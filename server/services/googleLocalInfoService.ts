type LocalInfoIntent =
  | "nearby_places"
  | "ticket_info"
  | "price_compare"
  | "gas_price"
  | "distance_route"
  | "retail"
  | "local_service";

type SourceConfidence = "high" | "medium" | "low" | "needs_confirmation";

export interface LocalInfoQuery {
  query: string;
  lat?: number;
  lng?: number;
  language?: "en" | "zh" | "fr";
  maxResults?: number;
}

export interface LocalInfoResult {
  name: string;
  category: string;
  address?: string;
  distanceKm?: number;
  driveTimeMin?: number;
  rating?: number;
  reviews?: number;
  openNow?: boolean;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  priceLevel?: string;
  priceInfo?: {
    type: "ticket" | "fuel" | "service" | "general";
    value?: string;
    source: "official_website" | "google_places" | "third_party" | "not_available";
    confidence: SourceConfidence;
    note: string;
  };
  sourceLabels: string[];
  sourceConfidence: SourceConfidence;
}

export interface LocalInfoResponse {
  intent: LocalInfoIntent;
  category: string;
  query: string;
  realTimeNeeded: boolean;
  locationNeeded: boolean;
  sourceSummary: string;
  caveats: string[];
  results: LocalInfoResult[];
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: { openNow?: boolean };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  types?: string[];
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
}

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
}

const DEFAULT_TORONTO = { lat: 43.6532, lng: -79.3832 };
const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.regularOpeningHours",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.types",
].join(",");

function getGoogleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_DIRECTIONS_API_KEY;
}

const LOCAL_CATEGORY_RULES: Array<{
  category: string;
  intent?: LocalInfoIntent;
  pattern: RegExp;
}> = [
  { category: "grocery_store", intent: "retail", pattern: /\b(?:supermarket|grocery|groceries|asian supermarket|chinese supermarket|korean supermarket|indian grocery)\b|(?:超市|亚洲超市|华人超市|中国超市|韩国超市|印度超市|买菜|生鲜|食品杂货)/ },
  { category: "convenience_store", intent: "retail", pattern: /\b(?:convenience store|corner store)\b|(?:便利店|小卖部)/ },
  { category: "pharmacy", intent: "retail", pattern: /\b(?:pharmacy|drugstore)\b|(?:药店|买药|药房)/ },
  { category: "hardware_store", intent: "retail", pattern: /\b(?:hardware store|tools|home improvement)\b|(?:五金店|工具|建材店)/ },
  { category: "electronics_store", intent: "retail", pattern: /\b(?:electronics store|computer store|phone store|cell phone store|mobile store|charger)\b|(?:电子产品店|电脑店|手机店|充电器)/ },
  { category: "department_store", intent: "retail", pattern: /\b(?:department store)\b|(?:百货)/ },
  { category: "clothing_store", intent: "retail", pattern: /\b(?:clothing store|clothes|fashion|shoe store|shoes)\b|(?:服装店|衣服|服饰|鞋店|鞋子)/ },
  { category: "book_store", intent: "retail", pattern: /\b(?:bookstore|books)\b|(?:书店|买书)/ },
  { category: "liquor_store", intent: "retail", pattern: /\b(?:liquor store|wine shop|beer store)\b|(?:酒铺|酒类|买酒)/ },
  { category: "pet_store", intent: "retail", pattern: /\b(?:pet store|pet shop|pet food)\b|(?:宠物店|宠物食品|宠物用品)/ },
  { category: "furniture_store", intent: "retail", pattern: /\b(?:furniture store|furniture|mattress)\b|(?:家具店|家具|床垫)/ },
  { category: "jewelry_store", intent: "retail", pattern: /\b(?:jewelry store|jewellery store|watch store)\b|(?:珠宝店|首饰|手表店)/ },
  { category: "bicycle_store", intent: "retail", pattern: /\b(?:bike shop|bicycle store|bicycle repair)\b|(?:自行车店|单车店|修自行车)/ },
  { category: "photo_studio", intent: "local_service", pattern: /\b(?:photo studio|photographer|passport photo)\b|(?:照相馆|摄影|证件照)/ },
  { category: "print_shop", intent: "local_service", pattern: /\b(?:print shop|printing|copy shop|printer)\b|(?:打印店|复印|打印)/ },
  { category: "lumber_supplier", intent: "local_service", pattern: /\b(?:lumber|wood|timber|sawmill|mill)\b|(?:木材|木材厂|木料)/ },
  { category: "phone_repair", intent: "local_service", pattern: /\b(?:phone repair|cell phone repair|mobile repair|screen repair)\b|(?:手机维修|修手机|换屏)/ },
  { category: "optician", intent: "local_service", pattern: /\b(?:optician|optical|glasses|eyeglasses|eye exam)\b|(?:眼镜店|配眼镜|验光)/ },
  { category: "laundry", intent: "local_service", pattern: /\b(?:laundry|laundromat|dry cleaner|dry cleaning)\b|(?:洗衣店|干洗店|自助洗衣)/ },
  { category: "hair_care", intent: "local_service", pattern: /\b(?:barber|hair salon|haircut|salon)\b|(?:理发店|剪头发|美发|发廊)/ },
  { category: "gym", intent: "local_service", pattern: /\b(?:gym|fitness|workout)\b|(?:健身房|健身)/ },
  { category: "bank", pattern: /\b(?:bank|atm)\b|(?:银行|取款机|ATM)/i },
  { category: "post_office", pattern: /\b(?:post office|mail|parcel|shipping)\b|(?:邮局|寄件|快递|包裹)/ },
  { category: "museum", intent: "ticket_info", pattern: /\b(?:museum|gallery)\b|(?:博物馆|美术馆)/ },
  { category: "amusement_park", intent: "ticket_info", pattern: /\b(?:amusement park|theme park|water park)\b|(?:游乐园|主题公园|水上乐园)/ },
  { category: "restaurant", pattern: /\b(?:restaurant|food|lunch|dinner|cafe|coffee)\b|(?:餐厅|吃|美食|咖啡)/ },
];

