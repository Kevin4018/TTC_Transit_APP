// ─── Types ────────────────────────────────────────────────────────────────────

export interface StopResult {
  id: string;
  name: string;
  routes: string;   // e.g. "501, 506"
  distance: string; // e.g. "0.8 km"
}

export interface DestinationResult {
  id: string;
  name: string;
  address: string;
  distance: string;
}

export interface NearbyStop {
  stopId: string;
  name: string;
  pos: [number, number];
}

export interface Prediction {
  stopName: string;
  routeId: number;
  direction: string;
  etaMin: number;
  confidence: number;
  weatherSource: string;
  weatherDescription: string;
  trafficDescription: string;
  passengerLoadLevel: "low" | "normal" | "busy" | "crowded";
  passengerLoadDescription: string;
  dirs: [string, string];
  routes: number[];
  offsets: {
    schedule: number;
    weather: number;
    traffic: number;
    passengerLoad: number;
    accidents: number;
    construction: number;
  };
  summary: string;
}

export interface BusReport {
  stopName: string;
  routeId: number;
  etaMin: number;
  confidence: number;
  weatherSource: string;
  weatherDescription: string;
  trafficDescription: string;
  passengerLoadLevel: "low" | "normal" | "busy" | "crowded";
  passengerLoadDescription: string;
  factors: {
    schedule: { value: number; description: string };
    weather:  { value: number; description: string };
    traffic:  { value: number; description: string };
    passengerLoad: { value: number; description: string };
    accidents:    { value: number; description: string };
    construction: { value: number; description: string };
  };
}

