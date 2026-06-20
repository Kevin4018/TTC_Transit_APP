import { apiRequest } from "./request";
import { getTrafficImpact } from "./traffic";
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
  navigationEtaMin?: number;
  navigationArrivalTime?: string;
  pendingRouteClarification?: number;
  lastIntent?: TransitAssistantAnswer["matchedIntent"];
}

export interface TransitAssistantAnswer {
  text: string;
  matchedIntent: "eta" | "delay" | "weather" | "traffic" | "crowding" | "navigation" | "help" | "out-of-scope";
  confidence: number;
  context?: TransitAssistantContext;
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

function findRouteInText(input: string): number | undefined {
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
    /\b(?:i\s+want\s+to\s+go\s+to|i\s+need\s+to\s+go\s+to|take\s+me\s+to|go\s+to|get\s+me\s+to|how\s+do\s+i\s+get\s+to|directions?\s+to|navigate\s+to)\s+(.+)$/i,
    /\b(?:trip|route|transit)\s+to\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

function isRouteNumberOnlyDestination(query: string | undefined): number | undefined {
  const routeId = query?.trim().match(/^([1-9]\d{1,2})$/)?.[1];
  return routeId ? Number(routeId) : undefined;
}

function isRouteNumberOnlyInput(input: string): boolean {
  return /^([1-9]\d{1,2})$/.test(input.trim());
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
  return /\b(?:how\s+about|what\s+about|that\s+trip|the\s+trip|same\s+destination|there|destination|arrival|arrive|walk|ride|stops|directions?|navigate|miss|missed|next\s+(?:one|bus|vehicle|streetcar)|another\s+(?:one|bus|vehicle|streetcar)|more\s+options?|other\s+options?|any\s+other|alternatives?|alternate\s+(?:routes?|ways?)|other\s+ways?|different\s+routes?|what\s+else|something\s+else|choices?)\b/i.test(input);
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

function isLocationQuestion(input: string): boolean {
  return /\b(?:where\s+am\s+i|where\s+are\s+we|my\s+location|current\s+location|where\s+is\s+my\s+location|am\s+i\s+near)\b/i.test(input);
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
  return /\b(?:what\s+about|how\s+about|tomorrow|tonight|this evening|later|then|(?:in\s+)?(?:\d+|one|two|three|four|five|six)\s+(?:minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?|(?:at|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i.test(input);
}

function parseAssistantTargetTime(input: string): Date | undefined {
  const text = input.toLowerCase();
  const now = new Date();
  const relative = text.match(/\b(?:in\s+)?(\d+|one|two|three|four|five|six)\s+(minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/);
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
    return new Date(now.getTime() + milliseconds);
  }

  if (/\btomorrow\b/.test(text)) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    return target;
  }

  if (/\btonight\b|\bthis evening\b/.test(text)) {
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  const explicitTime = text.match(/\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (explicitTime) {
    let hour = Number(explicitTime[1]);
    const minute = Number(explicitTime[2] ?? 0);
    const suffix = explicitTime[3];

    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (!suffix && hour >= 1 && hour <= 7) hour += 12;

    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  return undefined;
}

function parseRelativeTargetOffsetMinutes(input: string): number | undefined {
  const text = input.toLowerCase();
  const relative = text.match(/\b(?:in\s+)?(\d+|one|two|three|four|five|six)\s+(minute|minutes|hour|hours)(?:\s+later|\s+from\s+now)?\b/);
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
): { etaMin: number; arrivalTime: string; timingNote?: string } {
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

  const targetTime = parseAssistantTargetTime(input);
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
    };
  }

  return {
    etaMin: Math.max(0, Math.round((targetTime.getTime() - Date.now()) / 60000)),
    arrivalTime: formatTransitTime(targetTime),
    timingNote: `Around ${formatTransitTime(targetTime)},`,
  };
}

function buildDestinationOptionsAnswer(
  route: NavigationRoute,
  context: TransitAssistantContext,
): { text: string; etaMin: number; arrivalTime: string } {
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

async function answerWeatherQuestion(input: string, context: TransitAssistantContext): Promise<TransitAssistantAnswer> {
  const targetTime = parseAssistantTargetTime(input);

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
        context: { ...context, lastIntent: "weather" },
        text: describeForecastWeather(closest, targetTime, forecast.locationName),
      };
    }

    const weather = await getCurrentWeather(43.6532, -79.3832);
    return {
      matchedIntent: "weather",
      confidence: 88,
      context: { ...context, lastIntent: "weather" },
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
  const targetTime = parseAssistantTargetTime(input);
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
      context: { ...context, routeId, lastIntent: "traffic" },
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

async function answerDestinationQuestion(
  input: string,
  context: TransitAssistantContext,
): Promise<TransitAssistantAnswer | null> {
  const destinationQuery = extractDestinationQuery(input);
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

  const destinationId = context.destinationId ?? (await searchDestinations(destinationQuery ?? ""))[0]?.id;
  if (!destinationId) {
    return {
      matchedIntent: "navigation",
      confidence: 62,
      context,
      text: `I could not find "${destinationQuery}" as a destination yet. Try a known place like CN Tower, Kensington Market, or Spadina at Dundas.`,
    };
  }

  const route = await getNavigationRoute("current-location", destinationId);
  const stopName = route.busStop.replace(/[.]+$/, "");
  const transport = route.routeLabel.match(/^\d+/) ? "TTC transit" : "transit";
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
    lastIntent: "navigation" as const,
  };
  const intro = timing.timingNote
    ? `${timing.timingNote} take ${transport} route ${route.routeLabel} to get to ${route.destName}.`
    : `To get to ${route.destName}, take ${transport} route ${route.routeLabel}.`;

  return {
    matchedIntent: "navigation",
    confidence: timing.timingNote ? 78 : 86,
    context: nextContext,
    text: [
      intro,
      `Walk ${route.walkMin} min (${route.walkMeters} m) to ${stopName} station/stop.`,
      `The vehicle is estimated in ${timing.etaMin} min, then ride ${route.totalStops} stops.`,
      `Estimated arrival: ${timing.arrivalTime}.`,
    ].join(" "),
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
      const matchingStop = routeStops.find(stop => stop.routes.split(",").map(route => Number(route.trim())).includes(routeId));
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

export async function askTransitAssistant(
  input: string,
  context: TransitAssistantContext = {},
): Promise<TransitAssistantAnswer> {
  const q = input.trim();

  if (!q) {
    return {
      matchedIntent: "help",
      confidence: 90,
      text: 'Ask me about a TTC route, stop, ETA, delay, traffic, weather, or destination. For example: "When is the 501 coming at College?"',
    };
  }

  const clarificationAnswer = answerRouteClarification(q, context);
  if (clarificationAnswer) return clarificationAnswer;

  if (isLocationQuestion(q)) {
    return answerLocationQuestion(context);
  }

  const followUp = isGenericFollowUp(q) && hasAssistantContext(context);
  const wantsWeather = isWeatherQuestion(q) || (context.lastIntent === "weather" && (isTimeFollowUp(q) || followUp));
  const wantsTraffic = isTrafficQuestion(q) || (context.lastIntent === "traffic" && (isTimeFollowUp(q) || followUp));
  const wantsDelay = isDelayQuestion(q) || (context.lastIntent === "delay" && followUp);
  const wantsCrowding = isCrowdingQuestion(q) || (context.lastIntent === "crowding" && followUp);
  const wantsEta = isEtaQuestion(q) || (hasRouteContext(context) && (context.lastIntent === "eta" || followUp));

  const terminalAnswer = answerRouteTerminalQuestion(q, context);
  if (terminalAnswer) return terminalAnswer;

  if (wantsWeather) {
    return answerWeatherQuestion(q, context);
  }

  if (wantsTraffic && !wantsCrowding) {
    return answerTrafficQuestion(q, context);
  }

  const destinationAnswer = await answerDestinationQuestion(q, context);
  if (destinationAnswer) return destinationAnswer;

  const stopContextAnswer = await answerStopContextQuestion(q, context);
  if (stopContextAnswer) return stopContextAnswer;

  const isTransitQuestion = /bus|ttc|route|stop|station|eta|arriv|delay|late|weather|traffic|crowd|busy|navigate|direction|trip|destination|terminal|terminus|last stop|final stop|walk|go to|get to|take me|east|west|north|south|\b\d{3}\b/i.test(q) || followUp;
  if (!isTransitQuestion) {
    return {
      matchedIntent: "out-of-scope",
      confidence: 82,
      context,
      text: "I can help with TTC trip questions like arrival times, nearby stops, route delays, traffic, weather, and navigation.",
    };
  }

  try {
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
      return {
        matchedIntent: "delay",
        confidence,
        context: { ...nextContext, lastIntent: "delay" },
        text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. Main factors: ${summary}. Confidence: ${confidence}%.`,
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
