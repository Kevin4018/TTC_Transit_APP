import { apiRequest } from "./request";

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
    const stops = await searchStops(input);
    stopId = stops[0]?.id;
  }

  if (!stopId) {
    throw new Error("No matching stop");
  }

  const meta = await getStopMeta(stopId);
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

  const isTransitQuestion = /bus|ttc|route|stop|station|eta|arriv|delay|late|weather|traffic|crowd|busy|navigate|direction|trip|destination|walk|east|west|north|south|\b\d{3}\b/i.test(q);
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
