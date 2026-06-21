export type TrafficEventType = "traffic" | "accident" | "construction";

export interface TrafficEvent {
  id: string;
  type: TrafficEventType;
  title: string;
  description: string;
  lat?: number;
  lng?: number;
  delayMin: number;
  source: "mock" | "tomtom";
}

export interface TrafficImpact {
  source: "mock" | "tomtom";
  trafficDelayMin: number;
  accidentDelayMin: number;
  constructionDelayMin: number;
  events: TrafficEvent[];
}

interface TomTomFlowResponse {
  flowSegmentData?: {
    currentSpeed?: number;
    freeFlowSpeed?: number;
    currentTravelTime?: number;
    freeFlowTravelTime?: number;
    confidence?: number;
    roadClosure?: boolean;
  };
}

interface TomTomIncidentFeature {
  id?: string;
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    events?: Array<{ description?: string; code?: number }>;
    from?: string;
    to?: string;
    length?: number;
    delay?: number;
    roadNumbers?: string[];
  };
}

interface TomTomIncidentResponse {
  incidents?: TomTomIncidentFeature[];
}

const TOMTOM_API_BASE_URL = "https://api.tomtom.com";
const TOMTOM_TRAFFIC_TIMEOUT_MS = 3500;
const TOMTOM_INCIDENT_RADIUS_DEGREES = 0.025;

const getRouteNumber = (routeId: unknown) => {
  const parsed = Number(routeId);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ROUTE_PRESSURE: Record<number, number> = {
  501: 0.9,
  502: 0.62,
  503: 0.72,
  504: 0.92,
  505: 0.76,
  506: 0.84,
  510: 0.86,
  511: 0.78,
};

const TORONTO_CORE = {
  lat: 43.6532,
  lng: -79.3832,
};

function torontoClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? now.getHours());
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? now.getMinutes());
  const weekday = parts.find(part => part.type === "weekday")?.value ?? "";
  const normalizedHour = hour % 24;
  const displayHour = normalizedHour === 0 ? 12 : normalizedHour > 12 ? normalizedHour - 12 : normalizedHour;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";

  return {
    hourFloat: hour + minute / 60,
    isWeekend: weekday === "Sat" || weekday === "Sun",
    label: `${displayHour}:${String(minute).padStart(2, "0")} ${suffix} ${weekday || "local"}`,
  };
}

function curvePeak(hour: number, center: number, width: number) {
  return Math.exp(-Math.pow(hour - center, 2) / (2 * width * width));
}

function getTimeTrafficPressure(now = new Date()) {
  const clock = torontoClock(now);
  const base = clock.isWeekend ? 0.1 : 0.08;
  const morningPeak = curvePeak(clock.hourFloat, 8.15, 0.9) * (clock.isWeekend ? 0.18 : 0.74);
  const lunchPressure = curvePeak(clock.hourFloat, 12.6, 1.35) * (clock.isWeekend ? 0.22 : 0.24);
  const afternoonPeak = curvePeak(clock.hourFloat, 17.25, 1.05) * (clock.isWeekend ? 0.3 : 0.82);
  const eveningPressure = curvePeak(clock.hourFloat, 20.5, 1.4) * (clock.isWeekend ? 0.36 : 0.22);
  const earlyMorning = clock.hourFloat < 5.75;
  const score = earlyMorning
    ? Math.min(0.06, base)
    : Math.min(1, base + morningPeak + lunchPressure + afternoonPeak + eveningPressure);

  return {
    score,
    label: clock.label,
    earlyMorning,
  };
}

function getDowntownPressure(lat: number, lng: number) {
  const latDistance = Math.abs(lat - TORONTO_CORE.lat);
  const lngDistance = Math.abs(lng - TORONTO_CORE.lng);
  const distanceScore = Math.max(0, 1 - (latDistance + lngDistance) / 0.12);

  return Math.min(1, Math.max(0.25, distanceScore));
}

function getTrafficDelayFromScore(score: number) {
  if (score >= 0.78) return { delayMin: 4, title: "Heavy downtown traffic" };
  if (score >= 0.58) return { delayMin: 3, title: "Moderate downtown traffic" };
  if (score >= 0.48) return { delayMin: 1, title: "Light downtown traffic" };
  return { delayMin: 0, title: "Light traffic" };
}

