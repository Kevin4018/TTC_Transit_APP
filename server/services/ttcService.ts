import Database from "better-sqlite3";
import { existsSync } from "node:fs";

type TransitSource = "mock" | "gtfs";
type ServicePeriod = "day" | "night";

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
  confidence: number;
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
  source: TransitSource;
  stopName: string;
  routeId: number;
  etaMin: number;
  confidence: number;
  factors: {
    schedule: { value: number; description: string };
    weather: { value: number; description: string };
    traffic: { value: number; description: string };
    accidents: { value: number; description: string };
    construction: { value: number; description: string };
    other: { value: number; description: string };
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

interface StopRecord {
  name: string;
  routes: number[];
  dirs: [string, string];
  pos: [number, number];
  predictions: Record<
    string,
    Record<
      number,
      {
        eta: number;
        schedule: number;
        weather: number;
        traffic: number;
      }
    >
  >;
}

interface DestinationRecord {
  name: string;
  address: string;
  distance: string;
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

interface GtfsStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface GtfsRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
}

interface GtfsTrip {
  route_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id?: string;
}

interface GtfsStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

interface GtfsStopDeparture {
  headsign: string;
  departure_minutes: string;
}

let gtfsDb: Database.Database | null | undefined;

const getGtfsDb = () => {
  if (gtfsDb !== undefined) return gtfsDb;

  const dbPath = process.env.GTFS_DB_PATH ?? "./data/gtfs.sqlite";

  if (!existsSync(dbPath)) {
    gtfsDb = null;
    return gtfsDb;
  }

  gtfsDb = new Database(dbPath, { readonly: true });
  return gtfsDb;
};

const NIGHT_SERVICE_START_MINUTES = 1 * 60 + 30;
const NIGHT_SERVICE_END_MINUTES = 5 * 60 + 30;

const getServicePeriod = (): ServicePeriod => {
  if (process.env.TTC_SERVICE_PERIOD === "day") return "day";
  if (process.env.TTC_SERVICE_PERIOD === "night") return "night";

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= NIGHT_SERVICE_START_MINUTES &&
    currentMinutes < NIGHT_SERVICE_END_MINUTES
    ? "night"
    : "day";
};

const routePeriodPredicate = () =>
  getServicePeriod() === "night"
    ? "CAST(routes.route_short_name AS INTEGER) BETWEEN 300 AND 399"
    : "CAST(routes.route_short_name AS INTEGER) NOT BETWEEN 300 AND 399";

const servicePeriodParam = () => getServicePeriod();

const toNumberRoutes = (routes: Iterable<string | number>) =>
  [...routes]
    .map((route) => Number(route))
    .filter((route) => Number.isFinite(route))
    .sort((a, b) => a - b);

const getPredictionConfidence = (offsets: {
  schedule: number;
  weather: number;
  traffic: number;
  accidents: number;
  construction: number;
  other: number;
}) => {
  const variableDelay =
    Math.abs(offsets.schedule) +
    Math.abs(offsets.weather) +
    Math.abs(offsets.traffic) +
    Math.abs(offsets.accidents) +
    Math.abs(offsets.construction) +
    Math.abs(offsets.other);

  return Math.max(62, Math.min(94, 94 - variableDelay * 4));
};

const describeScheduleOffset = (routeId: number, offsetMin: number) => {
  if (offsetMin === 0) {
    return `Route ${routeId} is currently matching its expected schedule window.`;
  }

  const minutes = Math.abs(offsetMin);
  return offsetMin > 0
    ? `Route ${routeId} is estimated about ${minutes} min later than the expected schedule window.`
    : `Route ${routeId} is estimated about ${minutes} min earlier than the expected schedule window.`;
};

const GROUP_PREFIX = "group:";

const isGroupStopId = (stopId: string) => stopId.startsWith(GROUP_PREFIX);

const getRepresentativeStopId = (stopId: string) =>
  isGroupStopId(stopId) ? stopId.slice(GROUP_PREFIX.length) : stopId;

const getGtfsStopGroup = (db: Database.Database, stopId: string) => {
  const representativeStopId = getRepresentativeStopId(stopId);
  const representativeStop = db
    .prepare("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?")
    .get(representativeStopId) as GtfsStop | undefined;

  if (!representativeStop) return null;

  const stops = db
    .prepare("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_name = ?")
    .all(representativeStop.stop_name) as GtfsStop[];

  return {
    id: `${GROUP_PREFIX}${representativeStop.stop_id}`,
    name: representativeStop.stop_name,
    stops,
  };
};

const getGtfsStopRoutes = (db: Database.Database, stopId: string) => {
  const group = getGtfsStopGroup(db, stopId);
  const stopIds = group?.stops.map((stop) => stop.stop_id) ?? [stopId];
  const placeholders = stopIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`
      SELECT DISTINCT route_name
      FROM stop_routes
      WHERE stop_id IN (${placeholders})
        AND service_period = ?
      ORDER BY route_name
    `)
    .all(...stopIds, servicePeriodParam()) as Array<{ route_name: string }>;

  return toNumberRoutes(rows.map((row) => row.route_name));
};

