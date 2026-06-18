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
  dirs: [string, string];
  routes: number[];
  offsets: {
    schedule: number;
    weather: number;
    traffic: number;
    accidents: number;
    construction: number;
    other: number;
  };
}

export interface BusReport {
  stopName: string;
  routeId: number;
  etaMin: number;
  factors: {
    schedule: { value: number; description: string };
    weather:  { value: number; description: string };
    traffic:  { value: number; description: string };
    accidents:    { value: number; description: string };
    construction: { value: number; description: string };
    other:        { value: number; description: string };
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

interface StopMeta {
  name: string;
  routes: number[];
  dirs: [string, string];
  pos: [number, number];
  predictions: Record<string, Record<number, {
    eta: number; schedule: number; weather: number; traffic: number;
  }>>;
}

const STOPS_DB: Record<string, StopMeta> = {
  "college-yonge": {
    name: "College St. at Yonge St.", routes: [501, 506],
    dirs: ["Westbound", "Eastbound"], pos: [43.6613, -79.3837],
    predictions: {
      Westbound: { 501: { eta: 10, schedule: 8,  weather: 1, traffic: 1 }, 506: { eta: 14, schedule: 10, weather: 1, traffic: 3 } },
      Eastbound: { 501: { eta: 2,  schedule: -1, weather: 2, traffic: 1 }, 506: { eta: 6,  schedule: 4,  weather: 1, traffic: 1 } },
    },
  },
  "queen-spadina": {
    name: "Queen St. at Spadina Ave.", routes: [501, 503, 504],
    dirs: ["Westbound", "Eastbound"], pos: [43.6484, -79.3976],
    predictions: {
      Westbound: { 501: { eta: 8, schedule: 6, weather: 0, traffic: 2 }, 503: { eta: 15, schedule: 10, weather: 2, traffic: 3 }, 504: { eta: 11, schedule: 8, weather: 1, traffic: 2 } },
      Eastbound: { 501: { eta: 3, schedule: 1, weather: 0, traffic: 2 }, 503: { eta: 7,  schedule: 5,  weather: 1, traffic: 1 }, 504: { eta: 5,  schedule: 3, weather: 0, traffic: 2 } },
    },
  },
  "king-bay": {
    name: "King St. at Bay St.", routes: [502, 503, 504],
    dirs: ["Westbound", "Eastbound"], pos: [43.6480, -79.3780],
    predictions: {
      Westbound: { 502: { eta: 12, schedule: 9, weather: 1, traffic: 2 }, 503: { eta: 6,  schedule: 4, weather: 0, traffic: 2 }, 504: { eta: 9, schedule: 7, weather: 1, traffic: 1 } },
      Eastbound: { 502: { eta: 6,  schedule: 4, weather: 1, traffic: 1 }, 503: { eta: 3,  schedule: 1, weather: 0, traffic: 2 }, 504: { eta: 4, schedule: 2, weather: 0, traffic: 2 } },
    },
  },
  "spadina-nassau": {
    name: "Spadina at Nassau", routes: [510],
    dirs: ["Eastbound", "Southbound"], pos: [43.6600, -79.4018],
    predictions: {
      Eastbound:  { 510: { eta: 2, schedule: -1, weather: 2, traffic: 1 } },
      Southbound: { 510: { eta: 5, schedule: 3,  weather: 1, traffic: 1 } },
    },
  },
  "spadina-dundas": {
    name: "Spadina at Dundas", routes: [505, 510],
    dirs: ["Eastbound", "Westbound"], pos: [43.6547, -79.4003],
    predictions: {
      Eastbound: { 505: { eta: 8,  schedule: 5, weather: 1, traffic: 2 }, 510: { eta: 4,  schedule: 2, weather: 1, traffic: 1 } },
      Westbound: { 505: { eta: 12, schedule: 8, weather: 2, traffic: 1 }, 510: { eta: 7,  schedule: 4, weather: 1, traffic: 2 } },
    },
  },
};

const DEST_DB: Record<string, { name: string; address: string; distance: string; walkMin: number; walkMeters: number; busStop: string; routeLabel: string; etaMin: number; departureTime: string; arrivalTime: string; totalStops: number; alsoAt: string[] }> = {
  "dest-spadina-nassau": { name: "Spadina at Nassau", address: "Spadina Ave, Toronto, ON", distance: "1.5 km", walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 10, departureTime: "18:08", arrivalTime: "18:38", totalStops: 12, alsoAt: ["30 min", "60 min"] },
  "dest-spadina-dundas": { name: "Spadina at Dundas", address: "Spadina Ave, Toronto, ON", distance: "2 km",   walkMin: 7, walkMeters: 480, busStop: "Spadina at Nassau",         routeLabel: "510 Spadina", etaMin: 14, departureTime: "18:08", arrivalTime: "18:45", totalStops: 8,  alsoAt: ["30 min", "60 min"] },
  "dest-cn-tower":       { name: "CN Tower",          address: "290 Bremner Blvd, Toronto, ON", distance: "3 km",   walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 18, departureTime: "18:08", arrivalTime: "18:55", totalStops: 15, alsoAt: ["30 min", "60 min"] },
  "dest-kensington":     { name: "Kensington Market", address: "Kensington Ave, Toronto, ON",   distance: "1.8 km", walkMin: 5, walkMeters: 350, busStop: "College St. at Yonge St.", routeLabel: "501 Queen", etaMin: 12, departureTime: "18:08", arrivalTime: "18:40", totalStops: 10, alsoAt: ["30 min", "60 min"] },
};

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
  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);
  const p = stop.predictions[direction]?.[routeId];
  if (!p) throw new Error(`No prediction for stop=${stopId} route=${routeId} dir=${direction}`);
  return {
    stopName: stop.name,
    routeId,
    direction,
    etaMin: p.eta,
    dirs: stop.dirs,
    routes: stop.routes,
    offsets: {
      schedule: p.schedule,
      weather:  p.weather,
      traffic:  p.traffic,
      accidents: 0,
      construction: 0,
      other: 0,
    },
  };
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
  return {
    stopName: stop.name,
    routeId,
    etaMin: p.eta,
    factors: {
      schedule:     { value: p.schedule, description: `${routeId} is scheduled to arrive at ${20 + p.schedule}:00, according to the official TTC data.` },
      weather:      { value: p.weather,  description: p.weather > 0 ? `Weather today may cause a slight delay of ${p.weather} min.` : "Clear skies, no weather delay expected." },
      traffic:      { value: p.traffic,  description: p.traffic > 0 ? `Traffic may delay the bus for ${p.traffic} min.` : "Traffic is normal, no delay expected." },
      accidents:    { value: 0, description: `No significant accidents happened on route of ${routeId}.` },
      construction: { value: 0, description: `No significant construction happening on route of ${routeId}.` },
      other:        { value: 0, description: `No significant other events happening effecting route of ${routeId}.` },
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