function findLocalCategoryRule(query: string) {
  const text = query.toLowerCase();
  return LOCAL_CATEGORY_RULES.find(rule => rule.pattern.test(text));
}

function detectIntent(query: string): LocalInfoIntent {
  const text = query.toLowerCase();
  const categoryRule = findLocalCategoryRule(query);
  if (/\b(?:gas|fuel|petrol|gasoline)\b|(?:加油|油价|汽油)/.test(text)) return "gas_price";
  if (/\b(?:ticket|tickets|admission|entry fee|entrance fee|zoo|aquarium)\b|(?:门票|票价|入场|动物园|水族馆)/.test(text)) return "ticket_info";
  if (/\b(?:price|prices|cost|quote|compare|cheapest|affordable|how much|rate|rates)\b|(?:价格|多少钱|报价|比较|最便宜|费用|收费)/.test(text)) return "price_compare";
  if (categoryRule?.intent) return categoryRule.intent;
  if (/\b(?:distance|how far|nearest|closest|drive time|driving time|route)\b|(?:距离|多远|最近|开车多久|路线)/.test(text)) return "distance_route";
  if (/\b(?:supermarket|grocery|groceries|market|convenience store|pharmacy|drugstore|hardware store|electronics store|department store|clothing store|bookstore|liquor store|store|shop|mall|buy)\b|(?:超市|便利店|药店|五金店|电子产品店|百货|服装店|书店|酒铺|商店|店|商场|买菜|买药|买东西)/.test(text)) return "retail";
  if (/\b(?:repair|studio|printing|supplier|clinic|salon|service)\b|(?:维修|诊所|服务)/.test(text)) return "local_service";
  return "nearby_places";
}

function inferCategory(query: string, intent: LocalInfoIntent) {
  const text = query.toLowerCase();
  if (intent === "gas_price") return "gas_station";
  const categoryRule = findLocalCategoryRule(query);
  if (categoryRule) return categoryRule.category;
  if (/\b(?:shop|store|buy|shopping|mall)\b|(?:买|商店|购物|商场|店)/.test(text)) return "store";
  return "point_of_interest";
}

