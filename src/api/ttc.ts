import { apiRequest } from "./request";
import { getTrafficImpact, type TrafficEvent, type TrafficImpact } from "./traffic";
import { getEventImpact, type CityEvent, type EventImpact } from "./events";
import { getHolidayImpact, type HolidayImpact } from "./holidays";
import { queryLocalInfo, type LocalInfoResponse, type LocalInfoResult } from "./localInfo";
import { searchYelpRecommendations, type YelpRecommendation } from "./places";
import {
  getRegionalPrediction,
  type RegionalPrediction,
} from "./regionalTransit";
import {
  getCurrentWeather,
  getWeatherForecast,
  type CurrentWeather,
  type WeatherForecastHour,
} from "./weather";

export type TransitSource = "mock" | "gtfs" | "gtfs-rt" | "ttc" | "otp" | "google";

export interface StopResult {
  source: TransitSource;
  id: string;
  name: string;
  routes: string;
  distance: string;
  pos?: [number, number];
}

export interface DestinationResult {
  source: TransitSource;
  id: string;
  name: string;
  address: string;
  distance: string;
  pos?: [number, number];
}

export interface NearbyStop {
  source: TransitSource;
  stopId: string;
  name: string;
  pos: [number, number];
}

export interface Prediction {
  source: TransitSource;
  stopName: string;
  routeId: number;
  direction: string;
  etaMin: number;
  confidence?: number;
  weatherSource?: string;
  weatherDescription?: string;
  trafficDescription?: string;
  passengerLoadLevel?: "low" | "normal" | "busy" | "crowded";
  passengerLoadDescription?: string;
  dirs: string[];
  routes: number[];
  offsets: {
    schedule: number;
    weather: number;
    traffic: number;
    passengerLoad?: number;
    accidents: number;
    construction: number;
    events?: number;
    holidays?: number;
    other: number;
  };
  summary?: string;
}

export interface BusReport {
  source: TransitSource;
  stopName: string;
  routeId: number;
  etaMin: number;
  confidence?: number;
  weatherSource?: string;
  weatherDescription?: string;
  trafficDescription?: string;
  passengerLoadLevel?: "low" | "normal" | "busy" | "crowded";
  passengerLoadDescription?: string;
  factors: {
    schedule: { value: number; description: string };
    weather: { value: number; description: string };
    traffic: { value: number; description: string };
    passengerLoad?: { value: number; description: string };
    accidents: { value: number; description: string };
    construction: { value: number; description: string };
    events?: { value: number; description: string };
    holidays?: { value: number; description: string };
    other?: { value: number; description: string };
  };
}

export interface NavigationRoute {
  source: TransitSource;
  available?: boolean;
  message?: string;
  originCoordinates?: {
    lat: number;
    lng: number;
  };
  destinationCoordinates?: {
    lat: number;
    lng: number;
  };
  destName: string;
  destAddress: string;
  durationMin?: number;
  walkMin: number;
  walkMeters: number;
  busStop: string;
  routeLabel: string;
  etaMin: number;
  departureTime: string;
  arrivalTime: string;
  totalStops: number;
  alsoAt: string[];
  legs?: NavigationLeg[];
  alternatives?: NavigationRoute[];
}

export type NavigationMode = "bus" | "car" | "walk" | "bike";

export interface NavigationLeg {
  mode: "WALK" | "BUS" | "STREETCAR" | "SUBWAY" | "CAR" | "BICYCLE" | "TRANSIT" | "OTHER";
  fromName: string;
  toName: string;
  fromPos?: [number, number];
  toPos?: [number, number];
  durationMin: number;
  distanceMeters?: number;
  routeLabel?: string;
  headsign?: string;
  startTime?: string;
  endTime?: string;
  geometry?: [number, number][];
}

export interface StopMeta {
  source: TransitSource;
  id: string;
  name: string;
  routes: number[];
  dirs: string[];
  pos: [number, number];
}

export interface TransitAssistantContext {
  stopId?: string;
  routeId?: number;
  direction?: string;
  regionalAgencyId?: string;
  regionalStopId?: string;
  regionalRouteName?: string;
  regionalDirection?: string;
  destinationId?: string;
  originPos?: [number, number];
  originLabel?: string;
  navigationEtaMin?: number;
  navigationArrivalTime?: string;
  pendingRouteClarification?: number;
  pendingUnknownRoute?: number;
  pendingSuggestedRoute?: number;
  lastTargetTimeIso?: string;
  lastIntent?: TransitAssistantAnswer["matchedIntent"];
  guideArea?: string;
  guideDuration?: string;
  guideAudience?: string;
  guideBudget?: string;
  guideTopic?: string;
  aroundScope?: TransitAssistantIntentScope;
  lastRecommendationQuery?: string;
  lastRecommendationKind?: "shopping" | "food" | "places" | "plan";
  lastRecommendations?: AssistantRecommendationOption[];
  currentTopic?: string;
  currentLocalInfoIntent?: ConversationUnderstandingIntent;
  mentionedPlaces?: string[];
  userOrigin?: string;
  date?: string;
  targetGroup?: string;
  compareBy?: ConversationCompareBy;
  lastResolvedQuestion?: string;
  missingSlots?: string[];
  lastUnderstanding?: ConversationUnderstandingResult;
}

export type TransitAssistantIntent =
  | "eta"
  | "delay"
  | "weather"
  | "traffic"
  | "events"
  | "holidays"
  | "crowding"
  | "navigation"
  | "recommendation"
  | "guide"
  | "help"
  | "out-of-scope";

export interface TransitAssistantAnswer {
  text: string;
  matchedIntent: TransitAssistantIntent;
  confidence: number;
  context?: TransitAssistantContext;
}

export interface AssistantRecommendationOption {
  name: string;
  address?: string;
  note?: string;
  url?: string;
  price?: string;
  rating?: number;
  reviews?: number;
  distanceKm?: number;
  categories?: string[];
  budget?: "free" | "low" | "medium" | "higher";
  destinationQuery?: string;
}

export interface TransitAssistantIntentScope {
  kind: "none" | "current" | "place";
  place?: string;
  phrase?: string;
}

export type ConversationUnderstandingIntent =
  | "ticket_price"
  | "opening_hours"
  | "distance"
  | "gas_price"
  | "price_comparison"
  | "recommendation"
  | "route"
  | "local_info"
  | "clarification"
  | "unknown";

export type ConversationCompareBy =
  | "price"
  | "distance"
  | "time"
  | "rating"
  | "open_now"
  | "none";

interface ConversationUnderstandingResult {
  isFollowUp: boolean;
  resolvedQuestion: string;
  intent: ConversationUnderstandingIntent;
  entity?: string;
  targetGroup?: string;
  time?: string;
  compareBy: ConversationCompareBy;
  missingSlots: string[];
  needsApi: boolean;
  apiType:
    | "google_places"
    | "google_routes"
    | "official_ticket_lookup"
    | "fuel_price"
    | "web_price_lookup"
    | "none";
  confidence: number;
  reason?: string;
}

interface TransitAssistantIntentResult {
  intent: TransitAssistantIntent;
  confidence: number;
  reason?: string;
  scope?: TransitAssistantIntentScope;
}

interface TransitAssistantAnswerVerificationResult {
  isCorrect: boolean;
  answer: string;
  confidence: number;
  reason?: string;
}

type ResponseLanguage = "en" | "zh" | "fr";

function detectResponseLanguage(input: string): ResponseLanguage {
  if (/[\u4e00-\u9fff]/.test(input)) return "zh";
  if (/[àâçéèêëîïôùûüÿœ]/i.test(input) || /\b(?:bonjour|salut|recommande-moi|recommandez-moi|où|quoi|comment|manger|visiter|trajet|météo|retard|arrivée|heure|merci|s'il vous plaît|avec\s+des|une\s+idée|un\s+itinéraire)\b/i.test(input)) return "fr";
  return "en";
}

function localizeGuideAnswer(answer: TransitAssistantAnswer, language: ResponseLanguage): TransitAssistantAnswer {
  if (answer.matchedIntent !== "guide" || language === "en") return answer;
  const lines = answer.text.split("\n");
  const localized = lines.map(line => {
    if (/^Here is a/.test(line)) return language === "zh" ? "这是一个多伦多攻略建议：" : "Voici une idée d'itinéraire à Toronto :";
    if (/^\s+\d+\./.test(line) || /^\d+\./.test(line)) return line;
    if (/^\s{3}/.test(line)) return language === "zh" ? `   ${line.trim()}` : `   ${line.trim()}`;
    if (/^Budget fit:/.test(line)) return language === "zh" ? line.replace("Budget fit:", "预算：") : line.replace("Budget fit:", "Budget :");
    if (/^Before going:/.test(line)) return language === "zh"
      ? "出发前：请确认实时营业时间、门票和预约。"
      : "Avant de partir : vérifiez les horaires, les billets et les réservations.";
    if (/^Next step:/.test(line)) return language === "zh"
      ? line.replace("Next step: ask", "下一步：可以问").replace("when you choose a stop.", "然后选择站点。")
      : line.replace("Next step: ask", "Étape suivante : demandez").replace("when you choose a stop.", "quand vous choisissez un arrêt.");
    return line;
  }).join("\n");

  return { ...answer, text: localized };
}

function splitAssistantSentences(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]?/g);
  return sentences?.map(sentence => sentence.trim()).filter(Boolean) ?? [paragraph.trim()];
}

function formatAssistantParagraph(paragraph: string): string {
  const trimmed = paragraph.trim();
  if (!trimmed) return "";
  if (/^(?:\d+\.|- )/.test(trimmed)) return trimmed;

  const sentences = splitAssistantSentences(trimmed);
  if (sentences.length <= 1) return trimmed;

  if (sentences.length >= 2 && trimmed.length <= 220) {
    return sentences.join("\n");
  }

  const lines: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > 95 && current) {
      lines.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines.join("\n");
}

