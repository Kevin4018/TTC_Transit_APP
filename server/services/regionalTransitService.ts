import Database from "better-sqlite3";
import { existsSync } from "node:fs";

type RegionalTransitSource = "regional-gtfs";

export interface RegionalStopResult {
  source: RegionalTransitSource;
  agencyId: string;
  agencyName: string;
  id: string;
  name: string;
  routes: string;
  distance: string;
  pos?: [number, number];
}

export interface RegionalNearbyStop {
  source: RegionalTransitSource;
  agencyId: string;
  agencyName: string;
  stopId: string;
  name: string;
  routes: string[];
  pos: [number, number];
  distanceMeters?: number;
}

export interface RegionalStopMeta {
  source: RegionalTransitSource;
  agencyId: string;
  agencyName: string;
  id: string;
  name: string;
  routes: string[];
  dirs: string[];
  pos: [number, number];
}

export interface RegionalPrediction {
  source: RegionalTransitSource;
  agencyId: string;
  agencyName: string;
  stopId: string;
  stopName: string;
  routeName: string;
  direction: string;
  etaMin: number;
  confidence: number;
  dirs: string[];
  routes: string[];
  alsoAt: string[];
  scheduledDeparture: string;
  summary: string;
}

interface StopRow {
  agency_id: string;
  agency_name: string;
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  routes?: string;
}

interface DepartureRow {
  agency_id: string;
  agency_name: string;
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  route_name: string;
  headsign: string;
  departure_minutes: string;
}

let regionalDb: Database.Database | null | undefined;

const dbPath = () => process.env.REGIONAL_TRANSIT_ARRIVALS_DB_PATH ?? "./data/regional-arrivals.sqlite";

const getRegionalDb = () => {
  if (regionalDb !== undefined) return regionalDb;
  const path = dbPath();
  regionalDb = existsSync(path) ? new Database(path, { readonly: true }) : null;
  return regionalDb;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const agencyAliases: Record<string, string[]> = {
  "go-transit": ["go", "go transit", "metrolinx", "up", "up express"],
  miway: ["miway", "mississauga"],
  "yrt-viva": ["yrt", "viva", "york", "york region"],
  "brampton-transit": ["brampton", "zum", "züm"],
};

export const resolveRegionalAgencyId = (input: string) => {
  const normalized = normalize(input);
  for (const [agencyId, aliases] of Object.entries(agencyAliases)) {
    if (aliases.some(alias => normalized.includes(normalize(alias)))) {
      return agencyId;
    }
  }
  return undefined;
};

const getTorontoClockMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
  return (hour % 24) * 60 + minute;
};

const formatClock = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const parseDepartures = (value: string) =>
  value
    .split(",")
    .map(item => Number(item))
    .filter(item => Number.isFinite(item))
    .sort((a, b) => a - b);

const findNextDeparture = (departureMinutes: string) => {
  const now = getTorontoClockMinutes();
  const departures = parseDepartures(departureMinutes);
  let best: { departure: number; eta: number } | null = null;

  for (const departure of departures) {
    const normalized = departure < now - 90 ? departure + 1440 : departure;
    const eta = normalized - now;
    if (eta < 0) continue;
    if (!best || eta < best.eta) best = { departure: normalized, eta };
  }

  return best;
};

const distanceMeters = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthMeters = 6_371_000;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.sqrt(a));
};

const rowsToMeta = (rows: DepartureRow[]): RegionalStopMeta => {
  if (!rows[0]) throw new Error("Regional stop not found");
  return {
    source: "regional-gtfs",
    agencyId: rows[0].agency_id,
    agencyName: rows[0].agency_name,
    id: rows[0].stop_id,
    name: rows[0].stop_name,
    routes: [...new Set(rows.map(row => row.route_name).filter(Boolean))],
    dirs: [...new Set(rows.map(row => row.headsign || "Scheduled service"))],
    pos: [rows[0].stop_lat, rows[0].stop_lon],
  };
};

const ensureDb = () => {
  const db = getRegionalDb();
  if (!db) {
    throw new Error(`Regional transit arrivals database is missing. Run npm run import:regional-gtfs to create ${dbPath()}.`);
  }
  return db;
};

export function searchRegionalStops(query: string, limit = 12): RegionalStopResult[] {
  const db = getRegionalDb();
  if (!db) return [];

  const q = normalize(query);
  if (!q) return [];
  const agencyId = resolveRegionalAgencyId(query);
  const searchText = q
    .replace(/\b(go transit|go|metrolinx|up express|up|miway|mississauga|yrt|viva|york region|york|brampton transit|brampton|zum|z m)\b/g, " ")
    .trim();
  const like = `%${(searchText || q).replace(/\s+/g, "%")}%`;

  const rows = db.prepare(`
    SELECT
      stops.agency_id,
      agencies.agency_name,
      stops.stop_id,
      stops.stop_name,
      stops.stop_lat,
      stops.stop_lon,
      GROUP_CONCAT(DISTINCT stop_routes.route_name) AS routes
    FROM stops
    JOIN agencies ON agencies.agency_id = stops.agency_id
    LEFT JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
    WHERE (? IS NULL OR stops.agency_id = ?)
      AND (
        LOWER(stops.stop_name) LIKE LOWER(?)
        OR LOWER(COALESCE(stop_routes.route_name, '')) LIKE LOWER(?)
        OR LOWER(agencies.agency_name) LIKE LOWER(?)
      )
    GROUP BY stops.stop_id
    ORDER BY
      CASE WHEN LOWER(stops.stop_name) = LOWER(?) THEN 0 ELSE 1 END,
      stops.stop_name
    LIMIT ?
  `).all(agencyId ?? null, agencyId ?? null, like, like, like, searchText || query, limit) as StopRow[];

  return rows.map(row => ({
    source: "regional-gtfs",
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    id: row.stop_id,
    name: row.stop_name,
    routes: row.routes ?? "",
    distance: row.agency_name,
    pos: [row.stop_lat, row.stop_lon],
  }));
}