const getGtfsStopDirs = (
  db: Database.Database,
  stopId: string,
  routeId?: number,
): [string, string] => {
  const group = getGtfsStopGroup(db, stopId);
  const stopIds = group?.stops.map((stop) => stop.stop_id) ?? [stopId];
  const placeholders = stopIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`
      SELECT DISTINCT headsign
      FROM stop_routes
      WHERE stop_id IN (${placeholders})
        AND service_period = ?
        AND (? IS NULL OR route_name = ?)
        AND headsign IS NOT NULL
        AND headsign != ''
      ORDER BY headsign
      LIMIT 2
    `)
    .all(
      ...stopIds,
      servicePeriodParam(),
      routeId ?? null,
      String(routeId ?? ""),
    ) as Array<{ headsign: string }>;

  const headsigns = [...new Set(rows.map((row) => cleanHeadsign(row.headsign)))];

  return [
    headsigns[0] ?? "Outbound",
    headsigns[1] ?? "Inbound",
  ];
};

const getDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const parseGtfsTimeToMinutes = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

const hasTable = (db: Database.Database, tableName: string) => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;

  return Boolean(row);
};

const cleanHeadsign = (headsign: string) =>
  headsign
    .replace(
      /^([A-Za-z]+)\s+-\s+\d+[A-Za-z]?\s+.+?\s+Short Turn\s+(towards|to)\s+/i,
      "$1 - Short Turn towards ",
    )
    .replace(
      /^([A-Za-z]+)\s+-\s+\d+[A-Za-z]?\s+.+?\s+(towards|to)\s+/i,
      "$1 - towards ",
    )
    .replace(/\s+/g, " ")
    .trim();

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const findGtfsPrediction = (
  db: Database.Database,
  stopId: string,
  routeId: number,
  direction: string,
) => {
  const currentMinutes = getCurrentMinutes();
  const group = getGtfsStopGroup(db, stopId);
  const stopIds = group?.stops.map((stop) => stop.stop_id) ?? [stopId];
  const placeholders = stopIds.map(() => "?").join(", ");

  if (hasTable(db, "stop_departures")) {
    const selectRows = (matchDirection: boolean) =>
      db
        .prepare(`
          SELECT headsign, departure_minutes
          FROM stop_departures
          WHERE stop_id IN (${placeholders})
            AND route_name = ?
            AND service_period = ?
            AND (? = 0 OR ? = '' OR headsign = ?)
        `)
        .all(
          ...stopIds,
          String(routeId),
          servicePeriodParam(),
          matchDirection ? 1 : 0,
          direction,
          direction,
        ) as GtfsStopDeparture[];

    const rows = selectRows(true).length > 0 ? selectRows(true) : selectRows(false);
    const predictions = rows.flatMap((row) =>
      row.departure_minutes
        .split(",")
        .map((value) => Number(value))
        .filter((minutes) => Number.isFinite(minutes))
        .map((departureMinutes) => {
          const normalizedDeparture =
            departureMinutes < currentMinutes
              ? departureMinutes + 24 * 60
              : departureMinutes;

          return {
            etaMin: Math.max(0, normalizedDeparture - currentMinutes),
            headsign: cleanHeadsign(row.headsign || direction || "Outbound"),
          };
        }),
    );

    return predictions.sort((a, b) => a.etaMin - b.etaMin)[0] ?? null;
  }

  const selectRows = (matchDirection: boolean) =>
    db
    .prepare(`
      SELECT
        stop_times.arrival_time,
        stop_times.departure_time,
        trips.trip_headsign AS headsign
      FROM stop_times
      JOIN trips ON trips.trip_id = stop_times.trip_id
      JOIN routes ON routes.route_id = trips.route_id
      WHERE stop_times.stop_id IN (${placeholders})
        AND (routes.route_short_name = ? OR routes.route_id = ?)
        AND ${routePeriodPredicate()}
        AND (? = 0 OR ? = '' OR trips.trip_headsign = ?)
    `)
    .all(
      ...stopIds,
      String(routeId),
      String(routeId),
      matchDirection ? 1 : 0,
      direction,
      direction,
    ) as Array<{
      arrival_time: string;
      departure_time: string;
      headsign: string;
    }>;
  const rows = selectRows(true).length > 0 ? selectRows(true) : selectRows(false);

  return rows
    .map((row) => {
      const arrivalMinutes = parseGtfsTimeToMinutes(
        row.departure_time || row.arrival_time,
      );
      const normalizedArrival =
        arrivalMinutes < currentMinutes ? arrivalMinutes + 24 * 60 : arrivalMinutes;

      return {
        etaMin: Math.max(0, normalizedArrival - currentMinutes),
        headsign: cleanHeadsign(row.headsign || direction || "Outbound"),
      };
    })
    .sort((a, b) => a.etaMin - b.etaMin)[0] ?? null;
};