function formatAssistantText(text: string): string {
  const prepared = text
    .replace(/\r\n/g, "\n")
    .replace(/\ba\.m\./gi, "AM")
    .replace(/\bp\.m\./gi, "PM")
    .replace(/[ \t]+/g, " ")
    .replace(/([.!?。！？])\s+(?=\d+\.\s)/g, "$1\n\n")
    .replace(/\s+(\d+\.\s)/g, "\n$1")
    .replace(/(?<!\w)\s+(-\s+)/g, "\n$1")
    .replace(/\s+(Steps:|Main factors:|Factors:|Estimated arrival:|Before going:|Next step:|Budget fit:)/g, "\n\n$1")
    .replace(/\s+(步骤：|主要因素：|因素：|预计到达：|出发前：|下一步：|预算：)/g, "\n\n$1")
    .replace(/\s+(Étapes :|Facteurs principaux :|Facteurs :|Arrivée estimée :|Avant de partir :|Étape suivante :|Budget :)/g, "\n\n$1")
    .replace(/:\s+(?=\d+\.\s)/g, ":\n\n")
    .replace(/：\s*(?=\d+\.)/g, "：\n\n");

  return prepared
    .split(/\n{2,}/)
    .map(block => block
      .split("\n")
      .map(formatAssistantParagraph)
      .filter(Boolean)
      .join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyResponsePresentation(input: string, answer: TransitAssistantAnswer): TransitAssistantAnswer {
  const language = detectResponseLanguage(input);
  const localized = localizeGuideAnswer(answer, language);

  return {
    ...localized,
    text: formatAssistantText(localized.text),
  };
}

function localizedCapabilityText(language: ResponseLanguage): string {
  if (language === "zh") {
    return "我可以帮你查询 TTC 到站时间、附近站点、路线延误、交通、天气、活动、节假日，以及 Toronto/GTA 的跨区域公交路线和按出发时间规划行程。";
  }
  if (language === "fr") {
    return "Je peux vous aider avec les arrivées TTC, les arrêts proches, les retards, la circulation, la météo, les événements, les jours fériés et les trajets en transport dans Toronto et la région du Grand Toronto selon l'heure de départ.";
  }
  return "I can help with TTC arrivals, nearby stops, delays, traffic, weather, events, holidays, and Toronto/GTA transit trip planning with departure-time choices.";
}

function localizedTryAgain(language: ResponseLanguage): string {
  if (language === "zh") return "请稍后再试。";
  if (language === "fr") return "Réessayez dans un instant.";
  return "Try again in a moment.";
}

const ROUTE_TERMINALS: Record<number, { label: string; terminals: string[]; notes?: string }> = {
  501: {
    label: "501 Queen",
    terminals: ["Long Branch", "Neville Park"],
  },
  505: {
    label: "505 Dundas",
    terminals: ["Dundas West Station", "Broadview Station"],
  },
  506: {
    label: "506 Carlton",
    terminals: ["High Park", "Main Street Station"],
  },
  510: {
    label: "510 Spadina",
    terminals: ["Spadina Station", "Union Station"],
    notes: "I cannot confirm individual short turns right now.",
  },
};

type GuideCategory = "attractions" | "food" | "parks" | "shopping" | "culture" | "night";
type GuidePlace = {
  name: string;
  category: GuideCategory;
  area: string;
  address: string;
  bestFor: string[];
  note: string;
  noteZh: string;
  noteFr: string;
  indoor?: boolean;
  budget?: "free" | "low" | "medium" | "higher";
  destinationQuery: string;
};

const GUIDE_PLACES: GuidePlace[] = [
  { name: "CN Tower", category: "attractions", area: "downtown", address: "290 Bremner Blvd", bestFor: ["first time", "views", "photos"], note: "best paired with the waterfront or Ripley's Aquarium", noteZh: "适合和湖边或 Ripley's Aquarium 一起安排", noteFr: "à combiner avec le waterfront ou Ripley's Aquarium", indoor: true, budget: "higher", destinationQuery: "CN Tower" },
  { name: "Ripley's Aquarium of Canada", category: "attractions", area: "downtown", address: "288 Bremner Blvd", bestFor: ["kids", "rain", "first time"], note: "strong indoor stop near CN Tower", noteZh: "CN Tower 旁边的强室内选择", noteFr: "bonne option intérieure près de la CN Tower", indoor: true, budget: "higher", destinationQuery: "Ripley's Aquarium of Canada" },
  { name: "St. Lawrence Market", category: "food", area: "east downtown", address: "93 Front St E", bestFor: ["food", "casual", "local"], note: "good for lunch and quick tasting stops", noteZh: "适合午餐和快速试吃", noteFr: "bon choix pour le déjeuner et des dégustations rapides", indoor: true, budget: "medium", destinationQuery: "St. Lawrence Market" },
  { name: "Kensington Market", category: "food", area: "west downtown", address: "Kensington Ave", bestFor: ["food", "walking", "budget"], note: "good for casual food, vintage shops, and street wandering", noteZh: "适合小吃、复古店和街区散步", noteFr: "idéal pour manger simplement, voir des boutiques vintage et se promener", budget: "low", destinationQuery: "Kensington Market" },
  { name: "Chinatown", category: "food", area: "west downtown", address: "Spadina Ave", bestFor: ["food", "budget", "late"], note: "pairs naturally with Kensington Market and AGO", noteZh: "很适合和 Kensington Market、AGO 连在一起", noteFr: "se combine bien avec Kensington Market et l'AGO", budget: "low", destinationQuery: "Chinatown Toronto" },
  { name: "Art Gallery of Ontario", category: "culture", area: "west downtown", address: "317 Dundas St W", bestFor: ["art", "rain", "culture"], note: "good indoor culture stop near Chinatown", noteZh: "Chinatown 附近的室内文化景点", noteFr: "bonne halte culturelle intérieure près de Chinatown", indoor: true, budget: "medium", destinationQuery: "Art Gallery of Ontario" },
  { name: "Royal Ontario Museum", category: "culture", area: "midtown", address: "100 Queens Park", bestFor: ["kids", "rain", "museum"], note: "large museum option near Bloor-Yonge and University of Toronto", noteZh: "Bloor-Yonge 和多大附近的大型博物馆", noteFr: "grand musée près de Bloor-Yonge et de l'Université de Toronto", indoor: true, budget: "medium", destinationQuery: "Royal Ontario Museum" },
  { name: "Toronto Islands Ferry", category: "parks", area: "waterfront", address: "Jack Layton Ferry Terminal", bestFor: ["views", "walking", "summer"], note: "best in good weather; allow extra time for ferry lines", noteZh: "天气好时最适合，排 ferry 要预留时间", noteFr: "meilleur par beau temps; prévoyez du temps pour la file du ferry", budget: "low", destinationQuery: "Toronto Islands Ferry" },
  { name: "High Park", category: "parks", area: "west end", address: "1873 Bloor St W", bestFor: ["nature", "walking", "free"], note: "large park with easy subway access", noteZh: "大型公园，坐地铁很方便", noteFr: "grand parc facile d'accès en métro", budget: "free", destinationQuery: "High Park" },
  { name: "Trinity Bellwoods Park", category: "parks", area: "west downtown", address: "790 Queen St W", bestFor: ["local", "walking", "free"], note: "pairs well with Queen West shops and food", noteZh: "适合和 Queen West 的店铺、美食一起安排", noteFr: "se combine bien avec les boutiques et restaurants de Queen West", budget: "free", destinationQuery: "Trinity Bellwoods Park" },
  { name: "CF Toronto Eaton Centre", category: "shopping", area: "downtown", address: "220 Yonge St", bestFor: ["shopping", "rain", "central"], note: "central indoor shopping near Dundas and Queen", noteZh: "Dundas 和 Queen 附近的市中心室内购物点", noteFr: "centre commercial intérieur près de Dundas et Queen", indoor: true, budget: "medium", destinationQuery: "CF Toronto Eaton Centre" },
  { name: "Yorkville Village", category: "shopping", area: "midtown", address: "55 Avenue Rd", bestFor: ["shopping", "upscale", "cafes"], note: "good for a quieter upscale stop near ROM", noteZh: "ROM 附近较安静、偏高端的区域", noteFr: "option plus calme et haut de gamme près du ROM", indoor: true, budget: "higher", destinationQuery: "Yorkville Village" },
  { name: "Queen West", category: "night", area: "west downtown", address: "Queen St W", bestFor: ["night", "food", "shopping"], note: "good evening area for restaurants, bars, and local shops", noteZh: "晚上适合餐厅、酒吧和本地小店", noteFr: "bon quartier le soir pour restaurants, bars et boutiques locales", budget: "medium", destinationQuery: "Queen West Toronto" },
  { name: "Distillery District", category: "culture", area: "east downtown", address: "55 Mill St", bestFor: ["date", "photos", "walking"], note: "brick-lane walking area with cafes, galleries, and seasonal markets", noteZh: "适合拍照、散步、咖啡和季节市集", noteFr: "quartier piéton avec cafés, galeries et marchés saisonniers", budget: "low", destinationQuery: "Distillery District" },
  { name: "Harbourfront Centre", category: "attractions", area: "waterfront", address: "235 Queens Quay W", bestFor: ["views", "walking", "free"], note: "easy waterfront stop for lake views and casual walks", noteZh: "适合看湖景和轻松散步", noteFr: "bonne halte au bord du lac pour les vues et une promenade", budget: "free", destinationQuery: "Harbourfront Centre" },
  { name: "Seven Lives Tacos", category: "food", area: "west downtown", address: "69 Kensington Ave", bestFor: ["food", "budget", "casual"], note: "quick casual food stop inside Kensington Market", noteZh: "Kensington Market 里适合快速吃饭的小店", noteFr: "halte rapide et décontractée dans Kensington Market", budget: "low", destinationQuery: "Seven Lives Tacos" },
  { name: "Pai Northern Thai Kitchen", category: "food", area: "downtown", address: "18 Duncan St", bestFor: ["food", "dinner", "date"], note: "popular downtown dinner option; expect waits at busy times", noteZh: "市中心热门晚餐选择，高峰期可能需要排队", noteFr: "restaurant populaire au centre-ville; attendez-vous à de l'attente aux heures chargées", indoor: true, budget: "medium", destinationQuery: "Pai Northern Thai Kitchen" },
  { name: "Dineen Coffee Co.", category: "food", area: "downtown", address: "140 Yonge St", bestFor: ["coffee", "rain", "quick"], note: "central coffee break near Queen and King", noteZh: "Queen 和 King 附近适合休息喝咖啡", noteFr: "pause café centrale près de Queen et King", indoor: true, budget: "low", destinationQuery: "Dineen Coffee Co" },
  { name: "Little Canada", category: "attractions", area: "downtown", address: "10 Dundas St E", bestFor: ["kids", "rain", "first time"], note: "indoor miniature attraction near Dundas Station", noteZh: "Dundas Station 附近的室内迷你景点", noteFr: "attraction miniature intérieure près de Dundas Station", indoor: true, budget: "medium", destinationQuery: "Little Canada Toronto" },
];

function getDistanceKm(from: [number, number], to: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to[0] - from[0]);
  const dLng = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getStopMeta(stopId: string): Promise<StopMeta> {
  return apiRequest<StopMeta>(`/api/ttc/stops/${encodeURIComponent(stopId)}`);
}

export function searchStops(query: string): Promise<StopResult[]> {
  return apiRequest<StopResult[]>("/api/ttc/stops/search", {
    params: { q: query },
  });
}

export function searchDestinations(
  query: string,
): Promise<DestinationResult[]> {
  return apiRequest<DestinationResult[]>("/api/ttc/destinations/search", {
    params: { q: query },
  });
}

export function getNearbyStops(
  lat: number,
  lng: number,
): Promise<NearbyStop[]> {
  return apiRequest<NearbyStop[]>("/api/ttc/stops/nearby", {
    params: { lat, lng },
  });
}

export function getPrediction(
  stopId: string,
  routeId: number,
  direction: string,
): Promise<Prediction> {
  return apiRequest<Prediction>("/api/ttc/prediction", {
    params: { stopId, routeId, direction },
  });
}

export function getBusReport(
  stopId: string,
  routeId: number,
  direction: string,
): Promise<BusReport> {
  return apiRequest<BusReport>("/api/ttc/bus-report", {
    params: { stopId, routeId, direction },
  });
}

export function getNavigationRoute(
  origin: string,
  destination: string,
  originPos?: [number, number] | null,
  mode: NavigationMode = "bus",
  departureTime?: string,
): Promise<NavigationRoute> {
  return apiRequest<NavigationRoute>("/api/ttc/navigation", {
    params: {
      origin,
      destination,
      originLat: originPos?.[0],
      originLng: originPos?.[1],
      mode,
      departureTime,
    },
  });
}

async function classifyTransitAssistantIntent(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantIntentResult | undefined> {
  try {
    const result = await apiRequest<TransitAssistantIntentResult>("/api/ttc/assistant/intent", {
      method: "POST",
      body: { input, context },
    });

    return result.confidence >= 60 ? result : undefined;
  } catch {
    return undefined;
  }
}

function inferCurrentTopic(context: TransitAssistantContext): string | undefined {
  return context.currentTopic ??
    context.lastRecommendations?.[0]?.name ??
    context.lastRecommendationQuery;
}

function heuristicConversationUnderstanding(
  input: string,
  context: TransitAssistantContext,
): ConversationUnderstandingResult {
  const topic = inferCurrentTopic(context);
  const normalized = input.trim();
  const lower = normalized.toLowerCase();
  const targetGroup =
    /\b(?:child|children|kid|kids)\b|(?:儿童|孩子|小孩)/i.test(normalized) ? "child" :
    /\b(?:student|students)\b|(?:学生)/i.test(normalized) ? "student" :
    /\b(?:senior|seniors)\b|(?:老人|长者|老年)/i.test(normalized) ? "senior" :
    /\b(?:adult|adults)\b|(?:成人)/i.test(normalized) ? "adult" :
    undefined;
  const time =
    /\btomorrow\b|明天/i.test(normalized) ? "tomorrow" :
    /\btoday\b|今天/i.test(normalized) ? "today" :
    /\btonight\b|今晚|晚上/i.test(normalized) ? "tonight" :
    undefined;
  const compareBy: ConversationCompareBy =
    /\b(?:cheapest|cheap|price|cost|expensive)\b|(?:最便宜|便宜|价格|多少钱|贵)/i.test(normalized) ? "price" :
    /\b(?:closest|nearest|distance|far)\b|(?:最近|距离|多远|远吗|近)/i.test(normalized) ? "distance" :
    /\b(?:open|hours|closed)\b|(?:开门|营业|关门|开吗)/i.test(normalized) ? "open_now" :
    /\b(?:rating|best|reviews?)\b|(?:评分|评价|最好)/i.test(normalized) ? "rating" :
    "none";
  const isShortFollowUp = Boolean(topic) && (
    targetGroup !== undefined ||
    time !== undefined ||
    compareBy !== "none" ||
    /^(?:what about|how about|and|那|这个|那个|那里|它|贵吗|远吗|开吗|明天呢|今天呢|学生呢|儿童呢)/i.test(normalized)
  );
  const intent: ConversationUnderstandingIntent =
    compareBy === "distance" ? "distance" :
    compareBy === "open_now" || time ? "opening_hours" :
    targetGroup ? "ticket_price" :
    compareBy === "price" ? "price_comparison" :
    context.currentLocalInfoIntent ?? "unknown";
  const resolvedQuestion = isShortFollowUp && topic
    ? [
      intent === "ticket_price" ? `What is the ${targetGroup ?? ""} ticket price for ${topic}?` : "",
      intent === "opening_hours" ? `Is ${topic} open ${time ?? "now"}?` : "",
      intent === "distance" ? `How far is ${topic} from my location?` : "",
      intent === "price_comparison" ? `Compare price for ${topic}.` : "",
    ].find(Boolean) ?? normalized
    : normalized;

  return {
    isFollowUp: isShortFollowUp,
    resolvedQuestion,
    intent,
    entity: isShortFollowUp ? topic : undefined,
    targetGroup,
    time,
    compareBy,
    missingSlots: intent === "distance" && !context.originPos ? ["location"] : [],
    needsApi: intent !== "unknown",
    apiType: intent === "distance"
      ? "google_routes"
      : intent === "ticket_price"
        ? "official_ticket_lookup"
        : intent === "price_comparison"
          ? "web_price_lookup"
          : intent === "opening_hours"
            ? "google_places"
            : "none",
    confidence: isShortFollowUp ? 72 : 45,
    reason: isShortFollowUp ? "Heuristic follow-up resolved from conversation memory." : "No strong follow-up pattern.",
  };
}

async function resolveConversationUnderstanding(
  input: string,
  context: TransitAssistantContext,
): Promise<ConversationUnderstandingResult> {
  const fallback = heuristicConversationUnderstanding(input, context);

  try {
    const result = await apiRequest<ConversationUnderstandingResult>("/api/ttc/assistant/resolve-context", {
      method: "POST",
      body: { input, context },
    });

    return result.confidence >= 60 ? result : fallback;
  } catch {
    return fallback;
  }
}

async function verifyTransitAssistantAnswer(
  input: string,
  draft: TransitAssistantAnswer,
): Promise<TransitAssistantAnswer> {
  try {
    const result = await apiRequest<TransitAssistantAnswerVerificationResult>("/api/ttc/assistant/verify-answer", {
      method: "POST",
      body: {
        input,
        draftAnswer: draft.text,
        matchedIntent: draft.matchedIntent,
        confidence: draft.confidence,
        context: draft.context,
      },
    });

    if (result.isCorrect && result.answer === draft.text) {
      return draft;
    }

    return {
      ...draft,
      text: result.answer || draft.text,
      confidence: Math.max(draft.confidence, result.confidence),
    };
  } catch {
    return draft;
  }
}

function findRouteInText(input: string): number | undefined {
  if (isAddressLikeDestination(input)) return undefined;

  const route = input.match(/(?:^|[^\d])([1-9]\d{1,2})(?=$|[^\d])/);
  return route ? Number(route[1]) : undefined;
}

function findDirectionInText(input: string): string | undefined {
  if (/\beast\s*bound\b|\beastbound\b|\beast\b/i.test(input)) return "Eastbound";
  if (/\bwest\s*bound\b|\bwestbound\b|\bwest\b/i.test(input)) return "Westbound";
  if (/\bsouth\s*bound\b|\bsouthbound\b|\bsouth\b/i.test(input)) return "Southbound";
  if (/\bnorth\s*bound\b|\bnorthbound\b|\bnorth\b/i.test(input)) return "Northbound";
  return undefined;
}

function isYes(input: string): boolean {
  return /^(?:yes|yeah|yep|yup|sure|correct|right|exactly|that'?s right|please|ok|okay)\b/i.test(input.trim());
}

function isNo(input: string): boolean {
  return /^(?:no|nope|nah|not that|not route|different)\b/i.test(input.trim());
}

function extractDestinationQuery(input: string): string | undefined {
  const cleaned = input.trim().replace(/[?.!]+$/, "");
  const patterns = [
    /(?:从.+?(?:到|去|前往)|我要(?:到|去)|我想(?:到|去)|帮我(?:到|去|导航到)|怎么(?:到|去)|如何(?:到|去)|导航(?:到|去)|路线(?:到|去)|前往|去|到)\s*([^，。！？?]+)$/i,
    /\b(?:i\s+(?:want|need|would\s+like)\s+to\s+(?:go|travel|get)\s+to|can\s+you\s+(?:take|get|route|navigate)\s+me\s+to|take\s+me\s+to|get\s+me\s+to|route\s+me\s+to|navigate\s+me\s+to|go\s+to|travel\s+to|head\s+to|visit)\s+(.+)$/i,
    /\bfrom\s+.+?\s+to\s+(.+)$/i,
    /\b(?:i\s+(?:want|need|would\s+like)\s+to\s+)?(?:plan|schedule|map)\s+(?:me\s+)?(?:a\s+)?(?:ttc\s+|transit\s+)?trip\b.{0,80}?\bto\s+(.+)$/i,
    /\b(?:how\s+(?:do|can|should)\s+i\s+(?:get|go|travel)\s+to|how\s+to\s+(?:get|go|travel)\s+to|directions?\s+to|navigate\s+to|route\s+to|trip\s+to|transit\s+to|plan\s+(?:me\s+)?(?:a\s+)?trip\s+to)\s+(.+)$/i,
    /\b(?:what(?:'s|\s+is)?\s+the\s+(?:best\s+)?(?:route|way|trip)\s+to|give\s+me\s+(?:a\s+)?(?:route|trip|directions?)\s+to)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) return cleanDestinationQuery(match[1]);
  }

  return undefined;
}

function extractOriginQuery(input: string): string | undefined {
  const cleaned = input.trim().replace(/[?.!]+$/, "");
  const patterns = [
    /(?:从|由)\s*([^，。！？?]+?)\s*(?:到|去|前往)/i,
    /\bfrom\s+(.+?)\s+to\s+.+$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) return cleanDestinationQuery(match[1]);
  }

  return undefined;
}

function cleanDestinationQuery(input: string): string {
  const cleaned = input
    .trim()
    .replace(/\b(?:please|thanks|thank you)\b/gi, " ")
    .replace(/\b(?:for|on)\s+(?:today|tomorrow|tonight|this evening|later)\b/gi, " ")
    .replace(/\b(?:today|tomorrow|tonight|this evening|later)\b/gi, " ")
    .replace(/\b(?:at|around|by|before|after)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\b(?:in\s+)?(?:another\s+)?(?:\d+|one|two|three|four|five|six)\s+(?:more\s+)?(?:minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/gi, " ")
    .replace(/(?:今天|明天|今晚|晚上|早上|上午|中午|下午|稍后|等下|之后|以后)/g, " ")
    .replace(/(?:大概|大约|约)?\s*\d{1,2}(?:点|:)\d{0,2}(?:分)?(?:左右|前|后)?/g, " ")
    .replace(/(?:\d+|一|二|两|三|四|五|六)\s*(?:分钟|小时)(?:后|之后|以后)/g, " ")
    .replace(/(?:出发|离开|走|到达)$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || input.trim();
}

function isNavigationQuestion(input: string): boolean {
  return extractDestinationQuery(input) !== undefined ||
    /\b(?:navigate|navigation|directions?|route\s+me|take\s+me|get\s+me|go\s+to|get\s+to|travel\s+to|transit\s+to|trip\s+to|plan|schedule|map)\b.*\b(?:trip|to|there|destination|union|station)\b/i.test(input) ||
    /(?:导航|路线|怎么去|怎么到|如何去|如何到|前往|从.+到|从.+去|去.+怎么走|到.+怎么走|出行方式|公交怎么走|坐车去)/i.test(input);
}

function isBareDestinationCandidate(input: string): boolean {
  const cleaned = input.trim();
  if (cleaned.length < 3) return false;
  if (isPendingStopClarificationInput(cleaned)) return false;
  if (isWeatherQuestion(cleaned) || isTrafficQuestion(cleaned) || isDelayQuestion(cleaned) || isCrowdingQuestion(cleaned)) return false;
  if (isLocationQuestion(cleaned) || isRouteTerminalQuestion(cleaned) || isTransitArrivalRequest(cleaned)) return false;

  return /[a-z\u4e00-\u9fff]/i.test(cleaned);
}

function isAddressLikeDestination(input: string): boolean {
  return /\b\d+\s+[\w\s'.-]+(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|court|ct|crescent|cres|lane|ln|way|parkway|pkwy)\b/i.test(input);
}

function isPendingStopClarificationInput(input: string): boolean {
  return /\b(?:at|near|by)\b/i.test(input) && !/\b(?:go|travel|get|navigate|route|directions?|trip|destination)\s+to\b/i.test(input);
}

function getClarificationStopQuery(input: string): string {
  const cleaned = input.trim();
  if (/\b\w+\s+at\s+\w+\b/i.test(cleaned)) return cleaned;
  return extractStopQuery(cleaned) ?? cleaned;
}

function isTransitArrivalRequest(input: string): boolean {
  if (isAddressLikeDestination(input)) return false;
  if (findRouteInText(input)) return true;

  return /\b(?:when|eta|arriv|arrival|coming|due|next|how\s+long|real\s*time|live|prediction|estimate)\b/i.test(input) ||
    /\b(?:bus|streetcar|vehicle|ttc|route|stop|station)\b/i.test(input) ||
    /(?:多久|几分钟|什么时候到|下一班|实时|到站|公交|电车|车站|路线)/.test(input);
}

const REGIONAL_AGENCIES = [
  {
    id: "go-transit",
    aliases: ["go transit", "go train", "go bus", "metrolinx", "up express", "up train", "up"],
  },
  {
    id: "miway",
    aliases: ["miway", "mississauga transit", "mississauga bus"],
  },
  {
    id: "yrt-viva",
    aliases: ["yrt", "viva", "york region transit", "york region bus"],
  },
  {
    id: "brampton-transit",
    aliases: ["brampton transit", "brampton bus", "zum", "züm"],
  },
] as const;

function normalizeRegionalText(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function detectRegionalAgencyId(input: string, context: TransitAssistantContext): string | undefined {
  const normalized = normalizeRegionalText(input);
  const matched = REGIONAL_AGENCIES.find(agency =>
    agency.aliases.some(alias => normalized.includes(normalizeRegionalText(alias))),
  );
  return matched?.id ?? context.regionalAgencyId;
}

function isRegionalTransitQuestion(input: string, context: TransitAssistantContext): boolean {
  if (detectRegionalAgencyId(input, context)) return true;
  return /\b(?:go transit|go train|go bus|miway|mississauga transit|yrt|viva|brampton transit|zum|züm|york region transit)\b/i.test(input);
}

function cleanRegionalQuery(input: string): string {
  let cleaned = input;
  for (const agency of REGIONAL_AGENCIES) {
    for (const alias of agency.aliases) {
      cleaned = cleaned.replace(new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), " ");
    }
  }
  return cleaned
    .replace(/\b(?:bus|train|route|line|stop|station|platform|eta|arrival|arrive|coming|next|when|what|time|from|at|near|by|the|a|an)\b/gi, " ")
    .replace(/(?:公交|火车|路线|车站|站点|到站|下一班|什么时候|多久|几分钟|在|从|到)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRegionalRouteName(input: string, context: TransitAssistantContext): string | undefined {
  const viva = input.match(/\bviva\s+(blue|purple|orange|pink|yellow|green|silver)\b/i)?.[0];
  if (viva) return viva.replace(/\s+/g, " ").trim();

  const up = /\bup\s+express\b/i.test(input) ? "UP" : undefined;
  if (up) return up;

  const route = input.match(/\b(?:route|bus|line)\s+([a-z]?\d+[a-z]?|[a-z]+)\b/i)?.[1] ??
    input.match(/(?:路线|公交)\s*([a-z]?\d+[a-z]?|[a-z]+)/i)?.[1] ??
    input.match(/\b([1-9]\d{0,2}[a-z]?)\b/i)?.[1];

  return route?.toUpperCase() ?? context.regionalRouteName;
}

function extractRegionalStopQuery(input: string, context: TransitAssistantContext): string | undefined {
  const explicit = extractStopQuery(input) ??
    input.match(/\b(?:at|from|near|by)\s+(.+)$/i)?.[1] ??
    input.match(/(?:在|从|到)\s*([^，。！？?]+)$/i)?.[1];

  const cleaned = explicit ? cleanRegionalQuery(explicit) : cleanRegionalQuery(input);
  const route = extractRegionalRouteName(input, context);
  const withoutRoute = route
    ? cleaned.replace(new RegExp(`\\b${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), " ").replace(/\s+/g, " ").trim()
    : cleaned;

  if (withoutRoute && !/^(?:next|arrival|eta|schedule)$/i.test(withoutRoute)) return withoutRoute;
  return undefined;
}

function formatRegionalPredictionAnswer(prediction: RegionalPrediction, input: string): string {
  const language = detectResponseLanguage(input);
  const confidence = prediction.confidence ?? 72;
  const otherDepartures = prediction.alsoAt.length > 0
    ? prediction.alsoAt.slice(0, 3).join(", ")
    : "";

  if (language === "zh") {
    return [
      `${prediction.agencyName} ${prediction.routeName}`,
      `方向：${prediction.direction}`,
      `到站：约 ${prediction.etaMin} 分钟`,
      `站点：${prediction.stopName}`,
      `班表时间：${prediction.scheduledDeparture}`,
      `数据：本地 GTFS 静态班表，暂不是实时车辆定位`,
      otherDepartures ? `其他即将到站：${otherDepartures}` : "",
      `置信度：${confidence}%`,
    ].filter(Boolean).join("\n");
  }

  if (language === "fr") {
    return [
      `${prediction.agencyName} ${prediction.routeName}`,
      `Direction : ${prediction.direction}`,
      `Arrivée : environ ${prediction.etaMin} min`,
      `Arrêt : ${prediction.stopName}`,
      `Départ prévu : ${prediction.scheduledDeparture}`,
      "Données : horaire GTFS local, pas encore un suivi véhicule en direct",
      otherDepartures ? `Autres départs proches : ${otherDepartures}` : "",
      `Confiance : ${confidence} %`,
    ].filter(Boolean).join("\n");
  }

  return [
    `${prediction.agencyName} ${prediction.routeName}`,
    `Direction: ${prediction.direction}`,
    `ETA: about ${prediction.etaMin} min`,
    `Stop: ${prediction.stopName}`,
    `Scheduled departure: ${prediction.scheduledDeparture}`,
    "Data: local GTFS schedule, not live vehicle tracking yet",
    otherDepartures ? `Other upcoming options: ${otherDepartures}` : "",
    `Confidence: ${confidence}%`,
  ].filter(Boolean).join("\n");
}

async function answerRegionalTransitEta(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  if (!isRegionalTransitQuestion(input, context)) return null;

  const agencyId = detectRegionalAgencyId(input, context);
  const routeName = extractRegionalRouteName(input, context);
  const extractedStopQuery = extractRegionalStopQuery(input, context);
  const regionalFollowUp = Boolean(context.regionalStopId) &&
    /^(?:next|next one|the next one|what about(?: the)? next|how about(?: the)? next|那下一班呢|下一班呢?|那呢|这个呢)[?.!？。]*$/i.test(input.trim());
  const stopQuery = regionalFollowUp ? undefined : extractedStopQuery;
  const stopId = stopQuery ? undefined : context.regionalStopId;

  if (!stopId && !stopQuery) {
    const language = detectResponseLanguage(input);
    return {
      matchedIntent: "help",
      confidence: 76,
      context: { ...context, regionalAgencyId: agencyId, regionalRouteName: routeName, lastIntent: "help" },
      text: language === "zh"
        ? "可以。请告诉我区域公交的站点，例如：MiWay 26 at Square One，或 GO train from Oakville GO。"
        : language === "fr"
          ? "Oui. Indiquez l'arrêt, par exemple : MiWay 26 at Square One, ou GO train from Oakville GO."
          : "Yes. Tell me the regional stop, for example: MiWay 26 at Square One, or GO train from Oakville GO.",
    };
  }

  try {
    const prediction = await getRegionalPrediction({
      agencyId,
      stopId,
      stopQuery,
      routeName,
      headsign: context.regionalDirection,
    });

    return {
      matchedIntent: "eta",
      confidence: prediction.confidence,
      context: {
        ...context,
        regionalAgencyId: prediction.agencyId,
        regionalStopId: prediction.stopId,
        regionalRouteName: prediction.routeName,
        regionalDirection: prediction.direction,
        currentTopic: prediction.stopName,
        lastIntent: "eta",
      },
      text: formatRegionalPredictionAnswer(prediction, input),
    };
  } catch {
    const language = detectResponseLanguage(input);
    return {
      matchedIntent: "help",
      confidence: 68,
      context: { ...context, regionalAgencyId: agencyId, regionalRouteName: routeName, lastIntent: "help" },
      text: language === "zh"
        ? "我没能找到这个区域公交站点或路线。你可以把机构、路线和站点一起发给我，例如：MiWay 26 at Square One。"
        : language === "fr"
          ? "Je n'ai pas trouvé cet arrêt ou cette ligne régionale. Essayez avec l'agence, la ligne et l'arrêt, par exemple : MiWay 26 at Square One."
          : "I could not find that regional stop or route. Try including the agency, route, and stop, for example: MiWay 26 at Square One.",
    };
  }
}

function isRouteNumberOnlyDestination(query: string | undefined): number | undefined {
  const routeId = query?.trim().match(/^([1-9]\d{1,2})$/)?.[1];
  return routeId ? Number(routeId) : undefined;
}

async function routeHasStops(routeId: number): Promise<boolean> {
  const stops = await searchStops(String(routeId));
  return stops.some(stop => stopServesRoute(stop, routeId));
}

function isRouteNumberOnlyInput(input: string): boolean {
  return /^([1-9]\d{1,2})$/.test(input.trim());
}

function getStopRoutes(stop: StopResult): number[] {
  return stop.routes.split(",").map(route => Number(route.trim())).filter(Number.isFinite);
}

function stopServesRoute(stop: StopResult, routeId: number): boolean {
  return getStopRoutes(stop).includes(routeId);
}

function normalizeStopText(input: string): string {
  return input.toLowerCase().replace(/\bbus stop:\s*/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function findRouteStopByQuery(routeId: number, stopQuery: string): Promise<StopResult | undefined> {
  const normalizedQuery = normalizeStopText(stopQuery);
  if (!normalizedQuery) return undefined;

  const routeStops = await searchStops(String(routeId));
  return routeStops.find(stop => stopServesRoute(stop, routeId) && normalizeStopText(stop.name).includes(normalizedQuery));
}

function extractStopQuery(input: string): string | undefined {
  const cleaned = input.trim().replace(/[?.!]+$/, "");
  const patterns = [
    /(?:^|[^\d])(?:[1-9]\d{1,2})\s*(?:在|到|去)\s*([^，。！？?]+?)(?:什么时候到|多久到|几分钟|到站|下一班|$)/i,
    /(?:什么时候|多久|几分钟|下一班|到站).*(?:在|到)\s*([^，。！？?]+)$/i,
    /\b(?:at|from|near|by)\s+(.+)$/i,
    /\b(?:stop|station)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/\b(?:for|on|route|bus|streetcar|ttc|coming|arriving|arrive|arrival|eta|when|what|about|the|a|an|next|live|real\s*time)\b/gi, " ")
        .replace(/(?:什么时候到|多久到|几分钟|下一班|实时|到站|公交|电车|车站|路线|预计)/g, " ")
        .replace(/\b[1-9]\d{1,2}\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (findRouteInText(cleaned) && isEtaQuestion(cleaned)) {
    const fallback = cleaned
      .replace(/(?:^|[^\d])([1-9]\d{1,2})(?=$|[^\d])/g, " ")
      .replace(/\b(?:for|on|route|bus|streetcar|ttc|coming|arriving|arrive|arrival|eta|when|what|about|the|a|an|next|live|real\s*time|now|current)\b/gi, " ")
      .replace(/(?:现在|目前|当前|什么时候到|多久到|几分钟|下一班|实时|到站|公交|电车|车站|路线|预计|还有多久|要多久)/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (fallback.length >= 3 && /[a-z0-9\u4e00-\u9fff]/i.test(fallback)) return fallback;
  }

  return undefined;
}

function maybeLooksLikeStopName(input: string): boolean {
  const cleaned = input.trim();
  if (cleaned.length < 3 || cleaned.length > 80) return false;
  if (findRouteInText(cleaned)) return false;

  return /\b(?:at|and|&|station|st|street|ave|avenue|road|rd|college|bay|yonge|bathurst|queen|king|dundas|spadina|bloor|union)\b/i.test(cleaned);
}

async function answerStopContextQuestion(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  if (!maybeLooksLikeStopName(input)) return null;

  const stops = await searchStops(input);
  const stop = stops[0];
  if (!stop) return null;

  const meta = await getStopMeta(stop.id);
  const routeText = meta.routes.length > 0
    ? ` Routes here right now: ${meta.routes.slice(0, 6).join(", ")}.`
    : "";

  return {
    matchedIntent: "help",
    confidence: 82,
    context: {
      ...context,
      stopId: meta.id,
      routeId: meta.routes[0] ?? context.routeId,
      direction: meta.dirs[0] ?? context.direction,
      lastIntent: "help",
    },
    text: `I found ${meta.name}.${routeText} Ask "when is ${meta.routes[0] ?? "the bus"}?" for the next arrival at this stop.`,
  };
}

function isDestinationFollowUp(input: string): boolean {
  return /\b(?:how\s+about|what\s+about|that\s+trip|the\s+trip|same\s+destination|there|destination|arrival|arrive|walk|ride|stops|directions?|navigate|miss|missed|leave|leaving|depart|departure|when\s+should\s+i|how\s+long|next\s+(?:one|bus|vehicle|streetcar)|another\s+(?:one|bus|vehicle|streetcar)|more\s+options?|other\s+options?|any\s+other|alternatives?|alternate\s+(?:routes?|ways?)|other\s+ways?|different\s+routes?|what\s+else|something\s+else|choices?)\b/i.test(input) ||
    /(?:这趟|同一个目的地|那里|目的地|到达|步行|坐几站|导航|路线|赶不上|错过|出发|离开|几点|多久|下一班|下一趟|另一个|其他选择|别的选择|更多选择|不同路线|换一条|还有吗|还有别的吗|备选)/i.test(input) ||
    isTimeFollowUp(input);
}

function hasDestinationContext(context: TransitAssistantContext): boolean {
  return Boolean(context.destinationId);
}

function hasRouteContext(context: TransitAssistantContext): boolean {
  return Boolean(context.stopId || context.routeId || context.direction);
}

function hasAssistantContext(context: TransitAssistantContext): boolean {
  return hasDestinationContext(context) || hasRouteContext(context) || Boolean(context.lastIntent);
}

function isGenericFollowUp(input: string): boolean {
  return /\b(?:what\s+about|how\s+about|and\s+(?:now|then|later|there|that|this)|also|then|later|now|today|tomorrow|tonight|this evening|same|again|that|this|it|there|those|them|why|how\s+(?:long|late|far|bad|busy)|when|where|which|should\s+i|can\s+i|do\s+i|is\s+(?:it|that|there)|are\s+(?:there|they)|does\s+(?:it|that)|more\s+options?|other\s+options?|any\s+other|alternatives?|what\s+else|something\s+else|miss|missed|next\s+(?:one|bus|vehicle|streetcar))\b/i.test(input) ||
    /(?:那|这个|那个|同样|再来|现在|今天|明天|今晚|晚上|稍后|等下|为什么|多久|多远|几点|哪里|哪个|还有|其他|别的|更多选择|换一个|下一班|下一趟|错过|赶不上)/i.test(input);
}

function isUpcomingQuestion(input: string): boolean {
  return /\b(?:upcoming|coming|next|soon|future|this\s+week|weekend|later\s+this\s+month|next\s+month|à\s+venir|prochain(?:e|s|es)?|bientôt|ce\s+week-end|cette\s+semaine)\b/i.test(input) ||
    /(?:接下来|近期|即将|未来|这个周末|这周|下周|下个月|最近)/.test(input);
}

function formatAssistantDate(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getFutureDate(daysFromNow: number, hour = 12): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function parseHolidayDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isGuideFollowUp(input: string, context: TransitAssistantContext): boolean {
  return context.lastIntent === "guide" && (
    isGenericFollowUp(input) ||
    /\b(?:more|another|different|nearby|closer|cheaper|free|indoor|outdoor|rainy|kids|family|date|food|restaurant|shopping|museum|park|night|morning|afternoon|evening|half\s+day|one\s+day|shorter|longer|swap|replace|only|also|coffee|lunch|dinner|attraction|tourist)\b/i.test(input) ||
    /\b(?:plus|moins|autre|près|gratuit|intérieur|extérieur|pluie|famille|enfants|restaurant|musée|parc|soir|matin|après-midi|journée|café)\b/i.test(input) ||
    /(?:更多|换一个|附近|近一点|便宜|免费|室内|室外|下雨|亲子|情侣|吃|餐厅|购物|博物馆|公园|晚上|上午|下午|半日|一天|替换|只要|咖啡|午餐|晚餐|景点|游客)/i.test(input)
  );
}

function isLocationQuestion(input: string): boolean {
  return /\b(?:where\s+am\s+i|where\s+are\s+we|my\s+location|current\s+location|where\s+is\s+my\s+location|am\s+i\s+near)\b/i.test(input);
}

function isCurrentTimeQuestion(input: string): boolean {
  return /\b(?:what(?:'s|\s+is)?\s+the\s+time|what\s+time\s+is\s+it|current\s+time|time\s+now)\b/i.test(input);
}

function isNextVehicleFollowUp(input: string): boolean {
  return /\b(?:miss|missed|next\s+(?:one|bus|vehicle|streetcar)|another\s+(?:one|bus|vehicle|streetcar))\b/i.test(input) ||
    /(?:错过|赶不上|下一班|下一趟|另一班|另一趟)/i.test(input);
}

function isOptionsFollowUp(input: string): boolean {
  return /\b(?:more\s+options?|other\s+options?|any\s+other|alternatives?|alternate\s+(?:routes?|ways?)|other\s+ways?|different\s+routes?|what\s+else|something\s+else|choices?)\b/i.test(input) ||
    /(?:其他选择|别的选择|更多选择|不同路线|换一条|还有吗|还有别的吗|备选|其他路线|别的路线)/i.test(input);
}

function isWeatherQuestion(input: string): boolean {
  return /\b(?:weather|rain|raining|snow|snowing|storm|wind|windy|ice|icy|temperature|temp|hot|cold|humid|humidity|météo|pluie|pleut|neige|orage|vent|température|chaud|froid|humide)\b/i.test(input) ||
    /(?:天气|下雨|雨|下雪|雪|暴风|风|温度|气温|热|冷|湿度|潮湿)/.test(input);
}

function isTrafficQuestion(input: string): boolean {
  return /\b(?:traffic|road|roads|congestion|jam|busy roads|rush hour|accident|crash|collision|incident|roadwork|roadworks|construction|closure|closed road|detour|blocked|bottleneck|slowdown)\b/i.test(input) ||
    /(?:交通|路况|拥堵|堵车|塞车|事故|车祸|施工|封路|道路关闭|绕行|改道|堵塞)/.test(input);
}

function isEventQuestion(input: string): boolean {
  return /\b(?:event|events|game|games|match|concert|show|festival|arena|stadium|rogers\s+centre|scotiabank\s+arena|bmo\s+field|budweiser\s+stage|entertainment|venue|crowds?|événement|événements|matchs?|concerts?|spectacle|festival|stade|salle|foule)\b/i.test(input) ||
    /(?:活动|赛事|比赛|演唱会|音乐会|表演|节日|场馆|人流|人群)/.test(input);
}

function extractEventQuery(input: string): string | undefined {
  const cleaned = input
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/\b(?:around|near|nearby|close\s+to|by)\s+(?:me|my\s+location|current\s+location|here)\b/gi, " ")
    .replace(/\b(?:upcoming|coming|next|soon|future|this\s+week|weekend|event|events|game|games|concert|concerts|show|shows|festival|festivals|tell\s+me|about|any|are\s+there|is\s+there|what|when|where|in\s+toronto|nearby)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3) return undefined;
  if (/^(?:sports?|entertainment|large|major|toronto|venue|venues)$/i.test(cleaned)) return undefined;
  return cleaned;
}

function eventMatchesQuery(event: CityEvent, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length >= 3);
  if (terms.length === 0) return true;
  const haystack = `${event.title} ${event.venueName} ${event.description} ${event.kind}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
}

type AssistantLocationFocus = {
  label: string;
  pos?: [number, number];
  source: "current" | "place" | "context";
};

function referencesCurrentLocation(input: string): boolean {
  return /\b(?:around|near|nearby|close\s+to|by)\s+(?:me|my\s+location|current\s+location|here)\b/i.test(input) ||
    /\b(?:around\s+me|near\s+me|nearby\s+me|where\s+i\s+am|from\s+here)\b/i.test(input);
}

function extractLocationFocusQuery(input: string): string | undefined {
  const cleaned = input.trim().replace(/[?.!]+$/, "");
  const patterns = [
    /\b(?:around|near|nearby|close\s+to|by)\s+(.+)$/i,
    /\b(?:restaurants?|food|events?|things?\s+to\s+do|places?)\s+(?:around|near|nearby|close\s+to|by)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw || /^(?:me|my\s+location|current\s+location|here)$/i.test(raw)) continue;
    const query = raw
      .replace(/\b(?:today|tomorrow|tonight|this\s+weekend|this\s+week|right\s+now|now)\b/gi, " ")
      .replace(/\b(?:in\s+toronto|toronto)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (query.length >= 3) return query;
  }

  return undefined;
}

async function resolveAssistantLocationFocus(
  input: string,
  context: TransitAssistantContext,
): Promise<AssistantLocationFocus | undefined> {
  if (context.aroundScope?.kind === "current" && context.originPos) {
    return {
      label: context.originLabel ?? "your current location",
      pos: context.originPos,
      source: "current",
    };
  }

  if (context.aroundScope?.kind === "place" && context.aroundScope.place) {
    const destination = (await searchDestinations(context.aroundScope.place).catch(() => []))[0];
    if (destination?.pos) {
      return {
        label: destination.name.replace(/^destination:\s*/i, ""),
        pos: destination.pos,
        source: "place",
      };
    }

    return {
      label: context.aroundScope.place,
      source: "place",
    };
  }

  if (referencesCurrentLocation(input) && context.originPos) {
    return {
      label: context.originLabel ?? "your current location",
      pos: context.originPos,
      source: "current",
    };
  }

  const placeQuery = extractLocationFocusQuery(input);
  if (placeQuery) {
    const destination = (await searchDestinations(placeQuery).catch(() => []))[0];
    if (destination?.pos) {
      return {
        label: destination.name.replace(/^destination:\s*/i, ""),
        pos: destination.pos,
        source: "place",
      };
    }

    return {
      label: placeQuery,
      source: "place",
    };
  }

  if (/\b(?:nearby|around|near)\b/i.test(input) && context.originPos) {
    return {
      label: context.originLabel ?? "your current location",
      pos: context.originPos,
      source: "context",
    };
  }

  return undefined;
}

function formatLocationFocusLine(
  focus: AssistantLocationFocus | undefined,
  language: ResponseLanguage,
): string {
  if (!focus) return "";
  if (language === "zh") return `Location focus: ${focus.label}`;
  if (language === "fr") return `Lieu utilise : ${focus.label}`;
  return `Location focus: ${focus.label}`;
}

function intentSupportsAroundScope(intent: TransitAssistantIntent | undefined): boolean {
  return intent === "weather" ||
    intent === "traffic" ||
    intent === "events" ||
    intent === "crowding" ||
    intent === "recommendation" ||
    intent === "guide";
}

function withClassifiedAroundScope(
  context: TransitAssistantContext,
  classifiedIntent: TransitAssistantIntentResult | undefined,
): TransitAssistantContext {
  if (!classifiedIntent) {
    return context;
  }

  if (!intentSupportsAroundScope(classifiedIntent.intent) || classifiedIntent.scope?.kind === "none") {
    return { ...context, aroundScope: undefined };
  }

  if (!classifiedIntent.scope) {
    return context;
  }

  return {
    ...context,
    aroundScope: classifiedIntent.scope,
  };
}

function isHolidayQuestion(input: string): boolean {
  return /\b(?:holiday|holidays|public holiday|stat holiday|statutory holiday|long weekend|canada day|christmas|boxing day|new year|thanksgiving|family day|victoria day|labou?r day|jour\s+férié|jours\s+fériés|congé|long\s+week-end|noël|action\s+de\s+grâce)\b/i.test(input) ||
    /(?:假日|节假日|公共假期|法定假日|长周末|加拿大日|圣诞|新年|感恩节|家庭日|维多利亚日|劳动节)/.test(input);
}

function isGuideQuestion(input: string): boolean {
  return isShoppingQuestion(input) ||
    /\b(?:guide|itinerary|recommend|recommendation|suggest|where\s+should\s+i\s+go|what\s+should\s+i\s+do|things?\s+to\s+do|places?\s+to\s+(?:go|visit|eat|see)|tourist|tourism|sightseeing|attractions?|restaurants?|food|eat|lunch|dinner|cafe|coffee|date|family|kids|rainy|rain\s+day|budget|cheap|free|half\s+day|one\s+day|day\s+trip|plan\s+my\s+day|plan\s+(?:a\s+)?day|plan\s+(?:a\s+)?(?:trip|travel|visit|tour)|plan\s+to\s+(?:travel|visit|tour)|travel\s+(?:in|around|through)\s+toronto|tour\s+(?:in|around)\s+toronto|travel\s+plan|trip\s+ideas?|where\s+to\s+eat|where\s+to\s+visit|visit\s+toronto)\b/i.test(input) ||
    /\b(?:itinéraire|recommande|recommandation|suggère|où\s+aller|quoi\s+faire|à\s+visiter|restaurants?|manger|déjeuner|dîner|café|touriste|attractions?|musée|famille|enfants|pluie|budget|gratuit|demi-journée|journée|visiter\s+toronto)\b/i.test(input) ||
    /(?:攻略|行程|推荐|去哪|哪里玩|玩什么|吃什么|餐厅|景点|一日游|半日|亲子|情侣|下雨|预算|便宜|免费|附近|旅游|旅行|安排|计划|玩一天|半天|咖啡|午餐|晚餐|博物馆|室内|室外|多伦多怎么玩)/i.test(input);
}

function isGreeting(input: string): boolean {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[!?.。,，]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized || normalized.length > 80) return false;

  return /^(?:hi|hello|hey|heya|hiya|yo|howdy|greetings|good day|good morning|good afternoon|good evening|good night|morning|afternoon|evening|happy holidays|what's up|whats up|sup|bonjour|hola|ciao|namaste|salaam|shalom|ni hao|你好|嗨|哈喽|早上好|下午好|晚上好)(?:\s+(?:there|again|friend|buddy|everyone|everybody|all|bot|assistant))*$/.test(normalized);
}

function answerGreeting(input: string, context: TransitAssistantContext): TransitAssistantAnswer {
  const normalized = input.trim().toLowerCase();
  const language = detectResponseLanguage(input);
  let greeting = language === "zh" ? "你好" : language === "fr" ? "Bonjour" : "Hello";

  if (/\b(?:good morning|morning)\b|早上好/.test(normalized)) {
    greeting = language === "zh" ? "早上好" : language === "fr" ? "Bonjour" : "Good morning";
  } else if (/\b(?:good afternoon|afternoon)\b|下午好/.test(normalized)) {
    greeting = language === "zh" ? "下午好" : language === "fr" ? "Bon après-midi" : "Good afternoon";
  } else if (/\b(?:good evening|evening)\b|晚上好/.test(normalized)) {
    greeting = language === "zh" ? "晚上好" : language === "fr" ? "Bonsoir" : "Good evening";
  } else if (/\b(?:good night)\b/.test(normalized)) {
    greeting = language === "zh" ? "晚安" : language === "fr" ? "Bonne nuit" : "Good night";
  }

  const helpText = language === "zh"
    ? "我可以帮你查询 TTC 到站时间、附近站点、延误、交通、天气、活动、节假日，以及 Toronto/GTA 的跨区域公交路线和按出发时间规划行程。"
    : language === "fr"
      ? "Je peux vous aider avec les arrivées TTC, les arrêts proches, les retards, la circulation, la météo, les événements, les jours fériés et les trajets en transport dans Toronto et la région du Grand Toronto selon l'heure de départ."
      : "I can help with TTC arrivals, nearby stops, delays, traffic, weather, events, holidays, and Toronto/GTA transit trip planning with departure-time choices.";

  return {
    matchedIntent: "help",
    confidence: 95,
    context: { ...context, lastIntent: "help" },
    text: `${greeting}! ${helpText}`,
  };
}

function isDelayQuestion(input: string): boolean {
  return /\b(?:delay|late|slow|behind|accident|construction|why)\b/i.test(input);
}

function isEtaQuestion(input: string): boolean {
  return /\b(?:bus|streetcar|vehicle|ttc|route|stop|station|eta|arriv|arrival|coming|due|when|how\s+long|next\s+(?:one|bus|vehicle|streetcar)|miss|missed|real\s*time|live|prediction|estimate|\b\d{3}\b)\b/i.test(input) ||
    /(?:多久|几分钟|什么时候到|下一班|实时|到站|公交|电车|车站|路线|预计)/.test(input);
}

function isCrowdingQuestion(input: string): boolean {
  return /\b(?:crowd|busy|full|passenger|load|packed|space|seats?)\b/i.test(input);
}

function isRouteTerminalQuestion(input: string): boolean {
  return /\b(?:terminal|terminus|end\s*(?:point)?|last\s+stop|final\s+stop|short\s*turn|shortturn|turn\s+back|which\s+(?:vehicle|streetcar|car|one).*(?:terminal|short)|goes?\s+to\s+(?:the\s+)?terminal|where\s+does\s+(?:it|this|that|the\s+(?:bus|streetcar|route))\s+(?:end|go)|where\s+is\s+(?:it|this|that)\s+going|destination\s+of\s+(?:the\s+)?(?:route\s+)?\d{3})\b/i.test(input);
}

function isTimeFollowUp(input: string): boolean {
  return /\b(?:what\s+about|how\s+about|tomorrow|tonight|this evening|later|then|(?:in\s+)?(?:another\s+)?(?:\d+|one|two|three|four|five|six)\s+(?:more\s+)?(?:minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?|(?:at|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i.test(input) ||
    /(?:明天|今晚|晚上|早上|上午|中午|下午|稍后|等下|之后|以后|出发时间|几点出发|(?:\d+|一|二|两|三|四|五|六)\s*(?:分钟|小时)(?:后|之后|以后)|\d{1,2}(?:点|:)\d{0,2}(?:分)?)/i.test(input);
}

function isChainedTimeFollowUp(input: string): boolean {
  return /\b(?:another|more|after\s+that|afterward|afterwards|from\s+then|from\s+that|later\s+than\s+that|again)\b/i.test(input) ||
    /(?:再|再晚|之后|以后|下一趟|下一班|晚一点)/i.test(input);
}

function getLastTargetTime(context: TransitAssistantContext): Date | undefined {
  if (!context.lastTargetTimeIso) return undefined;

  const target = new Date(context.lastTargetTimeIso);
  return Number.isNaN(target.getTime()) ? undefined : target;
}

function getTimeBase(input: string, context: TransitAssistantContext): Date {
  return isChainedTimeFollowUp(input) ? getLastTargetTime(context) ?? new Date() : new Date();
}

function parseAssistantTargetTime(input: string, baseTime = new Date()): Date | undefined {
  const text = input.toLowerCase();
  const relative = text.match(/\b(?:in\s+)?(?:another\s+)?(\d+|one|two|three|four|five|six)\s+(?:more\s+)?(minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/);
  const wordNumbers: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };

  if (relative) {
    const amount = wordNumbers[relative[1]] ?? Number(relative[1]);
    const milliseconds = relative[2].startsWith("hour")
      ? amount * 60 * 60 * 1000
      : amount * 60 * 1000;
    return new Date(baseTime.getTime() + milliseconds);
  }

  const zhNumbers: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };
  const zhRelative = input.match(/(\d+|一|二|两|三|四|五|六)\s*(分钟|小时)(?:后|之后|以后)/);
  if (zhRelative) {
    const amount = zhNumbers[zhRelative[1]] ?? Number(zhRelative[1]);
    const milliseconds = zhRelative[2] === "小时"
      ? amount * 60 * 60 * 1000
      : amount * 60 * 1000;
    return new Date(baseTime.getTime() + milliseconds);
  }

  const explicitTime = text.match(/\b(?:at|around|by|before|after)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (explicitTime) {
    let hour = Number(explicitTime[1]);
    const minute = Number(explicitTime[2] ?? 0);
    const suffix = explicitTime[3];

    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (!suffix && hour >= 1 && hour <= 7) hour += 12;

    const target = new Date(baseTime);
    if (/\btomorrow\b/.test(text)) target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);
    if (!/\btomorrow\b/.test(text) && target.getTime() <= baseTime.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  const zhExplicitTime = input.match(/(?:(明天|今天|今晚)?\s*)?(?:(早上|上午|中午|下午|晚上|今晚)\s*)?(\d{1,2})(?:点|:)(?:(\d{1,2})分?)?(?:左右|前|后)?/);
  if (zhExplicitTime) {
    const dayWord = zhExplicitTime[1] ?? "";
    const period = zhExplicitTime[2] ?? "";
    let hour = Number(zhExplicitTime[3]);
    const minute = Number(zhExplicitTime[4] ?? 0);

    if ((period === "下午" || period === "晚上" || period === "今晚") && hour < 12) hour += 12;
    if (period === "中午" && hour < 11) hour += 12;
    if ((period === "早上" || period === "上午") && hour === 12) hour = 0;
    if (!period && hour >= 1 && hour <= 7) hour += 12;

    const target = new Date(baseTime);
    if (dayWord === "明天") target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);
    if (dayWord !== "明天" && target.getTime() <= baseTime.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  if (/\btomorrow\b/.test(text) || /明天/.test(input)) {
    const target = new Date(baseTime);
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    return target;
  }

  if (/\btonight\b|\bthis evening\b/.test(text) || /今晚|晚上/.test(input)) {
    const target = new Date(baseTime);
    target.setHours(20, 0, 0, 0);
    if (target.getTime() <= baseTime.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  return undefined;
}

function getObservedHolidayDate(year: number, monthIndex: number, matcher: (date: Date) => boolean): Date {
  const date = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  while (!matcher(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function parseNamedHolidayTargetDate(input: string, baseTime = new Date()): Date | undefined {
  const text = input.toLowerCase();
  const year = baseTime.getFullYear();
  const fixedDate = (monthIndex: number, day: number) => new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (/\bcanada day\b/.test(text)) return fixedDate(6, 1);
  if (/\bchristmas\b/.test(text)) return fixedDate(11, 25);
  if (/\bboxing day\b/.test(text)) return fixedDate(11, 26);
  if (/\bnew year'?s?(?: day)?\b/.test(text)) return fixedDate(0, 1);
  if (/\bfamily day\b/.test(text)) {
    let mondayCount = 0;
    return getObservedHolidayDate(year, 1, date => {
      if (date.getDay() !== 1) return false;
      mondayCount += 1;
      return mondayCount === 3;
    });
  }
  if (/\bvictoria day\b/.test(text)) {
    const date = new Date(year, 4, 24, 12, 0, 0, 0);
    while (date.getDay() !== 1) date.setDate(date.getDate() - 1);
    return date;
  }
  if (/\blabou?r day\b/.test(text)) {
    return getObservedHolidayDate(year, 8, date => date.getDay() === 1);
  }
  if (/\bthanksgiving\b/.test(text)) {
    let mondayCount = 0;
    return getObservedHolidayDate(year, 9, date => {
      if (date.getDay() !== 1) return false;
      mondayCount += 1;
      return mondayCount === 2;
    });
  }

  return undefined;
}

function parseRelativeTargetOffsetMinutes(input: string): number | undefined {
  const text = input.toLowerCase();
  const relative = text.match(/\b(?:in\s+)?(?:another\s+)?(\d+|one|two|three|four|five|six)\s+(?:more\s+)?(minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/);
  const wordNumbers: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };

  if (!relative) {
    const zhNumbers: Record<string, number> = {
      一: 1,
      二: 2,
      两: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
    };
    const zhRelative = input.match(/(\d+|一|二|两|三|四|五|六)\s*(分钟|小时)(?:后|之后|以后)/);
    if (!zhRelative) return undefined;
    const amount = zhNumbers[zhRelative[1]] ?? Number(zhRelative[1]);
    return zhRelative[2] === "小时" ? amount * 60 : amount;
  }

  const amount = wordNumbers[relative[1]] ?? Number(relative[1]);
  return relative[2].startsWith("hour") ? amount * 60 : amount;
}

function getNavigationDepartureTarget(input: string, context: TransitAssistantContext): Date | undefined {
  return parseAssistantTargetTime(input, getTimeBase(input, context));
}

function formatAssistantDepartureTarget(target: Date, language: ResponseLanguage): string {
  const weekday = target.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
  });
  const time = formatTransitTime(target);

  if (language === "zh") return `${weekday} ${time} 出发`;
  if (language === "fr") return `départ ${weekday} ${time}`;
  return `leaving ${weekday} ${time}`;
}

function parseTransitClockMinutes(time: string): number | undefined {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;

  return hours * 60 + minutes;
}

function formatTransitClockMinutes(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${hours}:${String(mins).padStart(2, "0")}`;
}

function parseDurationMinutes(duration: string): number | undefined {
  const match = duration.match(/\b(\d+)\s*(?:min|minute|minutes)\b/i);
  if (!match) return undefined;

  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : undefined;
}

function calculateDestinationTiming(
  input: string,
  route: NavigationRoute,
  context: TransitAssistantContext,
  plannedDepartureTarget?: Date,
): { etaMin: number; arrivalTime: string; timingNote?: string; targetTime?: Date } {
  if (isNextVehicleFollowUp(input)) {
    const nextVehicleGap = route.alsoAt
      .map(parseDurationMinutes)
      .find((minutes): minutes is number => minutes !== undefined) ?? 30;
    const currentEta = context.navigationEtaMin ?? route.etaMin;
    const currentArrival = parseTransitClockMinutes(context.navigationArrivalTime ?? route.arrivalTime);

    return {
      etaMin: currentEta + nextVehicleGap,
      arrivalTime: currentArrival !== undefined
        ? formatTransitClockMinutes(currentArrival + nextVehicleGap)
        : route.arrivalTime,
      timingNote: `If you miss that vehicle, the next one is about ${nextVehicleGap} min later,`,
    };
  }

  if (plannedDepartureTarget) {
    return {
      etaMin: route.etaMin,
      arrivalTime: route.arrivalTime,
      timingNote: `Using ${formatAssistantDepartureTarget(plannedDepartureTarget, "en")},`,
      targetTime: plannedDepartureTarget,
    };
  }

  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  if (!targetTime) {
    return { etaMin: route.etaMin, arrivalTime: route.arrivalTime };
  }

  const relativeOffset = parseRelativeTargetOffsetMinutes(input);
  const scheduledArrival = parseTransitClockMinutes(route.arrivalTime);

  if (relativeOffset !== undefined && scheduledArrival !== undefined) {
    return {
      etaMin: route.etaMin + relativeOffset,
      arrivalTime: formatTransitClockMinutes(scheduledArrival + relativeOffset),
      timingNote: `Leaving ${relativeOffset} min later,`,
      targetTime,
    };
  }

  const scheduledDeparture = parseTransitClockMinutes(route.departureTime);
  if (scheduledDeparture !== undefined && scheduledArrival !== undefined) {
    const tripDuration = scheduledArrival >= scheduledDeparture
      ? scheduledArrival - scheduledDeparture
      : scheduledArrival + 1440 - scheduledDeparture;
    const targetMinutes = targetTime.getHours() * 60 + targetTime.getMinutes();

    return {
      etaMin: Math.max(0, Math.round((targetTime.getTime() - Date.now()) / 60000)),
      arrivalTime: formatTransitClockMinutes(targetMinutes + tripDuration),
      timingNote: `Leaving around ${formatTransitTime(targetTime)},`,
      targetTime,
    };
  }

  return {
    etaMin: Math.max(0, Math.round((targetTime.getTime() - Date.now()) / 60000)),
    arrivalTime: formatTransitTime(targetTime),
    timingNote: `Around ${formatTransitTime(targetTime)},`,
    targetTime,
  };
}

function buildDestinationOptionsAnswer(
  route: NavigationRoute,
  context: TransitAssistantContext,
  input: string,
): { text: string; etaMin: number; arrivalTime: string } {
  const language = detectResponseLanguage(input);
  if (route.available === false) {
    return {
      etaMin: 0,
      arrivalTime: "",
      text: buildNavigationTripText(route, {
        etaMin: 0,
        arrivalTime: "",
      }, language).join(language === "en" ? " " : "\n"),
    };
  }

  const baseEta = context.navigationEtaMin ?? route.etaMin;
  const baseArrival = parseTransitClockMinutes(context.navigationArrivalTime ?? route.arrivalTime);
  const routeChoices = [route, ...(route.alternatives ?? [])]
    .filter(candidate => candidate.available !== false)
    .slice(0, 4);
  const options = routeChoices.length > 1
    ? routeChoices.map((candidate, index) => {
      const label = language === "zh" ? `方案 ${index + 1}` : language === "fr" ? `option ${index + 1}` : `option ${index + 1}`;
      return `${label}: ${summarizeNavigationRoute(candidate, language)}`;
    })
    : [0, ...route.alsoAt.map(parseDurationMinutes)]
      .filter((minutes): minutes is number => minutes !== undefined)
      .filter((minutes, index, all) => all.indexOf(minutes) === index)
      .slice(0, 4)
      .map((gap) => {
        const eta = baseEta + gap;
        const arrival = baseArrival !== undefined
          ? formatTransitClockMinutes(baseArrival + gap)
          : route.arrivalTime;

        if (language === "zh") return `约 ${eta} 分钟，到达 ${arrival}`;
        if (language === "fr") return `environ ${eta} min, arrivée ${arrival}`;
        return `about ${eta} min, arriving ${arrival}`;
      });

  const stopName = route.busStop.replace(/[.]+$/, "");
  const transport = localizedTransitVehicle(language);
  const majorLegs = route.legs
    ?.filter(leg => leg.mode !== "WALK")
    .slice(0, 4)
    .map(leg => [formatLegMode(leg.mode, language), leg.routeLabel, leg.headsign ? (language === "zh" ? `往 ${leg.headsign}` : language === "fr" ? `vers ${leg.headsign}` : `toward ${leg.headsign}`) : ""].filter(Boolean).join(" "))
    .join(language === "zh" ? " → " : " -> ");
  const routeSummary = majorLegs || `${transport} ${route.routeLabel}`;

  return {
    etaMin: baseEta,
    arrivalTime: baseArrival !== undefined ? formatTransitClockMinutes(baseArrival) : route.arrivalTime,
    text: language === "zh"
      ? [
        `可以。去 ${route.destName}，主要路线是 ${routeSummary}。`,
        `接下来的选择：${options.join("；")}。`,
        `都需要先步行 ${route.walkMin} 分钟到站，然后乘坐 ${route.totalStops} 站。`,
      ].join("\n")
      : language === "fr"
        ? [
          `Oui. Pour aller à ${route.destName}, l'option principale est ${routeSummary} depuis ${stopName}.`,
          `Options à venir : ${options.join("; ")}.`,
          `Chaque option demande ${route.walkMin} min de marche jusqu'à l'arrêt, puis ${route.totalStops} arrêts en transport.`,
        ].join("\n")
        : [
          `Yes. For ${route.destName}, the main option is ${routeSummary} from ${stopName}.`,
          `Upcoming options are ${options.join("; ")}.`,
          `They all ride ${route.totalStops} stops after the ${route.walkMin} min walk to the stop.`,
        ].join(" "),
  };
}

async function resolveNavigationOrigin(
  input: string,
  context: TransitAssistantContext,
): Promise<{ label: string; pos?: [number, number] | null }> {
  const originQuery = extractOriginQuery(input);
  if (!originQuery) {
    return {
      label: context.originLabel ?? "current-location",
      pos: context.originPos,
    };
  }

  const originMatch = (await searchDestinations(originQuery).catch(() => []))[0];
  return {
    label: originMatch?.name ?? originQuery,
    pos: originMatch?.pos ?? context.originPos,
  };
}

function estimateWeatherTransitDelay(weather: CurrentWeather): number {
  const condition = weather.condition.toLowerCase();
  let delay = 0;

  if (/thunder|storm|sleet|freezing|ice|blizzard/.test(condition)) delay += 3;
  else if (/snow|heavy rain|downpour/.test(condition)) delay += 2;
  else if (/rain|drizzle|shower|fog|mist/.test(condition)) delay += 1;

  if ((weather.precipitationMm ?? 0) >= 2) delay += 2;
  else if ((weather.precipitationMm ?? 0) > 0) delay += 1;

  if (weather.windKph >= 45) delay += 2;
  else if (weather.windKph >= 30) delay += 1;

  return Math.min(delay, 6);
}

function formatWeatherTime(observedAt: string): string {
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return "now";

  return observed.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).replace(/\ba\.m\./i, "AM").replace(/\bp\.m\./i, "PM");
}

function formatTransitTime(date: Date): string {
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).replace(/\ba\.m\./i, "AM").replace(/\bp\.m\./i, "PM");
}

function answerCurrentTimeQuestion(input: string, context: TransitAssistantContext): TransitAssistantAnswer {
  const language = detectResponseLanguage(input);
  const time = formatTransitTime(new Date());
  const text = language === "zh"
    ? `现在多伦多时间是 ${time}。`
    : language === "fr"
      ? `Il est ${time} à Toronto.`
      : `It is ${time} in Toronto.`;

  return {
    matchedIntent: "help",
    confidence: 95,
    context: { ...context, lastIntent: "help" },
    text,
  };
}

function describeCurrentWeather(weather: CurrentWeather): string {
  const delay = estimateWeatherTransitDelay(weather);
  const precipitation = weather.precipitationMm && weather.precipitationMm > 0;
  const impact = delay > 0
    ? `Some TTC trips may take about ${delay} min longer.`
    : "No extra TTC weather delay expected.";

  return [
    `Current weather in ${weather.locationName}:`,
    `Condition: ${weather.condition.toLowerCase()}, ${Math.round(weather.temperatureC)} C`,
    `Feels like: ${Math.round(weather.feelsLikeC)} C`,
    `Wind: ${Math.round(weather.windKph)} km/h`,
    `Humidity: ${weather.humidity}%`,
    precipitation ? `Precipitation: ${weather.precipitationMm} mm` : "",
    `Observed: ${formatWeatherTime(weather.observedAt)}`,
    `TTC impact: ${impact}`,
  ].filter(Boolean).join("\n");
}

function describeCurrentWeatherLocalized(weather: CurrentWeather, input: string): string {
  const language = detectResponseLanguage(input);
  if (language === "en") return describeCurrentWeather(weather);

  const delay = estimateWeatherTransitDelay(weather);
  const precipitation = weather.precipitationMm && weather.precipitationMm > 0
    ? weather.precipitationMm
    : undefined;

  if (language === "zh") {
    return [
      `现在 ${weather.locationName} 的天气：${weather.condition.toLowerCase()}，${Math.round(weather.temperatureC)} C，体感 ${Math.round(weather.feelsLikeC)} C。`,
      `风速：${Math.round(weather.windKph)} km/h；湿度：${weather.humidity}%。`,
      precipitation !== undefined ? `降水量：${precipitation} mm。` : "",
      delay > 0
        ? `TTC 影响：部分行程可能增加约 ${delay} 分钟。`
        : "TTC 影响：目前天气不应该造成明显延误。",
    ].filter(Boolean).join("\n");
  }

  return [
    `Météo actuelle à ${weather.locationName} : ${weather.condition.toLowerCase()}, ${Math.round(weather.temperatureC)} C, ressenti ${Math.round(weather.feelsLikeC)} C.`,
    `Vent : ${Math.round(weather.windKph)} km/h ; humidité : ${weather.humidity} %.`,
    precipitation !== undefined ? `Précipitations : ${precipitation} mm.` : "",
    delay > 0
      ? `Effet TTC : certains trajets peuvent prendre environ ${delay} min de plus.`
      : "Effet TTC : la météo ne devrait pas ajouter de retard important pour le moment.",
  ].filter(Boolean).join("\n");
}

function estimateForecastWeatherTransitDelay(hour: WeatherForecastHour): number {
  const condition = hour.condition.toLowerCase();
  let delay = 0;

  if (/thunder|storm|sleet|freezing|ice|blizzard/.test(condition)) delay += 3;
  else if (/snow|heavy rain|downpour/.test(condition)) delay += 2;
  else if (/rain|drizzle|shower|fog|mist/.test(condition)) delay += 1;

  if (hour.precipitationProbability >= 70) delay += 2;
  else if (hour.precipitationProbability >= 40) delay += 1;

  if (hour.windKph >= 45) delay += 2;
  else if (hour.windKph >= 30) delay += 1;

  return Math.min(delay, 6);
}

function describeForecastWeather(hour: WeatherForecastHour, targetTime: Date, locationName: string): string {
  const delay = estimateForecastWeatherTransitDelay(hour);
  const impact = delay > 0
    ? `Some TTC trips may take about ${delay} min longer.`
    : "No extra TTC weather delay expected.";

  return [
    `Forecast around ${formatTransitTime(targetTime)} in ${locationName}:`,
    `Condition: ${hour.condition.toLowerCase()}, ${Math.round(hour.temperatureC)} C`,
    `Rain/snow chance: ${hour.precipitationProbability}%`,
    `Wind: ${Math.round(hour.windKph)} km/h`,
    `TTC impact: ${impact}`,
  ].join("\n");
}

function describeForecastWeatherLocalized(
  hour: WeatherForecastHour,
  targetTime: Date,
  locationName: string,
  input: string,
): string {
  const language = detectResponseLanguage(input);
  if (language === "en") return describeForecastWeather(hour, targetTime, locationName);

  const delay = estimateForecastWeatherTransitDelay(hour);
  if (language === "zh") {
    return [
      `${formatTransitTime(targetTime)} 左右，${locationName} 的预报是 ${hour.condition.toLowerCase()}，${Math.round(hour.temperatureC)} C。`,
      `降雨/降雪概率：${hour.precipitationProbability}%；风速：${Math.round(hour.windKph)} km/h。`,
      delay > 0
        ? `TTC 影响：这种天气可能让部分行程增加约 ${delay} 分钟。`
        : "TTC 影响：这种天气不应该造成明显延误。",
    ].join("\n");
  }

  return [
    `Vers ${formatTransitTime(targetTime)} à ${locationName}, la prévision est ${hour.condition.toLowerCase()} avec ${Math.round(hour.temperatureC)} C.`,
    `Risque de pluie ou neige : ${hour.precipitationProbability} % ; vent : ${Math.round(hour.windKph)} km/h.`,
    delay > 0
      ? `Effet TTC : cette météo peut ajouter environ ${delay} min à certains trajets.`
      : "Effet TTC : cette météo ne devrait pas ajouter de retard important.",
  ].join("\n");
}

function describeTrafficLevel(delayMin: number): string {
  if (delayMin >= 4) return "heavy";
  if (delayMin >= 3) return "moderate";
  if (delayMin >= 1) return "light";
  return "light";
}

function describeTrafficQuestionLocalized(
  input: string,
  routeId: number,
  hasRoute: boolean,
  targetTime: Date | undefined,
  trafficDelayMin: number,
): string {
  const language = detectResponseLanguage(input);
  const when = targetTime ? formatTransitTime(targetTime) : undefined;
  const routeText = hasRoute ? `route ${routeId}` : "downtown Toronto";

  if (language === "zh") {
    const level = trafficDelayMin >= 4 ? "较重" : trafficDelayMin >= 3 ? "中等" : "较轻";
    return [
      `${when ? `${when} 左右，` : "现在"}${routeText} 附近预计交通${level}。`,
      trafficDelayMin > 0
        ? `TTC 影响：交通可能增加约 ${trafficDelayMin} 分钟。`
        : "TTC 影响：交通目前不应该造成明显延误。",
    ].join("\n");
  }

  if (language === "fr") {
    const level = trafficDelayMin >= 4 ? "dense" : trafficDelayMin >= 3 ? "modérée" : "légère";
    return [
      `${when ? `Vers ${when}, ` : "Maintenant, "}la circulation devrait être ${level} près de ${routeText}.`,
      trafficDelayMin > 0
        ? `Effet TTC : la circulation peut ajouter environ ${trafficDelayMin} min.`
        : "Effet TTC : la circulation ne devrait pas ajouter de retard important.",
    ].join("\n");
  }

  const englishWhen = targetTime ? `around ${formatTransitTime(targetTime)}` : "right now";
  const englishRouteText = hasRoute ? ` for route ${routeId}` : " downtown";
  const delayText = trafficDelayMin > 0
    ? `Traffic may add about ${trafficDelayMin} min`
    : "Traffic should not add delay";
  return `${englishWhen}, ${describeTrafficLevel(trafficDelayMin)} traffic is expected${englishRouteText}. ${delayText}.`;
}

function trafficEventLabel(event: TrafficEvent, language: ResponseLanguage) {
  if (language === "zh") {
    if (event.type === "accident") return "事故";
    if (event.type === "construction") return "施工/封路";
    return "拥堵";
  }
  if (language === "fr") {
    if (event.type === "accident") return "incident";
    if (event.type === "construction") return "travaux/fermeture";
    return "congestion";
  }
  if (event.type === "accident") return "incident";
  if (event.type === "construction") return "roadwork/closure";
  return "congestion";
}

function formatTrafficEvents(events: TrafficEvent[], language: ResponseLanguage) {
  const visibleEvents = events
    .filter(event => event.delayMin > 0 || event.type !== "traffic")
    .slice(0, 3);

  if (visibleEvents.length === 0) {
    if (language === "zh") return "未发现附近明显事故、施工、封路或严重拥堵。";
    if (language === "fr") return "Aucun incident, travaux, fermeture ou embouteillage important n'est signalé à proximité.";
    return "No major nearby incidents, roadwork, closures, or heavy congestion are showing.";
  }

  return visibleEvents
    .map((event, index) => {
      const label = trafficEventLabel(event, language);
      const delayText = event.delayMin > 0 ? `+${event.delayMin} min` : "monitor";
      return `${index + 1}. ${event.title} (${label}, ${delayText})\n   ${event.description}`;
    })
    .join("\n");
}

function describeLiveTrafficQuestionLocalized(
  input: string,
  routeId: number,
  hasRoute: boolean,
  targetTime: Date | undefined,
  impact: TrafficImpact,
  locationLabel: string,
): string {
  const language = detectResponseLanguage(input);
  const when = targetTime ? formatTransitTime(targetTime) : undefined;
  const routeText = hasRoute ? `route ${routeId}` : locationLabel;
  const totalDelay = Math.max(impact.trafficDelayMin, impact.accidentDelayMin, impact.constructionDelayMin);

  if (language === "zh") {
    return [
      `${when ? `${when} 左右` : "现在"}，${routeText} 附近的实时路况显示：`,
      totalDelay > 0
        ? `预计 TTC 可能增加约 ${totalDelay} 分钟。`
        : "目前没有明显额外交通延误。",
      `具体情况：\n${formatTrafficEvents(impact.events, language)}`,
      impact.source === "mock"
        ? "实时路况暂时不可用，因此使用本地时间和路线压力估算。"
        : "回答基于实时道路速度、拥堵和事件数据。下一个路口或几分钟内可能变化。",
    ].join("\n");
  }

  if (language === "fr") {
    return [
      `${when ? `Vers ${when}` : "Maintenant"}, l'état de la circulation près de ${routeText} indique :`,
      totalDelay > 0
        ? `Effet TTC estimé : environ +${totalDelay} min.`
        : "Aucun retard routier important n'est prévu pour le moment.",
      `Détails :\n${formatTrafficEvents(impact.events, language)}`,
      impact.source === "mock"
        ? "Les données en direct ne sont pas disponibles, donc j'utilise une estimation locale selon l'heure et la route."
        : "La réponse utilise les vitesses routières, la congestion et les incidents en temps réel. La situation peut changer rapidement.",
    ].join("\n");
  }

  return [
    `${when ? `Around ${when}` : "Right now"}, live traffic near ${routeText} shows:`,
    totalDelay > 0
      ? `Estimated TTC impact: about +${totalDelay} min.`
      : "No major extra traffic delay is showing right now.",
    `Details:\n${formatTrafficEvents(impact.events, language)}`,
    impact.source === "mock"
      ? "Live traffic conditions are unavailable, so this uses the local time-of-day and route-pressure estimate."
      : "This uses live road speed, congestion, closure, and incident data. Conditions can change within minutes.",
  ].join("\n");
}

function describeEventImpact(impact: EventImpact, targetTime?: Date): string {
  const when = targetTime ? `around ${formatTransitTime(targetTime)}` : "right now";

  if (impact.events.length === 0) {
    return `I do not see nearby sports games, concerts, festivals, or large entertainment events affecting TTC arrivals ${when}.`;
  }

  const eventText = impact.events
    .slice(0, 3)
    .map(event => `${event.title} at ${event.venueName} (${event.distanceKm.toFixed(1)} km away, about +${event.delayMin} min)`)
    .join("; ");
  const delayText = impact.eventDelayMin > 0
    ? `Large-event crowds may add about ${impact.eventDelayMin} min near the route.`
    : "Those events should not add TTC delay.";

  return `${when}, ${delayText} Events: ${eventText}.`;
}

async function getUpcomingEventImpacts(
  routeId: number,
  focus?: AssistantLocationFocus,
): Promise<EventImpact> {
  const checks: Promise<EventImpact | null>[] = [];
  const [lat, lng] = focus?.pos ?? [43.6532, -79.3832];
  for (let day = 0; day <= 14; day += 1) {
    checks.push(getEventImpact(lat, lng, routeId, getFutureDate(day, 13).toISOString()).catch(() => null));
    checks.push(getEventImpact(lat, lng, routeId, getFutureDate(day, 19).toISOString()).catch(() => null));
  }

  const impacts = await Promise.all(checks);
  const events = new Map<string, CityEvent>();
  let source: EventImpact["source"] = "mock";

  for (const impact of impacts) {
    if (!impact) continue;
    if (impact.source === "ticketmaster") source = "ticketmaster";
    for (const event of impact.events) {
      events.set(event.id, event);
    }
  }

  const eventList = [...events.values()]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 8);

  return {
    source,
    events: eventList,
    eventDelayMin: Math.max(0, ...eventList.map(event => event.delayMin)),
  };
}

function formatEventDateTime(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "time unavailable";

  return date.toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeEventImpactLocalized(
  impact: EventImpact,
  input: string,
  targetTime?: Date,
  query?: string,
  focus?: AssistantLocationFocus,
): string {
  const language = detectResponseLanguage(input);
  const filteredEvents = query ? impact.events.filter(event => eventMatchesQuery(event, query)) : impact.events;
  const when = targetTime ? formatTransitTime(targetTime) : undefined;
  const focusLine = formatLocationFocusLine(focus, language);
  const focusPrefix = focusLine ? `${focusLine}\n\n` : "";

  if (impact.source !== "ticketmaster" && isUpcomingQuestion(input)) {
    if (language === "zh") {
      return [
        "我现在不能确认真实的 upcoming Toronto event 名单。",
        "",
        "我仍然可以根据大型场馆估算 TTC 人流影响，例如 Rogers Centre、Scotiabank Arena、BMO Field 和 Budweiser Stage。",
        "",
        "下一步：你可以问一个具体时间或地点，例如 “tonight near Scotiabank Arena”。",
      ].join("\n");
    }
    if (language === "fr") {
      return [
        "Je ne peux pas confirmer la liste réelle des événements à venir à Toronto pour l'instant.",
        "",
        "Je peux quand même estimer l'effet sur la TTC près des grands lieux comme Rogers Centre, Scotiabank Arena, BMO Field et Budweiser Stage.",
        "",
        "Étape suivante : demandez une heure ou un lieu précis, par exemple \"tonight near Scotiabank Arena\".",
      ].join("\n");
    }
    return [
      "I cannot confirm real upcoming Toronto event names from live event data right now.",
      "",
      "I can still estimate TTC crowd pressure near major venues like Rogers Centre, Scotiabank Arena, BMO Field, and Budweiser Stage.",
      "",
      'Next step: ask about a specific time or place, like "tonight near Scotiabank Arena".',
    ].join("\n");
  }

  if (filteredEvents.length === 0) {
    if (query) {
      if (language === "zh") {
        return [
          `我没有在可用事件数据里找到 “${query}”。`,
          "",
          "我检查的是未来约 14 天、对多伦多 TTC 可能有影响的大型活动。",
          "",
          "下一步：可以换一个活动名、场馆名，或问 upcoming events。",
        ].join("\n");
      }
      if (language === "fr") {
        return [
          `Je ne trouve pas "${query}" dans les données d'événements disponibles.`,
          "",
          "J'ai vérifié environ les 14 prochains jours pour les grands événements pouvant influencer la TTC à Toronto.",
          "",
          "Étape suivante : essayez un autre nom d'événement, un lieu, ou demandez les événements à venir.",
        ].join("\n");
      }
      return [
        `I do not see "${query}" in the available event data.`,
        "",
        "I checked about the next 14 days for larger Toronto events that may affect TTC travel.",
        "",
        "Next step: try another event name, a venue name, or ask for upcoming events.",
      ].join("\n");
    }

    if (language === "zh") {
      return `我没有看到${when ? ` ${when} 左右` : "现在"}附近有会明显影响 TTC 的大型比赛、演唱会、节日或娱乐活动。`;
    }
    if (language === "fr") {
      return `Je ne vois pas de grand match, concert, festival ou événement de divertissement qui affecterait clairement la TTC${when ? ` vers ${when}` : " maintenant"}.`;
    }
    return `${focusPrefix}I do not see nearby sports games, concerts, festivals, or large entertainment events affecting TTC arrivals${when ? ` around ${when}` : " right now"}.`;
  }

  const list = filteredEvents.slice(0, 5)
    .map((event, index) => `${index + 1}. ${event.title}\n   ${event.venueName} - ${formatEventDateTime(event.startsAt)}\n   Estimated TTC impact: about +${event.delayMin} min near the venue.`)
    .join("\n");

  if (language === "zh") {
    const title = query ? `我找到这些和 “${query}” 相关的活动：` : "我在可用数据里看到这些 upcoming Toronto events：";
    return `${title}\n\n${list}\n\n出发前：请确认门票、入场时间和场馆公告。`;
  }

  if (language === "fr") {
    const title = query ? `J'ai trouvé ces événements liés à "${query}" :` : "Voici les événements à venir que je vois dans les données disponibles :";
    return `${title}\n\n${list}\n\nAvant de partir : vérifiez les billets, l'heure d'entrée et les avis du lieu.`;
  }

  const title = query ? `I found these events related to "${query}":` : "Upcoming Toronto events I can see:";
  return `${focusPrefix}${title}\n\n${list}\n\nBefore going: check tickets, entry time, and venue notices.`;
}

function describeHolidayImpact(impact: HolidayImpact, targetTime?: Date): string {
  const when = targetTime ? `around ${formatTransitTime(targetTime)}` : "today";
  const holiday = impact.holidays[0];

  if (!holiday) {
    return `I do not see an Ontario public holiday for ${when}.`;
  }

  const delayText = impact.holidayDelayMin > 0
    ? `It may add about ${impact.holidayDelayMin} min because TTC schedules and travel patterns can shift on holidays.`
    : "I do not expect extra TTC delay from it right now.";

  return `${holiday.name} is observed ${when}. ${delayText}`;
}

async function getUpcomingHolidayImpacts(daysAhead = 60): Promise<HolidayImpact[]> {
  const checks = Array.from({ length: daysAhead + 1 }, (_, day) =>
    getHolidayImpact(getFutureDate(day).toISOString()).catch(() => null),
  );
  const impacts = await Promise.all(checks);
  const seen = new Set<string>();

  return impacts
    .filter((impact): impact is HolidayImpact => Boolean(impact?.isHoliday && impact.holidays.length > 0))
    .filter(impact => {
      const holiday = impact.holidays[0];
      const key = `${holiday.date}:${holiday.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function describeHolidayImpactLocalized(
  impact: HolidayImpact,
  input: string,
  targetTime?: Date,
): string {
  const language = detectResponseLanguage(input);
  const when = targetTime ? formatAssistantDate(targetTime) : "today";
  const holiday = impact.holidays[0];

  if (!holiday) {
    if (language === "zh") return `我没有看到 ${when} 是 Ontario public holiday。`;
    if (language === "fr") return `Je ne vois pas de jour férié public en Ontario pour ${when}.`;
    return `I do not see an Ontario public holiday for ${when}.`;
  }

  const date = formatAssistantDate(parseHolidayDate(holiday.date));
  const delay = impact.holidayDelayMin > 0 ? `+${impact.holidayDelayMin} min` : "no extra delay expected";
  if (language === "zh") {
    return [
      `${holiday.name} 是 Ontario public holiday。`,
      "",
      `日期：${date}`,
      `TTC 影响：${delay}，因为节假日班次和出行模式可能和平日不同。`,
    ].join("\n");
  }
  if (language === "fr") {
    return [
      `${holiday.name} est un jour férié public en Ontario.`,
      "",
      `Date : ${date}`,
      `Effet TTC : ${delay}, car les horaires et les habitudes de déplacement peuvent changer les jours fériés.`,
    ].join("\n");
  }
  return [
    `${holiday.name} is an Ontario public holiday.`,
    "",
    `Date: ${date}`,
    `TTC impact: ${delay}, because holiday schedules and travel patterns can differ from a normal weekday.`,
  ].join("\n");
}

function describeUpcomingHolidaysLocalized(impacts: HolidayImpact[], input: string): string {
  const language = detectResponseLanguage(input);

  if (impacts.length === 0) {
    if (language === "zh") {
      return [
        "我没有在未来 60 天的可用数据里看到 Ontario public holidays。",
        "",
        "下一步：你可以问具体节日，例如 Canada Day、Thanksgiving 或 Christmas。",
      ].join("\n");
    }
    if (language === "fr") {
      return [
        "Je ne vois pas de jours fériés publics en Ontario dans les 60 prochains jours selon les données disponibles.",
        "",
        "Étape suivante : demandez un jour précis, par exemple Canada Day, Thanksgiving ou Christmas.",
      ].join("\n");
    }
    return [
      "I do not see Ontario public holidays in the next 60 days from the available data.",
      "",
      "Next step: ask about a specific holiday like Canada Day, Thanksgiving, or Christmas.",
    ].join("\n");
  }

  const list = impacts.map((impact, index) => {
    const holiday = impact.holidays[0];
    const date = formatAssistantDate(parseHolidayDate(holiday.date));
    const delay = impact.holidayDelayMin > 0 ? `about +${impact.holidayDelayMin} min` : "no extra delay expected";
    return `${index + 1}. ${holiday.name} - ${date}\n   TTC impact: ${delay}.`;
  }).join("\n");

  if (language === "zh") {
    return `我在可用数据里看到这些 upcoming Ontario holidays：\n\n${list}\n\n出发前：节假日 TTC 班次和客流可能和平日不同。`;
  }
  if (language === "fr") {
    return `Voici les prochains jours fériés en Ontario que je vois dans les données disponibles :\n\n${list}\n\nAvant de partir : les horaires TTC et l'achalandage peuvent différer d'un jour normal.`;
  }
  return `Upcoming Ontario holidays I can see:\n\n${list}\n\nBefore going: TTC schedules and travel patterns may differ from a normal weekday.`;
}

function formatLegMode(mode: NavigationLeg["mode"], language: ResponseLanguage = "en"): string {
  const labels: Record<NavigationLeg["mode"], Record<ResponseLanguage, string>> = {
    BUS: { en: "bus", zh: "公交", fr: "bus" },
    STREETCAR: { en: "streetcar", zh: "街车", fr: "tramway" },
    SUBWAY: { en: "subway", zh: "地铁", fr: "métro" },
    WALK: { en: "walk", zh: "步行", fr: "marche" },
    CAR: { en: "drive", zh: "开车", fr: "voiture" },
    BICYCLE: { en: "bike", zh: "骑车", fr: "vélo" },
    TRANSIT: { en: "transit", zh: "公共交通", fr: "transport" },
    OTHER: { en: "travel", zh: "出行", fr: "trajet" },
  };

  return labels[mode]?.[language] ?? labels.OTHER[language];
}

function describeNavigationLeg(leg: NavigationLeg, language: ResponseLanguage = "en"): string {
  const mode = formatLegMode(leg.mode, language);
  const routeText = leg.routeLabel ? ` ${leg.routeLabel}` : "";
  const timeText = leg.startTime && leg.endTime ? ` (${leg.startTime}-${leg.endTime})` : "";
  const distanceText = leg.distanceMeters && leg.mode === "WALK" ? `, ${leg.distanceMeters} m` : "";

  if (language === "zh") {
    const headsignText = leg.headsign ? ` 往 ${leg.headsign}` : "";
    return `${mode}${routeText}${headsignText}：${leg.fromName} 到 ${leg.toName}，约 ${leg.durationMin} 分钟${distanceText}${timeText}`;
  }

  if (language === "fr") {
    const headsignText = leg.headsign ? ` vers ${leg.headsign}` : "";
    return `${mode}${routeText}${headsignText} de ${leg.fromName} à ${leg.toName} pendant ${leg.durationMin} min${distanceText}${timeText}`;
  }

  const headsignText = leg.headsign ? ` toward ${leg.headsign}` : "";
  return `${mode}${routeText}${headsignText} from ${leg.fromName} to ${leg.toName} for ${leg.durationMin} min${distanceText}${timeText}`;
}

function localizedTransitVehicle(language: ResponseLanguage): string {
  if (language === "zh") return "公共交通";
  if (language === "fr") return "transport en commun";
  return "transit";
}

function summarizeNavigationRoute(route: NavigationRoute, language: ResponseLanguage): string {
  const duration = route.durationMin ? `${route.durationMin} min` : `${route.etaMin} min`;
  const timeRange = route.departureTime && route.arrivalTime ? `${route.departureTime}-${route.arrivalTime}` : route.arrivalTime;
  const majorLegs = route.legs
    ?.filter(leg => leg.mode !== "WALK")
    .slice(0, 4)
    .map(leg => [formatLegMode(leg.mode, language), leg.routeLabel, leg.headsign ? (language === "zh" ? `往 ${leg.headsign}` : language === "fr" ? `vers ${leg.headsign}` : `toward ${leg.headsign}`) : ""].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(language === "zh" ? " → " : " -> ");
  const walkText = route.walkMin > 0
    ? language === "zh"
      ? `，步行 ${route.walkMin} 分钟`
      : language === "fr"
        ? `, ${route.walkMin} min de marche`
        : `, ${route.walkMin} min walk`
    : "";

  if (language === "zh") {
    return `${majorLegs || localizedTransitVehicle(language)}，约 ${duration}${timeRange ? `，${timeRange}` : ""}${walkText}`;
  }
  if (language === "fr") {
    return `${majorLegs || localizedTransitVehicle(language)}, environ ${duration}${timeRange ? `, ${timeRange}` : ""}${walkText}`;
  }
  return `${majorLegs || localizedTransitVehicle(language)}, about ${duration}${timeRange ? `, ${timeRange}` : ""}${walkText}`;
}

function buildNavigationAlternativesText(route: NavigationRoute, language: ResponseLanguage): string[] {
  const options = [route, ...(route.alternatives ?? [])]
    .filter(candidate => candidate.available !== false)
    .slice(0, 4);

  if (options.length <= 1) return [];

  const title = language === "zh"
    ? "可选路线："
    : language === "fr"
      ? "Options :"
      : "Route options:";
  const lines = options.map((candidate, index) => {
    const label = language === "zh" ? `方案 ${index + 1}` : language === "fr" ? `Option ${index + 1}` : `Option ${index + 1}`;
    return `${label}: ${summarizeNavigationRoute(candidate, language)}`;
  });

  return [title, ...lines];
}

function buildNavigationTripText(
  route: NavigationRoute,
  timing: ReturnType<typeof calculateDestinationTiming>,
  language: ResponseLanguage = "en",
): string[] {
  if (route.available === false) {
    if (language === "zh") {
      return [
        "我找到了这个目的地，但现在无法计算完整实时路线。",
        `目的地：${route.destName}`,
        route.destAddress ? `地址：${route.destAddress}` : "",
        "下一步：可以换一种出行方式、输入更具体地址，或选择附近地标。",
      ].filter(Boolean);
    }
    if (language === "fr") {
      return [
        "J'ai trouvé cette destination, mais je ne peux pas calculer un trajet complet en temps réel maintenant.",
        `Destination : ${route.destName}`,
        route.destAddress ? `Adresse : ${route.destAddress}` : "",
        "Étape suivante : essayez un autre mode, une adresse plus précise ou un repère proche.",
      ].filter(Boolean);
    }

    return [
      "I found this destination, but live routing is unavailable right now.",
      `Destination: ${route.destName}`,
      route.destAddress ? `Address: ${route.destAddress}` : "",
      "Next step: try another travel mode, a more specific address, or a nearby landmark.",
    ].filter(Boolean);
  }

  if (route.legs?.length) {
    const totalTime = route.durationMin ? `${route.durationMin} min` : `${timing.etaMin} min`;
    const legText = route.legs.slice(0, 5).map(leg => describeNavigationLeg(leg, language)).join(language === "zh" ? "；" : "; ");
    const plannedText = timing.targetTime ? formatAssistantDepartureTarget(timing.targetTime, language) : "";
    const alternativesText = buildNavigationAlternativesText(route, language);
    if (language === "zh") {
      return [
        `去 ${route.destName} 大约需要 ${totalTime}${plannedText ? `（${plannedText}）` : ""}。`,
        `步骤：${legText}。`,
        route.arrivalTime ? `预计到达：${route.arrivalTime}。` : "",
        ...alternativesText,
      ].filter(Boolean);
    }
    if (language === "fr") {
      return [
        `Pour aller à ${route.destName}, le trajet prend environ ${totalTime}${plannedText ? ` (${plannedText})` : ""}.`,
        `Étapes : ${legText}.`,
        route.arrivalTime ? `Arrivée estimée : ${route.arrivalTime}.` : "",
        ...alternativesText,
      ].filter(Boolean);
    }
    return [
      `To get to ${route.destName}, the trip is about ${totalTime}${plannedText ? ` (${plannedText})` : ""}.`,
      `Steps: ${legText}.`,
      route.arrivalTime ? `Estimated arrival: ${route.arrivalTime}.` : "",
      ...alternativesText,
    ].filter(Boolean);
  }

  const stopName = route.busStop.replace(/[.]+$/, "");
  const transport = localizedTransitVehicle(language);
  const plannedText = timing.targetTime ? formatAssistantDepartureTarget(timing.targetTime, language) : "";
  const intro = timing.timingNote
    ? `${timing.timingNote} take ${transport} route ${route.routeLabel} to get to ${route.destName}.`
    : `To get to ${route.destName}, take ${transport} route ${route.routeLabel}.`;

  if (language === "zh") {
    return [
      `去 ${route.destName}，搭乘 ${transport} ${route.routeLabel}${plannedText ? `（${plannedText}）` : ""}。`,
      `先步行 ${route.walkMin} 分钟（${route.walkMeters} m）到 ${stopName}。`,
      `车辆预计 ${timing.etaMin} 分钟后到达，然后乘坐 ${route.totalStops} 站。`,
      `预计到达：${timing.arrivalTime}。`,
      ...buildNavigationAlternativesText(route, language),
    ];
  }

  if (language === "fr") {
    return [
      `Pour aller à ${route.destName}, prenez ${transport} ${route.routeLabel}${plannedText ? ` (${plannedText})` : ""}.`,
      `Marchez ${route.walkMin} min (${route.walkMeters} m) jusqu'à ${stopName}.`,
      `Le véhicule est estimé dans ${timing.etaMin} min, puis vous ferez ${route.totalStops} arrêts.`,
      `Arrivée estimée : ${timing.arrivalTime}.`,
      ...buildNavigationAlternativesText(route, language),
    ];
  }

  return [
    plannedText ? `For ${plannedText}, take ${transport} route ${route.routeLabel} to get to ${route.destName}.` : intro,
    `Walk ${route.walkMin} min (${route.walkMeters} m) to ${stopName} station/stop.`,
    `The vehicle is estimated in ${timing.etaMin} min, then ride ${route.totalStops} stops.`,
    `Estimated arrival: ${timing.arrivalTime}.`,
    ...buildNavigationAlternativesText(route, language),
  ];
}

async function answerWeatherQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  const focus = await resolveAssistantLocationFocus(input, context);
  const [lat, lng] = focus?.pos ?? [43.6532, -79.3832];
  const language = detectResponseLanguage(input);
  const focusPrefix = formatLocationFocusLine(focus, language);
  const prefix = focusPrefix ? `${focusPrefix}\n\n` : "";

  try {
    if (targetTime && targetTime.getTime() - Date.now() > 20 * 60 * 1000) {
      const forecast = await getWeatherForecast(lat, lng);
      const targetMs = targetTime.getTime();
      const closest = forecast.hours.reduce<WeatherForecastHour | undefined>((best, hour) => {
        if (!best) return hour;
        return Math.abs(new Date(hour.time).getTime() - targetMs) < Math.abs(new Date(best.time).getTime() - targetMs)
          ? hour
          : best;
      }, undefined);

      if (!closest) {
        return {
          matchedIntent: "weather",
          confidence: 62,
          context: { ...context, lastIntent: "weather" },
          text: language === "zh"
            ? "我可以查询近期天气预报，但目前没有那么远的天气数据。"
            : language === "fr"
              ? "Je peux vérifier la prévision à court terme, mais je n'ai pas de données météo aussi lointaines."
              : "I can check the near-term forecast, but I do not have weather data that far ahead yet.",
        };
      }

      return {
        matchedIntent: "weather",
        confidence: 84,
        context: { ...context, lastTargetTimeIso: targetTime.toISOString(), lastIntent: "weather" },
        text: `${prefix}${describeForecastWeatherLocalized(closest, targetTime, forecast.locationName, input)}`,
      };
    }

    const weather = await getCurrentWeather(lat, lng);
    return {
      matchedIntent: "weather",
      confidence: 88,
      context: {
        ...context,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "weather",
      },
      text: `${prefix}${describeCurrentWeatherLocalized(weather, input)}`,
    };
  } catch {
    return {
      matchedIntent: "weather",
      confidence: 55,
      context: { ...context, lastIntent: "weather" },
      text: language === "zh"
        ? `我现在无法获取天气。${localizedTryAgain(language)}`
        : language === "fr"
          ? `Je ne peux pas obtenir la météo maintenant. ${localizedTryAgain(language)}`
          : "I cannot get the weather right now. Try again in a moment.",
    };
  }
}

async function answerTrafficQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  const routeId = findRouteInText(input) ?? context.routeId ?? 501;
  const hasRoute = Boolean(findRouteInText(input) || context.routeId);
  const focus = await resolveAssistantLocationFocus(input, context);
  const [lat, lng] = focus?.pos ?? [43.6532, -79.3832];
  const language = detectResponseLanguage(input);
  const focusPrefix = formatLocationFocusLine(focus, language);
  const prefix = focusPrefix ? `${focusPrefix}\n\n` : "";
  const locationLabel = focus?.label ?? context.originLabel ?? "downtown Toronto";

  try {
    const impact = await getTrafficImpact(lat, lng, routeId, targetTime?.toISOString());

    return {
      matchedIntent: "traffic",
      confidence: targetTime ? 78 : 82,
      context: {
        ...context,
        routeId,
        aroundScope: context.aroundScope,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "traffic",
      },
      text: `${prefix}${describeLiveTrafficQuestionLocalized(input, routeId, hasRoute, targetTime, impact, locationLabel)}`,
    };
  } catch {
    return {
      matchedIntent: "traffic",
      confidence: 55,
      context: { ...context, lastIntent: "traffic" },
      text: language === "zh"
        ? `我现在无法估算交通影响。${localizedTryAgain(language)}`
        : language === "fr"
          ? `Je ne peux pas estimer la circulation maintenant. ${localizedTryAgain(language)}`
          : "I cannot estimate traffic right now. Try again in a moment.",
    };
  }
}

async function answerEventQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  const routeId = findRouteInText(input) ?? context.routeId ?? 501;
  const query = extractEventQuery(input);
  const focus = await resolveAssistantLocationFocus(input, context);
  const [lat, lng] = focus?.pos ?? [43.6532, -79.3832];

  try {
    const impact = isUpcomingQuestion(input) || query
      ? await getUpcomingEventImpacts(routeId, focus)
      : await getEventImpact(lat, lng, routeId, targetTime?.toISOString());

    return {
      matchedIntent: "events",
      confidence: impact.source === "ticketmaster" ? 84 : 72,
      context: {
        ...context,
        routeId,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "events",
      },
      text: describeEventImpactLocalized(impact, input, targetTime, query, focus),
    };
  } catch {
    const language = detectResponseLanguage(input);
    return {
      matchedIntent: "events",
      confidence: 55,
      context: { ...context, lastIntent: "events" },
      text: language === "zh"
        ? `我现在无法检查多伦多活动人流影响。${localizedTryAgain(language)}`
        : language === "fr"
          ? `Je ne peux pas vérifier l'effet des événements à Toronto maintenant. ${localizedTryAgain(language)}`
          : "I cannot check Toronto event pressure right now. Try again in a moment.",
    };
  }
}

async function answerHolidayQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const timeBase = getTimeBase(input, context);
  const targetTime = parseNamedHolidayTargetDate(input, timeBase) ?? parseAssistantTargetTime(input, timeBase);

  try {
    if (isUpcomingQuestion(input) && !targetTime) {
      const impacts = await getUpcomingHolidayImpacts();
      return {
        matchedIntent: "holidays",
        confidence: impacts.some(impact => impact.source === "nager") ? 86 : 70,
        context: {
          ...context,
          lastTargetTimeIso: new Date().toISOString(),
          lastIntent: "holidays",
        },
        text: describeUpcomingHolidaysLocalized(impacts, input),
      };
    }

    const impact = await getHolidayImpact(targetTime?.toISOString());

    return {
      matchedIntent: "holidays",
      confidence: impact.source === "nager" ? 86 : 70,
      context: {
        ...context,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "holidays",
      },
      text: describeHolidayImpactLocalized(impact, input, targetTime),
    };
  } catch {
    const language = detectResponseLanguage(input);
    return {
      matchedIntent: "holidays",
      confidence: 55,
      context: { ...context, lastIntent: "holidays" },
      text: language === "zh"
        ? `我现在无法检查节假日信息。${localizedTryAgain(language)}`
        : language === "fr"
          ? `Je ne peux pas vérifier les jours fériés maintenant. ${localizedTryAgain(language)}`
          : "I cannot check holiday schedules right now. Try again in a moment.",
    };
  }
}

async function answerHolidayGreeting(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer | null> {
  try {
    const impact = await getHolidayImpact();
    if (!impact.isHoliday || !impact.greeting) return null;
    const language = detectResponseLanguage(input);
    const helpText = localizedCapabilityText(language);
    const text = language === "zh"
      ? `${impact.greeting}！${impact.description}\n\n${helpText}`
      : language === "fr"
        ? `${impact.greeting}! ${impact.description}\n\n${helpText}`
        : `${impact.greeting}! ${impact.description} Ask me about a route, stop, ETA, delay, traffic, weather, events, holidays, or destination.`;

    return {
      matchedIntent: "holidays",
      confidence: impact.source === "nager" ? 88 : 72,
      context: { ...context, lastIntent: "holidays" },
      text,
    };
  } catch {
    return understanding?.needsApi
      ? localInfoUnavailableAnswer(query, context, understanding, displayInput)
      : null;
  }
}

function getGuideProfile(input: string, context: TransitAssistantContext, useContext: boolean) {
  const text = input.toLowerCase();
  const area =
    /waterfront|island|harbou?r|湖边|岛/.test(text) ? "waterfront" :
    /kensington|chinatown|queen\s+west|spadina|west|西/.test(text) ? "west downtown" :
    /rom|yorkville|midtown|bloor|中城/.test(text) ? "midtown" :
    /downtown|city\s+centre|center|市中心/.test(text) ? "downtown" :
    useContext ? context.guideArea : undefined;
  const duration =
    /half\s*day|half-day|半日|半天/.test(text) ? "half-day" :
    /one\s*day|full\s*day|day\s+trip|一天|一日游/.test(text) ? "one-day" :
    /evening|night|晚上|夜/.test(text) ? "evening" :
    /morning|上午/.test(text) ? "morning" :
    /afternoon|下午/.test(text) ? "afternoon" :
    useContext ? context.guideDuration ?? "half-day" : "half-day";
  const audience =
    /kids?|children|family|亲子|孩子|家庭/.test(text) ? "family" :
    /date|couple|romantic|情侣|约会/.test(text) ? "date" :
    /first\s*time|tourist|第一次|游客/.test(text) ? "first time" :
    useContext ? context.guideAudience : undefined;
  const budget =
    /free|免费/.test(text) ? "free" :
    /cheap|cheaper|budget|low\s+cost|便宜|省钱|预算/.test(text) ? "low" :
    /upscale|fancy|高端/.test(text) ? "higher" :
    useContext ? context.guideBudget : undefined;
  const wantsFood = /food|restaurant|eat|lunch|dinner|cafe|coffee|吃|餐厅|美食|咖啡/.test(text);
  const wantsAttractions = /attraction|tourist|sightseeing|view|景点|游客|看景点/.test(text);
  const topic =
    /rain|indoor|museum|gallery|下雨|室内|博物馆|美术馆/.test(text) ? "indoor" :
    wantsFood ? "food" :
    /park|nature|walk|outdoor|公园|自然|散步|室外/.test(text) ? "parks" :
    isShoppingQuestion(input) || /shop|mall|shopping|supermarket|grocery|pharmacy|hardware|electronics|clothing|bookstore|购物|商场|超市|便利店|药店|五金店|电子产品店|服装店|书店/.test(text) ? "shopping" :
    /night|bar|evening|晚上|夜/.test(text) ? "night" :
    wantsAttractions ? "attractions" :
    useContext ? context.guideTopic ?? "general" : "general";

  return { area, duration, audience, budget, topic, wantsFood, wantsAttractions };
}

function scoreGuidePlace(place: GuidePlace, profile: ReturnType<typeof getGuideProfile>) {
  let score = 0;
  if (profile.area && (place.area === profile.area || place.area.includes(profile.area) || profile.area.includes(place.area))) score += 3;
  if (profile.topic === place.category) score += 4;
  if (profile.topic === "indoor" && place.indoor) score += 4;
  if (profile.wantsFood && place.category === "food") score += 3;
  if (profile.wantsAttractions && (place.category === "attractions" || place.category === "culture")) score += 3;
  if (profile.topic === "general" && ["attractions", "food", "culture"].includes(place.category)) score += 1;
  if (profile.audience && place.bestFor.includes(profile.audience)) score += 3;
  if (profile.budget === "free" && place.budget === "free") score += 4;
  if (profile.budget === "low" && (place.budget === "free" || place.budget === "low")) score += 3;
  if (profile.budget === "higher" && place.budget === "higher") score += 2;
  if (profile.duration === "evening" && (place.category === "food" || place.category === "night")) score += 2;
  return score;
}

function buildGuideRoute(places: GuidePlace[], profile: ReturnType<typeof getGuideProfile>) {
  const count = profile.duration === "one-day" ? 5 : profile.duration === "evening" ? 3 : 4;
  const budgetMatchedPlaces = profile.budget === "free"
    ? places.filter(place => place.budget === "free")
    : profile.budget === "low"
      ? places.filter(place => place.budget === "free" || place.budget === "low")
      : places;
  const rankedPlaces = budgetMatchedPlaces.length >= Math.min(2, count) ? budgetMatchedPlaces : places;
  const selected = [...rankedPlaces]
    .sort((a, b) => scoreGuidePlace(b, profile) - scoreGuidePlace(a, profile))
    .slice(0, count);

  if (selected.length >= 3) return selected;

  const fallback = GUIDE_PLACES
    .filter(place => !selected.some(existing => existing.name === place.name))
    .sort((a, b) => scoreGuidePlace(b, profile) - scoreGuidePlace(a, profile))
    .slice(0, count - selected.length);

  return [...selected, ...fallback];
}

function isRecommendationQuestion(input: string): boolean {
  return /\b(?:recommend|recommendation|suggest|any|good|best|where\s+to|places?\s+to|restaurants?|food|eat|lunch|dinner|cafe|coffee|attractions?|things?\s+to\s+do|parks?|shopping|shops?|malls?)\b/i.test(input) ||
    /(?:推荐|有没有|哪里|餐厅|美食|咖啡|景点|公园|购物|商场)/i.test(input);
}

function getRecommendationCategories(profile: ReturnType<typeof getGuideProfile>): GuideCategory[] {
  if (profile.topic === "food") return ["food"];
  if (profile.topic === "parks") return ["parks"];
  if (profile.topic === "shopping") return ["shopping"];
  if (profile.topic === "attractions") return ["attractions", "culture"];
  if (profile.topic === "indoor") return ["attractions", "culture", "shopping", "food"];
  if (profile.topic === "night") return ["night", "food"];
  return ["food", "attractions", "culture", "parks", "shopping"];
}

function getYelpRecommendationQuery(profile: ReturnType<typeof getGuideProfile>) {
  if (profile.topic === "food") return "restaurants";
  if (profile.topic === "parks") return "parks";
  if (profile.topic === "shopping") return "shopping";
  if (profile.topic === "attractions") return "attractions";
  if (profile.topic === "night") return "bars restaurants";
  if (profile.topic === "indoor") return "indoor attractions";
  return "restaurants attractions";
}

function extractShoppingNeed(input: string): string | undefined {
  const cleaned = input.trim().replace(/[?.!。！？]+$/, "");
  const patterns = [
    /(?:buy|shop\s+for|looking\s+for|need\s+to\s+buy|where\s+can\s+i\s+buy|where\s+to\s+buy|get|find)\s+(.+)$/i,
    /(?:买|购买|想买|要买|哪里可以买|去哪买|找)\s*([^，。！？?]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match?.[1]) continue;
    const item = match[1]
      .replace(/\b(?:near|nearby|around|close\s+to|by)\s+(?:me|here|my\s+location|current\s+location)\b/gi, " ")
      .replace(/\b(?:near|nearby|around|close\s+to|by)\s+.+$/i, " ")
      .replace(/\b(?:in|around)\s+toronto\b/gi, " ")
      .replace(/\b(?:cheap|cheapest|affordable|closest|nearest|best|good|options?|places?|stores?|shops?)\b/gi, " ")
      .replace(/(?:便宜|最便宜|最近|附近|选择|店|商店|地方|多伦多)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (item.length >= 2) return item;
  }

  return undefined;
}

function isShoppingQuestion(input: string): boolean {
  return /\b(?:buy|shop\s+for|shopping\s+for|where\s+can\s+i\s+buy|where\s+to\s+buy|looking\s+for|need\s+to\s+buy|stores?|shops?|supermarket|grocery|groceries|asian supermarket|market|convenience store|pharmacy|drugstore|hardware store|electronics store|department store|clothing store|bookstore|liquor store|pet store|furniture store|jewelry store|bike shop|bicycle store|mall)\b/i.test(input) ||
    /(?:买|购买|想买|要买|哪里可以买|去哪买|商店|店里|购物|超市|亚洲超市|华人超市|便利店|药店|药房|五金店|电子产品店|电脑店|手机店|百货|服装店|书店|酒铺|宠物店|家具店|珠宝店|自行车店|商场|买菜|买药|买东西)/.test(input);
}

function isRecommendationFollowUp(input: string, context: TransitAssistantContext): boolean {
  if (!context.lastRecommendations?.length) return false;
  return isGenericFollowUp(input) ||
    /\b(?:cheapest|cheap|affordable|lowest\s+price|closest|nearest|nearer|nearby|highest\s+rated|best\s+rated|best|rating|reviews?|open|another|different|more|plan|itinerary|route|which\s+one|compare|rank|sort|filter|indoor|outdoor|free)\b/i.test(input) ||
    /(?:最便宜|便宜|最近|近一点|评分|评价|最高分|最好|哪个|比较|排序|筛选|换一个|更多|其他|别的|计划|行程|路线|室内|室外|免费)/.test(input);
}

function isLocalInfoLookupQuestion(input: string): boolean {
  return isShoppingQuestion(input) ||
    /\b(?:ticket|tickets|admission|entry fee|entrance fee|museum|amusement park|theme park|gas|fuel|petrol|gasoline|price|prices|cost|quote|compare|cheapest|how much|photo studio|photographer|passport photo|print shop|printing|lumber|wood|timber|sawmill|mill|supplier|distance|how far|nearest|closest|drive time|local service|supermarket|grocery|groceries|market|convenience store|pharmacy|drugstore|hardware store|electronics store|department store|clothing store|bookstore|liquor store|pet store|phone repair|optician|optical|laundry|laundromat|dry cleaner|barber|hair salon|gym|bank|atm|post office)\b/i.test(input) ||
    /(?:门票|票价|入场|博物馆|游乐园|油价|加油|汽油|价格|多少钱|报价|比较|最便宜|照相馆|摄影|证件照|打印店|复印|木材|木材厂|木料|距离|多远|最近|开车多久|本地服务|超市|亚洲超市|华人超市|便利店|药店|药房|五金店|电子产品店|电脑店|手机店|百货|服装店|书店|酒铺|宠物店|家具店|珠宝店|自行车店|手机维修|修手机|眼镜店|配眼镜|洗衣店|干洗店|理发店|健身房|银行|取款机|邮局|寄件|商场|买菜|买药|买东西)/.test(input);
}

function sourceConfidenceLabel(confidence: string, language: ResponseLanguage) {
  if (language === "zh") {
    if (confidence === "high") return "高";
    if (confidence === "medium") return "中";
    if (confidence === "low") return "低";
    return "需确认";
  }
  if (language === "fr") {
    if (confidence === "high") return "élevée";
    if (confidence === "medium") return "moyenne";
    if (confidence === "low") return "faible";
    return "à confirmer";
  }
  if (confidence === "high") return "high";
  if (confidence === "medium") return "medium";
  if (confidence === "low") return "low";
  return "needs confirmation";
}

function localInfoTitle(info: LocalInfoResponse, language: ResponseLanguage) {
  const intentLabels: Record<LocalInfoResponse["intent"], Record<ResponseLanguage, string>> = {
    nearby_places: { en: "nearby options", zh: "附近选择", fr: "options proches" },
    ticket_info: { en: "ticket / visitor-info options", zh: "门票/参观信息选择", fr: "billets / infos de visite" },
    price_compare: { en: "price-comparison leads", zh: "价格比较线索", fr: "pistes de comparaison de prix" },
    gas_price: { en: "nearby gas stations", zh: "附近加油站", fr: "stations-service proches" },
    distance_route: { en: "distance-ranked options", zh: "按距离排序的选择", fr: "options triées par distance" },
    retail: { en: "retail options", zh: "零售/购物选择", fr: "options de magasinage" },
    local_service: { en: "local service options", zh: "本地服务选择", fr: "services locaux" },
  };

  const label = intentLabels[info.intent][language];
  if (language === "zh") return `我查到这些${label}：`;
  if (language === "fr") return `J'ai trouvé ces ${label} :`;
  return `I found these ${label}:`;
}

function formatLocalInfoResult(result: LocalInfoResult, index: number, language: ResponseLanguage) {
  const rating = result.rating !== undefined
    ? language === "zh"
      ? `${result.rating.toFixed(1)} 星${result.reviews ? `，${result.reviews} 条评价` : ""}`
      : language === "fr"
        ? `${result.rating.toFixed(1)} étoiles${result.reviews ? `, ${result.reviews} avis` : ""}`
        : `${result.rating.toFixed(1)} stars${result.reviews ? `, ${result.reviews} reviews` : ""}`
    : "";
  const distance = result.distanceKm !== undefined
    ? language === "zh"
      ? `约 ${result.distanceKm.toFixed(1)} km`
      : language === "fr"
        ? `environ ${result.distanceKm.toFixed(1)} km`
        : `${result.distanceKm.toFixed(1)} km away`
    : "";
  const drive = result.driveTimeMin !== undefined
    ? language === "zh"
      ? `开车约 ${result.driveTimeMin} 分钟`
      : language === "fr"
        ? `environ ${result.driveTimeMin} min en voiture`
        : `${result.driveTimeMin} min drive`
    : "";
  const open = result.openNow !== undefined
    ? language === "zh"
      ? result.openNow ? "现在营业" : "现在可能未营业"
      : language === "fr"
        ? result.openNow ? "ouvert maintenant" : "probablement fermé maintenant"
        : result.openNow ? "open now" : "likely closed now"
    : "";
  const price = result.priceInfo
    ? language === "zh"
      ? `价格信息：${result.priceInfo.value ?? "未直接提供"}（${sourceConfidenceLabel(result.priceInfo.confidence, language)}）`
      : language === "fr"
        ? `Prix : ${result.priceInfo.value ?? "non fourni directement"} (${sourceConfidenceLabel(result.priceInfo.confidence, language)})`
        : `Price info: ${result.priceInfo.value ?? "not directly available"} (${sourceConfidenceLabel(result.priceInfo.confidence, language)})`
    : result.priceLevel ? `Price level: ${result.priceLevel}` : "";
  const source = language === "zh"
    ? `来源：${result.sourceLabels.join(", ") || "local info"}；可信度：${sourceConfidenceLabel(result.sourceConfidence, language)}`
    : language === "fr"
      ? `Sources : ${result.sourceLabels.join(", ") || "local info"} ; confiance : ${sourceConfidenceLabel(result.sourceConfidence, language)}`
      : `Sources: ${result.sourceLabels.join(", ") || "local info"}; confidence: ${sourceConfidenceLabel(result.sourceConfidence, language)}`;
  const website = result.website
    ? language === "zh"
      ? `官网：${result.website}`
      : language === "fr"
        ? `Site : ${result.website}`
        : `Website: ${result.website}`
    : "";
  const phone = result.phone
    ? language === "zh"
      ? `电话：${result.phone}`
      : language === "fr"
        ? `Téléphone : ${result.phone}`
        : `Phone: ${result.phone}`
    : "";

  return [
    `${index + 1}. ${result.name}`,
    [result.address, distance, drive, rating, open].filter(Boolean).join(" - "),
    price,
    result.priceInfo?.note,
    source,
    website || phone,
  ].filter(Boolean).join("\n   ");
}

function localInfoToRecommendations(info: LocalInfoResponse): AssistantRecommendationOption[] {
  return info.results.map(result => ({
    name: result.name,
    address: result.address,
    note: result.priceInfo?.note,
    url: result.website ?? result.mapsUrl,
    price: result.priceInfo?.value ?? result.priceLevel,
    rating: result.rating,
    reviews: result.reviews,
    distanceKm: result.distanceKm,
    categories: [result.category],
  }));
}

function mergeConversationUnderstandingContext(
  context: TransitAssistantContext,
  understanding: ConversationUnderstandingResult,
): TransitAssistantContext {
  const mentionedPlaces = [
    ...(context.mentionedPlaces ?? []),
    understanding.entity,
  ].filter((place): place is string => Boolean(place));
  const uniqueMentionedPlaces = [...new Set(mentionedPlaces)].slice(-6);

  return {
    ...context,
    currentTopic: understanding.entity ?? context.currentTopic,
    currentLocalInfoIntent: understanding.intent !== "unknown"
      ? understanding.intent
      : context.currentLocalInfoIntent,
    mentionedPlaces: uniqueMentionedPlaces,
    date: understanding.time ?? context.date,
    targetGroup: understanding.targetGroup ?? context.targetGroup,
    compareBy: understanding.compareBy !== "none" ? understanding.compareBy : context.compareBy,
    lastResolvedQuestion: understanding.resolvedQuestion,
    missingSlots: understanding.missingSlots,
    lastUnderstanding: understanding,
  };
}

function localInfoIntentToConversationIntent(intent: LocalInfoResponse["intent"]): ConversationUnderstandingIntent {
  if (intent === "ticket_info") return "ticket_price";
  if (intent === "gas_price") return "gas_price";
  if (intent === "price_compare") return "price_comparison";
  if (intent === "distance_route") return "distance";
  if (intent === "retail" || intent === "nearby_places") return "recommendation";
  return "local_info";
}

function localInfoUnavailableAnswer(
  query: string,
  context: TransitAssistantContext,
  understanding: ConversationUnderstandingResult,
  displayInput: string,
): TransitAssistantAnswer {
  const language = detectResponseLanguage(displayInput);
  const missingLocation = understanding.missingSlots.includes("location");
  const reliabilityNote = (() => {
    if (understanding.intent === "distance" || understanding.intent === "route") {
      if (language === "zh") return "距离和路线需要可用的位置与路线数据。";
      if (language === "fr") return "La distance et le trajet nécessitent une position et des données d'itinéraire disponibles.";
      return "Distance and routing need an available location and route data.";
    }
    if (understanding.intent === "opening_hours") {
      if (language === "zh") return "营业时间最好用 Google 商家资料或官方网页确认。";
      if (language === "fr") return "Les horaires doivent être confirmés avec la fiche Google ou le site officiel.";
      return "Opening hours are best confirmed with the Google listing or official website.";
    }
    if (understanding.intent === "ticket_price") {
      if (language === "zh") return "门票价格通常要以官方网页为准，因为日期、年龄和优惠会影响价格。";
      if (language === "fr") return "Les billets doivent être confirmés sur le site officiel, car la date, l'âge et les promotions changent le prix.";
      return "Ticket prices should be confirmed on the official website because date, age group, and promotions can change the price.";
    }
    if (understanding.intent === "price_comparison") {
      if (language === "zh") return "服务价格通常不统一，可能需要官网价格页或商家报价。";
      if (language === "fr") return "Les prix de services varient souvent; il faut parfois une page de prix officielle ou un devis.";
      return "Service prices are often not standardized and may require an official pricing page or quote.";
    }
    if (language === "zh") return "最可靠来源通常是官方网页、商家电话或实时数据源。";
    if (language === "fr") return "La source la plus fiable est souvent le site officiel, un appel au commerce ou une donnée en direct.";
    return "The most reliable source is usually the official website, business phone, or a live data source.";
  })();
  const contextWithUnderstanding = {
    ...mergeConversationUnderstandingContext(context, understanding),
    lastRecommendationQuery: query,
  };
  const text = language === "zh"
    ? [
      `我理解你的问题是：${query}`,
      "",
      missingLocation
        ? "我还需要你的位置，才能准确比较距离或路线。"
        : "我现在没有拿到可用的本地检索结果。",
      reliabilityNote,
      "",
      "你可以补充位置、日期、人数/年龄，或者换一个更具体的地点名。",
    ].join("\n")
    : language === "fr"
      ? [
        `Je comprends la question comme : ${query}`,
        "",
        missingLocation
          ? "Il me manque votre position pour comparer correctement la distance ou le trajet."
          : "Je n'ai pas obtenu de résultat local exploitable pour l'instant.",
        reliabilityNote,
        "",
        "Ajoutez un lieu, une date, le nombre de personnes/l'âge, ou un nom plus précis.",
      ].join("\n")
      : [
        `I understand the question as: ${query}`,
        "",
        missingLocation
          ? "I still need your location to compare distance or routes accurately."
          : "I could not get usable local lookup results right now.",
        reliabilityNote,
        "",
        "You can add a location, date, party size/age group, or a more specific place name.",
      ].join("\n");

  return {
    matchedIntent: understanding.intent === "distance" || understanding.intent === "route"
      ? "navigation"
      : "help",
    confidence: Math.max(62, understanding.confidence),
    context: contextWithUnderstanding,
    text,
  };
}

async function answerLocalInfoQuestion(
  input: string,
  context: TransitAssistantContext,
  understanding?: ConversationUnderstandingResult,
  displayInput = input,
): Promise<TransitAssistantAnswer | null> {
  const query = understanding?.resolvedQuestion ?? input;
  if (!isLocalInfoLookupQuestion(query) && !understanding?.needsApi) return null;
  const language = detectResponseLanguage(displayInput);

  try {
    const info = await queryLocalInfo({
      query,
      lat: context.originPos?.[0],
      lng: context.originPos?.[1],
      language,
      maxResults: 6,
    });

    if (info.results.length === 0) {
      return understanding?.needsApi
        ? localInfoUnavailableAnswer(query, context, understanding, displayInput)
        : null;
    }

    const caveats = info.caveats.map(caveat => `- ${caveat}`).join("\n");
    const sourceLine = language === "zh"
      ? `数据层：${info.sourceSummary}`
      : language === "fr"
        ? `Sources utilisées : ${info.sourceSummary}`
        : `Data layer: ${info.sourceSummary}`;
    const caveatTitle = language === "zh" ? "注意：" : language === "fr" ? "À noter :" : "Notes:";
    const followUp = language === "zh"
      ? "你可以继续问：最便宜的、最近的、评分最高的，或帮我安排路线。"
      : language === "fr"
        ? "Vous pouvez ensuite demander : le moins cher, le plus proche, le mieux noté, ou fais-moi un trajet."
        : "You can follow up with: cheapest, closest, highest rated, or make this a route.";

    return {
      matchedIntent: info.intent === "distance_route" ? "navigation" : "recommendation",
      confidence: 88,
      context: {
        ...context,
        currentTopic: info.results[0]?.name ?? understanding?.entity ?? context.currentTopic,
        currentLocalInfoIntent: understanding?.intent && understanding.intent !== "unknown"
          ? understanding.intent
          : localInfoIntentToConversationIntent(info.intent),
        mentionedPlaces: [
          ...(context.mentionedPlaces ?? []),
          ...info.results.slice(0, 3).map(result => result.name),
        ].filter(Boolean).slice(-6),
        date: understanding?.time ?? context.date,
        targetGroup: understanding?.targetGroup ?? context.targetGroup,
        compareBy: understanding?.compareBy && understanding.compareBy !== "none"
          ? understanding.compareBy
          : context.compareBy,
        lastResolvedQuestion: query,
        missingSlots: understanding?.missingSlots ?? context.missingSlots,
        lastUnderstanding: understanding ?? context.lastUnderstanding,
        lastRecommendationQuery: query,
        lastRecommendationKind: info.intent === "ticket_info" ? "places" : info.intent === "distance_route" ? "plan" : "shopping",
        lastRecommendations: localInfoToRecommendations(info),
        lastIntent: info.intent === "distance_route" ? "navigation" : "recommendation",
      },
      text: [
        localInfoTitle(info, language),
        "",
        info.results.slice(0, 6).map((result, index) => formatLocalInfoResult(result, index, language)).join("\n\n"),
        "",
        sourceLine,
        "",
        caveatTitle,
        caveats,
        "",
        followUp,
      ].join("\n"),
    };
  } catch {
    return null;
  }
}

function priceRank(option: AssistantRecommendationOption): number {
  if (option.budget === "free") return 0;
  if (option.budget === "low") return 1;
  if (option.budget === "medium") return 2;
  if (option.budget === "higher") return 3;
  const dollars = option.price?.match(/\$/g)?.length;
  return dollars && dollars > 0 ? dollars : 9;
}

function recommendationFollowUpMode(input: string): "cheapest" | "nearest" | "rating" | "plan" | "more" | "default" {
  if (/\b(?:cheapest|cheap|affordable|lowest\s+price|free)\b/i.test(input) || /(?:最便宜|便宜|实惠|免费|低价)/.test(input)) return "cheapest";
  if (/\b(?:closest|nearest|nearer|nearby|walking\s+distance)\b/i.test(input) || /(?:最近|近一点|附近|步行)/.test(input)) return "nearest";
  if (/\b(?:highest\s+rated|best\s+rated|rating|reviews?|best)\b/i.test(input) || /(?:评分|评价|最高分|最好)/.test(input)) return "rating";
  if (/\b(?:plan|itinerary|route|schedule|day|afternoon|evening)\b/i.test(input) || /(?:计划|行程|路线|安排|一天|下午|晚上)/.test(input)) return "plan";
  if (/\b(?:another|different|more|other|else)\b/i.test(input) || /(?:换一个|更多|其他|别的|还有)/.test(input)) return "more";
  return "default";
}

function formatRecommendationOption(
  option: AssistantRecommendationOption,
  index: number,
  language: ResponseLanguage,
): string {
  const meta = [
    option.address,
    option.distanceKm !== undefined
      ? language === "zh"
        ? `约 ${option.distanceKm.toFixed(1)} km`
        : language === "fr"
          ? `environ ${option.distanceKm.toFixed(1)} km`
          : `${option.distanceKm.toFixed(1)} km away`
      : "",
    option.price || option.budget,
    option.rating !== undefined
      ? language === "zh"
        ? `${option.rating.toFixed(1)} 星${option.reviews ? `，${option.reviews} 条评价` : ""}`
        : language === "fr"
          ? `${option.rating.toFixed(1)} étoiles${option.reviews ? `, ${option.reviews} avis` : ""}`
          : `${option.rating.toFixed(1)} stars${option.reviews ? `, ${option.reviews} reviews` : ""}`
      : "",
  ].filter(Boolean).join(" - ");
  const note = option.note ? `\n   ${language === "zh" ? "理由" : language === "fr" ? "Pourquoi" : "Why"}: ${option.note}` : "";
  const link = option.url ? `\n   ${option.url}` : "";
  return `${index + 1}. ${option.name}${meta ? `\n   ${meta}` : ""}${note}${link}`;
}

function formatRecommendationOptions(
  options: AssistantRecommendationOption[],
  language: ResponseLanguage,
): string {
  return options
    .slice(0, 5)
    .map((option, index) => formatRecommendationOption(option, index, language))
    .join("\n\n");
}

function yelpToRecommendationOption(item: YelpRecommendation): AssistantRecommendationOption {
  return {
    name: item.name,
    url: item.url,
    price: item.price,
    rating: item.rating,
    reviews: item.reviews,
    categories: item.categories,
    note: item.snippet,
  };
}

function guideToRecommendationOption(
  place: GuidePlace,
  distanceKm?: number,
  language: ResponseLanguage = "en",
): AssistantRecommendationOption {
  return {
    name: place.name,
    address: place.address,
    note: language === "zh" ? place.noteZh : language === "fr" ? place.noteFr : place.note,
    distanceKm,
    categories: [place.category],
    budget: place.budget,
    destinationQuery: place.destinationQuery,
  };
}

function buildRecommendationContext(
  context: TransitAssistantContext,
  profile: ReturnType<typeof getGuideProfile>,
  query: string,
  kind: TransitAssistantContext["lastRecommendationKind"],
  options: AssistantRecommendationOption[],
): TransitAssistantContext {
  return {
    ...context,
    guideArea: profile.area,
    guideDuration: profile.duration,
    guideAudience: profile.audience,
    guideBudget: profile.budget,
    guideTopic: profile.topic,
    lastRecommendationQuery: query,
    lastRecommendationKind: kind,
    lastRecommendations: options.slice(0, 8),
    lastIntent: kind === "plan" ? "guide" : "recommendation",
  };
}

function answerRecommendationFollowUp(
  input: string,
  context: TransitAssistantContext,
): TransitAssistantAnswer | null {
  const previous = context.lastRecommendations;
  if (!previous?.length) return null;

  const language = detectResponseLanguage(input);
  const mode = recommendationFollowUpMode(input);
  const sorted = [...previous].sort((a, b) => {
    if (mode === "cheapest") return priceRank(a) - priceRank(b);
    if (mode === "nearest") return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    if (mode === "rating") return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0);
    return 0;
  });
  const visible = mode === "more" ? sorted.slice(1, 6) : sorted.slice(0, 5);

  if (mode === "plan") {
    const lines = visible.slice(0, 4).map((option, index) => {
      const label = language === "zh"
        ? ["先去", "然后", "中途", "最后"][index] ?? `第 ${index + 1} 站`
        : language === "fr"
          ? ["Commencez", "Ensuite", "Pause", "Terminez"][index] ?? `Arrêt ${index + 1}`
          : ["Start", "Then", "Break", "Finish"][index] ?? `Stop ${index + 1}`;
      return `${index + 1}. ${label}: ${option.name}${option.address ? `\n   ${option.address}` : ""}${option.note ? `\n   ${option.note}` : ""}`;
    }).join("\n\n");
    const title = language === "zh"
      ? "可以，把上一轮选择整理成这样："
      : language === "fr"
        ? "Oui, je l'organiserais comme ceci :"
        : "Yes. I would turn those options into this plan:";
    const before = language === "zh"
      ? "出发前：确认营业时间、库存、门票或预约。"
      : language === "fr"
        ? "Avant de partir : vérifiez les horaires, le stock, les billets ou les réservations."
        : "Before going: check hours, stock, tickets, or reservations.";
    return {
      matchedIntent: "guide",
      confidence: 88,
      context: { ...context, lastRecommendations: visible, lastIntent: "guide" },
      text: `${title}\n\n${lines}\n\n${before}`,
    };
  }

  const title = language === "zh"
    ? mode === "cheapest"
      ? "按最便宜/预算友好排序："
      : mode === "nearest"
        ? "按最近排序："
        : mode === "rating"
          ? "按评分排序："
          : "可以，换一组/继续看："
    : language === "fr"
      ? mode === "cheapest"
        ? "Trié par prix le plus bas / budget :"
        : mode === "nearest"
          ? "Trié par distance :"
          : mode === "rating"
            ? "Trié par note :"
            : "Voici d'autres options :"
      : mode === "cheapest"
        ? "Sorted by cheapest / most budget-friendly:"
        : mode === "nearest"
          ? "Sorted by nearest:"
          : mode === "rating"
            ? "Sorted by highest rated:"
            : "Here are more options:";

  const caveat = language === "zh"
    ? "价格和库存可能变化，出发前最好再确认。"
    : language === "fr"
      ? "Les prix et la disponibilité peuvent changer; vérifiez avant de partir."
      : "Prices and availability can change, so check before you go.";

  return {
    matchedIntent: "recommendation",
    confidence: 88,
    context: { ...context, lastRecommendations: visible, lastIntent: "recommendation" },
    text: `${title}\n\n${formatRecommendationOptions(visible, language)}\n\n${caveat}`,
  };
}

function formatYelpRecommendationList(items: YelpRecommendation[]) {
  return items
    .slice(0, 5)
    .map((item, index) => {
      const rating = item.rating === undefined
        ? "rating unavailable"
        : `${item.rating.toFixed(1)} stars${item.reviews ? `, ${item.reviews} reviews` : ""}`;
      const meta = [
        rating,
        item.price,
        item.categories.slice(0, 2).join(", "),
      ].filter(Boolean).join(" - ");
      const snippet = item.snippet ? `\n   Note: ${item.snippet}` : "";
      const link = item.url ? `\n   Yelp: ${item.url}` : "";

      return `${index + 1}. ${item.name}\n   ${meta}${snippet}${link}`;
    })
    .join("\n\n");
}

async function getGuidePlacePosition(place: GuidePlace): Promise<[number, number] | undefined> {
  const result = (await searchDestinations(place.destinationQuery).catch(() => []))[0];
  return result?.pos;
}

async function buildRecommendationRows(
  places: GuidePlace[],
  profile: ReturnType<typeof getGuideProfile>,
  focus: AssistantLocationFocus | undefined,
) {
  const ranked = [...places]
    .sort((a, b) => scoreGuidePlace(b, profile) - scoreGuidePlace(a, profile))
    .slice(0, focus?.pos ? 8 : 5);

  const withDistance = await Promise.all(ranked.map(async (place) => {
    const pos = focus?.pos ? await getGuidePlacePosition(place) : undefined;
    const distanceKm = focus?.pos && pos ? getDistanceKm(focus.pos, pos) : undefined;
    return { place, distanceKm };
  }));

  return withDistance
    .sort((a, b) => {
      if (a.distanceKm === undefined && b.distanceKm === undefined) {
        return scoreGuidePlace(b.place, profile) - scoreGuidePlace(a.place, profile);
      }
      if (a.distanceKm === undefined) return 1;
      if (b.distanceKm === undefined) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, 5);
}

function getGuideDurationLabel(duration: string, language: ResponseLanguage): string {
  const labels: Record<string, Record<ResponseLanguage, string>> = {
    "one-day": { en: "one-day", zh: "一天", fr: "une journée" },
    evening: { en: "evening", zh: "晚上", fr: "soirée" },
    morning: { en: "morning", zh: "上午", fr: "matinée" },
    afternoon: { en: "afternoon", zh: "下午", fr: "après-midi" },
    "half-day": { en: "half-day", zh: "半天", fr: "demi-journée" },
  };
  return labels[duration]?.[language] ?? labels["half-day"][language];
}

function getGuideTopicLabel(topic: string, language: ResponseLanguage): string {
  const labels: Record<string, Record<ResponseLanguage, string>> = {
    food: { en: "food", zh: "美食", fr: "restaurants" },
    parks: { en: "parks", zh: "公园", fr: "parcs" },
    shopping: { en: "shopping", zh: "购物", fr: "magasinage" },
    night: { en: "nightlife", zh: "夜晚活动", fr: "soirée" },
    indoor: { en: "indoor", zh: "室内", fr: "intérieur" },
    attractions: { en: "attractions", zh: "景点", fr: "attractions" },
    general: { en: "general", zh: "综合", fr: "général" },
  };
  return labels[topic]?.[language] ?? labels.general[language];
}

function localizeGuideArea(area: string, language: ResponseLanguage): string {
  if (language === "zh") {
    const labels: Record<string, string> = {
      downtown: "市中心",
      "east downtown": "东市中心",
      "west downtown": "西市中心",
      midtown: "中城",
      waterfront: "湖边",
      "west end": "西区",
    };
    return labels[area] ?? area;
  }
  if (language === "fr") {
    const labels: Record<string, string> = {
      downtown: "centre-ville",
      "east downtown": "est du centre-ville",
      "west downtown": "ouest du centre-ville",
      midtown: "midtown",
      waterfront: "bord du lac",
      "west end": "ouest de la ville",
    };
    return labels[area] ?? area;
  }
  return area;
}

function getGuideTimeSlot(index: number, total: number, duration: string, language: ResponseLanguage): string {
  const slots: Record<string, Record<ResponseLanguage, string[]>> = {
    "one-day": {
      en: ["Morning", "Late morning", "Lunch", "Afternoon", "Evening"],
      zh: ["上午", "接近中午", "午餐", "下午", "晚上"],
      fr: ["Matin", "Fin de matinée", "Déjeuner", "Après-midi", "Soir"],
    },
    evening: {
      en: ["Start", "Dinner", "After dinner"],
      zh: ["开始", "晚餐", "饭后"],
      fr: ["Début", "Dîner", "Après le dîner"],
    },
    morning: {
      en: ["Start", "Coffee / quick stop", "Late morning"],
      zh: ["开始", "咖啡/短停", "接近中午"],
      fr: ["Début", "Café / arrêt court", "Fin de matinée"],
    },
    afternoon: {
      en: ["Start", "Mid-afternoon", "Late afternoon"],
      zh: ["开始", "下午中段", "傍晚前"],
      fr: ["Début", "Milieu d'après-midi", "Fin d'après-midi"],
    },
    "half-day": {
      en: ["Start", "Second stop", "Food / break", "Final stop"],
      zh: ["开始", "第二站", "吃饭/休息", "最后一站"],
      fr: ["Début", "Deuxième arrêt", "Repas / pause", "Dernier arrêt"],
    },
  };
  const sequence = slots[duration]?.[language] ?? slots["half-day"][language];
  return sequence[Math.min(index, sequence.length - 1)] ?? `${index + 1}/${total}`;
}

function buildGuidePlaceLine(place: GuidePlace, index: number, total: number, profile: ReturnType<typeof getGuideProfile>, language: ResponseLanguage): string {
  const note = language === "zh" ? place.noteZh : language === "fr" ? place.noteFr : place.note;
  const slot = getGuideTimeSlot(index, total, profile.duration, language);
  const area = localizeGuideArea(place.area, language);
  if (language === "zh") {
    return `${index + 1}. ${slot}：${place.name}\n   区域：${area}\n   地址：${place.address}\n   推荐理由：${note}`;
  }
  if (language === "fr") {
    return `${index + 1}. ${slot} : ${place.name}\n   Quartier : ${area}\n   Adresse : ${place.address}\n   Pourquoi : ${note}`;
  }
  return `${index + 1}. ${slot}: ${place.name}\n   Area: ${area}\n   Address: ${place.address}\n   Why: ${note}`;
}

async function answerGuideQuestion(
  input: string,
  context: TransitAssistantContext,
  forceRecommendation = false,
): Promise<TransitAssistantAnswer> {
  const language = detectResponseLanguage(input);
  const shouldInheritGuideContext = context.lastIntent === "guide" &&
    !/\b(?:guide|itinerary|recommend|recommendation|suggest|things?\s+to\s+do|places?\s+to\s+(?:go|visit|eat|see)|plan\s+my\s+day)\b|(?:攻略|行程|推荐|去哪|哪里玩|玩什么)/i.test(input);
  const focus = await resolveAssistantLocationFocus(input, context);
  const profile = getGuideProfile(input, context, shouldInheritGuideContext);
  const shoppingNeed = extractShoppingNeed(input);
  const recommendationQuery = shoppingNeed
    ? `${shoppingNeed} stores`
    : getYelpRecommendationQuery(profile);
  const recommendationKind: TransitAssistantContext["lastRecommendationKind"] = shoppingNeed
    ? "shopping"
    : profile.topic === "food" || profile.topic === "shopping"
      ? profile.topic
      : "places";
  const recommendationCategories = getRecommendationCategories(profile);
  const candidates = GUIDE_PLACES.filter(place => {
    if (profile.topic === "food") return place.category === "food";
    if (profile.topic === "parks") return place.category === "parks";
    if (profile.topic === "shopping") return place.category === "shopping";
    if (profile.topic === "night") return place.category === "night" || place.category === "food";
    if (profile.topic === "indoor") return place.indoor;
    if (profile.topic === "attractions") return place.category === "attractions" || place.category === "culture";
    return true;
  });
  const locationLine = formatLocationFocusLine(focus, language);
  const locationText = locationLine
    ? `\n${locationLine}${focus?.pos ? " (using the location from the map/search context)." : " (using the closest matching place name I can find)."}`
    : "";

  if (forceRecommendation || isRecommendationQuestion(input)) {
    const yelpLocation = focus?.source === "current" && focus.pos
      ? `${focus.pos[0]},${focus.pos[1]}`
      : focus?.label
        ? `${focus.label}, Toronto, ON`
        : undefined;
    const yelpItems = yelpLocation
      ? await searchYelpRecommendations({
        query: recommendationQuery,
        lat: focus?.source === "current" ? focus.pos?.[0] : undefined,
        lng: focus?.source === "current" ? focus.pos?.[1] : undefined,
        location: yelpLocation,
      }).catch(() => [])
      : [];

    if (yelpItems.length > 0) {
      const options = yelpItems.map(yelpToRecommendationOption);
      const title = shoppingNeed
        ? language === "zh"
          ? `我找到几个可以买 ${shoppingNeed} 的选择：`
          : language === "fr"
            ? `J'ai trouvé quelques options pour acheter ${shoppingNeed} :`
            : `I found a few options for buying ${shoppingNeed}:`
        : language === "zh"
          ? "我找到这些推荐："
          : language === "fr"
            ? "J'ai trouvé ces recommandations :"
            : "I found these recommendations:";
      const beforeGoing = language === "zh"
        ? "出发前：请确认营业时间、库存、价格和近期评价。"
        : language === "fr"
          ? "Avant de partir : vérifiez les horaires, le stock, les prix et les avis récents."
          : "Before going: check hours, availability, prices, and recent reviews.";
      const nextStep = language === "zh"
        ? "你还可以继续问：最便宜的、最近的、评分最高的，或者帮我安排路线。"
        : language === "fr"
          ? "Vous pouvez ensuite demander : le moins cher, le plus proche, le mieux noté, ou fais-moi un plan."
          : "You can follow up with: cheapest, closest, highest rated, or make this a plan.";
      return {
        matchedIntent: "recommendation",
        confidence: 90,
        context: buildRecommendationContext(context, profile, recommendationQuery, recommendationKind, options),
        text: `${title}${locationText}\n\n${formatRecommendationOptions(options, language)}\n\n${beforeGoing}\n\n${nextStep}`,
      };
    }

    const recommendationPlaces = GUIDE_PLACES.filter(place => recommendationCategories.includes(place.category));
    const rows = await buildRecommendationRows(recommendationPlaces, profile, focus);
    const title =
      profile.topic === "food" ? "restaurant and food recommendations" :
      profile.topic === "parks" ? "park recommendations" :
      profile.topic === "shopping" ? "shopping recommendations" :
      profile.topic === "attractions" ? "attraction recommendations" :
      "Toronto recommendations";
    const options = rows.map(({ place, distanceKm }) => guideToRecommendationOption(place, distanceKm, language));
    const fallbackBeforeGoing = language === "zh"
      ? "出发前：我目前没有实时评分，所以建议确认营业时间、库存、价格和近期评价。"
      : language === "fr"
        ? "Avant de partir : je n'ai pas les notes en direct ici, donc vérifiez les horaires, le stock, les prix et les avis récents."
        : "Before going: I do not have live ratings in the current map data yet, so check hours, reservations, and recent reviews before you go.";
    const fallbackNextStep = language === "zh"
      ? "你还可以继续问：最近的、最便宜的、评分最高的，或者帮我安排成路线。"
      : language === "fr"
        ? "Vous pouvez ensuite demander : le plus proche, le moins cher, le mieux noté, ou transforme ça en plan."
        : "You can follow up with: closest, cheapest, highest rated, or make this a plan.";
    const fallbackTitle = language === "zh"
      ? `这里有几个${profile.topic === "shopping" ? "购物" : "多伦多"}推荐：`
      : language === "fr"
        ? `Voici des recommandations ${profile.topic === "shopping" ? "magasinage" : "Toronto"} :`
        : `Here are ${title}:`;

    return {
      matchedIntent: "recommendation",
      confidence: 88,
      context: buildRecommendationContext(context, profile, recommendationQuery, recommendationKind, options),
      text: `${fallbackTitle}${locationText}\n\n${formatRecommendationOptions(options, language)}\n\n${fallbackBeforeGoing}\n\n${fallbackNextStep}`,
    };
  }
  const route = buildGuideRoute(candidates, profile);
  const routeText = route
    .map((place, index) => buildGuidePlaceLine(place, index, route.length, profile, language))
    .join("\n\n");
  const durationText =
    profile.duration === "one-day" ? "one-day" :
    profile.duration === "evening" ? "evening" :
    profile.duration === "morning" ? "morning" :
    profile.duration === "afternoon" ? "afternoon" :
    "half-day";
  const budgetLabel = language === "zh" ? "预算" : language === "fr" ? "Budget" : "Budget fit";
  const budgetText = profile.budget ? `\n\n${budgetLabel}: ${profile.budget}.` : "";
  const nextDestination = route[0]?.destinationQuery;
  const navigationHint = nextDestination
    ? language === "zh"
      ? `\n\n下一步：可以问 "navigate to ${nextDestination}"，然后选择站点。`
      : language === "fr"
        ? `\n\nÉtape suivante : demandez "navigate to ${nextDestination}" quand vous choisissez un arrêt.`
        : `\n\nNext step: ask "navigate to ${nextDestination}" when you choose a stop.`
    : "";
  const intro = language === "zh"
    ? "这是一个可直接执行的多伦多攻略："
    : language === "fr"
      ? "Voici un itinéraire de Toronto prêt à utiliser :"
      : `Here is a ready-to-use ${durationText} Toronto guide:`;
  const fitLine = language === "zh"
    ? `适合：${getGuideDurationLabel(profile.duration, language)} / ${getGuideTopicLabel(profile.topic, language)}${profile.audience ? ` / ${profile.audience}` : ""}${profile.budget ? ` / ${profile.budget} 预算` : ""}`
    : language === "fr"
      ? `Idéal pour : ${getGuideDurationLabel(profile.duration, language)} / ${getGuideTopicLabel(profile.topic, language)}${profile.audience ? ` / ${profile.audience}` : ""}${profile.budget ? ` / budget ${profile.budget}` : ""}`
      : `Best fit: ${getGuideDurationLabel(profile.duration, language)} / ${getGuideTopicLabel(profile.topic, language)}${profile.audience ? ` / ${profile.audience}` : ""}${profile.budget ? ` / ${profile.budget} budget` : ""}`;
  const transitHint = language === "zh"
    ? "交通建议：选择第一个地点后，可以直接问我导航。\n我会把它带到现有 navigation 页面。"
    : language === "fr"
      ? "Transport : choisissez le premier lieu, puis demandez la navigation.\nJe l'enverrai vers la page de navigation existante."
      : "Transit: choose the first stop, then ask me to navigate.\nI can send it into the existing navigation flow.";
  const beforeGoing = language === "zh"
    ? "出发前：请确认实时营业时间、门票和预约。"
    : language === "fr"
      ? "Avant de partir : vérifiez les horaires, les billets et les réservations."
      : "Before going: check live hours, tickets, and reservations.";
  const planLabel = language === "zh" ? "行程：" : language === "fr" ? "Plan :" : "Plan:";

  return {
    matchedIntent: "guide",
    confidence: 86,
    context: {
      ...context,
      guideArea: profile.area,
      guideDuration: profile.duration,
      guideAudience: profile.audience,
      guideBudget: profile.budget,
      guideTopic: profile.topic,
      lastRecommendationQuery: `${profile.topic} ${profile.area ?? "Toronto"}`,
      lastRecommendationKind: "plan",
      lastRecommendations: route.map(place => guideToRecommendationOption(place, undefined, language)),
      lastIntent: "guide",
    },
    text: `${intro}\n${fitLine}${locationText}\n\n${planLabel}\n${routeText}${budgetText}\n\n${transitHint}\n\n${beforeGoing}${navigationHint}`,
  };
}

async function answerDestinationQuestion(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  const destinationQuery = extractDestinationQuery(input) ?? (isBareDestinationCandidate(input) ? input.trim() : undefined);
  if (!destinationQuery && !(context.destinationId && isDestinationFollowUp(input))) return null;

  const routeClarification = isRouteNumberOnlyDestination(destinationQuery);
  if (routeClarification) {
    return {
      matchedIntent: "help",
      confidence: 82,
      context: {
        ...context,
        pendingRouteClarification: routeClarification,
        lastIntent: "help",
      },
      text: `I could not find "${routeClarification}" as a destination. Do you mean route ${routeClarification}?`,
    };
  }

  const destinationId = destinationQuery
    ? (await searchDestinations(destinationQuery))[0]?.id
    : context.destinationId;
  if (!destinationId) {
    const language = detectResponseLanguage(input);
    return {
      matchedIntent: "navigation",
      confidence: 62,
      context,
      text: language === "zh"
        ? `我还找不到 "${destinationQuery}" 这个目的地。可以试试更具体的地点、车站或地址，比如 Union Station、CN Tower、Square One。`
        : language === "fr"
          ? `Je ne trouve pas encore "${destinationQuery}" comme destination. Essayez un lieu, une station ou une adresse plus précise.`
          : `I could not find "${destinationQuery}" as a destination yet. Try a more specific place, station, or address such as Union Station, CN Tower, or Square One.`,
    };
  }

  const departureTarget = getNavigationDepartureTarget(input, context);
  const departureTime = departureTarget ? formatTransitTime(departureTarget) : undefined;
  const origin = await resolveNavigationOrigin(input, context);
  const route = await getNavigationRoute(origin.label, destinationId, origin.pos, "bus", departureTime);
  if (isOptionsFollowUp(input)) {
    const optionsAnswer = buildDestinationOptionsAnswer(route, context, input);
    return {
      matchedIntent: "navigation",
      confidence: 82,
      context: {
        ...context,
        destinationId,
        navigationEtaMin: optionsAnswer.etaMin,
        navigationArrivalTime: optionsAnswer.arrivalTime,
        originLabel: origin.label,
        originPos: origin.pos ?? context.originPos,
        lastTargetTimeIso: departureTarget?.toISOString() ?? context.lastTargetTimeIso,
        lastIntent: "navigation",
      },
      text: optionsAnswer.text,
    };
  }

  const timing = calculateDestinationTiming(input, route, context, departureTarget);
  const nextContext = {
    ...context,
    destinationId,
    originLabel: origin.label,
    originPos: origin.pos ?? context.originPos,
    navigationEtaMin: timing.etaMin,
    navigationArrivalTime: timing.arrivalTime,
    lastTargetTimeIso: timing.targetTime?.toISOString() ?? context.lastTargetTimeIso,
    lastIntent: "navigation" as const,
  };

  return {
    matchedIntent: "navigation",
    confidence: route.available === false ? 58 : timing.timingNote ? 78 : 86,
    context: nextContext,
    text: buildNavigationTripText(route, timing, detectResponseLanguage(input)).join("\n"),
  };
}

function answerRouteClarification(input: string, context: TransitAssistantContext): TransitAssistantAnswer | null {
  const routeId = context.pendingRouteClarification;
  if (!routeId) return null;

  if (isYes(input)) {
    const route = ROUTE_TERMINALS[routeId];
    const routeName = route?.label ?? `route ${routeId}`;
    const terminalText = route
      ? ` It generally runs between ${route.terminals.join(" and ")}.`
      : "";

    return {
      matchedIntent: "eta",
      confidence: 84,
      context: {
        ...context,
        routeId,
        pendingRouteClarification: undefined,
        lastIntent: "eta",
      },
      text: `Got it. You mean ${routeName}.${terminalText} Ask "when is ${routeId} at Spadina?" for an arrival time.`,
    };
  }

  if (isNo(input)) {
    return {
      matchedIntent: "navigation",
      confidence: 78,
      context: {
        ...context,
        pendingRouteClarification: undefined,
        lastIntent: "navigation",
      },
      text: "Okay. What destination do you want to go to?",
    };
  }

  return null;
}

async function answerUnknownRouteClarification(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  const unknownRoute = context.pendingUnknownRoute;
  if (!unknownRoute) return null;

  const suggestedRoute = context.pendingSuggestedRoute;
  if (isYes(input) && suggestedRoute) {
    try {
      const { prediction, context: nextContext } = await pickAssistantPrediction(String(suggestedRoute), {
        ...context,
        routeId: suggestedRoute,
        pendingUnknownRoute: undefined,
        pendingSuggestedRoute: undefined,
      });
      const { confidence, summary } = describePrediction(prediction);
      const stopName = prediction.stopName.replace(/[.]+$/, "");

      return {
        matchedIntent: "eta",
        confidence,
        context: {
          ...nextContext,
          pendingUnknownRoute: undefined,
          pendingSuggestedRoute: undefined,
          lastIntent: "eta",
        },
        text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. ${summary}. Confidence: ${confidence}%.`,
      };
    } catch {
      return {
        matchedIntent: "help",
        confidence: 62,
        context: {
          ...context,
          pendingUnknownRoute: undefined,
          pendingSuggestedRoute: undefined,
        },
        text: `Okay. Ask with a stop too, like "when is ${suggestedRoute} at Spadina?"`,
      };
    }
  }

  if (isNo(input)) {
    return {
      matchedIntent: "help",
      confidence: 78,
      context: {
        ...context,
        pendingUnknownRoute: undefined,
        pendingSuggestedRoute: undefined,
      },
      text: "Okay. Which route number or stop did you mean?",
    };
  }

  const replacementRoute = findRouteInText(input);
  if (replacementRoute) {
    return {
      matchedIntent: "help",
      confidence: 78,
      context: {
        ...context,
        routeId: replacementRoute,
        pendingUnknownRoute: undefined,
        pendingSuggestedRoute: undefined,
        pendingRouteClarification: replacementRoute,
        lastIntent: "help",
      },
      text: context.stopId
        ? `Got it, route ${replacementRoute}. Which stop should I check?`
        : `Got it, route ${replacementRoute}. Which stop should I check for that route?`,
    };
  }

  if (isPendingStopClarificationInput(input) || /\b(?:stop|station)\b/i.test(input)) {
    const stopQuery = getClarificationStopQuery(input);
    const stop = (await searchStops(stopQuery))[0];
    const stopText = stop ? `I found ${stop.name.replace(/[.]+$/, "")}. ` : "";

    return {
      matchedIntent: "help",
      confidence: stop ? 80 : 72,
      context: {
        ...context,
        stopId: stop?.id,
        pendingUnknownRoute: undefined,
        pendingSuggestedRoute: undefined,
        lastIntent: "help",
      },
      text: `${stopText}Which route number do you want arrival times for?`,
    };
  }

  return null;
}

async function answerStopClarificationInput(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  if (context.lastIntent !== "help") return null;
  if (!(isPendingStopClarificationInput(input) || /\b(?:stop|station)\b/i.test(input))) return null;
  if (findRouteInText(input)) return null;

  const stopQuery = getClarificationStopQuery(input);
  const stop = (await searchStops(stopQuery))[0];

  return {
    matchedIntent: "help",
    confidence: stop ? 80 : 72,
    context: {
      ...context,
      stopId: stop?.id,
      destinationId: undefined,
      lastIntent: "help",
    },
    text: stop
      ? `I found ${stop.name.replace(/[.]+$/, "")}. Which route number do you want arrival times for?`
      : `I can use ${stopQuery} as the stop. Which route number do you want arrival times for?`,
  };
}

async function answerLocationQuestion(
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer> {
  let stopText = "";

  if (context.stopId) {
    try {
      const stop = await getStopMeta(context.stopId);
      stopText = ` The last TTC stop we discussed is ${stop.name}.`;
    } catch {
      stopText = "";
    }
  }

  return {
    matchedIntent: "help",
    confidence: 88,
    context,
    text: context.originPos
      ? `I can use ${context.originLabel ?? "your current location"} from the map context for nearby TTC, events, restaurants, and navigation questions.${stopText}`
      : `I cannot see your exact location from chat unless browser location is allowed.${stopText || " The map is currently using the app's default Toronto context."}`,
  };
}

function answerRouteTerminalQuestion(
  input: string,
  context: TransitAssistantContext,
): TransitAssistantAnswer | null {
  if (!isRouteTerminalQuestion(input)) return null;

  const routeId = findRouteInText(input) ?? context.routeId;
  if (!routeId) {
    return {
      matchedIntent: "help",
      confidence: 70,
      context,
      text: "Which route do you mean? Ask like \"what is the terminal of 510\" or \"where does 501 end?\"",
    };
  }

  const route = ROUTE_TERMINALS[routeId];
  if (!route) {
    return {
      matchedIntent: "eta",
      confidence: 62,
      context: { ...context, routeId, lastIntent: "eta" },
      text: `I do not have terminal details for route ${routeId} yet. I can still answer arrival times, delays, weather, traffic, and nearby stop questions for it.`,
    };
  }

  const terminalText = route.terminals.length === 2
    ? `${route.terminals[0]} and ${route.terminals[1]}`
    : route.terminals.join(", ");
  const asksVehicleShortTurn = /\b(?:short\s*turn|shortturn|which\s+(?:vehicle|streetcar|car|one)|goes?\s+to\s+(?:the\s+)?terminal)\b/i.test(input);
  const liveDataNote = asksVehicleShortTurn
    ? " I cannot tell which specific streetcar is short-turning right now. Check the vehicle sign at the stop."
    : "";
  const note = route.notes && routeId === 510 ? ` ${route.notes}` : route.notes ? ` ${route.notes}` : "";

  return {
    matchedIntent: "eta",
    confidence: asksVehicleShortTurn ? 72 : 86,
    context: { ...context, routeId, lastIntent: "eta" },
    text: `${route.label} generally runs between ${terminalText}.${liveDataNote || note}`,
  };
}

function describePrediction(prediction: Prediction) {
  const confidence = prediction.confidence ?? 82;
  const summary = prediction.summary ?? [
    prediction.offsets.schedule ? `schedule ${prediction.offsets.schedule > 0 ? "adds" : "saves"} ${Math.abs(prediction.offsets.schedule)} min` : "",
    prediction.offsets.weather ? `weather adds ${prediction.offsets.weather} min` : "",
    prediction.offsets.traffic ? `traffic adds ${prediction.offsets.traffic} min` : "",
    prediction.offsets.events ? `events add ${prediction.offsets.events} min` : "",
    prediction.offsets.holidays ? `holidays add ${prediction.offsets.holidays} min` : "",
  ].filter(Boolean).join("; ");

  return {
    confidence,
    summary: summary || "No major delay factors are currently shown.",
  };
}

function describePredictionLocalized(prediction: Prediction, input: string) {
  const language = detectResponseLanguage(input);
  const confidence = prediction.confidence ?? 82;
  if (language === "en") return describePrediction(prediction);

  const parts: string[] = [];
  if (prediction.offsets.schedule) {
    const verb = prediction.offsets.schedule > 0
      ? language === "zh" ? "增加" : "ajoute"
      : language === "zh" ? "减少" : "réduit";
    parts.push(language === "zh"
      ? `班次因素${verb} ${Math.abs(prediction.offsets.schedule)} 分钟`
      : `l'horaire ${verb} ${Math.abs(prediction.offsets.schedule)} min`);
  }
  if (prediction.offsets.weather) parts.push(language === "zh" ? `天气增加 ${prediction.offsets.weather} 分钟` : `la météo ajoute ${prediction.offsets.weather} min`);
  if (prediction.offsets.traffic) parts.push(language === "zh" ? `交通增加 ${prediction.offsets.traffic} 分钟` : `la circulation ajoute ${prediction.offsets.traffic} min`);
  if (prediction.offsets.events) parts.push(language === "zh" ? `活动增加 ${prediction.offsets.events} 分钟` : `les événements ajoutent ${prediction.offsets.events} min`);
  if (prediction.offsets.holidays) parts.push(language === "zh" ? `节假日增加 ${prediction.offsets.holidays} 分钟` : `les jours fériés ajoutent ${prediction.offsets.holidays} min`);

  return {
    confidence,
    summary: parts.length > 0
      ? parts.join(language === "zh" ? "；" : "; ")
      : language === "zh"
        ? "目前没有显示明显延误因素。"
        : "Aucun facteur de retard important n'est affiché pour le moment.",
  };
}

function getPredictionDataLabel(prediction: Prediction, language: ResponseLanguage): string {
  if (prediction.source === "gtfs-rt") {
    if (language === "zh") return "实时到站更新";
    if (language === "fr") return "arrivée mise à jour en direct";
    return "live arrival update";
  }

  if (prediction.source === "gtfs") {
    if (language === "zh") return "按班表估算";
    if (language === "fr") return "estimation selon l'horaire";
    return "scheduled estimate";
  }

  if (language === "zh") return "本地估算";
  if (language === "fr") return "estimation locale";
  return "local estimate";
}

function formatPredictionAnswer(
  prediction: Prediction,
  input: string,
  summary: string,
  confidence: number,
  options: {
    intent?: "eta" | "delay" | "traffic" | "weather";
    etaOverride?: number;
    prefixLines?: string[];
    factorLabel?: string;
  } = {},
) {
  const language = detectResponseLanguage(input);
  const stopName = prediction.stopName.replace(/[.]+$/, "");
  const eta = options.etaOverride ?? prediction.etaMin;
  const dataLabel = getPredictionDataLabel(prediction, language);
  const factorLabel = options.factorLabel ??
    (language === "zh" ? "影响因素" : language === "fr" ? "Facteurs" : "Factors");
  const prefixLines = options.prefixLines ?? [];

  if (language === "zh") {
    return [
      `路线 ${prediction.routeId}`,
      `方向：${prediction.direction}`,
      `到站：约 ${eta} 分钟`,
      `站点：${stopName}`,
      `到站状态：${dataLabel}`,
      ...prefixLines,
      `${factorLabel}：${summary}`,
      `置信度：${confidence}%`,
    ].join("\n");
  }

  if (language === "fr") {
    return [
      `Ligne ${prediction.routeId}`,
      `Direction : ${prediction.direction}`,
      `Arrivée : environ ${eta} min`,
      `Arrêt : ${stopName}`,
      `État : ${dataLabel}`,
      ...prefixLines,
      `${factorLabel} : ${summary}`,
      `Confiance : ${confidence} %`,
    ].join("\n");
  }

  return [
    `Route ${prediction.routeId}`,
    `Direction: ${prediction.direction}`,
    `ETA: about ${eta} min`,
    `Stop: ${stopName}`,
    `Timing: ${dataLabel}`,
    ...prefixLines,
    `${factorLabel}: ${summary}`,
    `Confidence: ${confidence}%`,
  ].join("\n");
}

function localizedRouteNeedsStop(routeId: number, input: string, hasContextStop: boolean): string {
  const language = detectResponseLanguage(input);
  if (language === "zh") {
    return [
      `路线 ${routeId} 需要一个具体站点，我才能估算到站时间。`,
      "",
      `你可以这样问：${routeId} at College 什么时候到？`,
      "或者先在地图上选择一个站点。",
    ].join("\n");
  }
  if (language === "fr") {
    return [
      `La ligne ${routeId} a besoin d'un arrêt précis avant que je puisse estimer l'arrivée.`,
      "",
      `Essayez : "when is ${routeId} at College?"`,
      hasContextStop ? "Vous pouvez aussi choisir un arrêt desservi par cette ligne." : "Vous pouvez aussi sélectionner un arrêt sur la carte.",
    ].join("\n");
  }
  return [
    `Route ${routeId} needs a specific stop before I can estimate the arrival time.`,
    "",
    `Try: when is ${routeId} at College?`,
    hasContextStop ? `Or choose a stop served by route ${routeId}.` : "Or select a stop on the map first.",
  ].join("\n");
}

function shouldKeepStructuredAnswer(answer: TransitAssistantAnswer): boolean {
  return [
    "eta",
    "delay",
    "traffic",
    "weather",
    "events",
    "holidays",
    "navigation",
    "recommendation",
    "guide",
    "help",
  ].includes(answer.matchedIntent);
}

function localizedStopRouteFallback(input: string): string {
  const language = detectResponseLanguage(input);
  if (language === "zh") {
    return [
      "我还没有匹配到具体 TTC 站点。",
      "",
      "请同时写路线和站点，例如：",
      "501 at College",
      "510 at Spadina and Dundas",
    ].join("\n");
  }
  if (language === "fr") {
    return [
      "Je n'ai pas encore trouvé l'arrêt TTC précis.",
      "",
      "Ajoutez la ligne et l'arrêt, par exemple :",
      "501 at College",
      "510 at Spadina and Dundas",
    ].join("\n");
  }
  return [
    "I could not match that to a specific TTC stop yet.",
    "",
    "Include both the route and stop, for example:",
    "501 at College",
    "510 at Spadina and Dundas",
  ].join("\n");
}

async function pickAssistantPrediction(
  input: string,
  context: TransitAssistantContext,
): Promise<{ prediction: Prediction; context: TransitAssistantContext }> {
  const followUpWithRouteContext = isGenericFollowUp(input) && hasRouteContext(context);
  const routeId = findRouteInText(input) ?? context.routeId;
  const directionFromText = findDirectionInText(input) ?? context.direction;
  const explicitStopQuery = extractStopQuery(input);
  let stopId = context.stopId;

  if (explicitStopQuery) {
    const explicitStops = await searchStops(explicitStopQuery);
    stopId = explicitStops[0]?.id ?? stopId;
  }

  if (!stopId && routeId && isRouteNumberOnlyInput(input)) {
    throw new Error("Route number needs a stop context");
  }

  if (!stopId) {
    const stops = await searchStops(explicitStopQuery || (routeId && followUpWithRouteContext ? String(routeId) : input));
    stopId = stops[0]?.id;
  }

  if (!stopId) {
    throw new Error("No matching stop");
  }

  let meta = await getStopMeta(stopId);
  if (routeId && !meta.routes.includes(routeId)) {
    if (explicitStopQuery) {
      const routeStops = await searchStops(explicitStopQuery);
      const matchingStop = routeStops.find(stop => stopServesRoute(stop, routeId))
        ?? await findRouteStopByQuery(routeId, explicitStopQuery);
      if (matchingStop) {
        stopId = matchingStop.id;
        meta = await getStopMeta(stopId);
      }
    }

    if (!meta.routes.includes(routeId)) {
      throw new Error(`Route ${routeId} is not available at this stop`);
    }
  }

  const route = routeId && meta.routes.includes(routeId) ? routeId : meta.routes[0];
  if (directionFromText && !meta.dirs.includes(directionFromText)) {
    const routeStops = await searchStops(String(route));
    let matchingStopId: string | undefined;

    for (const stop of routeStops) {
      const stopRoutes = stop.routes.split(",").map(item => Number(item.trim()));
      if (!stopRoutes.includes(route)) continue;

      try {
        const candidateMeta = getStopMeta(stop.id);
        if ((await candidateMeta).dirs.includes(directionFromText)) {
          matchingStopId = stop.id;
          break;
        }
      } catch {
        // Keep looking; stale search results should not break a follow-up.
      }
    }

    if (matchingStopId) {
      stopId = matchingStopId;
      meta = await getStopMeta(stopId);
    }
  }

  const direction = directionFromText && meta.dirs.includes(directionFromText)
    ? directionFromText
    : meta.dirs[0];

  return {
    prediction: await getPrediction(stopId, route, direction),
    context: { ...context, stopId, routeId: route, direction },
  };
}

async function buildTransitAssistantAnswer(
  input: string,
  context: TransitAssistantContext = {},
): Promise<TransitAssistantAnswer> {
  const q = input.trim();

  if (!q) {
    const language = detectResponseLanguage(q);
    return {
      matchedIntent: "help",
      confidence: 90,
      text: language === "zh"
        ? '你可以问我 TTC 路线、站点、到站时间、延误、交通、天气、活动、节假日或目的地导航。例如："501 at College 什么时候到？"'
        : language === "fr"
          ? 'Demandez-moi une ligne TTC, un arrêt, une arrivée, un retard, la circulation, la météo, les événements, les jours fériés ou une destination. Par exemple : "When is the 501 coming at College?"'
          : 'Ask me about a TTC route, stop, ETA, delay, traffic, weather, events, holidays, or destination. For example: "When is the 501 coming at College?"',
    };
  }

  if (isGreeting(q)) {
    const holidayGreeting = await answerHolidayGreeting(q, context);
    if (holidayGreeting) return holidayGreeting;
    return answerGreeting(q, context);
  }

  const unknownRouteAnswer = await answerUnknownRouteClarification(q, context);
  if (unknownRouteAnswer) return unknownRouteAnswer;

  const clarificationAnswer = answerRouteClarification(q, context);
  if (clarificationAnswer) return clarificationAnswer;

  const stopClarificationAnswer = await answerStopClarificationInput(q, context);
  if (stopClarificationAnswer) return stopClarificationAnswer;

  if (isLocationQuestion(q)) {
    return answerLocationQuestion(context);
  }

  if (isCurrentTimeQuestion(q)) {
    return answerCurrentTimeQuestion(q, context);
  }

  const understanding = await resolveConversationUnderstanding(q, context);
  const resolvedQ = understanding.isFollowUp ? understanding.resolvedQuestion : q;
  const understoodContext = mergeConversationUnderstandingContext(context, understanding);

  const classifiedIntent = await classifyTransitAssistantIntent(resolvedQ, understoodContext);
  const llmIntent = classifiedIntent?.intent;
  const scopedContext = withClassifiedAroundScope(understoodContext, classifiedIntent);
  const recommendationFollowUpAnswer = isRecommendationFollowUp(q, scopedContext)
    ? answerRecommendationFollowUp(q, scopedContext)
    : null;
  if (recommendationFollowUpAnswer) return recommendationFollowUpAnswer;

  const wantsRecommendation = llmIntent === "recommendation" || isShoppingQuestion(resolvedQ);
  const wantsGuide = wantsRecommendation || isGuideQuestion(resolvedQ) || llmIntent === "guide" || isGuideFollowUp(q, scopedContext);
  const destinationQueryForNavigation = extractDestinationQuery(resolvedQ);
  const navigationVerbRequested = /\b(?:navigate|directions?|route\s+me|get\s+me|take\s+me|how\s+(?:do|can|should)\s+i\s+get|how\s+to\s+get|go\s+to|travel\s+to|transit\s+to|trip\s+to)\b/i.test(resolvedQ) ||
    /(?:导航|路线|怎么去|怎么到|如何去|如何到|前往|从.+到|出行方式|公交怎么走|坐车去)/i.test(resolvedQ);
  const explicitNavigationQuestion =
    (!wantsGuide && isNavigationQuestion(resolvedQ)) ||
    (Boolean(destinationQueryForNavigation) && navigationVerbRequested && !/\b(?:things?\s+to\s+do|where\s+to|what\s+to|recommend|guide|itinerary|restaurants?|attractions?)\b/i.test(resolvedQ)) ||
    (llmIntent === "navigation" && (destinationQueryForNavigation !== undefined || (scopedContext.destinationId && isDestinationFollowUp(q))));

  const localInfoAnswer = await answerLocalInfoQuestion(resolvedQ, scopedContext, understanding, q);
  if (localInfoAnswer) return localInfoAnswer;
  if (understanding.needsApi && [
    "ticket_price",
    "opening_hours",
    "distance",
    "gas_price",
    "price_comparison",
    "local_info",
  ].includes(understanding.intent)) {
    return localInfoUnavailableAnswer(resolvedQ, scopedContext, understanding, q);
  }

  if (wantsGuide) {
    return await answerGuideQuestion(resolvedQ, scopedContext, wantsRecommendation);
  }

  if (explicitNavigationQuestion) {
    const destinationAnswer = await answerDestinationQuestion(resolvedQ, scopedContext);
    if (destinationAnswer) return destinationAnswer;
  }

  const followUp = isGenericFollowUp(q) && hasAssistantContext(scopedContext);
  const wantsEvents = isEventQuestion(q) || llmIntent === "events" || (scopedContext.lastIntent === "events" && (isTimeFollowUp(q) || followUp));
  const wantsHolidays = !explicitNavigationQuestion && (isHolidayQuestion(q) || llmIntent === "holidays" || (scopedContext.lastIntent === "holidays" && (isTimeFollowUp(q) || followUp)));
  const wantsWeather = !wantsEvents && !wantsHolidays && (llmIntent ? llmIntent === "weather" : isWeatherQuestion(q) || (scopedContext.lastIntent === "weather" && (isTimeFollowUp(q) || followUp)));
  const wantsTraffic = !wantsEvents && !wantsHolidays && (llmIntent ? llmIntent === "traffic" : isTrafficQuestion(q) || (scopedContext.lastIntent === "traffic" && (isTimeFollowUp(q) || followUp)));
  const wantsDelay = llmIntent ? llmIntent === "delay" : isDelayQuestion(q) || (scopedContext.lastIntent === "delay" && followUp);
  const wantsCrowding = llmIntent ? llmIntent === "crowding" : isCrowdingQuestion(q) || (scopedContext.lastIntent === "crowding" && followUp);
  const wantsEta = llmIntent ? llmIntent === "eta" : isEtaQuestion(q) || (hasRouteContext(scopedContext) && (scopedContext.lastIntent === "eta" || followUp));

  const terminalAnswer = answerRouteTerminalQuestion(q, context);
  if (terminalAnswer) return terminalAnswer;

  if (wantsWeather) {
    return answerWeatherQuestion(q, scopedContext);
  }

  if (wantsTraffic && !wantsCrowding) {
    return answerTrafficQuestion(q, scopedContext);
  }

  if (wantsEvents && !wantsCrowding) {
    return answerEventQuestion(q, scopedContext);
  }

  if (wantsHolidays && !wantsCrowding) {
    return answerHolidayQuestion(q, scopedContext);
  }

  if (!llmIntent || llmIntent === "navigation") {
    const destinationAnswer = await answerDestinationQuestion(q, scopedContext);
    if (destinationAnswer) return destinationAnswer;
  }

  const stopContextAnswer = await answerStopContextQuestion(q, scopedContext);
  if (stopContextAnswer) return stopContextAnswer;

  const isTransitQuestion = llmIntent
    ? llmIntent !== "out-of-scope"
    : /bus|ttc|go transit|miway|yrt|viva|brampton|oakville|halton|durham|gta|union station|route|stop|station|eta|arriv|delay|late|weather|traffic|event|game|concert|show|festival|holiday|long weekend|crowd|busy|navigate|direction|trip|destination|terminal|terminus|last stop|final stop|walk|go to|get to|take me|east|west|north|south|\b\d{3}\b/i.test(q) ||
      /公交|地铁|街车|车站|到站|路线|导航|出行|怎么去|怎么到|前往|从.+到|延误|晚点|天气|交通|活动|节假日|拥挤|联合车站|多伦多|大多|密西沙加|奥克维尔|约克区|宾顿/i.test(q) ||
      followUp;
  if (!isTransitQuestion) {
    const language = detectResponseLanguage(q);
    return {
      matchedIntent: "out-of-scope",
      confidence: 82,
      context,
      text: localizedCapabilityText(language),
    };
  }

  const regionalTransitAnswer = await answerRegionalTransitEta(q, scopedContext);
  if (regionalTransitAnswer) return regionalTransitAnswer;

  try {
    const explicitRoute = findRouteInText(q);
    if (explicitRoute && !(await routeHasStops(explicitRoute))) {
      const suggestedRoute = context.routeId;
      return {
        matchedIntent: "help",
        confidence: 84,
        context: {
          ...context,
          pendingUnknownRoute: explicitRoute,
          pendingSuggestedRoute: suggestedRoute,
          lastIntent: "help",
        },
        text: suggestedRoute
          ? [
            `I could not find route ${explicitRoute}.`,
            "",
            `Did you mean route ${suggestedRoute}?`,
          ].join("\n")
          : [
            `I could not find route ${explicitRoute}.`,
            "",
            "Which route or stop did you mean?",
          ].join("\n"),
      };
    }

    if (explicitRoute && isRouteNumberOnlyInput(q) && !context.stopId) {
      return {
        matchedIntent: "help",
        confidence: 78,
        context: {
          ...context,
          routeId: explicitRoute,
          pendingRouteClarification: explicitRoute,
          lastIntent: "help",
        },
        text: localizedRouteNeedsStop(explicitRoute, q, Boolean(context.stopId)),
      };
    }

    const { prediction, context: nextContext } = await pickAssistantPrediction(q, scopedContext);
    const { confidence, summary } = describePredictionLocalized(prediction, q);
    const language = detectResponseLanguage(q);

    if (wantsWeather) {
      const weatherLine = language === "zh"
        ? prediction.offsets.weather > 0
          ? `天气影响：约 +${prediction.offsets.weather} 分钟`
          : "天气影响：目前没有明显延误"
        : language === "fr"
          ? prediction.offsets.weather > 0
            ? `Effet météo : environ +${prediction.offsets.weather} min`
            : "Effet météo : aucun retard important"
          : prediction.offsets.weather > 0
            ? `Weather impact: about +${prediction.offsets.weather} min`
            : "Weather impact: no major delay right now";
      return {
        matchedIntent: "weather",
        confidence,
        context: { ...nextContext, lastIntent: "weather" },
        text: formatPredictionAnswer(prediction, q, summary, confidence, {
          intent: "weather",
          prefixLines: [weatherLine],
        }),
      };
    }

    if (wantsCrowding) {
      const focus = await resolveAssistantLocationFocus(q, scopedContext);
      const focusPrefix = formatLocationFocusLine(focus, language);
      const prefix = focusPrefix ? `${focusPrefix}\n\n` : "";
      return {
        matchedIntent: "crowding",
        confidence,
        context: { ...nextContext, aroundScope: scopedContext.aroundScope, lastIntent: "crowding" },
        text: language === "zh"
          ? "我现在无法检查车厢拥挤程度。\n\n我仍然可以回答到站时间、延误、天气、交通、事故和施工。"
          : language === "fr"
            ? "Je ne peux pas vérifier l'achalandage maintenant.\n\nJe peux quand même répondre sur les arrivées, retards, météo, circulation, accidents et travaux."
            : `${prefix}I cannot check crowding right now. I can still answer arrival times, delays, weather, traffic, accidents, and construction.`,
      };
    }

    if (wantsTraffic) {
      const trafficLine = language === "zh"
        ? prediction.offsets.traffic > 0
          ? `交通影响：约 +${prediction.offsets.traffic} 分钟`
          : "交通影响：目前没有明显延误"
        : language === "fr"
          ? prediction.offsets.traffic > 0
            ? `Effet circulation : environ +${prediction.offsets.traffic} min`
            : "Effet circulation : aucun retard important"
          : prediction.offsets.traffic > 0
            ? `Traffic impact: about +${prediction.offsets.traffic} min`
            : "Traffic impact: no major delay right now";
      return {
        matchedIntent: "traffic",
        confidence,
        context: { ...nextContext, lastIntent: "traffic" },
        text: formatPredictionAnswer(prediction, q, summary, confidence, {
          intent: "traffic",
          prefixLines: [trafficLine],
        }),
      };
    }

    if (wantsDelay) {
      const [eventImpact, holidayImpact] = await Promise.all([
        getEventImpact(43.6532, -79.3832, prediction.routeId).catch(() => null),
        getHolidayImpact().catch(() => null),
      ]);
      const factorSeparator = language === "zh" ? "；" : "; ";
      const eventText = eventImpact && eventImpact.eventDelayMin > 0
        ? language === "zh"
          ? `${factorSeparator}活动增加 ${eventImpact.eventDelayMin} 分钟（${eventImpact.events[0]?.title ?? "多伦多大型活动"}）`
          : language === "fr"
            ? `${factorSeparator}les événements ajoutent ${eventImpact.eventDelayMin} min (${eventImpact.events[0]?.title ?? "grand événement à Toronto"})`
            : `${factorSeparator}events add ${eventImpact.eventDelayMin} min (${eventImpact.events[0]?.title ?? "large Toronto event activity"})`
        : "";
      const holidayText = holidayImpact && holidayImpact.holidayDelayMin > 0
        ? language === "zh"
          ? `${factorSeparator}节假日增加 ${holidayImpact.holidayDelayMin} 分钟（${holidayImpact.holidays[0]?.name ?? "Ontario public holiday"}）`
          : language === "fr"
            ? `${factorSeparator}les jours fériés ajoutent ${holidayImpact.holidayDelayMin} min (${holidayImpact.holidays[0]?.name ?? "jour férié en Ontario"})`
            : `${factorSeparator}holidays add ${holidayImpact.holidayDelayMin} min (${holidayImpact.holidays[0]?.name ?? "Ontario public holiday"})`
        : "";
      const extraDelay = (eventImpact?.eventDelayMin ?? 0) + (holidayImpact?.holidayDelayMin ?? 0);
      return {
        matchedIntent: "delay",
        confidence,
        context: { ...nextContext, lastIntent: "delay" },
        text: formatPredictionAnswer(prediction, q, `${summary}${eventText}${holidayText}`, confidence, {
          intent: "delay",
          etaOverride: prediction.etaMin + extraDelay,
          factorLabel: language === "zh" ? "主要因素" : language === "fr" ? "Facteurs principaux" : "Main factors",
        }),
      };
    }

    return {
      matchedIntent: "eta",
      confidence,
      context: { ...nextContext, lastIntent: "eta" },
      text: formatPredictionAnswer(prediction, q, summary, confidence, { intent: "eta" }),
    };
  } catch {
    const routeOnly = findRouteInText(q);
    if (routeOnly && isRouteNumberOnlyInput(q)) {
      return {
        matchedIntent: "help",
        confidence: 76,
        context: {
          ...context,
          routeId: routeOnly,
          pendingRouteClarification: routeOnly,
          lastIntent: "help",
        },
        text: context.stopId
          ? localizedRouteNeedsStop(routeOnly, q, true)
          : localizedRouteNeedsStop(routeOnly, q, false),
      };
    }

    return {
      matchedIntent: "help",
      confidence: 65,
      context,
      text: localizedStopRouteFallback(q),
    };
  }
}

export async function askTransitAssistant(
  input: string,
  context: TransitAssistantContext = {},
): Promise<TransitAssistantAnswer> {
  const draft = await buildTransitAssistantAnswer(input, context);
  if (shouldKeepStructuredAnswer(draft)) {
    return applyResponsePresentation(input, draft);
  }
  const verified = await verifyTransitAssistantAnswer(input.trim(), draft);
  return applyResponsePresentation(input, verified);
}
