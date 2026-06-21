import { apiRequest } from "./request";
import { getTrafficImpact } from "./traffic";
import { getEventImpact, type EventImpact } from "./events";
import { getHolidayImpact, type HolidayImpact } from "./holidays";
import {
  getCurrentWeather,
  getWeatherForecast,
  type CurrentWeather,
  type WeatherForecastHour,
} from "./weather";

export type TransitSource = "mock" | "gtfs" | "ttc" | "otp";

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
  dirs: [string, string];
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
  dirs: [string, string];
  pos: [number, number];
}

export interface TransitAssistantContext {
  stopId?: string;
  routeId?: number;
  direction?: string;
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
  | "guide"
  | "help"
  | "out-of-scope";

export interface TransitAssistantAnswer {
  text: string;
  matchedIntent: TransitAssistantIntent;
  confidence: number;
  context?: TransitAssistantContext;
}

interface TransitAssistantIntentResult {
  intent: TransitAssistantIntent;
  confidence: number;
  reason?: string;
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

function formatAssistantText(text: string): string {
  return text
    .replace(/([.!?])\s+(?=\d+\.\s)/g, "$1\n\n")
    .replace(/\s+(\d+\.\s)/g, "\n$1")
    .replace(/\s+(Before going:|Next step:|Budget fit:|出发前：|下一步：|预算：|Avant de partir :|Étape suivante :|Budget :)/g, "\n\n$1")
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
];

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
): Promise<NavigationRoute> {
  return apiRequest<NavigationRoute>("/api/ttc/navigation", {
    params: {
      origin,
      destination,
      originLat: originPos?.[0],
      originLng: originPos?.[1],
      mode,
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

  const route = input.match(/\b([1-9]\d{1,2})\b/);
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
    /\b(?:i\s+(?:want|need|would\s+like)\s+to\s+(?:go|travel|get)\s+to|can\s+you\s+(?:take|get|route|navigate)\s+me\s+to|take\s+me\s+to|get\s+me\s+to|route\s+me\s+to|navigate\s+me\s+to|go\s+to|travel\s+to|head\s+to|visit)\s+(.+)$/i,
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

function cleanDestinationQuery(input: string): string {
  const cleaned = input
    .trim()
    .replace(/\b(?:please|thanks|thank you)\b/gi, " ")
    .replace(/\b(?:for|on)\s+(?:today|tomorrow|tonight|this evening|later)\b/gi, " ")
    .replace(/\b(?:today|tomorrow|tonight|this evening|later)\b/gi, " ")
    .replace(/\b(?:at|around|by|before|after)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\b(?:in\s+)?(?:another\s+)?(?:\d+|one|two|three|four|five|six)\s+(?:more\s+)?(?:minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || input.trim();
}

function isNavigationQuestion(input: string): boolean {
  return extractDestinationQuery(input) !== undefined ||
    /\b(?:navigate|navigation|directions?|route\s+me|take\s+me|get\s+me|go\s+to|get\s+to|travel\s+to|trip\s+to|plan|schedule|map)\b.*\b(?:trip|to|there|destination)\b/i.test(input);
}

function isBareDestinationCandidate(input: string): boolean {
  const cleaned = input.trim();
  if (cleaned.length < 3) return false;
  if (isPendingStopClarificationInput(cleaned)) return false;
  if (isWeatherQuestion(cleaned) || isTrafficQuestion(cleaned) || isDelayQuestion(cleaned) || isCrowdingQuestion(cleaned)) return false;
  if (isLocationQuestion(cleaned) || isRouteTerminalQuestion(cleaned) || isTransitArrivalRequest(cleaned)) return false;

  return /[a-z]/i.test(cleaned);
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

  return /\b(?:when|eta|arriv|arrival|coming|due|next|how\s+long)\b/i.test(input) ||
    /\b(?:bus|streetcar|vehicle|ttc|route)\b/i.test(input);
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
    /\b(?:at|from|near|by)\s+(.+)$/i,
    /\b(?:stop|station)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/\b(?:for|on|route|bus|streetcar|ttc|coming|arriving|arrive|eta|when|what|about|the|a|an)\b/gi, " ")
        .replace(/\b[1-9]\d{1,2}\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
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
  return /\b(?:what\s+about|how\s+about|and\s+(?:now|then|later|there|that|this)|also|then|later|now|today|tomorrow|tonight|this evening|same|again|that|this|it|there|those|them|why|how\s+(?:long|late|far|bad|busy)|when|where|which|should\s+i|can\s+i|do\s+i|is\s+(?:it|that|there)|are\s+(?:there|they)|does\s+(?:it|that)|more\s+options?|other\s+options?|any\s+other|alternatives?|what\s+else|something\s+else|miss|missed|next\s+(?:one|bus|vehicle|streetcar))\b/i.test(input);
}

function isGuideFollowUp(input: string, context: TransitAssistantContext): boolean {
  return context.lastIntent === "guide" && (
    isGenericFollowUp(input) ||
    /\b(?:more|another|different|nearby|closer|cheaper|free|indoor|outdoor|rainy|kids|family|date|food|restaurant|shopping|museum|park|night|morning|afternoon|evening|half\s+day|one\s+day|shorter|longer)\b/i.test(input) ||
    /(?:更多|换一个|附近|近一点|便宜|免费|室内|室外|下雨|亲子|情侣|吃|餐厅|购物|博物馆|公园|晚上|上午|下午|半日|一天)/i.test(input)
  );
}

function isLocationQuestion(input: string): boolean {
  return /\b(?:where\s+am\s+i|where\s+are\s+we|my\s+location|current\s+location|where\s+is\s+my\s+location|am\s+i\s+near)\b/i.test(input);
}

function isCurrentTimeQuestion(input: string): boolean {
  return /\b(?:what(?:'s|\s+is)?\s+the\s+time|what\s+time\s+is\s+it|current\s+time|time\s+now)\b/i.test(input);
}

function isNextVehicleFollowUp(input: string): boolean {
  return /\b(?:miss|missed|next\s+(?:one|bus|vehicle|streetcar)|another\s+(?:one|bus|vehicle|streetcar))\b/i.test(input);
}

function isOptionsFollowUp(input: string): boolean {
  return /\b(?:more\s+options?|other\s+options?|any\s+other|alternatives?|alternate\s+(?:routes?|ways?)|other\s+ways?|different\s+routes?|what\s+else|something\s+else|choices?)\b/i.test(input);
}

function isWeatherQuestion(input: string): boolean {
  return /\b(?:weather|rain|raining|snow|snowing|storm|wind|windy|ice|icy|temperature|temp|hot|cold|humid|humidity)\b/i.test(input);
}

function isTrafficQuestion(input: string): boolean {
  return /\b(?:traffic|road|roads|congestion|jam|busy roads|rush hour)\b/i.test(input);
}

function isEventQuestion(input: string): boolean {
  return /\b(?:event|events|game|games|match|concert|show|festival|arena|stadium|rogers\s+centre|scotiabank\s+arena|bmo\s+field|budweiser\s+stage|entertainment|venue|crowds?)\b/i.test(input);
}

function isHolidayQuestion(input: string): boolean {
  return /\b(?:holiday|holidays|public holiday|stat holiday|statutory holiday|long weekend|canada day|christmas|boxing day|new year|thanksgiving|family day|victoria day|labou?r day)\b/i.test(input);
}

function isGuideQuestion(input: string): boolean {
  return /\b(?:guide|itinerary|recommend|recommendation|suggest|where\s+should\s+i\s+go|what\s+should\s+i\s+do|things?\s+to\s+do|places?\s+to\s+(?:go|visit|eat|see)|tourist|sightseeing|attractions?|restaurants?|food|eat|lunch|dinner|cafe|coffee|date|family|kids|rainy|rain\s+day|budget|cheap|free|half\s+day|one\s+day|day\s+trip|plan\s+my\s+day)\b/i.test(input) ||
    /(?:攻略|行程|推荐|去哪|哪里玩|玩什么|吃什么|餐厅|景点|一日游|半日|亲子|情侣|下雨|预算|便宜|免费|附近)/i.test(input);
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
  let greeting = "Hello";

  if (/\b(?:good morning|morning)\b|早上好/.test(normalized)) {
    greeting = "Good morning";
  } else if (/\b(?:good afternoon|afternoon)\b|下午好/.test(normalized)) {
    greeting = "Good afternoon";
  } else if (/\b(?:good evening|evening)\b|晚上好/.test(normalized)) {
    greeting = "Good evening";
  } else if (/\b(?:good night)\b/.test(normalized)) {
    greeting = "Good night";
  }

  return {
    matchedIntent: "help",
    confidence: 95,
    context: { ...context, lastIntent: "help" },
    text: `${greeting}! I can help with TTC arrivals, nearby stops, delays, traffic, weather, events, holidays, and navigation.`,
  };
}

function isDelayQuestion(input: string): boolean {
  return /\b(?:delay|late|slow|behind|accident|construction|why)\b/i.test(input);
}

function isEtaQuestion(input: string): boolean {
  return /\b(?:bus|streetcar|vehicle|ttc|route|stop|station|eta|arriv|when|how\s+long|next\s+(?:one|bus|vehicle|streetcar)|miss|missed|\b\d{3}\b)\b/i.test(input);
}

function isCrowdingQuestion(input: string): boolean {
  return /\b(?:crowd|busy|full|passenger|load|packed|space|seats?)\b/i.test(input);
}

function isRouteTerminalQuestion(input: string): boolean {
  return /\b(?:terminal|terminus|end\s*(?:point)?|last\s+stop|final\s+stop|short\s*turn|shortturn|turn\s+back|which\s+(?:vehicle|streetcar|car|one).*(?:terminal|short)|goes?\s+to\s+(?:the\s+)?terminal|where\s+does\s+(?:it|this|that|the\s+(?:bus|streetcar|route))\s+(?:end|go)|where\s+is\s+(?:it|this|that)\s+going|destination\s+of\s+(?:the\s+)?(?:route\s+)?\d{3})\b/i.test(input);
}

function isTimeFollowUp(input: string): boolean {
  return /\b(?:what\s+about|how\s+about|tomorrow|tonight|this evening|later|then|(?:in\s+)?(?:another\s+)?(?:\d+|one|two|three|four|five|six)\s+(?:more\s+)?(?:minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?|(?:at|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i.test(input);
}

function isChainedTimeFollowUp(input: string): boolean {
  return /\b(?:another|more|after\s+that|afterward|afterwards|from\s+then|from\s+that|later\s+than\s+that|again)\b/i.test(input);
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

  if (/\btomorrow\b/.test(text)) {
    const target = new Date(baseTime);
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    return target;
  }

  if (/\btonight\b|\bthis evening\b/.test(text)) {
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

  if (!relative) return undefined;

  const amount = wordNumbers[relative[1]] ?? Number(relative[1]);
  return relative[2].startsWith("hour") ? amount * 60 : amount;
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
): { text: string; etaMin: number; arrivalTime: string } {
  if (route.available === false) {
    return {
      etaMin: 0,
      arrivalTime: "",
      text: buildNavigationTripText(route, {
        etaMin: 0,
        arrivalTime: "",
      }).join(" "),
    };
  }

  const baseEta = context.navigationEtaMin ?? route.etaMin;
  const baseArrival = parseTransitClockMinutes(context.navigationArrivalTime ?? route.arrivalTime);
  const optionGaps = [0, ...route.alsoAt.map(parseDurationMinutes)]
    .filter((minutes): minutes is number => minutes !== undefined)
    .filter((minutes, index, all) => all.indexOf(minutes) === index)
    .slice(0, 4);

  const options = optionGaps.map((gap) => {
    const eta = baseEta + gap;
    const arrival = baseArrival !== undefined
      ? formatTransitClockMinutes(baseArrival + gap)
      : route.arrivalTime;

    return `about ${eta} min, arriving ${arrival}`;
  });

  const stopName = route.busStop.replace(/[.]+$/, "");
  const transport = route.routeLabel.match(/^\d+/) ? "TTC transit" : "transit";

  return {
    etaMin: baseEta,
    arrivalTime: baseArrival !== undefined ? formatTransitClockMinutes(baseArrival) : route.arrivalTime,
    text: [
      `Yes. For ${route.destName}, you can keep using ${transport} route ${route.routeLabel} from ${stopName}.`,
      `Upcoming options are ${options.join("; ")}.`,
      `They all ride ${route.totalStops} stops after the ${route.walkMin} min walk to the stop.`,
    ].join(" "),
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
  });
}

function formatTransitTime(date: Date): string {
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
}

function answerCurrentTimeQuestion(context: TransitAssistantContext): TransitAssistantAnswer {
  return {
    matchedIntent: "help",
    confidence: 95,
    context: { ...context, lastIntent: "help" },
    text: `It is ${formatTransitTime(new Date())} in Toronto.`,
  };
}

function describeCurrentWeather(weather: CurrentWeather): string {
  const delay = estimateWeatherTransitDelay(weather);
  const precipitation = weather.precipitationMm && weather.precipitationMm > 0
    ? ` Precipitation: ${weather.precipitationMm} mm.`
    : "";
  const impact = delay > 0
    ? `Current weather may add about ${delay} min to some TTC trips.`
    : "Current weather should not add TTC delay.";

  return [
    `Right now in ${weather.locationName}, it is ${weather.condition.toLowerCase()} and ${Math.round(weather.temperatureC)} C, feeling like ${Math.round(weather.feelsLikeC)} C.`,
    `Wind is ${Math.round(weather.windKph)} km/h and humidity is ${weather.humidity}%.`,
    precipitation.trim(),
    `Observed at ${formatWeatherTime(weather.observedAt)}. ${impact}`,
  ].filter(Boolean).join(" ");
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
    ? `That weather may add about ${delay} min to some TTC trips.`
    : "That weather should not add TTC delay.";

  return [
    `Around ${formatTransitTime(targetTime)} in ${locationName}, the forecast is ${hour.condition.toLowerCase()} and ${Math.round(hour.temperatureC)} C.`,
    `Rain or snow chance is ${hour.precipitationProbability}% and wind is ${Math.round(hour.windKph)} km/h.`,
    impact,
  ].join(" ");
}

function describeTrafficLevel(delayMin: number): string {
  if (delayMin >= 4) return "heavy";
  if (delayMin >= 3) return "moderate";
  if (delayMin >= 1) return "light";
  return "light";
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

function formatLegMode(mode: NavigationLeg["mode"]): string {
  if (mode === "BUS") return "bus";
  if (mode === "STREETCAR") return "streetcar";
  if (mode === "SUBWAY") return "subway";
  if (mode === "WALK") return "walk";
  if (mode === "CAR") return "drive";
  if (mode === "BICYCLE") return "bike";
  if (mode === "TRANSIT") return "transit";
  return "travel";
}

function describeNavigationLeg(leg: NavigationLeg): string {
  const mode = formatLegMode(leg.mode);
  const routeText = leg.routeLabel ? ` ${leg.routeLabel}` : "";
  const headsignText = leg.headsign ? ` toward ${leg.headsign}` : "";
  const timeText = leg.startTime && leg.endTime ? ` (${leg.startTime}-${leg.endTime})` : "";
  const distanceText = leg.distanceMeters && leg.mode === "WALK" ? `, ${leg.distanceMeters} m` : "";

  return `${mode}${routeText}${headsignText} from ${leg.fromName} to ${leg.toName} for ${leg.durationMin} min${distanceText}${timeText}`;
}

function buildNavigationTripText(route: NavigationRoute, timing: ReturnType<typeof calculateDestinationTiming>): string[] {
  if (route.available === false) {
    const when = timing.targetTime ? ` around ${formatTransitTime(timing.targetTime)}` : " right now";
    const addressText = route.destAddress ? ` at ${route.destAddress}` : "";
    const message = route.message
      ? `${timing.targetTime ? `For around ${formatTransitTime(timing.targetTime)}, ` : ""}${route.message}`
      : `I found ${route.destName}${addressText}, but live transit routing is unavailable${when}.`;

    return [
      message,
      "You can still use that destination in navigation, or try another travel mode, a more specific address, or a nearby landmark.",
    ];
  }

  if (route.legs?.length) {
    const totalTime = route.durationMin ? `${route.durationMin} min` : `${timing.etaMin} min`;
    const legText = route.legs.slice(0, 5).map(describeNavigationLeg).join("; ");
    return [
      `To get to ${route.destName}, the trip is about ${totalTime}.`,
      `Steps: ${legText}.`,
      route.arrivalTime ? `Estimated arrival: ${route.arrivalTime}.` : "",
    ].filter(Boolean);
  }

  const stopName = route.busStop.replace(/[.]+$/, "");
  const transport = route.routeLabel.match(/^\d+/) ? "TTC transit" : "transit";
  const intro = timing.timingNote
    ? `${timing.timingNote} take ${transport} route ${route.routeLabel} to get to ${route.destName}.`
    : `To get to ${route.destName}, take ${transport} route ${route.routeLabel}.`;

  return [
    intro,
    `Walk ${route.walkMin} min (${route.walkMeters} m) to ${stopName} station/stop.`,
    `The vehicle is estimated in ${timing.etaMin} min, then ride ${route.totalStops} stops.`,
    `Estimated arrival: ${timing.arrivalTime}.`,
  ];
}

async function answerWeatherQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));

  try {
    if (targetTime && targetTime.getTime() - Date.now() > 20 * 60 * 1000) {
      const forecast = await getWeatherForecast(43.6532, -79.3832);
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
          text: "I can check the near-term forecast, but I do not have weather data that far ahead yet.",
        };
      }

      return {
        matchedIntent: "weather",
        confidence: 84,
        context: { ...context, lastTargetTimeIso: targetTime.toISOString(), lastIntent: "weather" },
        text: describeForecastWeather(closest, targetTime, forecast.locationName),
      };
    }

    const weather = await getCurrentWeather(43.6532, -79.3832);
    return {
      matchedIntent: "weather",
      confidence: 88,
      context: {
        ...context,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "weather",
      },
      text: describeCurrentWeather(weather),
    };
  } catch {
    return {
      matchedIntent: "weather",
      confidence: 55,
      context: { ...context, lastIntent: "weather" },
      text: "I cannot get the weather right now. Try again in a moment.",
    };
  }
}

async function answerTrafficQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  const routeId = findRouteInText(input) ?? context.routeId ?? 501;

  try {
    const impact = await getTrafficImpact(43.6532, -79.3832, routeId, targetTime?.toISOString());
    const when = targetTime ? `around ${formatTransitTime(targetTime)}` : "right now";
    const routeText = findRouteInText(input) || context.routeId ? ` for route ${routeId}` : " downtown";
    const delayText = impact.trafficDelayMin > 0
      ? `Traffic may add about ${impact.trafficDelayMin} min`
      : "Traffic should not add delay";

    return {
      matchedIntent: "traffic",
      confidence: targetTime ? 78 : 82,
      context: {
        ...context,
        routeId,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "traffic",
      },
      text: `${when}, ${describeTrafficLevel(impact.trafficDelayMin)} traffic is expected${routeText}. ${delayText}.`,
    };
  } catch {
    return {
      matchedIntent: "traffic",
      confidence: 55,
      context: { ...context, lastIntent: "traffic" },
      text: "I cannot estimate traffic right now. Try again in a moment.",
    };
  }
}

async function answerEventQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input, getTimeBase(input, context));
  const routeId = findRouteInText(input) ?? context.routeId ?? 501;

  try {
    const impact = await getEventImpact(43.6532, -79.3832, routeId, targetTime?.toISOString());

    return {
      matchedIntent: "events",
      confidence: impact.source === "ticketmaster" ? 84 : 72,
      context: {
        ...context,
        routeId,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "events",
      },
      text: describeEventImpact(impact, targetTime),
    };
  } catch {
    return {
      matchedIntent: "events",
      confidence: 55,
      context: { ...context, lastIntent: "events" },
      text: "I cannot check Toronto event pressure right now. Try again in a moment.",
    };
  }
}

async function answerHolidayQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const timeBase = getTimeBase(input, context);
  const targetTime = parseNamedHolidayTargetDate(input, timeBase) ?? parseAssistantTargetTime(input, timeBase);

  try {
    const impact = await getHolidayImpact(targetTime?.toISOString());

    return {
      matchedIntent: "holidays",
      confidence: impact.source === "nager" ? 86 : 70,
      context: {
        ...context,
        lastTargetTimeIso: targetTime?.toISOString() ?? new Date().toISOString(),
        lastIntent: "holidays",
      },
      text: describeHolidayImpact(impact, targetTime),
    };
  } catch {
    return {
      matchedIntent: "holidays",
      confidence: 55,
      context: { ...context, lastIntent: "holidays" },
      text: "I cannot check holiday schedules right now. Try again in a moment.",
    };
  }
}

async function answerHolidayGreeting(context: TransitAssistantContext): Promise<TransitAssistantAnswer | null> {
  try {
    const impact = await getHolidayImpact();
    if (!impact.isHoliday || !impact.greeting) return null;

    return {
      matchedIntent: "holidays",
      confidence: impact.source === "nager" ? 88 : 72,
      context: { ...context, lastIntent: "holidays" },
      text: `${impact.greeting}! ${impact.description} Ask me about a route, stop, ETA, delay, traffic, weather, events, holidays, or destination.`,
    };
  } catch {
    return null;
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
    /shop|mall|shopping|购物|商场/.test(text) ? "shopping" :
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

function answerGuideQuestion(input: string, context: TransitAssistantContext): TransitAssistantAnswer {
  const language = detectResponseLanguage(input);
  const shouldInheritGuideContext = context.lastIntent === "guide" &&
    !/\b(?:guide|itinerary|recommend|recommendation|suggest|things?\s+to\s+do|places?\s+to\s+(?:go|visit|eat|see)|plan\s+my\s+day)\b|(?:攻略|行程|推荐|去哪|哪里玩|玩什么)/i.test(input);
  const profile = getGuideProfile(input, context, shouldInheritGuideContext);
  const candidates = GUIDE_PLACES.filter(place => {
    if (profile.topic === "food") return place.category === "food";
    if (profile.topic === "parks") return place.category === "parks";
    if (profile.topic === "shopping") return place.category === "shopping";
    if (profile.topic === "night") return place.category === "night" || place.category === "food";
    if (profile.topic === "indoor") return place.indoor;
    if (profile.topic === "attractions") return place.category === "attractions" || place.category === "culture";
    return true;
  });
  const route = buildGuideRoute(candidates, profile);
  const routeText = route
    .map((place, index) => {
      const note = language === "zh" ? place.noteZh : language === "fr" ? place.noteFr : place.note;
      return `${index + 1}. ${place.name} (${place.area})\n   ${note}`;
    })
    .join("\n");
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
    ? "这是一个多伦多攻略建议："
    : language === "fr"
      ? "Voici une idée d'itinéraire à Toronto :"
      : `Here is a ${durationText} Toronto guide idea:`;
  const beforeGoing = language === "zh"
    ? "出发前：请确认实时营业时间、门票和预约。"
    : language === "fr"
      ? "Avant de partir : vérifiez les horaires, les billets et les réservations."
      : "Before going: check live hours, tickets, and reservations.";

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
      lastIntent: "guide",
    },
    text: `${intro}\n\n${routeText}${budgetText}\n\n${beforeGoing}${navigationHint}`,
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
    return {
      matchedIntent: "navigation",
      confidence: 62,
      context,
      text: `I could not find "${destinationQuery}" as a destination yet. Try a known place like CN Tower, Kensington Market, or Spadina at Dundas.`,
    };
  }

  const route = await getNavigationRoute(context.originLabel ?? "current-location", destinationId, context.originPos);
  if (isOptionsFollowUp(input)) {
    const optionsAnswer = buildDestinationOptionsAnswer(route, context);
    return {
      matchedIntent: "navigation",
      confidence: 82,
      context: {
        ...context,
        destinationId,
        navigationEtaMin: optionsAnswer.etaMin,
        navigationArrivalTime: optionsAnswer.arrivalTime,
        lastIntent: "navigation",
      },
      text: optionsAnswer.text,
    };
  }

  const timing = calculateDestinationTiming(input, route, context);
  const nextContext = {
    ...context,
    destinationId,
    navigationEtaMin: timing.etaMin,
    navigationArrivalTime: timing.arrivalTime,
    lastTargetTimeIso: timing.targetTime?.toISOString() ?? context.lastTargetTimeIso,
    lastIntent: "navigation" as const,
  };

  return {
    matchedIntent: "navigation",
    confidence: route.available === false ? 58 : timing.timingNote ? 78 : 86,
    context: nextContext,
    text: buildNavigationTripText(route, timing).join(" "),
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
    text: `I cannot see your exact location from chat unless browser location is allowed.${stopText || " The map is currently using the app's default Toronto context."}`,
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
    return {
      matchedIntent: "help",
      confidence: 90,
      text: 'Ask me about a TTC route, stop, ETA, delay, traffic, weather, events, holidays, or destination. For example: "When is the 501 coming at College?"',
    };
  }

  if (isGreeting(q)) {
    const holidayGreeting = await answerHolidayGreeting(context);
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
    return answerCurrentTimeQuestion(context);
  }

  const classifiedIntent = await classifyTransitAssistantIntent(q, context);
  const llmIntent = classifiedIntent?.intent;
  const wantsGuide = isGuideQuestion(q) || llmIntent === "guide" || isGuideFollowUp(q, context);
  const explicitNavigationQuestion =
    isNavigationQuestion(q) ||
    (llmIntent === "navigation" && (extractDestinationQuery(q) !== undefined || (context.destinationId && isDestinationFollowUp(q))));
  if (explicitNavigationQuestion) {
    const destinationAnswer = await answerDestinationQuestion(q, context);
    if (destinationAnswer) return destinationAnswer;
  }

  if (wantsGuide) {
    return answerGuideQuestion(q, context);
  }

  const followUp = isGenericFollowUp(q) && hasAssistantContext(context);
  const wantsEvents = isEventQuestion(q) || llmIntent === "events" || (context.lastIntent === "events" && (isTimeFollowUp(q) || followUp));
  const wantsHolidays = !explicitNavigationQuestion && (isHolidayQuestion(q) || llmIntent === "holidays" || (context.lastIntent === "holidays" && (isTimeFollowUp(q) || followUp)));
  const wantsWeather = !wantsEvents && !wantsHolidays && (llmIntent ? llmIntent === "weather" : isWeatherQuestion(q) || (context.lastIntent === "weather" && (isTimeFollowUp(q) || followUp)));
  const wantsTraffic = !wantsEvents && !wantsHolidays && (llmIntent ? llmIntent === "traffic" : isTrafficQuestion(q) || (context.lastIntent === "traffic" && (isTimeFollowUp(q) || followUp)));
  const wantsDelay = llmIntent ? llmIntent === "delay" : isDelayQuestion(q) || (context.lastIntent === "delay" && followUp);
  const wantsCrowding = llmIntent ? llmIntent === "crowding" : isCrowdingQuestion(q) || (context.lastIntent === "crowding" && followUp);
  const wantsEta = llmIntent ? llmIntent === "eta" : isEtaQuestion(q) || (hasRouteContext(context) && (context.lastIntent === "eta" || followUp));

  const terminalAnswer = answerRouteTerminalQuestion(q, context);
  if (terminalAnswer) return terminalAnswer;

  if (wantsWeather) {
    return answerWeatherQuestion(q, context);
  }

  if (wantsTraffic && !wantsCrowding) {
    return answerTrafficQuestion(q, context);
  }

  if (wantsEvents && !wantsCrowding) {
    return answerEventQuestion(q, context);
  }

  if (wantsHolidays && !wantsCrowding) {
    return answerHolidayQuestion(q, context);
  }

  if (!llmIntent || llmIntent === "navigation") {
    const destinationAnswer = await answerDestinationQuestion(q, context);
    if (destinationAnswer) return destinationAnswer;
  }

  const stopContextAnswer = await answerStopContextQuestion(q, context);
  if (stopContextAnswer) return stopContextAnswer;

  const isTransitQuestion = llmIntent
    ? llmIntent !== "out-of-scope"
    : /bus|ttc|route|stop|station|eta|arriv|delay|late|weather|traffic|event|game|concert|show|festival|holiday|long weekend|crowd|busy|navigate|direction|trip|destination|terminal|terminus|last stop|final stop|walk|go to|get to|take me|east|west|north|south|\b\d{3}\b/i.test(q) || followUp;
  if (!isTransitQuestion) {
    return {
      matchedIntent: "out-of-scope",
      confidence: 82,
      context,
      text: "I can help with TTC trip questions like arrival times, nearby stops, route delays, traffic, weather, events, holidays, and navigation.",
    };
  }

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
          ? `I could not find route ${explicitRoute}. Did you mean route ${suggestedRoute}?`
          : `I could not find route ${explicitRoute}. Which route or stop did you mean?`,
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
        text: `Route ${explicitRoute} needs a stop before I can estimate arrival time. Try asking "when is ${explicitRoute} at Spadina?"`,
      };
    }

    const { prediction, context: nextContext } = await pickAssistantPrediction(q, context);
    const { confidence, summary } = describePrediction(prediction);
    const stopName = prediction.stopName.replace(/[.]+$/, "");

    if (wantsWeather) {
      return {
        matchedIntent: "weather",
        confidence,
        context: { ...nextContext, lastIntent: "weather" },
        text: prediction.offsets.weather > 0
          ? `Weather is adding about ${prediction.offsets.weather} min. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`
          : `Weather is not adding delay right now. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`,
      };
    }

    if (wantsCrowding) {
      return {
        matchedIntent: "crowding",
        confidence,
        context: { ...nextContext, lastIntent: "crowding" },
        text: "I cannot check crowding right now. I can still answer arrival times, delays, weather, traffic, accidents, and construction.",
      };
    }

    if (wantsTraffic) {
      return {
        matchedIntent: "traffic",
        confidence,
        context: { ...nextContext, lastIntent: "traffic" },
        text: prediction.offsets.traffic > 0
          ? `Traffic is adding about ${prediction.offsets.traffic} min. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`
          : `Traffic is not adding delay right now. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`,
      };
    }

    if (wantsDelay) {
      const [eventImpact, holidayImpact] = await Promise.all([
        getEventImpact(43.6532, -79.3832, prediction.routeId).catch(() => null),
        getHolidayImpact().catch(() => null),
      ]);
      const eventText = eventImpact && eventImpact.eventDelayMin > 0
        ? `; events add ${eventImpact.eventDelayMin} min (${eventImpact.events[0]?.title ?? "large Toronto event activity"})`
        : "";
      const holidayText = holidayImpact && holidayImpact.holidayDelayMin > 0
        ? `; holidays add ${holidayImpact.holidayDelayMin} min (${holidayImpact.holidays[0]?.name ?? "Ontario public holiday"})`
        : "";
      const extraDelay = (eventImpact?.eventDelayMin ?? 0) + (holidayImpact?.holidayDelayMin ?? 0);
      return {
        matchedIntent: "delay",
        confidence,
        context: { ...nextContext, lastIntent: "delay" },
        text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin + extraDelay} min at ${stopName}. Main factors: ${summary}${eventText}${holidayText}. Confidence: ${confidence}%.`,
      };
    }

    return {
      matchedIntent: "eta",
      confidence,
      context: { ...nextContext, lastIntent: "eta" },
      text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. ${summary}. Confidence: ${confidence}%.`,
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
          ? `I do not see route ${routeOnly} at the current stop for the active service period. Try selecting a stop served by ${routeOnly}, or ask with a stop name like "when is ${routeOnly} at College?"`
          : `Route ${routeOnly} needs a stop before I can estimate arrival time. Try asking "when is ${routeOnly} at College?" or select a stop on the map first.`,
      };
    }

    return {
      matchedIntent: "help",
      confidence: 65,
      context,
      text: "I could not match that to a TTC stop yet. Try including a stop name and route number, like 501 at College.",
    };
  }
}

export async function askTransitAssistant(
  input: string,
  context: TransitAssistantContext = {},
): Promise<TransitAssistantAnswer> {
  const draft = await buildTransitAssistantAnswer(input, context);
  if (draft.matchedIntent === "guide") {
    return applyResponsePresentation(input, draft);
  }
  const verified = await verifyTransitAssistantAnswer(input.trim(), draft);
  return applyResponsePresentation(input, verified);
}