const STOPS_DB: Record<string, StopRecord> = {
  "college-yonge": {
    name: "College St. at Yonge St.",
    routes: [501, 506],
    dirs: ["Westbound", "Eastbound"],
    pos: [43.6613, -79.3837],
    predictions: {
      Westbound: {
        501: { eta: 10, schedule: 8, weather: 1, traffic: 1 },
        506: { eta: 14, schedule: 10, weather: 1, traffic: 3 },
      },
      Eastbound: {
        501: { eta: 2, schedule: -1, weather: 2, traffic: 1 },
        506: { eta: 6, schedule: 4, weather: 1, traffic: 1 },
      },
    },
  },
  "queen-spadina": {
    name: "Queen St. at Spadina Ave.",
    routes: [501, 503, 504],
    dirs: ["Westbound", "Eastbound"],
    pos: [43.6484, -79.3976],
    predictions: {
      Westbound: {
        501: { eta: 8, schedule: 6, weather: 0, traffic: 2 },
        503: { eta: 15, schedule: 10, weather: 2, traffic: 3 },
        504: { eta: 11, schedule: 8, weather: 1, traffic: 2 },
      },
      Eastbound: {
        501: { eta: 3, schedule: 1, weather: 0, traffic: 2 },
        503: { eta: 7, schedule: 5, weather: 1, traffic: 1 },
        504: { eta: 5, schedule: 3, weather: 0, traffic: 2 },
      },
    },
  },
  "king-bay": {
    name: "King St. at Bay St.",
    routes: [502, 503, 504],
    dirs: ["Westbound", "Eastbound"],
    pos: [43.648, -79.378],
    predictions: {
      Westbound: {
        502: { eta: 12, schedule: 9, weather: 1, traffic: 2 },
        503: { eta: 6, schedule: 4, weather: 0, traffic: 2 },
        504: { eta: 9, schedule: 7, weather: 1, traffic: 1 },
      },
      Eastbound: {
        502: { eta: 6, schedule: 4, weather: 1, traffic: 1 },
        503: { eta: 3, schedule: 1, weather: 0, traffic: 2 },
        504: { eta: 4, schedule: 2, weather: 0, traffic: 2 },
      },
    },
  },
  "spadina-nassau": {
    name: "Spadina at Nassau",
    routes: [510],
    dirs: ["Eastbound", "Southbound"],
    pos: [43.66, -79.4018],
    predictions: {
      Eastbound: { 510: { eta: 2, schedule: -1, weather: 2, traffic: 1 } },
      Southbound: { 510: { eta: 5, schedule: 3, weather: 1, traffic: 1 } },
    },
  },
  "spadina-dundas": {
    name: "Spadina at Dundas",
    routes: [505, 510],
    dirs: ["Eastbound", "Westbound"],
    pos: [43.6547, -79.4003],
    predictions: {
      Eastbound: {
        505: { eta: 8, schedule: 5, weather: 1, traffic: 2 },
        510: { eta: 4, schedule: 2, weather: 1, traffic: 1 },
      },
      Westbound: {
        505: { eta: 12, schedule: 8, weather: 2, traffic: 1 },
        510: { eta: 7, schedule: 4, weather: 1, traffic: 2 },
      },
    },
  },
};