export function getRegionalNearbyStops(lat?: number, lng?: number, limit = 12): RegionalNearbyStop[] {
  const db = getRegionalDb();
  if (!db) return [];

  const rows = db.prepare(`
    SELECT
      stops.agency_id,
      agencies.agency_name,
      stops.stop_id,
      stops.stop_name,
      stops.stop_lat,
      stops.stop_lon,
      GROUP_CONCAT(DISTINCT stop_routes.route_name) AS routes
    FROM stops
    JOIN agencies ON agencies.agency_id = stops.agency_id
    LEFT JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
    GROUP BY stops.stop_id
  `).all() as StopRow[];

  return rows
    .map(row => ({
      source: "regional-gtfs" as const,
      agencyId: row.agency_id,
      agencyName: row.agency_name,
      stopId: row.stop_id,
      name: row.stop_name,
      routes: (row.routes ?? "").split(",").filter(Boolean),
      pos: [row.stop_lat, row.stop_lon] as [number, number],
      distanceMeters: Number.isFinite(lat) && Number.isFinite(lng)
        ? distanceMeters(lat as number, lng as number, row.stop_lat, row.stop_lon)
        : undefined,
    }))
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
    .slice(0, limit);
}

export function getRegionalStopMeta(stopId: string): RegionalStopMeta {
  const db = ensureDb();
  const rows = db.prepare(`
    SELECT
      stops.agency_id,
      agencies.agency_name,
      stops.stop_id,
      stops.stop_name,
      stops.stop_lat,
      stops.stop_lon,
      stop_departures.route_name,
      stop_departures.headsign,
      stop_departures.departure_minutes
    FROM stops
    JOIN agencies ON agencies.agency_id = stops.agency_id
    LEFT JOIN stop_departures ON stop_departures.stop_id = stops.stop_id
    WHERE stops.stop_id = ?
  `).all(stopId) as DepartureRow[];
  return rowsToMeta(rows);
}

export function getRegionalPrediction(options: {
  agencyId?: string;
  stopId?: string;
  stopQuery?: string;
  routeName?: string;
  headsign?: string;
}): RegionalPrediction {
  const db = ensureDb();
  let stopId = options.stopId;

  if (!stopId && options.stopQuery) {
    stopId = searchRegionalStops(
      options.agencyId ? `${options.agencyId} ${options.stopQuery}` : options.stopQuery,
      1,
    )[0]?.id;
  }

  if (!stopId) throw new Error("Regional stop is required");

  const routeLike = options.routeName ? `%${normalize(options.routeName).replace(/\s+/g, "%")}%` : null;
  const headsignLike = options.headsign ? `%${normalize(options.headsign).replace(/\s+/g, "%")}%` : null;
  const rows = db.prepare(`
    SELECT
      stops.agency_id,
      agencies.agency_name,
      stops.stop_id,
      stops.stop_name,
      stops.stop_lat,
      stops.stop_lon,
      stop_departures.route_name,
      stop_departures.headsign,
      stop_departures.departure_minutes
    FROM stop_departures
    JOIN stops ON stops.stop_id = stop_departures.stop_id
    JOIN agencies ON agencies.agency_id = stops.agency_id
    WHERE stops.stop_id = ?
      AND (? IS NULL OR stops.agency_id = ?)
      AND (? IS NULL OR LOWER(stop_departures.route_name) LIKE LOWER(?))
      AND (? IS NULL OR LOWER(stop_departures.headsign) LIKE LOWER(?))
  `).all(
    stopId,
    options.agencyId ?? null,
    options.agencyId ?? null,
    routeLike,
    routeLike,
    headsignLike,
    headsignLike,
  ) as DepartureRow[];

  if (!rows.length) throw new Error("No regional departures found for that stop and route");

  const candidates = rows
    .map(row => ({ row, next: findNextDeparture(row.departure_minutes) }))
    .filter((candidate): candidate is { row: DepartureRow; next: { departure: number; eta: number } } => Boolean(candidate.next))
    .sort((a, b) => a.next.eta - b.next.eta);

  if (!candidates[0]) throw new Error("No upcoming regional departures found");

  const best = candidates[0];
  const routes = [...new Set(rows.map(row => row.route_name).filter(Boolean))];
  const dirs = [...new Set(rows.map(row => row.headsign || "Scheduled service"))];
  const alsoAt = candidates
    .slice(1, 4)
    .map(candidate => `${candidate.row.route_name} ${candidate.row.headsign || ""}`.trim())
    .filter(Boolean);

  return {
    source: "regional-gtfs",
    agencyId: best.row.agency_id,
    agencyName: best.row.agency_name,
    stopId: best.row.stop_id,
    stopName: best.row.stop_name,
    routeName: best.row.route_name,
    direction: best.row.headsign || "Scheduled service",
    etaMin: Math.max(0, Math.round(best.next.eta)),
    confidence: 72,
    dirs,
    routes,
    alsoAt,
    scheduledDeparture: formatClock(best.next.departure),
    summary: "Based on local GTFS schedules. Live vehicle tracking is not available for this agency yet.",
  };
}
