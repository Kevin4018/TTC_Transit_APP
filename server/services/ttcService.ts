import Database from "better-sqlite3";
import { existsSync } from "node:fs";

type TransitSource = "mock" | "gtfs" | "otp";
type ServicePeriod = "day" | "night";

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

export type NavigationMode = "bus" | "car" | "walk" | "bike";

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
  lat: number;
  lng: number;
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

  const dbPath = process.env.GTFS_DB_PATH ?? (
    existsSync("./data/gtfs.sqlite")
      ? "./data/gtfs.sqlite"
      : "./data/gtfs-slim.sqlite"
  );

  if (!existsSync(dbPath)) {
    gtfsDb = null;
    return gtfsDb;
  }

  gtfsDb = new Database(dbPath, { readonly: true });
  return gtfsDb;
};

const NIGHT_SERVICE_START_MINUTES = 1 * 60 + 30;
const NIGHT_SERVICE_END_MINUTES = 5 * 60 + 30;

const getTorontoClockMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return (hour % 24) * 60 + minute;
};

const getServicePeriod = (): ServicePeriod => {
  if (process.env.TTC_SERVICE_PERIOD === "day") return "day";
  if (process.env.TTC_SERVICE_PERIOD === "night") return "night";

  const currentMinutes = getTorontoClockMinutes();

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

const getHeadsignCardinal = (headsign: string) =>
  headsign.match(/^(North|South|East|West)\b/i)?.[1]?.toLowerCase() ?? headsign.toLowerCase();

const isShortTurnHeadsign = (headsign: string) => /\bshort\s*turn\b/i.test(headsign);

const getHeadsignScore = (headsign: string) => {
  let score = 0;
  if (isShortTurnHeadsign(headsign)) score += 10;
  if (!/\btowards?\b/i.test(headsign)) score += 4;
  if (/^inbound$/i.test(headsign.trim())) score += 20;
  if (/^outbound$/i.test(headsign.trim())) score += 20;
  return score;
};

const pickRepresentativeHeadsigns = (headsigns: string[]) => {
  const bestByCardinal = new Map<string, string>();

  headsigns
    .map((headsign) => cleanHeadsign(headsign))
    .filter(Boolean)
    .forEach((headsign) => {
      const key = getHeadsignCardinal(headsign);
      const current = bestByCardinal.get(key);
      if (!current || getHeadsignScore(headsign) < getHeadsignScore(current)) {
        bestByCardinal.set(key, headsign);
      }
    });

  return [...bestByCardinal.values()]
    .sort((a, b) => getHeadsignScore(a) - getHeadsignScore(b))
    .slice(0, 2);
};

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

const normalizeGtfsStopGroupName = (stopName: string) =>
  stopName
    .replace(/\s+-\s+(Northbound|Southbound|Eastbound|Westbound) Platform$/i, "")
    .trim();

const getStationSuffix = (stopName: string) =>
  stopName.match(/\s+-\s+(.+ Station)$/i)?.[1]?.trim();

const getActiveStopRoutes = (db: Database.Database, stopId: string) =>
  new Set(
    (
      db
        .prepare(`
          SELECT DISTINCT route_name
          FROM stop_routes
          WHERE stop_id = ?
            AND service_period = ?
        `)
        .all(stopId, servicePeriodParam()) as Array<{ route_name: string }>
    ).map((row) => row.route_name),
  );

const getGtfsStopGroup = (db: Database.Database, stopId: string) => {
  const representativeStopId = getRepresentativeStopId(stopId);
  const representativeStop = db
    .prepare("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?")
    .get(representativeStopId) as GtfsStop | undefined;

  if (!representativeStop) return null;

  const groupName = normalizeGtfsStopGroupName(representativeStop.stop_name);
  const baseStops = db
    .prepare(`
      SELECT stop_id, stop_name, stop_lat, stop_lon
      FROM stops
      WHERE stop_name = ?
        OR stop_name LIKE ?
      ORDER BY stop_name
    `)
    .all(groupName, `${groupName} - %bound Platform`) as GtfsStop[];
  const stationSuffix = getStationSuffix(representativeStop.stop_name);
  const representativeRoutes = getActiveStopRoutes(db, representativeStop.stop_id);
  const nearbyStationStops = stationSuffix && representativeRoutes.size > 0
    ? (db
      .prepare(`
        SELECT stop_id, stop_name, stop_lat, stop_lon
        FROM stops
        WHERE stop_name LIKE ?
          AND stop_lat BETWEEN ? AND ?
          AND stop_lon BETWEEN ? AND ?
        ORDER BY stop_name
      `)
      .all(
        `% - ${stationSuffix}`,
        representativeStop.stop_lat - 0.0012,
        representativeStop.stop_lat + 0.0012,
        representativeStop.stop_lon - 0.0012,
        representativeStop.stop_lon + 0.0012,
      ) as GtfsStop[])
      .filter((stop) => {
        const routes = getActiveStopRoutes(db, stop.stop_id);
        return [...representativeRoutes].some((route) => routes.has(route));
      })
    : [];
  const stopsById = new Map<string, GtfsStop>();
  [...baseStops, ...nearbyStationStops].forEach((stop) => stopsById.set(stop.stop_id, stop));
  const stops = [...stopsById.values()];

  return {
    id: `${GROUP_PREFIX}${representativeStop.stop_id}`,
    name: stationSuffix ?? groupName,
    stops,
  };
};

const getGtfsStopDestination = (
  db: Database.Database,
  stopId: string,
): DestinationRecord | null => {
  const group = getGtfsStopGroup(db, stopId);
  const representativeStop = group?.stops[0];
  if (!group || !representativeStop) return null;
  const lat = group.stops.reduce((sum, stop) => sum + stop.stop_lat, 0) / group.stops.length;
  const lng = group.stops.reduce((sum, stop) => sum + stop.stop_lon, 0) / group.stops.length;

  return {
    name: group.name,
    address: "TTC stop",
    lat,
    lng,
    distance: "TTC stop",
    walkMin: 0,
    walkMeters: 0,
    busStop: group.name,
    routeLabel: "Transit",
    etaMin: 0,
    departureTime: "",
    arrivalTime: "",
    totalStops: 0,
    alsoAt: [],
  };
};

const GEO_DEST_PREFIX = "geo:";

const encodeGeoDestinationId = (destination: DestinationRecord) =>
  `${GEO_DEST_PREFIX}${Buffer.from(JSON.stringify(destination), "utf8").toString("base64url")}`;

const decodeGeoDestination = (destination: string): DestinationRecord | null => {
  if (!destination.startsWith(GEO_DEST_PREFIX)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(destination.slice(GEO_DEST_PREFIX.length), "base64url").toString("utf8"),
    ) as Partial<DestinationRecord>;
    if (
      typeof parsed.name !== "string" ||
      typeof parsed.address !== "string" ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number"
    ) {
      return null;
    }

    return {
      name: parsed.name,
      address: parsed.address,
      lat: parsed.lat,
      lng: parsed.lng,
      distance: parsed.distance ?? "Toronto",
      walkMin: 0,
      walkMeters: 0,
      busStop: parsed.name,
      routeLabel: "Transit",
      etaMin: 0,
      departureTime: "",
      arrivalTime: "",
      totalStops: 0,
      alsoAt: [],
    };
  } catch {
    return null;
  }
};