function getMockTrafficImpact(
  lat: number,
  lng: number,
  routeId: unknown,
  at?: string,
): TrafficImpact {
  const routeNumber = getRouteNumber(routeId);
  const targetTime = at ? new Date(at) : new Date();
  const downtownRoute = routeNumber >= 500 && routeNumber < 600;
  const routePressure = ROUTE_PRESSURE[routeNumber] ?? (downtownRoute ? 0.62 : 0.35);
  const timePressure = getTimeTrafficPressure(Number.isNaN(targetTime.getTime()) ? new Date() : targetTime);
  const downtownPressure = getDowntownPressure(lat, lng);
  const rawTrafficScore = (
    timePressure.score * 0.48 +
    routePressure * 0.32 +
    downtownPressure * 0.2
  );
  const trafficScore = timePressure.earlyMorning ? Math.min(rawTrafficScore, 0.32) : Math.min(1, rawTrafficScore);
  const traffic = getTrafficDelayFromScore(trafficScore);

  const trafficDelayMin = traffic.delayMin;
  const accidentDelayMin = routeNumber === 501 ? 1 : 0;
  const constructionDelayMin = routeNumber === 506 ? 1 : 0;
  const events: TrafficEvent[] = [];

  if (trafficDelayMin > 0) {
    events.push({
      id: `mock-traffic-${routeNumber}`,
      type: "traffic",
      title: traffic.title,
      description: `At ${timePressure.label}, route ${routeNumber} has a traffic pressure score of ${trafficScore.toFixed(2)} based on time of day, route demand, and downtown proximity.`,
      lat,
      lng,
      delayMin: trafficDelayMin,
      source: "mock",
    });
  }

  if (accidentDelayMin > 0) {
    events.push({
      id: `mock-accident-${routeNumber}`,
      type: "accident",
      title: "Minor incident near route corridor",
      description: `A mock incident is being used to test accident delay reporting for route ${routeNumber}.`,
      lat,
      lng,
      delayMin: accidentDelayMin,
      source: "mock",
    });
  }

  if (constructionDelayMin > 0) {
    events.push({
      id: `mock-construction-${routeNumber}`,
      type: "construction",
      title: "Construction activity near stop",
      description: `A mock construction event is being used to test construction delay reporting for route ${routeNumber}.`,
      lat,
      lng,
      delayMin: constructionDelayMin,
      source: "mock",
    });
  }

  return {
    source: "mock",
    trafficDelayMin,
    accidentDelayMin,
    constructionDelayMin,
    events,
  };
}

function getIncidentCoordinates(incident: TomTomIncidentFeature) {
  const coordinates = incident.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  const firstPosition = JSON.stringify(coordinates).match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/);
  if (!firstPosition) return null;

  const [lngText, latText] = firstPosition[0].split(",");
  const lat = Number(latText);
  const lng = Number(lngText);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function getIncidentType(iconCategory?: number): TrafficEventType {
  if (iconCategory === 1 || iconCategory === 8 || iconCategory === 9) return "accident";
  if (iconCategory === 6 || iconCategory === 7 || iconCategory === 14) return "construction";
  return "traffic";
}

function getIncidentDelayMin(incident: TomTomIncidentFeature) {
  const delaySeconds = Number(incident.properties?.delay ?? 0);
  if (Number.isFinite(delaySeconds) && delaySeconds > 0) {
    return Math.min(6, Math.max(1, Math.round(delaySeconds / 60)));
  }

  const magnitude = Number(incident.properties?.magnitudeOfDelay ?? 0);
  if (magnitude >= 4) return 5;
  if (magnitude === 3) return 3;
  if (magnitude === 2) return 2;
  return 1;
}

function describeTomTomIncident(incident: TomTomIncidentFeature) {
  const properties = incident.properties;
  const eventDescription = properties?.events?.find(event => event.description)?.description;
  const roadText = properties?.roadNumbers?.length ? ` on ${properties.roadNumbers.join(", ")}` : "";
  const fromTo = properties?.from || properties?.to
    ? ` between ${properties?.from ?? "nearby"} and ${properties?.to ?? "nearby"}`
    : "";

  return `${eventDescription ?? "Traffic incident"}${roadText}${fromTo}.`;
}