function cleanSearchQuery(query: string) {
  return query
    .replace(/\b(?:near|nearby|closest|nearest|around|today|now|current|price|prices|cost|compare|cheapest|distance|how far|drive time)\b/gi, " ")
    .replace(/(?:附近|最近|今天|现在|价格|多少钱|比较|最便宜|距离|多远|开车多久)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wantsDistanceRanking(query: string) {
  const text = query.toLowerCase();
  return /\b(?:near|nearby|nearest|closest|distance|how far|drive time|driving time)\b|(?:附近|最近|距离|多远|开车多久)/.test(text);
}

function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseGoogleDurationMinutes(duration: string | undefined) {
  const seconds = Number(duration?.replace(/s$/, ""));
  return Number.isFinite(seconds) ? Math.round(seconds / 60) : undefined;
}

async function googleTextSearch({
  query,
  category,
  lat,
  lng,
  maxResults,
}: {
  query: string;
  category: string;
  lat: number;
  lng: number;
  maxResults: number;
}) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) return [];

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${cleanSearchQuery(query) || category} near Toronto`,
      maxResultCount: maxResults,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 12000,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places Text Search failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as GooglePlacesResponse;
  return data.places ?? [];
}

async function googleDriveRouteMinutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) return undefined;

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });

  if (!response.ok) return undefined;
  const data = await response.json() as GoogleRoutesResponse;
  return parseGoogleDurationMinutes(data.routes?.[0]?.duration);
}

function buildPriceInfo(intent: LocalInfoIntent, place: GooglePlace): LocalInfoResult["priceInfo"] {
  if (intent === "ticket_info") {
    return {
      type: "ticket",
      source: place.websiteUri ? "official_website" : "not_available",
      confidence: place.websiteUri ? "medium" : "needs_confirmation",
      note: place.websiteUri
        ? "Google Places found an official website, but ticket prices should be confirmed on that site."
        : "Ticket prices are not available from Google Places; confirm with the venue.",
    };
  }

  if (intent === "gas_price") {
    return {
      type: "fuel",
      source: "not_available",
      confidence: "needs_confirmation",
      note: "Google Places can find gas stations, but does not provide live pump prices here. Add a fuel-price provider for real-time prices.",
    };
  }

  if (intent === "price_compare") {
    return {
      type: "service",
      source: place.websiteUri ? "official_website" : "not_available",
      confidence: "needs_confirmation",
      note: place.websiteUri
        ? "Use the official website or phone number to confirm service pricing."
        : "No pricing source was found; contact the business for a quote.",
    };
  }

  return place.priceLevel
    ? {
      type: "general",
      value: place.priceLevel,
      source: "google_places",
      confidence: "low",
      note: "Google price level is a rough category, not an exact price.",
    }
    : undefined;
}

function localInfoCaveats(intent: LocalInfoIntent) {
  if (intent === "gas_price") {
    return [
      "Live gas prices are not available from Google Places; results show nearby stations only.",
      "Add a dedicated fuel-price API to compare prices accurately.",
    ];
  }
  if (intent === "ticket_info") {
    return [
      "Ticket prices change by date, age group, package, and promotions.",
      "Official venue websites are the highest-confidence source for admission prices.",
    ];
  }
  if (intent === "price_compare") {
    return [
      "Service prices are often not standardized and may require a quote.",
      "Results include official websites or phone numbers when Google provides them.",
    ];
  }
  if (intent === "retail") {
    return [
      "Google Places can identify stores, hours, ratings, websites, and distance, but not live shelf inventory.",
      "For product stock or exact prices, confirm on the store website or call before going.",
    ];
  }
  return ["Opening hours, availability, and prices can change; confirm before going."];
}

export async function searchLocalInfo(query: LocalInfoQuery): Promise<LocalInfoResponse> {
  const intent = detectIntent(query.query);
  const category = inferCategory(query.query, intent);
  const origin = {
    lat: query.lat ?? DEFAULT_TORONTO.lat,
    lng: query.lng ?? DEFAULT_TORONTO.lng,
  };
  const maxResults = Math.max(1, Math.min(query.maxResults ?? 6, 10));
  const places = await googleTextSearch({
    query: query.query,
    category,
    lat: origin.lat,
    lng: origin.lng,
    maxResults,
  });

  const results = await Promise.all(places.map(async (place): Promise<LocalInfoResult> => {
    const destination = place.location?.latitude !== undefined && place.location.longitude !== undefined
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : undefined;
    const distanceKm = destination ? haversineKm(origin, destination) : undefined;
    const driveTimeMin = destination && (intent === "distance_route" || intent === "gas_price")
      ? await googleDriveRouteMinutes(origin, destination)
      : undefined;
    const priceInfo = buildPriceInfo(intent, place);

    return {
      name: place.displayName?.text ?? "Unknown place",
      category,
      address: place.formattedAddress,
      distanceKm,
      driveTimeMin,
      rating: place.rating,
      reviews: place.userRatingCount,
      openNow: place.regularOpeningHours?.openNow,
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      mapsUrl: place.googleMapsUri,
      priceLevel: place.priceLevel,
      priceInfo,
      sourceLabels: [
        "Google Places",
        driveTimeMin !== undefined ? "Google Routes" : "",
        priceInfo?.source === "official_website" ? "Official website link" : "",
      ].filter(Boolean),
      sourceConfidence: priceInfo?.confidence ?? "medium",
    };
  }));

  const shouldSortByDistance = wantsDistanceRanking(query.query) ||
    intent === "distance_route" ||
    intent === "gas_price" ||
    intent === "retail" ||
    intent === "local_service" ||
    intent === "nearby_places";
  const sortedResults = results.sort((a, b) => {
    if (shouldSortByDistance) {
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    }
    if (intent === "price_compare") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return {
    intent,
    category,
    query: query.query,
    realTimeNeeded: intent === "gas_price",
    locationNeeded: true,
    sourceSummary: getGoogleApiKey()
      ? "Google Places for listings; Google Routes for drive time when relevant."
      : "Google Maps API key is not configured on the backend.",
    caveats: localInfoCaveats(intent),
    results: sortedResults,
  };
}