const getDestinationRecord = (destination: string): DestinationRecord | null => {
  const geoDestination = decodeGeoDestination(destination);
  if (geoDestination) return geoDestination;

  const fixedDestination = DEST_DB[destination];
  if (fixedDestination) return fixedDestination;

  const db = getGtfsDb();
  if (db) {
    const gtfsDestination = getGtfsStopDestination(db, destination);
    if (gtfsDestination) return gtfsDestination;
  }

  const stop = STOPS_DB[destination];
  if (!stop) return null;

  return {
    name: stop.name,
    address: "TTC stop",
    lat: stop.pos[0],
    lng: stop.pos[1],
    distance: "TTC stop",
    walkMin: 0,
    walkMeters: 0,
    busStop: stop.name,
    routeLabel: "Transit",
    etaMin: 0,
    departureTime: "",
    arrivalTime: "",
    totalStops: 0,
    alsoAt: [],
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
    `)
    .all(
      ...stopIds,
      servicePeriodParam(),
      routeId ?? null,
      String(routeId ?? ""),
    ) as Array<{ headsign: string }>;

  const headsigns = pickRepresentativeHeadsigns(rows.map((row) => row.headsign));

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
  const currentMinutes = getTorontoClockMinutes();

  return currentMinutes < NIGHT_SERVICE_END_MINUTES
    ? currentMinutes + 24 * 60
    : currentMinutes;
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
    const selectRows = () =>
      db
        .prepare(`
          SELECT headsign, departure_minutes
          FROM stop_departures
          WHERE stop_id IN (${placeholders})
            AND route_name = ?
            AND service_period = ?
        `)
        .all(
          ...stopIds,
          String(routeId),
          servicePeriodParam(),
        ) as GtfsStopDeparture[];

    const allRows = selectRows();
    const matchingRows = direction
      ? allRows.filter((row) => cleanHeadsign(row.headsign) === direction)
      : [];
    const rows = matchingRows.length > 0 ? matchingRows : allRows;
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

  const selectRows = () =>
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
    `)
    .all(
      ...stopIds,
      String(routeId),
      String(routeId),
    ) as Array<{
      arrival_time: string;
      departure_time: string;
      headsign: string;
    }>;
  const allRows = selectRows();
  const matchingRows = direction
    ? allRows.filter((row) => cleanHeadsign(row.headsign) === direction)
    : [];
  const rows = matchingRows.length > 0 ? matchingRows : allRows;

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
    lat: 43.6558,
    lng: -79.4022,
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
    lat: 43.6534,
    lng: -79.3988,
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
    lat: 43.6426,
    lng: -79.3871,
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
    lat: 43.6548,
    lng: -79.4004,
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

const STOP_QUERY_FILLER_WORDS = new Set([
  "at",
  "and",
  "near",
  "by",
  "the",
  "stop",
  "station",
  "bus",
  "streetcar",
  "st",
  "street",
  "ave",
  "avenue",
  "rd",
  "road",
]);

const getStopQueryTokens = (query: string): string[] =>
  query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_QUERY_FILLER_WORDS.has(token));

