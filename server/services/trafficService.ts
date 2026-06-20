export type TrafficEventType = "traffic" | "accident" | "construction";

export interface TrafficEvent {
  id: string;
  type: TrafficEventType;
  title: string;
  description: string;
  lat?: number;
  lng?: number;
  delayMin: number;
  source: "mock";
}

export interface TrafficImpact {
  source: "mock";
  trafficDelayMin: number;
  accidentDelayMin: number;
  constructionDelayMin: number;
  events: TrafficEvent[];
}

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

export function getTrafficImpact(
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