function getFlowDelayMin(flow: TomTomFlowResponse["flowSegmentData"]) {
  if (!flow) return 0;
  if (flow.roadClosure) return 6;

  const currentTravelTime = Number(flow.currentTravelTime ?? 0);
  const freeFlowTravelTime = Number(flow.freeFlowTravelTime ?? 0);
  if (currentTravelTime > 0 && freeFlowTravelTime > 0) {
    return Math.min(6, Math.max(0, Math.round((currentTravelTime - freeFlowTravelTime) / 60)));
  }

  const currentSpeed = Number(flow.currentSpeed ?? 0);
  const freeFlowSpeed = Number(flow.freeFlowSpeed ?? 0);
  if (currentSpeed > 0 && freeFlowSpeed > 0) {
    const ratio = currentSpeed / freeFlowSpeed;
    if (ratio < 0.35) return 5;
    if (ratio < 0.55) return 3;
    if (ratio < 0.75) return 1;
  }

  return 0;
}

async function fetchTomTomJson<T>(path: string, params: URLSearchParams): Promise<T | null> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return null;

  params.set("key", apiKey);
  const response = await fetch(`${TOMTOM_API_BASE_URL}${path}?${params.toString()}`, {
    signal: AbortSignal.timeout(TOMTOM_TRAFFIC_TIMEOUT_MS),
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

async function getTomTomTrafficImpact(
  lat: number,
  lng: number,
): Promise<TrafficImpact | null> {
  const flowParams = new URLSearchParams({
    point: `${lat},${lng}`,
    unit: "kmph",
  });
  const flow = await fetchTomTomJson<TomTomFlowResponse>(
    "/traffic/services/4/flowSegmentData/absolute/12/json",
    flowParams,
  );

  const bbox = [
    lng - TOMTOM_INCIDENT_RADIUS_DEGREES,
    lat - TOMTOM_INCIDENT_RADIUS_DEGREES,
    lng + TOMTOM_INCIDENT_RADIUS_DEGREES,
    lat + TOMTOM_INCIDENT_RADIUS_DEGREES,
  ].join(",");
  const incidentParams = new URLSearchParams({
    bbox,
    fields: "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code},from,to,length,delay,roadNumbers}}}",
    language: "en-CA",
    timeValidityFilter: "present",
  });
  const incidentsResponse = await fetchTomTomJson<TomTomIncidentResponse>(
    "/traffic/services/5/incidentDetails",
    incidentParams,
  );

  if (!flow?.flowSegmentData && !incidentsResponse?.incidents?.length) return null;

  const events: TrafficEvent[] = [];
  const flowDelayMin = getFlowDelayMin(flow?.flowSegmentData);

  if (flow?.flowSegmentData) {
    events.push({
      id: "tomtom-flow-nearest-road",
      type: "traffic",
      title: flow.flowSegmentData.roadClosure ? "Road closure near route" : "Live traffic flow near route",
      description: `Current speed is ${flow.flowSegmentData.currentSpeed ?? "unknown"} km/h; free-flow speed is ${flow.flowSegmentData.freeFlowSpeed ?? "unknown"} km/h.`,
      lat,
      lng,
      delayMin: flowDelayMin,
      source: "tomtom",
    });
  }

  for (const incident of incidentsResponse?.incidents ?? []) {
    const type = getIncidentType(incident.properties?.iconCategory);
    const position = getIncidentCoordinates(incident);
    events.push({
      id: incident.properties?.id ?? incident.id ?? `tomtom-incident-${events.length}`,
      type,
      title: type === "accident" ? "Live traffic incident" : type === "construction" ? "Live roadwork or closure" : "Live traffic disruption",
      description: describeTomTomIncident(incident),
      lat: position?.lat ?? lat,
      lng: position?.lng ?? lng,
      delayMin: getIncidentDelayMin(incident),
      source: "tomtom",
    });
  }

  return {
    source: "tomtom",
    trafficDelayMin: Math.max(
      flowDelayMin,
      ...events.filter(event => event.type === "traffic").map(event => event.delayMin),
      0,
    ),
    accidentDelayMin: Math.max(
      ...events.filter(event => event.type === "accident").map(event => event.delayMin),
      0,
    ),
    constructionDelayMin: Math.max(
      ...events.filter(event => event.type === "construction").map(event => event.delayMin),
      0,
    ),
    events: events.filter(event => event.delayMin > 0 || event.type !== "traffic"),
  };
}

export async function getTrafficImpact(
  lat: number,
  lng: number,
  routeId: unknown,
  at?: string,
): Promise<TrafficImpact> {
  const fallback = getMockTrafficImpact(lat, lng, routeId, at);

  try {
    const liveImpact = await getTomTomTrafficImpact(lat, lng);
    if (!liveImpact) return fallback;

    return liveImpact;
  } catch {
    return fallback;
  }
}