export const searchStops = (query: string): StopResult[] => {
  const db = getGtfsDb();
  const q = query.toLowerCase().trim();

  if (db) {
    const isNumericRouteQuery = /^[1-9]\d{1,2}$/.test(q);
    let rows = isNumericRouteQuery
      ? db
        .prepare(`
          SELECT
            MIN(CAST(stops.stop_id AS INTEGER)) AS stop_id,
            stops.stop_name,
            AVG(stops.stop_lat) AS stop_lat,
            AVG(stops.stop_lon) AS stop_lon,
            GROUP_CONCAT(DISTINCT stop_routes.route_name) AS route_names
          FROM stops
          JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
          WHERE stop_routes.route_name = ?
            AND stop_routes.service_period = ?
          GROUP BY stops.stop_name
          ORDER BY stop_name
          LIMIT 8
        `)
        .all(q, servicePeriodParam()) as Array<GtfsStop & { route_names: string }>
      : [];

    if (!rows.length && isNumericRouteQuery) {
      rows = db
        .prepare(`
          SELECT
            MIN(CAST(stops.stop_id AS INTEGER)) AS stop_id,
            stops.stop_name,
            AVG(stops.stop_lat) AS stop_lat,
            AVG(stops.stop_lon) AS stop_lon,
            GROUP_CONCAT(DISTINCT stop_routes.route_name) AS route_names
          FROM stops
          JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
          WHERE stop_routes.route_name = ?
          GROUP BY stops.stop_name
          ORDER BY stop_name
          LIMIT 8
        `)
        .all(q) as Array<GtfsStop & { route_names: string }>;
    }

    if (!rows.length) {
      rows = db
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
          OR lower(stops.stop_id) LIKE ?
          OR lower(stop_routes.route_name) LIKE ?)
          AND stop_routes.service_period = ?
        GROUP BY stops.stop_name
        ORDER BY stop_name
        LIMIT 8
      `)
      .all(q, `%${q}%`, `%${q}%`, `%${q}%`, servicePeriodParam()) as Array<GtfsStop & { route_names: string }>;
    }

    const tokens = getStopQueryTokens(q);
    if (!rows.length && tokens.length > 1) {
      const tokenRows = db
        .prepare(`
          SELECT
            MIN(CAST(stops.stop_id AS INTEGER)) AS stop_id,
            stops.stop_name,
            AVG(stops.stop_lat) AS stop_lat,
            AVG(stops.stop_lon) AS stop_lon,
            GROUP_CONCAT(DISTINCT stop_routes.route_name) AS route_names
          FROM stops
          JOIN stop_routes ON stop_routes.stop_id = stops.stop_id
          WHERE stop_routes.service_period = ?
          GROUP BY stops.stop_name
          ORDER BY stop_name
        `)
        .all(servicePeriodParam()) as Array<GtfsStop & { route_names: string }>;

      rows = tokenRows
        .filter((stop) => {
          const name = stop.stop_name.toLowerCase();
          return tokens.every((token) => name.includes(token));
        })
        .slice(0, 8);
    }

    return rows.map((stop) => ({
      source: "gtfs",
      id: `${GROUP_PREFIX}${stop.stop_id}`,
      name: `bus stop: ${stop.stop_name}`,
      routes: toNumberRoutes((stop.route_names ?? "").split(",")).slice(0, 8).join(", "),
      distance: getServicePeriod() === "night" ? "Blue Night stop" : "TTC stop",
      pos: [stop.stop_lat, stop.stop_lon],
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
      pos: stop.pos,
    }))
    .slice(0, 5);
};

type NominatimResult = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
  };
};

type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_value?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

const toGeoDestinationResult = (
  name: string,
  address: string,
  lat: number,
  lng: number,
  distance: string,
): DestinationResult => {
  const destination: DestinationRecord = {
    name,
    address,
    lat,
    lng,
    distance,
    walkMin: 0,
    walkMeters: 0,
    busStop: name,
    routeLabel: "Transit",
    etaMin: 0,
    departureTime: "",
    arrivalTime: "",
    totalStops: 0,
    alsoAt: [],
  };

  return {
    source: "otp",
    id: encodeGeoDestinationId(destination),
    name: `destination: ${name}`,
    address,
    distance,
    pos: [lat, lng],
  };
};

const searchPhotonDestinations = async (query: string): Promise<DestinationResult[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const normalizedQuery = q.replace(/\bcenter\b/gi, "centre");
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${normalizedQuery} toronto`);
  url.searchParams.set("limit", "10");
  url.searchParams.set("lat", "43.6532");
  url.searchParams.set("lon", "-79.3832");

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json() as { features?: PhotonFeature[] };
    return (data.features ?? [])
      .map((feature) => {
        const [lng, lat] = feature.geometry?.coordinates ?? [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const props = feature.properties ?? {};
        const name = props.name || [props.housenumber, props.street].filter(Boolean).join(" ") || q;
        const address = [
          [props.housenumber, props.street].filter(Boolean).join(" "),
          props.city,
          props.state,
          props.postcode,
          props.country,
        ].filter(Boolean).join(", ");

        return toGeoDestinationResult(
          name,
          address || "Toronto, Ontario",
          lat,
          lng,
          props.osm_value ?? "place",
        );
      })
      .filter((result): result is DestinationResult => result !== null);
  } catch {
    return [];
  }
};