const DEST_DB: Record<string, DestinationRecord> = {
  "dest-spadina-nassau": {
    name: "Spadina at Nassau",
    address: "Spadina Ave, Toronto, ON",
    distance: "1.5 km",
    walkMin: 5,
    walkMeters: 350,
    busStop: "College St. at Yonge St.",
    routeLabel: "501 Queen",
    etaMin: 10,
    departureTime: "18:08",
    arrivalTime: "18:38",
    totalStops: 12,
    alsoAt: ["30 min", "60 min"],
  },
  "dest-spadina-dundas": {
    name: "Spadina at Dundas",
    address: "Spadina Ave, Toronto, ON",
    distance: "2 km",
    walkMin: 7,
    walkMeters: 480,
    busStop: "Spadina at Nassau",
    routeLabel: "510 Spadina",
    etaMin: 14,
    departureTime: "18:08",
    arrivalTime: "18:45",
    totalStops: 8,
    alsoAt: ["30 min", "60 min"],
  },
  "dest-cn-tower": {
    name: "CN Tower",
    address: "290 Bremner Blvd, Toronto, ON",
    distance: "3 km",
    walkMin: 5,
    walkMeters: 350,
    busStop: "College St. at Yonge St.",
    routeLabel: "501 Queen",
    etaMin: 18,
    departureTime: "18:08",
    arrivalTime: "18:55",
    totalStops: 15,
    alsoAt: ["30 min", "60 min"],
  },
  "dest-kensington": {
    name: "Kensington Market",
    address: "Kensington Ave, Toronto, ON",
    distance: "1.8 km",
    walkMin: 5,
    walkMeters: 350,
    busStop: "College St. at Yonge St.",
    routeLabel: "501 Queen",
    etaMin: 12,
    departureTime: "18:08",
    arrivalTime: "18:40",
    totalStops: 10,
    alsoAt: ["30 min", "60 min"],
  },
};

export const getStopMeta = (stopId: string): StopMeta => {
  const db = getGtfsDb();
  const gtfsGroup = db ? getGtfsStopGroup(db, stopId) : null;

  if (db && gtfsGroup) {
    const routes = getGtfsStopRoutes(db, stopId);

    return {
      source: "gtfs",
      id: gtfsGroup.id,
      name: gtfsGroup.name,
      routes,
      dirs: getGtfsStopDirs(db, stopId, routes[0]),
      pos: [
        gtfsGroup.stops.reduce((sum, stop) => sum + stop.stop_lat, 0) / gtfsGroup.stops.length,
        gtfsGroup.stops.reduce((sum, stop) => sum + stop.stop_lon, 0) / gtfsGroup.stops.length,
      ],
    };
  }

  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);

  return {
    source: "mock",
    id: stopId,
    name: stop.name,
    routes: stop.routes,
    dirs: stop.dirs,
    pos: stop.pos,
  };
};

export const searchStops = (query: string): StopResult[] => {
  const db = getGtfsDb();
  const q = query.toLowerCase().trim();

  if (db) {
    const rows = db
      .prepare(`
        SELECT
          MIN(CAST(stops.stop_id AS INTEGER)) AS stop_id,
          stops.stop_name,
          AVG(stops.stop_lat) AS stop_lat,
          AVG(stops.stop_lon) AS stop_lon,
          GROUP_CONCAT(DISTINCT stop_routes.route_name) AS route_names
        FROM stops
        JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
        WHERE (? = ''
          OR lower(stops.stop_name) LIKE ?
          OR lower(stops.stop_id) LIKE ?)
          AND stop_routes.service_period = ?
        GROUP BY stops.stop_name
        ORDER BY stop_name
        LIMIT 8
      `)
      .all(q, `%${q}%`, `%${q}%`, servicePeriodParam()) as Array<GtfsStop & { route_names: string }>;

    return rows.map((stop) => ({
      source: "gtfs",
      id: `${GROUP_PREFIX}${stop.stop_id}`,
      name: `bus stop: ${stop.stop_name}`,
      routes: toNumberRoutes((stop.route_names ?? "").split(",")).slice(0, 8).join(", "),
      distance: getServicePeriod() === "night" ? "Blue Night stop" : "TTC stop",
    }));
  }

  return Object.entries(STOPS_DB)
    .filter(
      ([, stop]) =>
        !q ||
        stop.name.toLowerCase().includes(q) ||
        stop.routes.some((route) => String(route).includes(q)),
    )
    .map(([id, stop], index) => ({
      source: "mock" as const,
      id,
      name: `bus stop: ${stop.name}`,
      routes: stop.routes.join(", "),
      distance: `${(0.6 + index * 0.3).toFixed(1)} km`,
    }))
    .slice(0, 5);
};