export interface NavigationRoute {
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

// ─── Mock data store ──────────────────────────────────────────────────────────

const delay = (ms = 300) => new Promise<void>(r => setTimeout(r, ms));

interface StopRecord {
  name: string;
  routes: number[];
  dirs: [string, string];
  pos: [number, number];
  predictions: Record<string, Record<number, {
    base: number;
    schedule: number;
    weather: number;
    traffic: number;
    passengerLoad: number;
    accidents: number;
    construction: number;
  }>>;
}

const STOPS_DB: Record<string, StopRecord> = {
  "college-yonge": {
    name: "College St. at Yonge St.", routes: [501, 506],
    dirs: ["Westbound", "Eastbound"], pos: [43.6613, -79.3837],
    predictions: {
      Westbound: { 501: { base: 8, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 }, 506: { base: 10, schedule: 0, weather: 1, traffic: 3, passengerLoad: 0, accidents: 0, construction: 0 } },
      Eastbound: { 501: { base: 1, schedule: -2, weather: 2, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 }, 506: { base: 4, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 } },
    },
  },
  "queen-spadina": {
    name: "Queen St. at Spadina Ave.", routes: [501, 503, 504],
    dirs: ["Westbound", "Eastbound"], pos: [43.6484, -79.3976],
    predictions: {
      Westbound: { 501: { base: 6, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 503: { base: 10, schedule: 0, weather: 2, traffic: 3, passengerLoad: 0, accidents: 0, construction: 0 }, 504: { base: 8, schedule: 0, weather: 1, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 } },
      Eastbound: { 501: { base: 1, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 503: { base: 5, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 }, 504: { base: 3, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 } },
    },
  },
  "king-bay": {
    name: "King St. at Bay St.", routes: [502, 503, 504],
    dirs: ["Westbound", "Eastbound"], pos: [43.6480, -79.3780],
    predictions: {
      Westbound: { 502: { base: 9, schedule: 0, weather: 1, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 503: { base: 4, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 504: { base: 7, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 } },
      Eastbound: { 502: { base: 4, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 }, 503: { base: 1, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 504: { base: 2, schedule: 0, weather: 0, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 } },
    },
  },
  "spadina-nassau": {
    name: "Spadina at Nassau", routes: [510],
    dirs: ["Eastbound", "Southbound"], pos: [43.6600, -79.4018],
    predictions: {
      Eastbound:  { 510: { base: 1, schedule: -2, weather: 2, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 } },
      Southbound: { 510: { base: 3, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 } },
    },
  },
  "spadina-dundas": {
    name: "Spadina at Dundas", routes: [505, 510],
    dirs: ["Eastbound", "Westbound"], pos: [43.6547, -79.4003],
    predictions: {
      Eastbound: { 505: { base: 5, schedule: 0, weather: 1, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 }, 510: { base: 2, schedule: 0, weather: 1, traffic: 1, passengerLoad: 0, accidents: 0, construction: 0 } },
      Westbound: { 505: { base: 8, schedule: 0, weather: 2, traffic: 1, passengerLoad: 1, accidents: 0, construction: 0 }, 510: { base: 4, schedule: 0, weather: 1, traffic: 2, passengerLoad: 0, accidents: 0, construction: 0 } },
    },
  },
};

const DEST_DB: Record<string, { name: string; address: string; distance: string; walkMin: number; walkMeters: number; busStop: string; routeLabel: string; etaMin: number; departureTime: string; arrivalTime: string; totalStops: number; alsoAt: string[] }> = {
  "dest-spadina-nassau": { name: "Spadina at Nassau", address: "Spadina Ave, Toronto, ON", distance: "1.5 km", walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 10, departureTime: "18:08", arrivalTime: "18:38", totalStops: 12, alsoAt: ["30 min", "60 min"] },
  "dest-spadina-dundas": { name: "Spadina at Dundas", address: "Spadina Ave, Toronto, ON", distance: "2 km",   walkMin: 7, walkMeters: 480, busStop: "Spadina at Nassau",         routeLabel: "510 Spadina", etaMin: 14, departureTime: "18:08", arrivalTime: "18:45", totalStops: 8,  alsoAt: ["30 min", "60 min"] },
  "dest-cn-tower":       { name: "CN Tower",          address: "290 Bremner Blvd, Toronto, ON", distance: "3 km",   walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 18, departureTime: "18:08", arrivalTime: "18:55", totalStops: 15, alsoAt: ["30 min", "60 min"] },
  "dest-kensington":     { name: "Kensington Market", address: "Kensington Ave, Toronto, ON",   distance: "1.8 km", walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 12, departureTime: "18:08", arrivalTime: "18:40", totalStops: 10, alsoAt: ["30 min", "60 min"] },
};

type PredictionFactors = StopRecord["predictions"][string][number];

interface WeatherImpact {
  delayMin: number;
  description: string;
  source: string;
}

interface PassengerLoadImpact {
  delayMin: number;
  level: "low" | "normal" | "busy" | "crowded";
  description: string;
}

interface TrafficImpact {
  delayMin: number;
  level: "light" | "normal" | "moderate" | "heavy";
  description: string;
}

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    rain?: number;
    snowfall?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
  };
}

const FACTOR_LABELS: Record<keyof PredictionFactors, string> = {
  base: "base running time",
  schedule: "schedule variance",
  weather: "weather",
  traffic: "traffic",
  passengerLoad: "passenger load",
  accidents: "accidents",
  construction: "construction",
};

const STOP_POPULARITY: Record<string, number> = {
  "college-yonge": 0.82,
  "queen-spadina": 0.9,
  "king-bay": 0.95,
  "spadina-nassau": 0.58,
  "spadina-dundas": 0.74,
};

const ROUTE_POPULARITY: Record<number, number> = {
  501: 0.88,
  502: 0.62,
  503: 0.72,
  504: 0.92,
  505: 0.76,
  506: 0.8,
  510: 0.84,
};

const CROWDING_REPORTS: Record<string, Record<number, Partial<Record<string, number>>>> = {
  "college-yonge": { 506: { Westbound: 0.65 }, 501: { Westbound: 0.45, Eastbound: 0.25 } },
  "queen-spadina": { 501: { Westbound: 0.7 }, 504: { Westbound: 0.68 } },
  "king-bay": { 504: { Westbound: 0.78, Eastbound: 0.62 }, 503: { Westbound: 0.48 } },
  "spadina-dundas": { 510: { Westbound: 0.52 }, 505: { Westbound: 0.6 } },
};

const TRAFFIC_CORRIDOR_PRESSURE: Record<string, number> = {
  "college-yonge": 0.78,
  "queen-spadina": 0.86,
  "king-bay": 0.92,
  "spadina-nassau": 0.58,
  "spadina-dundas": 0.76,
};

export const TRANSIT_ASSISTANT_SYSTEM_PROMPT = [
  "You are Milk Bot, a TTC trip assistant for Toronto riders.",
  "Answer only transit, trip planning, stop, delay, weather, crowding, and ETA questions.",
  "Base every ETA answer on structured prediction data: base running time, schedule variance, weather, traffic, passenger load, accidents, and construction.",
  "Give a direct estimate first, then name the biggest factors and confidence.",
  "If the user asks for unrelated content, briefly redirect them to transportation help.",
  "Never invent live data. If data is mocked, explain it as an app estimate.",
].join(" ");

function estimateEtaMin(factors: PredictionFactors): number {
  return Math.max(
    0,
    Math.round(
      factors.base +
      factors.schedule +
      factors.weather +
      factors.traffic +
      factors.passengerLoad +
      factors.accidents +
      factors.construction,
    ),
  );
}

function confidenceFor(factors: PredictionFactors): number {
  const variableDelay = Math.abs(factors.weather) + Math.abs(factors.traffic) + Math.abs(factors.passengerLoad) + Math.abs(factors.accidents) + Math.abs(factors.construction);
  return Math.max(62, Math.min(94, 92 - variableDelay * 4));
}

function describeWeatherCode(code: number | undefined): string {
  if (code === undefined) return "current conditions";
  if (code === 0) return "clear conditions";
  if ([1, 2, 3].includes(code)) return "partly cloudy conditions";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "current conditions";
}

function weatherDelayFromCurrent(current: OpenMeteoCurrentResponse["current"], fallbackDelay: number): WeatherImpact {
  if (!current) {
    return {
      delayMin: fallbackDelay,
      description: fallbackDelay > 0 ? `Weather may add about ${fallbackDelay} min.` : "No weather delay expected.",
      source: "mock fallback",
    };
  }

  const precipitation = current.precipitation ?? Math.max(current.rain ?? 0, current.snowfall ?? 0);
  const windSpeed = current.wind_speed_10m ?? 0;
  const windGusts = current.wind_gusts_10m ?? 0;
  const code = current.weather_code;
  let delayMin = 0;

  if (precipitation >= 4) delayMin += 3;
  else if (precipitation >= 1) delayMin += 2;
  else if (precipitation > 0) delayMin += 1;

  if ((current.snowfall ?? 0) > 0 || [71, 73, 75, 77, 85, 86].includes(code ?? -1)) delayMin += 2;
  if ([95, 96, 99].includes(code ?? -1)) delayMin += 3;
  if (windGusts >= 60 || windSpeed >= 40) delayMin += 1;

  const condition = describeWeatherCode(code);
  const temp = current.temperature_2m;
  const tempText = temp === undefined ? "" : `, ${Math.round(temp)}°C`;
  const precipText = precipitation > 0 ? `, ${precipitation.toFixed(1)} mm precipitation` : "";
  const windText = windSpeed > 0 ? `, ${Math.round(windSpeed)} km/h wind` : "";

  return {
    delayMin: Math.min(delayMin, 6),
    description: `Current weather: ${condition}${tempText}${precipText}${windText}.`,
    source: "Open-Meteo current weather",
  };
}

function torontoClock(now = new Date()): { hour: number; minute: number; weekday: string; isWeekend: boolean; hourFloat: number; label: string } {
  const torontoTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(torontoTime.find(part => part.type === "hour")?.value ?? now.getHours());
  const minute = Number(torontoTime.find(part => part.type === "minute")?.value ?? now.getMinutes());
  const weekday = torontoTime.find(part => part.type === "weekday")?.value ?? "";
  const hourFloat = hour + minute / 60;
  const normalizedHour = hour % 24;
  const displayHour = normalizedHour === 0 ? 12 : normalizedHour > 12 ? normalizedHour - 12 : normalizedHour;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";

  return {
    hour,
    minute,
    weekday,
    isWeekend: weekday === "Sat" || weekday === "Sun",
    hourFloat,
    label: `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`,
  };
}

function curvePeak(hour: number, center: number, width: number): number {
  return Math.exp(-Math.pow(hour - center, 2) / (2 * width * width));
}

function trafficTimeDemandScore(now = new Date()): { score: number; label: string; earlyMorning: boolean } {
  const clock = torontoClock(now);
  const base = clock.isWeekend ? 0.1 : 0.08;
  const morningPeak = curvePeak(clock.hourFloat, 8.15, 0.9) * (clock.isWeekend ? 0.18 : 0.74);
  const lunchPressure = curvePeak(clock.hourFloat, 12.6, 1.35) * (clock.isWeekend ? 0.22 : 0.24);
  const afternoonPeak = curvePeak(clock.hourFloat, 17.25, 1.05) * (clock.isWeekend ? 0.3 : 0.82);
  const eveningPressure = curvePeak(clock.hourFloat, 20.5, 1.4) * (clock.isWeekend ? 0.36 : 0.22);
  const earlyMorning = clock.hourFloat < 5.75;
  const score = earlyMorning ? Math.min(0.06, base) : Math.min(1, base + morningPeak + lunchPressure + afternoonPeak + eveningPressure);

  return {
    score,
    label: `${clock.label} ${clock.isWeekend ? "weekend" : "weekday"}`,
    earlyMorning,
  };
}

function commuteDirectionBoost(direction: string, now = new Date()): { boost: number; label: string } {
  const { hourFloat } = torontoClock(now);
  const morningStrength = curvePeak(hourFloat, 8.15, 0.95);
  const afternoonStrength = curvePeak(hourFloat, 17.25, 1.1);

  if (["Eastbound", "Southbound"].includes(direction) && morningStrength > 0.35) {
    return { boost: 0.12 * morningStrength, label: "morning commute direction" };
  }
  if (["Westbound", "Northbound"].includes(direction) && afternoonStrength > 0.35) {
    return { boost: 0.12 * afternoonStrength, label: "afternoon commute direction" };
  }
  return { boost: 0, label: "neutral direction" };
}

function passengerTimeDemandScore(now = new Date()): { score: number; label: string; earlyMorning: boolean } {
  const clock = torontoClock(now);
  const base = clock.isWeekend ? 0.12 : 0.1;
  const morningBoarding = curvePeak(clock.hourFloat, 8.0, 0.75) * (clock.isWeekend ? 0.16 : 0.76);
  const schoolLunchErrands = curvePeak(clock.hourFloat, 12.3, 1.25) * (clock.isWeekend ? 0.3 : 0.28);
  const afternoonBoarding = curvePeak(clock.hourFloat, 17.1, 0.95) * (clock.isWeekend ? 0.32 : 0.8);
  const nightlifeBoarding = curvePeak(clock.hourFloat, 21.7, 1.55) * (clock.isWeekend ? 0.44 : 0.2);
  const earlyMorning = clock.hourFloat < 5.75;
  const score = earlyMorning ? Math.min(0.05, base) : Math.min(1, base + morningBoarding + schoolLunchErrands + afternoonBoarding + nightlifeBoarding);

  return {
    score,
    label: `${clock.label} ${clock.isWeekend ? "weekend" : "weekday"}`,
    earlyMorning,
  };
}

function trafficMessage(level: TrafficImpact["level"], delayMin: number, timeLabel: string): string {
  if (delayMin === 0) return `Roads look quiet near this stop for ${timeLabel}.`;
  if (level === "normal") return `Traffic is moving normally near this stop for ${timeLabel}.`;
  if (level === "moderate") return `Traffic is slower than usual near this stop for ${timeLabel}.`;
  return `Heavy traffic is expected near this stop for ${timeLabel}.`;
}

function trafficDelayFromScore(score: number): { delayMin: number; level: TrafficImpact["level"] } {
  if (score >= 0.78) return { delayMin: 4, level: "heavy" };
  if (score >= 0.58) return { delayMin: 3, level: "moderate" };
  if (score >= 0.5) return { delayMin: 1, level: "normal" };
  return { delayMin: 0, level: "light" };
}

function estimateTrafficImpact(
  stopId: string,
  routeId: number,
  direction: string,
  fallbackDelay: number,
): TrafficImpact {
  const timeDemand = trafficTimeDemandScore();
  const directionDemand = commuteDirectionBoost(direction);
  const corridorPressure = TRAFFIC_CORRIDOR_PRESSURE[stopId] ?? 0.5;
  const routePressure = ROUTE_POPULARITY[routeId] ?? 0.5;
  const fallbackPressure = Math.min(1, Math.max(0, fallbackDelay / 4));

  const rawScore = Math.min(1, Math.max(0, (
    timeDemand.score * 0.42 +
    corridorPressure * 0.26 +
    routePressure * 0.16 +
    fallbackPressure * 0.1 +
    directionDemand.boost * 0.6
  )));
  const score = timeDemand.earlyMorning ? Math.min(rawScore, 0.28) : rawScore;
  const { delayMin, level } = trafficDelayFromScore(score);
  return {
    delayMin,
    level,
    description: trafficMessage(level, delayMin, timeDemand.label),
  };
}

function passengerDelayFromScore(score: number): { delayMin: number; level: PassengerLoadImpact["level"] } {
  if (score >= 0.78) return { delayMin: 3, level: "crowded" };
  if (score >= 0.58) return { delayMin: 2, level: "busy" };
  if (score >= 0.5) return { delayMin: 1, level: "normal" };
  return { delayMin: 0, level: "low" };
}

function passengerLoadMessage(level: PassengerLoadImpact["level"], delayMin: number, timeLabel: string): string {
  if (delayMin === 0) return `Passenger volume looks low for ${timeLabel}.`;
  if (level === "normal") return `Passenger volume is normal for this time.`;
  if (level === "busy") return `This route may be busier than usual right now.`;
  return `This route may be crowded right now.`;
}

function estimatePassengerLoadImpact(
  stopId: string,
  routeId: number,
  direction: string,
  fallbackDelay: number,
): PassengerLoadImpact {
  const timeDemand = passengerTimeDemandScore();
  const directionDemand = commuteDirectionBoost(direction);
  const stopDemand = STOP_POPULARITY[stopId] ?? 0.5;
  const routeDemand = ROUTE_POPULARITY[routeId] ?? 0.5;
  const reportDemand = CROWDING_REPORTS[stopId]?.[routeId]?.[direction] ?? 0.35;
  const fallbackDemand = Math.min(1, Math.max(0, fallbackDelay / 3));

  const rawScore = Math.min(1, Math.max(0, (
    timeDemand.score * 0.34 +
    stopDemand * 0.2 +
    routeDemand * 0.2 +
    reportDemand * 0.18 +
    fallbackDemand * 0.08 +
    directionDemand.boost
  )));
  const score = timeDemand.earlyMorning ? Math.min(rawScore, 0.28) : rawScore;
  const { delayMin, level } = passengerDelayFromScore(score);
  return {
    delayMin,
    level,
    description: passengerLoadMessage(level, delayMin, timeDemand.label),
  };
}

async function getCurrentWeatherImpact(lat: number, lng: number, fallbackDelay: number): Promise<WeatherImpact> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_gusts_10m",
    timezone: "America/Toronto",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const data = await response.json() as OpenMeteoCurrentResponse;
    return weatherDelayFromCurrent(data.current, fallbackDelay);
  } catch {
    return weatherDelayFromCurrent(undefined, fallbackDelay);
  }
}

function factorSummary(factors: PredictionFactors): string {
  const ranked = (Object.entries(factors) as [keyof PredictionFactors, number][])
    .filter(([key, value]) => key !== "base" && value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  if (ranked.length === 0) return "Running close to schedule with no major delay factors.";

  return ranked
    .slice(0, 2)
    .map(([key, value]) => `${FACTOR_LABELS[key]} ${value > 0 ? "adds" : "saves"} ${Math.abs(value)} min`)
    .join("; ");
}

async function buildPrediction(stopId: string, routeId: number, direction: string): Promise<Prediction> {
  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);
  const p = stop.predictions[direction]?.[routeId];
  if (!p) throw new Error(`No prediction for stop=${stopId} route=${routeId} dir=${direction}`);
  const weather = await getCurrentWeatherImpact(stop.pos[0], stop.pos[1], p.weather);
  const traffic = estimateTrafficImpact(stopId, routeId, direction, p.traffic);
  const passengerLoad = estimatePassengerLoadImpact(stopId, routeId, direction, p.passengerLoad);
  const factors = { ...p, weather: weather.delayMin, traffic: traffic.delayMin, passengerLoad: passengerLoad.delayMin };

  return {
    stopName: stop.name,
    routeId,
    direction,
    etaMin: estimateEtaMin(factors),
    confidence: confidenceFor(factors),
    weatherSource: weather.source,
    weatherDescription: weather.description,
    trafficDescription: traffic.description,
    passengerLoadLevel: passengerLoad.level,
    passengerLoadDescription: passengerLoad.description,
    dirs: stop.dirs,
    routes: stop.routes,
    offsets: {
      schedule: factors.schedule,
      weather: factors.weather,
      traffic: factors.traffic,
      passengerLoad: factors.passengerLoad,
      accidents: p.accidents,
      construction: p.construction,
    },
    summary: factorSummary(factors),
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export interface StopMeta {
  id: string;
  name: string;
  routes: number[];
  dirs: [string, string];
}

export async function getStopMeta(stopId: string): Promise<StopMeta> {
  await delay(100);
  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);
  return { id: stopId, name: stop.name, routes: stop.routes, dirs: stop.dirs };
}

export async function searchStops(query: string): Promise<StopResult[]> {
  await delay(200);
  const q = query.toLowerCase().trim();
  return Object.entries(STOPS_DB)
    .filter(([, s]) => !q || s.name.toLowerCase().includes(q) || s.routes.some(r => String(r).includes(q)))
    .map(([id, s]) => ({
      id,
      name: `bus stop: ${s.name}`,
      routes: s.routes.join(", "),
      distance: `${(Math.random() * 1.5 + 0.5).toFixed(1)} km`,
    }))
    .slice(0, 5);
}

export async function searchDestinations(query: string): Promise<DestinationResult[]> {
  await delay(200);
  const q = query.toLowerCase().trim();
  return Object.entries(DEST_DB)
    .filter(([, d]) => !q || d.name.toLowerCase().includes(q) || d.address.toLowerCase().includes(q))
    .map(([id, d]) => ({
      id,
      name: `destination: ${d.name}`,
      address: d.address,
      distance: d.distance,
    }))
    .slice(0, 5);
}

export async function getNearbyStops(lat: number, lng: number): Promise<NearbyStop[]> {
  await delay(150);
  // Return all mock stops — in production this would filter by proximity
  void lat; void lng;
  return Object.entries(STOPS_DB).map(([stopId, s]) => ({
    stopId,
    name: s.name,
    pos: s.pos,
  }));
}

export async function getPrediction(
  stopId: string,
  routeId: number,
  direction: string,
): Promise<Prediction> {
  await delay(250);
  return await buildPrediction(stopId, routeId, direction);
}

export async function getBusReport(
  stopId: string,
  routeId: number,
  direction: string,
): Promise<BusReport> {
  await delay(300);
  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);
  const p = stop.predictions[direction]?.[routeId];
  if (!p) throw new Error(`No data for stop=${stopId} route=${routeId} dir=${direction}`);
  const prediction = await buildPrediction(stopId, routeId, direction);
  return {
    stopName: stop.name,
    routeId,
    etaMin: prediction.etaMin,
    confidence: prediction.confidence,
    weatherSource: prediction.weatherSource,
    weatherDescription: prediction.weatherDescription,
    trafficDescription: prediction.trafficDescription,
    passengerLoadLevel: prediction.passengerLoadLevel,
    passengerLoadDescription: prediction.passengerLoadDescription,
    factors: {
      schedule:     { value: p.schedule, description: p.schedule === 0 ? `${routeId} is matching its expected schedule window at this stop.` : `${routeId} is ${Math.abs(p.schedule)} min ${p.schedule > 0 ? "behind" : "ahead of"} the planned schedule window.` },
      weather:      { value: prediction.offsets.weather,  description: `${prediction.weatherDescription} ${prediction.offsets.weather > 0 ? `Weather is adding about ${prediction.offsets.weather} min.` : "Weather is not adding delay."}` },
      traffic:      { value: prediction.offsets.traffic,  description: `${prediction.trafficDescription} ${prediction.offsets.traffic > 0 ? `Traffic is adding about ${prediction.offsets.traffic} min.` : "Traffic is not adding delay."}` },
      passengerLoad: { value: prediction.offsets.passengerLoad, description: `${prediction.passengerLoadDescription} ${prediction.offsets.passengerLoad > 0 ? `Longer boarding is adding about ${prediction.offsets.passengerLoad} min.` : "Boarding time is not adding delay."}` },
      accidents:    { value: p.accidents, description: p.accidents > 0 ? `A reported incident is adding about ${p.accidents} min on this route segment.` : `No significant accidents are affecting route ${routeId}.` },
      construction: { value: p.construction, description: p.construction > 0 ? `Construction is adding about ${p.construction} min near this route segment.` : `No significant construction is affecting route ${routeId}.` },
    },
  };
}

export async function getNavigationRoute(
  origin: string,
  destination: string,
): Promise<NavigationRoute> {
  await delay(350);
  const dest = DEST_DB[destination];
  if (!dest) throw new Error(`Unknown destination: ${destination}`);
  void origin;
  return {
    destName:      dest.name,
    destAddress:   dest.address,
    walkMin:       dest.walkMin,
    walkMeters:    dest.walkMeters,
    busStop:       dest.busStop,
    routeLabel:    dest.routeLabel,
    etaMin:        dest.etaMin,
    departureTime: dest.departureTime,
    arrivalTime:   dest.arrivalTime,
    totalStops:    dest.totalStops,
    alsoAt:        dest.alsoAt,
  };
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

function findRouteInText(input: string): number | undefined {
  const route = input.match(/\b(50[1-6]|510|504|503|502|501)\b/);
  return route ? Number(route[1]) : undefined;
}

function findDirectionInText(input: string): string | undefined {
  if (/\beast\s*bound\b|\beastbound\b|\beast\b/.test(input)) return "Eastbound";
  if (/\bwest\s*bound\b|\bwestbound\b|\bwest\b/.test(input)) return "Westbound";
  if (/\bsouth\s*bound\b|\bsouthbound\b|\bsouth\b/.test(input)) return "Southbound";
  if (/\bnorth\s*bound\b|\bnorthbound\b|\bnorth\b/.test(input)) return "Northbound";
  return undefined;
}

function findStopInText(input: string): string | undefined {
  const q = input.toLowerCase();
  return Object.entries(STOPS_DB).find(([id, stop]) => {
    return q.includes(id.replace(/-/g, " ")) || stop.name.toLowerCase().split(/\s+at\s+|\s*&\s*/).some(part => part.length > 3 && q.includes(part));
  })?.[0];
}

function findDestinationInText(input: string): string | undefined {
  const q = input.toLowerCase();
  return Object.entries(DEST_DB).find(([id, dest]) => {
    return q.includes(id.replace("dest-", "").replace(/-/g, " ")) || q.includes(dest.name.toLowerCase());
  })?.[0];
}

function sentenceStopName(stopName: string): string {
  return stopName.replace(/[.]+$/, "");
}

async function pickPrediction(context: TransitAssistantContext, input: string): Promise<{ prediction: Prediction; context: TransitAssistantContext }> {
  const routeId = findRouteInText(input) ?? context.routeId;
  const stopId = findStopInText(input) ?? context.stopId ?? Object.keys(STOPS_DB).find(id => routeId ? STOPS_DB[id].routes.includes(routeId) : true) ?? "college-yonge";
  const stop = STOPS_DB[stopId];
  const route = routeId && stop.routes.includes(routeId) ? routeId : stop.routes[0];
  const requestedDirection = findDirectionInText(input) ?? context.direction;
  const direction = requestedDirection && stop.predictions[requestedDirection]?.[route] ? requestedDirection : Object.keys(stop.predictions).find(dir => stop.predictions[dir][route]) ?? stop.dirs[0];

  return {
    prediction: await buildPrediction(stopId, route, direction),
    context: { ...context, stopId, routeId: route, direction },
  };
}

export async function askTransitAssistant(
  input: string,
  context: TransitAssistantContext = {},
): Promise<TransitAssistantAnswer> {
  await delay(450);
  const q = input.trim().toLowerCase();
  if (!q) {
    return {
      matchedIntent: "help",
      confidence: 90,
      text: "Ask me about a route, stop, delay, weather, traffic, crowding, or destination. For example: \"When is the 501 coming?\"",
    };
  }

  const isTransitQuestion = /bus|ttc|route|stop|station|eta|arriv|delay|late|weather|traffic|crowd|busy|full|passenger|navigate|direction|trip|destination|walk|eastbound|westbound|northbound|southbound|\beast\b|\bwest\b|\bnorth\b|\bsouth\b|501|502|503|504|505|506|510/.test(q);
  if (!isTransitQuestion) {
    return {
      matchedIntent: "out-of-scope",
      confidence: 82,
      text: "I can help with TTC trip questions like arrival times, route delays, nearby stops, crowding, and navigation.",
    };
  }

  const destinationId = findDestinationInText(q) ?? context.destinationId;
  if (/navigate|direction|trip|destination|how do i get|go to/.test(q) && destinationId) {
    const route = await getNavigationRoute("current-location", destinationId);
    return {
      matchedIntent: "navigation",
      confidence: 86,
      context: { ...context, destinationId },
      text: `To ${route.destName}, walk ${route.walkMin} min to ${route.busStop}, then take ${route.routeLabel}. The bus is estimated in ${route.etaMin} min and arrival is around ${route.arrivalTime}.`,
    };
  }

  const picked = await pickPrediction(context, q);
  const { prediction } = picked;
  const stopName = sentenceStopName(prediction.stopName);

  if (/weather|rain|snow|storm|wind|ice/.test(q)) {
    return {
      matchedIntent: "weather",
      confidence: prediction.confidence,
      context: picked.context,
      text: prediction.offsets.weather > 0
        ? `${prediction.weatherDescription} Weather is adding about ${prediction.offsets.weather} min to route ${prediction.routeId} ${prediction.direction}. Current ETA at ${stopName} is ${prediction.etaMin} min.`
        : `${prediction.weatherDescription} Weather is not adding delay to route ${prediction.routeId} ${prediction.direction}. Current ETA at ${stopName} is ${prediction.etaMin} min.`,
    };
  }

  if (/traffic|road|congestion|busy street/.test(q)) {
    return {
      matchedIntent: "traffic",
      confidence: prediction.confidence,
      context: picked.context,
      text: prediction.offsets.traffic > 0
        ? `${prediction.trafficDescription} Traffic is adding about ${prediction.offsets.traffic} min. Route ${prediction.routeId} ${prediction.direction} is estimated at ${prediction.etaMin} min for ${stopName}.`
        : `${prediction.trafficDescription} Traffic is not adding delay. ETA is ${prediction.etaMin} min at ${stopName}.`,
    };
  }

  if (/crowd|busy|full|passenger|population|load|seat/.test(q)) {
    return {
      matchedIntent: "crowding",
      confidence: prediction.confidence,
      context: picked.context,
      text: prediction.offsets.passengerLoad > 0
        ? `${prediction.passengerLoadDescription} Passenger load adds about ${prediction.offsets.passengerLoad} min for boarding. Route ${prediction.routeId} is estimated in ${prediction.etaMin} min.`
        : `${prediction.passengerLoadDescription} Passenger load is not adding delay. Route ${prediction.routeId} is estimated in ${prediction.etaMin} min.`,
    };
  }

  if (/delay|late|slow|behind|accident|construction/.test(q)) {
    return {
      matchedIntent: "delay",
      confidence: prediction.confidence,
      context: picked.context,
      text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. Main factors: ${prediction.summary}. Confidence: ${prediction.confidence}%.`,
    };
  }

  return {
    matchedIntent: "eta",
    confidence: prediction.confidence,
    context: picked.context,
    text: `Route ${prediction.routeId} ${prediction.direction} is estimated in ${prediction.etaMin} min at ${stopName}. ${prediction.summary}. Confidence: ${prediction.confidence}%.`,
  };
}