const searchNominatimDestinations = async (query: string): Promise<DestinationResult[]> => {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${q.replace(/\bcenter\b/gi, "centre")}, Toronto, Ontario`);
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TransportationPredictor/0.1 local prototype",
      },
    });
    if (!response.ok) return [];
    if (!response.headers.get("content-type")?.includes("application/json")) return [];

    const rows = await response.json() as NominatimResult[];
    return rows
      .map((row) => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const name =
          row.name ||
          row.address?.road ||
          row.display_name?.split(",")[0] ||
          q;
        const address = row.display_name ?? "Toronto, Ontario";
        return toGeoDestinationResult(
          name,
          address,
          lat,
          lng,
          row.type ?? "Toronto",
        );
      })
      .filter((result): result is DestinationResult => result !== null);
  } catch {
    return [];
  }
};

const searchStopDestinations = (query: string): DestinationResult[] =>
  searchStops(query)
    .map((stop) => {
      const destination = getDestinationRecord(stop.id);
      return {
        source: stop.source,
        id: stop.id,
        name: `destination: ${destination?.name ?? stop.name.replace(/^bus stop:\s*/i, "")}`,
        address: destination?.address ?? "TTC stop",
        distance: destination?.distance ?? stop.distance,
        pos: destination ? [destination.lat, destination.lng] as [number, number] : stop.pos,
      };
    });

export const searchDestinations = async (query: string): Promise<DestinationResult[]> => {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const stopResults = searchStopDestinations(query);
  const liveResults = [
    ...await searchPhotonDestinations(query),
    ...await searchNominatimDestinations(query),
  ];
  const fixedResults = Object.entries(DEST_DB)
    .filter(
      ([, destination]) =>
        destination.name.toLowerCase().includes(q) ||
        destination.address.toLowerCase().includes(q),
    )
    .map(([id, destination]) => ({
      source: "mock" as const,
      id,
      name: `destination: ${destination.name}`,
      address: destination.address,
      distance: destination.distance,
      pos: [destination.lat, destination.lng] as [number, number],
    }));

  const isTransitStationQuery = /\b(?:station|stop|ttc|subway|streetcar|bus)\b/i.test(query);
  const candidates = isTransitStationQuery
    ? [...stopResults, ...fixedResults, ...liveResults]
    : [...fixedResults, ...liveResults, ...stopResults];

  if (candidates.length > 0) {
    const seen = new Set<string>();
    return candidates.filter((result) => {
      if (!result.pos) return false;
      const key = `${result.pos[0].toFixed(5)},${result.pos[1].toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  }

  return [];
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

const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
};

