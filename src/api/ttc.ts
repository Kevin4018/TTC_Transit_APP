import { apiRequest } from "./request";
import { getTrafficImpact } from "./traffic";
import {
  getCurrentWeather,
  getWeatherForecast,
  type CurrentWeather,
  type WeatherForecastHour,
} from "./weather";

export type TransitSource = "mock" | "gtfs" | "ttc";

export interface StopResult {
  source: TransitSource;
  id: string;
  name: string;
  routes: string;
  distance: string;
}

export interface DestinationResult {
  source: TransitSource;
  id: string;
  name: string;
  address: string;
  distance: string;
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
  originCoordinates?: {
    lat: number;
    lng: number;
  };
  destName: string;
  destAddress: string;
  walkMin: number;
  walkMeters: number;
  busStop: string;
  routeLabel: string;
  etaMin: number;
  departureTime: string;
  arrivalTime: string;
  totalStops: number;
  alsoAt: string[];
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
  lastIntent?: TransitAssistantAnswer["matchedIntent"];
}

export interface TransitAssistantAnswer {
  text: string;
  matchedIntent: "eta" | "delay" | "weather" | "traffic" | "crowding" | "navigation" | "help" | "out-of-scope";
  confidence: number;
  context?: TransitAssistantContext;
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
): Promise<NavigationRoute> {
  return apiRequest<NavigationRoute>("/api/ttc/navigation", {
    params: {
      origin,
      destination,
      originLat: originPos?.[0],
      originLng: originPos?.[1],
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

function isDestinationFollowUp(input: string): boolean {
  return /\b(?:how\s+about|what\s+about|that\s+trip|the\s+trip|same\s+destination|there|destination|arrival|arrive|walk|ride|stops|directions?|navigate)\b/i.test(input);
}

function isWeatherQuestion(input: string): boolean {
  return /\b(?:weather|rain|raining|snow|snowing|storm|wind|windy|ice|icy|temperature|temp|hot|cold|humid|humidity)\b/i.test(input);
}

function isTrafficQuestion(input: string): boolean {
  return /\b(?:traffic|road|roads|congestion|jam|busy roads|rush hour)\b/i.test(input);
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
  const nextContext = { ...context, destinationId };

  return {
    matchedIntent: "navigation",
    confidence: 86,
    context: nextContext,
    text: [
      `To get to ${route.destName}, take ${transport} route ${route.routeLabel}.`,
      `Walk ${route.walkMin} min (${route.walkMeters} m) to ${stopName} station/stop.`,
      `The vehicle is estimated in ${route.etaMin} min, then ride ${route.totalStops} stops.`,
      `Estimated arrival: ${route.arrivalTime}.`,
    ].join(" "),
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
  const routeId = findRouteInText(input) ?? context.routeId;
  const directionFromText = findDirectionInText(input) ?? context.direction;
  let stopId = context.stopId;

  if (!stopId) {
    const stops = await searchStops(routeId ? String(routeId) : input);
    stopId = stops[0]?.id;
  }

  if (!stopId) {
    throw new Error("No matching stop");
  }

  let meta = await getStopMeta(stopId);
  if (routeId && !meta.routes.includes(routeId)) {
    const routeStops = await searchStops(String(routeId));
    const matchingStop = routeStops.find(stop => stop.routes.split(",").map(route => Number(route.trim())).includes(routeId));
    if (matchingStop) {
      stopId = matchingStop.id;
      meta = await getStopMeta(stopId);
    }
  }

  const route = routeId && meta.routes.includes(routeId) ? routeId : meta.routes[0];
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

  const destinationAnswer = await answerDestinationQuestion(q, context);
  if (destinationAnswer) return destinationAnswer;

  if (isWeatherQuestion(q) || (context.lastIntent === "weather" && isTimeFollowUp(q))) {
    return answerWeatherQuestion(q, context);
  }

  if (isTrafficQuestion(q) || (context.lastIntent === "traffic" && isTimeFollowUp(q))) {
    return answerTrafficQuestion(q, context);
  }

  const isTransitQuestion = /bus|ttc|route|stop|station|eta|arriv|delay|late|weather|traffic|crowd|busy|navigate|direction|trip|destination|walk|go to|get to|take me|east|west|north|south|\b\d{3}\b/i.test(q);
  if (!isTransitQuestion) {
    return {
      matchedIntent: "out-of-scope",
      confidence: 82,
      text: "I can help with TTC trip questions like arrival times, nearby stops, route delays, traffic, weather, and navigation.",
    };
  }

  try {
    const { prediction, context: nextContext } = await pickAssistantPrediction(q, context);
    const { confidence, summary } = describePrediction(prediction);
    const stopName = prediction.stopName.replace(/[.]+$/, "");

    if (/weather|rain|snow|storm|wind|ice/i.test(q)) {
      return {
        matchedIntent: "weather",
        confidence,
        context: nextContext,
        text: prediction.offsets.weather > 0
          ? `Weather is adding about ${prediction.offsets.weather} min. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`
          : `Weather is not adding delay right now. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`,
      };
    }

    if (/traffic|road|congestion/i.test(q)) {
      return {
        matchedIntent: "traffic",
        confidence,
        context: nextContext,
        text: prediction.offsets.traffic > 0
          ? `Traffic is adding about ${prediction.offsets.traffic} min. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`
          : `Traffic is not adding delay right now. Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}.`,
      };
    }

    if (/crowd|busy|full|passenger|load/i.test(q)) {
      return {
        matchedIntent: "crowding",
        confidence,
        context: nextContext,
        text: "Crowding is not connected to a live data source yet, so I can only answer ETA, schedule, weather, traffic, accident, and construction factors for now.",
      };
    }

    if (/delay|late|slow|behind|accident|construction/i.test(q)) {
      return {
        matchedIntent: "delay",
        confidence,
        context: nextContext,
        text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. Main factors: ${summary}. Confidence: ${confidence}%.`,
      };
    }

    return {
      matchedIntent: "eta",
      confidence,
      context: nextContext,
      text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. ${summary}. Confidence: ${confidence}%.`,
    };
  } catch {
    return {
      matchedIntent: "help",
      confidence: 65,
      context,
      text: "I could not match that to a TTC stop yet. Try including a stop name and route number, like 501 at College.",
    };
  }
}