export const searchDestinations = (query: string): DestinationResult[] => {
  const q = query.toLowerCase().trim();

  return Object.entries(DEST_DB)
    .filter(
      ([, destination]) =>
        !q ||
        destination.name.toLowerCase().includes(q) ||
        destination.address.toLowerCase().includes(q),
    )
    .map(([id, destination]) => ({
      source: "mock" as const,
      id,
      name: `destination: ${destination.name}`,
      address: destination.address,
      distance: destination.distance,
    }))
    .slice(0, 5);
};

export const getNearbyStops = (_lat: number, _lng: number): NearbyStop[] =>
  getGtfsDb()
    ? (() => {
      const searchRadius = 0.08;
      return (getGtfsDb()!
          .prepare(`
          SELECT
            MIN(CAST(stops.stop_id AS INTEGER)) AS stop_id,
            stops.stop_name,
            AVG(stops.stop_lat) AS stop_lat,
            AVG(stops.stop_lon) AS stop_lon,
            ((AVG(stops.stop_lat) - ?) * (AVG(stops.stop_lat) - ?)) +
              ((AVG(stops.stop_lon) - ?) * (AVG(stops.stop_lon) - ?)) AS distance_score
          FROM stops
          JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
          WHERE stops.stop_lat BETWEEN ? AND ?
            AND stops.stop_lon BETWEEN ? AND ?
            AND stop_routes.service_period = ?
          GROUP BY stops.stop_name
          ORDER BY distance_score ASC
          LIMIT 800
        `)
          .all(
            _lat,
            _lat,
            _lng,
            _lng,
            _lat - searchRadius,
            _lat + searchRadius,
            _lng - searchRadius,
            _lng + searchRadius,
            servicePeriodParam(),
          ) as GtfsStop[])
        .map((stop) => ({
          source: "gtfs" as const,
          stopId: `${GROUP_PREFIX}${stop.stop_id}`,
          name: stop.stop_name,
          pos: [stop.stop_lat, stop.stop_lon] as [number, number],
          distanceKm: getDistanceKm(
            _lat,
            _lng,
            stop.stop_lat,
            stop.stop_lon,
          ),
        }))
        .filter((stop) => Number.isFinite(stop.pos[0]) && Number.isFinite(stop.pos[1]))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 160)
        .map(({ distanceKm: _distanceKm, ...stop }) => stop);
    })()
    : Object.entries(STOPS_DB).map(([stopId, stop]) => ({
        source: "mock",
        stopId,
        name: stop.name,
        pos: stop.pos,
      }));
export const getPrediction = (
  stopId: string,
  routeId: number,
  direction: string,
): Prediction => {
  const db = getGtfsDb();
  const gtfsGroup = db ? getGtfsStopGroup(db, stopId) : null;

  if (db && gtfsGroup) {
    const routes = getGtfsStopRoutes(db, stopId);
    const prediction = findGtfsPrediction(db, stopId, routeId, direction);

    if (!prediction) {
      throw new Error(
        `No GTFS prediction for stop=${stopId} route=${routeId} dir=${direction}`,
      );
    }

    const offsets = {
      schedule: 0,
      weather: 0,
      traffic: 0,
      accidents: 0,
      construction: 0,
      other: 0,
    };

    return {
      source: "gtfs",
      stopName: gtfsGroup.name,
      routeId,
      direction: prediction.headsign,
      etaMin: prediction.etaMin,
      confidence: getPredictionConfidence(offsets),
      dirs: getGtfsStopDirs(db, stopId, routeId),
      routes,
      offsets,
    };
  }

  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);

  const prediction = stop.predictions[direction]?.[routeId];
  if (!prediction) {
    throw new Error(
      `No prediction for stop=${stopId} route=${routeId} dir=${direction}`,
    );
  }

  const offsets = {
    schedule: prediction.schedule,
    weather: prediction.weather,
    traffic: prediction.traffic,
    accidents: 0,
    construction: 0,
    other: 0,
  };

  return {
    source: "mock",
    stopName: stop.name,
    routeId,
    direction,
    etaMin: prediction.eta,
    confidence: getPredictionConfidence(offsets),
    dirs: stop.dirs,
    routes: stop.routes,
    offsets,
  };
};