const formatOtpTime = (value: unknown) => {
  const timestamp = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return "";

  return new Date(timestamp).toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  });
};

const getTorontoDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
};

const formatOtpOffsetDateTime = (
  dateParts: Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>,
) => {
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}-04:00`;
};

const getOtpPlanDateTime = () => {
  const configured = process.env.OTP_PLAN_DATETIME;
  if (configured && configured !== "match-weekday") return configured;

  const feedStart = process.env.OTP_GTFS_SERVICE_START_DATE ?? "2026-06-21";
  const [year, month, day] = feedStart.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const now = new Date();
  const torontoNow = getTorontoDateParts(now);
  const candidate = new Date(year, month - 1, day, Number(torontoNow.hour), Number(torontoNow.minute), Number(torontoNow.second));
  const torontoToday = new Date(Number(torontoNow.year), Number(torontoNow.month) - 1, Number(torontoNow.day));
  const dayOffset = (torontoToday.getDay() - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + dayOffset);

  return formatOtpOffsetDateTime({
    ...torontoNow,
    year: String(candidate.getFullYear()).padStart(4, "0"),
    month: String(candidate.getMonth() + 1).padStart(2, "0"),
    day: String(candidate.getDate()).padStart(2, "0"),
  });
};

const getMinutesBetween = (from: unknown, to: unknown) => {
  const fromTimestamp = typeof from === "number" ? from : Date.parse(String(from));
  const toTimestamp = typeof to === "number" ? to : Date.parse(String(to));
  if (!Number.isFinite(fromTimestamp) || !Number.isFinite(toTimestamp)) return undefined;

  return Math.max(0, Math.round((toTimestamp - fromTimestamp) / 60000));
};

type OtpLeg = {
  mode?: string;
  headsign?: string;
  from?: { name?: string; lat?: number; lon?: number };
  to?: { name?: string; lat?: number; lon?: number };
  distance?: number;
  duration?: number;
  transitLeg?: boolean;
  start?: { scheduledTime?: string };
  end?: { scheduledTime?: string };
  route?: { shortName?: string; longName?: string } | null;
  legGeometry?: { points?: string };
};

type OtpPlanResponse = {
  data?: {
    planConnection?: {
      edges?: Array<{
        node?: {
          duration?: number;
          walkDistance?: number;
          start?: string;
          end?: string;
          legs?: OtpLeg[];
        };
      }>;
      routingErrors?: Array<{ code?: string; description?: string }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

type OtpItinerary = {
  duration?: number;
  walkDistance?: number;
  start?: string;
  end?: string;
  legs?: OtpLeg[];
};

const normalizeOtpMode = (mode?: string): NavigationLeg["mode"] => {
  const normalized = (mode ?? "").toUpperCase();
  if (normalized === "WALK") return "WALK";
  if (normalized === "BUS") return "BUS";
  if (normalized === "TRAM") return "STREETCAR";
  if (normalized === "SUBWAY") return "SUBWAY";
  if (normalized === "CAR") return "CAR";
  if (normalized === "BICYCLE") return "BICYCLE";
  if (normalized) return "TRANSIT";
  return "OTHER";
};

const modeLabel = (mode: NavigationMode) => {
  if (mode === "car") return "Drive";
  if (mode === "bike") return "Bike";
  if (mode === "walk") return "Walk";
  return "Transit";
};

const getOtpNavigationRoute = async (
  dest: DestinationRecord,
  originCoordinates: { lat: number; lng: number },
  mode: NavigationMode,
): Promise<NavigationRoute | null> => {
  const baseUrl = process.env.OTP_BASE_URL ?? "http://localhost:8080";
  const url = new URL("/otp/gtfs/v1", baseUrl.replace(/\/$/, ""));
  const modesByMode: Record<NavigationMode, string> = {
    bus: "transit: { access: [WALK], egress: [WALK], transfer: [WALK] } transitOnly: true",
    car: "direct: [CAR]",
    walk: "direct: [WALK]",
    bike: "direct: [BICYCLE]",
  };
  const planDateTime = getOtpPlanDateTime();
  const dateTimeVariable = planDateTime ? "$planDateTime: OffsetDateTime!, " : "";
  const dateTimeArgument = planDateTime ? "dateTime: { earliestDeparture: $planDateTime }" : "";
  const query = `
    query PlanRoute(${dateTimeVariable}$originLat: CoordinateValue!, $originLng: CoordinateValue!, $destLat: CoordinateValue!, $destLng: CoordinateValue!) {
      planConnection(
        origin: { label: "Origin", location: { coordinate: { latitude: $originLat, longitude: $originLng } } }
        destination: { label: "Destination", location: { coordinate: { latitude: $destLat, longitude: $destLng } } }
        ${dateTimeArgument}
        modes: { ${modesByMode[mode]} }
        first: 1
      ) {
        routingErrors { code description }
        edges {
          node {
            duration
            walkDistance
            start
            end
            legs {
              mode
              transitLeg
              duration
              distance
              headsign
              start { scheduledTime }
              end { scheduledTime }
              from { name lat lon }
              to { name lat lon }
              route { shortName longName }
              legGeometry { points }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          ...(planDateTime ? { planDateTime } : {}),
          originLat: originCoordinates.lat,
          originLng: originCoordinates.lng,
          destLat: dest.lat,
          destLng: dest.lng,
        },
      }),
    });
    if (!response.ok) return getNavigationUnavailableRoute(dest, originCoordinates, mode);

    const data = await response.json() as OtpPlanResponse;
    if (data.errors?.length) return getNavigationUnavailableRoute(dest, originCoordinates, mode);

    const itinerary: OtpItinerary | undefined = data.data?.planConnection?.edges?.[0]?.node;
    if (!itinerary?.legs?.length) {
      return getUnavailableNavigationRoute(
        dest,
        originCoordinates,
        mode,
        data.data?.planConnection?.routingErrors?.[0]?.description,
      );
    }

    const legs: NavigationLeg[] = itinerary.legs.map((leg) => ({
      mode: normalizeOtpMode(leg.mode),
      fromName: leg.from?.name ?? "Origin",
      toName: leg.to?.name ?? "Destination",
      fromPos: leg.from?.lat !== undefined && leg.from?.lon !== undefined ? [leg.from.lat, leg.from.lon] : undefined,
      toPos: leg.to?.lat !== undefined && leg.to?.lon !== undefined ? [leg.to.lat, leg.to.lon] : undefined,
      durationMin: Math.max(1, Math.round((leg.duration ?? 0) / 60)),
      distanceMeters: leg.distance === undefined ? undefined : Math.round(leg.distance),
      routeLabel: leg.route?.shortName ?? leg.route?.longName,
      headsign: leg.headsign,
      startTime: formatOtpTime(leg.start?.scheduledTime),
      endTime: formatOtpTime(leg.end?.scheduledTime),
      geometry: leg.legGeometry?.points ? decodePolyline(leg.legGeometry.points) : undefined,
    }));

    const otpTransitLeg = itinerary.legs.find((leg) => leg.transitLeg);
    const transitLeg = legs.find((leg) =>
      leg.mode === "BUS" || leg.mode === "STREETCAR" || leg.mode === "SUBWAY" || leg.mode === "TRANSIT"
    );
    const transitEtaMin = getMinutesBetween(itinerary.start, otpTransitLeg?.start?.scheduledTime);
    const walkMeters = Math.round(itinerary.walkDistance ?? legs
      .filter((leg) => leg.mode === "WALK")
      .reduce((sum, leg) => sum + (leg.distanceMeters ?? 0), 0));

    return {
      source: "otp",
      available: true,
      originCoordinates,
      destinationCoordinates: { lat: dest.lat, lng: dest.lng },
      destName: dest.name,
      destAddress: dest.address,
      durationMin: Math.max(1, Math.round((itinerary.duration ?? 0) / 60)),
      walkMin: legs
        .filter((leg) => leg.mode === "WALK")
        .reduce((sum, leg) => sum + leg.durationMin, 0),
      walkMeters,
      busStop: transitLeg?.fromName ?? legs[0]?.toName ?? dest.name,
      routeLabel: [transitLeg?.routeLabel, transitLeg?.headsign].filter(Boolean).join(" to ") || modeLabel(mode),
      etaMin: transitEtaMin ?? Math.max(1, Math.round((itinerary.duration ?? 0) / 60)),
      departureTime: formatOtpTime(itinerary.start) || legs[0]?.startTime || "",
      arrivalTime: formatOtpTime(itinerary.end) || legs.at(-1)?.endTime || "",
      totalStops: legs.filter((leg) => leg.mode !== "WALK").length,
      alsoAt: [],
      legs,
    };
  } catch {
    return getNavigationUnavailableRoute(dest, originCoordinates, mode);
  }
};

const getUnavailableNavigationRoute = (
  dest: DestinationRecord,
  originCoordinates: { lat: number; lng: number },
  mode: NavigationMode,
  detail?: string,
): NavigationRoute => ({
  source: "otp",
  available: false,
  message: `I found ${dest.name}${dest.address ? ` at ${dest.address}` : ""}, but I cannot calculate a complete live ${modeLabel(mode).toLowerCase()} route from your current origin right now.`,
  originCoordinates,
  destinationCoordinates: { lat: dest.lat, lng: dest.lng },
  destName: dest.name,
  destAddress: dest.address,
  durationMin: undefined,
  walkMin: 0,
  walkMeters: 0,
  busStop: "",
  routeLabel: modeLabel(mode),
  etaMin: 0,
  departureTime: "",
  arrivalTime: "",
  totalStops: 0,
  alsoAt: [],
  legs: [],
});

const getNavigationUnavailableRoute = (
  dest: DestinationRecord,
  originCoordinates: { lat: number; lng: number },
  mode: NavigationMode,
): NavigationRoute => ({
  source: "otp",
  available: false,
  message: `I found ${dest.name}${dest.address ? ` at ${dest.address}` : ""}, but live ${modeLabel(mode).toLowerCase()} routing is unavailable right now.`,
  originCoordinates,
  destinationCoordinates: { lat: dest.lat, lng: dest.lng },
  destName: dest.name,
  destAddress: dest.address,
  durationMin: undefined,
  walkMin: 0,
  walkMeters: 0,
  busStop: "",
  routeLabel: modeLabel(mode),
  etaMin: 0,
  departureTime: "",
  arrivalTime: "",
  totalStops: 0,
  alsoAt: [],
  legs: [],
});