export const getBusReport = (
  stopId: string,
  routeId: number,
  direction: string,
): BusReport => {
  const db = getGtfsDb();
  const gtfsGroup = db ? getGtfsStopGroup(db, stopId) : null;

  if (db && gtfsGroup) {
    const prediction = getPrediction(stopId, routeId, direction);

    return {
      source: "gtfs",
      stopName: prediction.stopName,
      routeId,
      etaMin: prediction.etaMin,
      confidence: prediction.confidence,
      factors: {
        schedule: {
          value: 0,
          description: `${routeId} is using the next scheduled GTFS departure for ${prediction.direction}.`,
        },
        weather: {
          value: 0,
          description: "Weather delay is calculated separately from live weather data.",
        },
        traffic: {
          value: 0,
          description: "Traffic delay is not connected to a live traffic feed yet.",
        },
        accidents: {
          value: 0,
          description: `No live incident feed is connected for route ${routeId} yet.`,
        },
        construction: {
          value: 0,
          description: `No live construction feed is connected for route ${routeId} yet.`,
        },
        other: {
          value: 0,
          description: `No additional live service alerts are connected for route ${routeId} yet.`,
        },
      },
    };
  }

  const stop = STOPS_DB[stopId];
  if (!stop) throw new Error(`Unknown stop: ${stopId}`);

  const prediction = stop.predictions[direction]?.[routeId];
  if (!prediction) {
    throw new Error(`No data for stop=${stopId} route=${routeId} dir=${direction}`);
  }

  const offsets = {
    schedule: prediction.schedule,
    weather: prediction.weather,
    traffic: prediction.traffic,
    accidents: 0,
    construction: 0,
    other: 0,
  };

  return {
    source: "mock",
    stopName: stop.name,
    routeId,
    etaMin: prediction.eta,
    confidence: getPredictionConfidence(offsets),
    factors: {
      schedule: {
        value: prediction.schedule,
        description: describeScheduleOffset(routeId, prediction.schedule),
      },
      weather: {
        value: prediction.weather,
        description:
          prediction.weather > 0
            ? `Weather today may cause a slight delay of ${prediction.weather} min.`
            : "Clear skies, no weather delay expected.",
      },
      traffic: {
        value: prediction.traffic,
        description:
          prediction.traffic > 0
            ? `Traffic may delay the bus for ${prediction.traffic} min.`
            : "Traffic is normal, no delay expected.",
      },
      accidents: {
        value: 0,
        description: `No significant accidents happened on route of ${routeId}.`,
      },
      construction: {
        value: 0,
        description: `No significant construction happening on route of ${routeId}.`,
      },
      other: {
        value: 0,
        description: `No significant other events happening effecting route of ${routeId}.`,
      },
    },
  };
};

export const getNavigationRoute = (
  origin: string,
  destination: string,
  originCoordinates?: { lat: number; lng: number },
): NavigationRoute => {
  const dest = DEST_DB[destination];
  if (!dest) throw new Error(`Unknown destination: ${destination}`);

  void origin;

  return {
    source: "mock",
    ...(originCoordinates ? { originCoordinates } : {}),
    destName: dest.name,
    destAddress: dest.address,
    walkMin: dest.walkMin,
    walkMeters: dest.walkMeters,
    busStop: dest.busStop,
    routeLabel: dest.routeLabel,
    etaMin: dest.etaMin,
    departureTime: dest.departureTime,
    arrivalTime: dest.arrivalTime,
    totalStops: dest.totalStops,
    alsoAt: dest.alsoAt,
  };
};