export const getNavigationRoute = (
  origin: string,
  destination: string,
  originCoordinates?: { lat: number; lng: number },
  mode: NavigationMode = "bus",
): Promise<NavigationRoute> => {
  const dest = getDestinationRecord(destination);
  if (!dest) throw new Error(`Unknown destination: ${destination}`);

  void origin;

  if (originCoordinates) {
    return getOtpNavigationRoute(dest, originCoordinates, mode)
      .then((route) => route ?? getUnavailableNavigationRoute(dest, originCoordinates, mode));
  }

  return Promise.resolve(getMockNavigationRoute(dest, originCoordinates));
};

const isPlaceholderDestination = (dest: DestinationRecord) =>
  dest.routeLabel === "Transit" &&
  dest.walkMin === 0 &&
  dest.walkMeters === 0 &&
  dest.etaMin === 0 &&
  !dest.arrivalTime &&
  dest.totalStops === 0;

const getMockNavigationRoute = (
  dest: DestinationRecord,
  originCoordinates?: { lat: number; lng: number },
): NavigationRoute => {
  if (isPlaceholderDestination(dest)) {
    return {
      source: "mock",
      available: false,
      message: `I found ${dest.name}${dest.address ? ` at ${dest.address}` : ""}, but I need your current location and live routing to calculate the trip.`,
      ...(originCoordinates ? { originCoordinates } : {}),
      destinationCoordinates: { lat: dest.lat, lng: dest.lng },
      destName: dest.name,
      destAddress: dest.address,
      walkMin: 0,
      walkMeters: 0,
      busStop: "",
      routeLabel: "",
      etaMin: 0,
      departureTime: "",
      arrivalTime: "",
      totalStops: 0,
      alsoAt: [],
      legs: [],
    };
  }

  return {
    source: "mock",
    available: true,
    ...(originCoordinates ? { originCoordinates } : {}),
    destinationCoordinates: { lat: dest.lat, lng: dest.lng },
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
