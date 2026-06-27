import Database from "better-sqlite3";
import "dotenv/config";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

type RegionalFeed = {
  id: string;
  name?: string;
  enabled?: boolean;
  filename?: string;
};

const feedsFile = process.env.REGIONAL_TRANSIT_FEEDS_FILE ?? "./config/regional-transit-feeds.json";
const gtfsDir = process.env.REGIONAL_TRANSIT_OUTPUT_DIR ?? process.env.GTHA_GTFS_OUTPUT_DIR ?? "./data/otp";
const dbPath = process.env.REGIONAL_TRANSIT_ARRIVALS_DB_PATH ?? "./data/regional-arrivals.sqlite";
const windowDays = Number(process.env.REGIONAL_TRANSIT_WINDOW_DAYS ?? 14);

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

async function readZipCsv(
  zipPath: string,
  filename: string,
  onRow: (row: Record<string, string>) => void,
) {
  const child = spawn("unzip", ["-p", zipPath, filename], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const errors: Buffer[] = [];
  child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));

  const reader = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;

  for await (const rawLine of reader) {
    const line = rawLine.replace(/^\uFEFF/, "");
    if (!line.trim()) continue;

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    onRow(
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
  }

  const code = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (code !== 0 && headers === null) {
    throw new Error(`Could not read ${filename} from ${zipPath}: ${Buffer.concat(errors).toString("utf8")}`);
  }
}

const formatGtfsDate = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

const parseGtfsDate = (value: string) =>
  new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
  );

const getDateWindow = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
};

const weekdayColumns = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const parseGtfsTimeToMinutes = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

const prefixed = (agencyId: string, id: string) => `${agencyId}:${id}`;

function readFeeds(): RegionalFeed[] {
  const parsed = JSON.parse(readFileSync(feedsFile, "utf8")) as { feeds?: RegionalFeed[] } | RegionalFeed[];
  const feeds = Array.isArray(parsed) ? parsed : parsed.feeds ?? [];
  return feeds.filter(feed => feed.enabled !== false && feed.id !== "ttc");
}

async function getActiveServiceIds(zipPath: string) {
  const dates = getDateWindow();
  const activeByDate = new Map(dates.map((date) => [formatGtfsDate(date), new Set<string>()]));
  const availableCalendarDateServiceIds = new Set<string>();

  await readZipCsv(zipPath, "calendar.txt", (row) => {
    const serviceId = row.service_id;
    if (!serviceId) return;

    const start = parseGtfsDate(row.start_date);
    const end = parseGtfsDate(row.end_date);

    dates.forEach((date) => {
      const dateKey = formatGtfsDate(date);
      const weekdayColumn = weekdayColumns[date.getDay()];
      if (date >= start && date <= end && row[weekdayColumn] === "1") {
        activeByDate.get(dateKey)?.add(serviceId);
      }
    });
  }).catch(() => undefined);

  await readZipCsv(zipPath, "calendar_dates.txt", (row) => {
    if (row.service_id && row.exception_type === "1") {
      availableCalendarDateServiceIds.add(row.service_id);
    }

    const services = activeByDate.get(row.date);
    if (!services || !row.service_id) return;

    if (row.exception_type === "1") services.add(row.service_id);
    if (row.exception_type === "2") services.delete(row.service_id);
  }).catch(() => undefined);

  const activeServiceIds = new Set([...activeByDate.values()].flatMap((services) => [...services]));
  if (activeServiceIds.size > 0) return activeServiceIds;

  return availableCalendarDateServiceIds;
}

mkdirSync(path.dirname(dbPath), { recursive: true });
rmSync(dbPath, { force: true });
rmSync(`${dbPath}-wal`, { force: true });
rmSync(`${dbPath}-shm`, { force: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.exec(`
  CREATE TABLE agencies (
    agency_id TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL
  );

  CREATE TABLE stops (
    agency_id TEXT NOT NULL,
    stop_id TEXT PRIMARY KEY,
    raw_stop_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    stop_lat REAL NOT NULL,
    stop_lon REAL NOT NULL
  );

  CREATE TABLE stop_routes (
    agency_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    headsign TEXT NOT NULL
  );

  CREATE TABLE stop_departures (
    agency_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    headsign TEXT NOT NULL,
    departure_minutes TEXT NOT NULL
  );
`);

const insertAgency = db.prepare("INSERT OR REPLACE INTO agencies (agency_id, agency_name) VALUES (?, ?)");
const insertStop = db.prepare(`
  INSERT OR REPLACE INTO stops (
    agency_id,
    stop_id,
    raw_stop_id,
    stop_name,
    stop_lat,
    stop_lon
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertStopRoute = db.prepare(`
  INSERT INTO stop_routes (agency_id, stop_id, route_name, headsign)
  VALUES (?, ?, ?, ?)
`);
const insertStopDeparture = db.prepare(`
  INSERT INTO stop_departures (
    agency_id,
    stop_id,
    route_name,
    headsign,
    departure_minutes
  )
  VALUES (?, ?, ?, ?, ?)
`);

for (const feed of readFeeds()) {
  const agencyId = feed.id;
  const filename = feed.filename ?? `${feed.id}.gtfs.zip`;
  const zipPath = path.resolve(gtfsDir, filename);
  if (!existsSync(zipPath)) {
    console.log(`Skipping ${feed.name ?? agencyId}: missing ${zipPath}`);
    continue;
  }

  console.log(`Importing ${feed.name ?? agencyId} from ${zipPath}`);
  insertAgency.run(agencyId, feed.name ?? agencyId);

  const routeNamesById = new Map<string, string>();
  const activeTripsById = new Map<string, { routeName: string; headsign: string }>();
  const departureMinutesByKey = new Map<string, Set<number>>();
  const activeServiceIds = await getActiveServiceIds(zipPath);

  console.log(`  Active services: ${activeServiceIds.size}`);
  await readZipCsv(zipPath, "routes.txt", (row) => {
    routeNamesById.set(
      row.route_id,
      row.route_short_name || row.route_long_name || row.route_id,
    );
  });

  await readZipCsv(zipPath, "stops.txt", (row) => {
    if (!row.stop_id || !row.stop_name || !row.stop_lat || !row.stop_lon) return;
    insertStop.run(
      agencyId,
      prefixed(agencyId, row.stop_id),
      row.stop_id,
      row.stop_name,
      Number(row.stop_lat),
      Number(row.stop_lon),
    );
  });

  await readZipCsv(zipPath, "trips.txt", (row) => {
    if (!activeServiceIds.has(row.service_id)) return;
    activeTripsById.set(row.trip_id, {
      routeName: routeNamesById.get(row.route_id) ?? row.route_id,
      headsign: row.trip_headsign ?? "",
    });
  });

  let stopTimeCount = 0;
  await readZipCsv(zipPath, "stop_times.txt", (row) => {
    const trip = activeTripsById.get(row.trip_id);
    if (!trip || !row.stop_id) return;

    const time = row.departure_time || row.arrival_time;
    if (!time) return;

    const minutes = parseGtfsTimeToMinutes(time);
    if (!Number.isFinite(minutes)) return;

    const stopId = prefixed(agencyId, row.stop_id);
    const key = [agencyId, stopId, trip.routeName, trip.headsign].join("\u001f");
    const departures = departureMinutesByKey.get(key) ?? new Set<number>();
    departures.add(minutes);
    departureMinutesByKey.set(key, departures);
    stopTimeCount += 1;
  });

  const insertRows = db.transaction(() => {
    for (const [key, departures] of departureMinutesByKey) {
      const [rowAgencyId, stopId, routeName, headsign] = key.split("\u001f");
      const sortedDepartures = [...departures].sort((a, b) => a - b);
      insertStopRoute.run(rowAgencyId, stopId, routeName, headsign);
      insertStopDeparture.run(
        rowAgencyId,
        stopId,
        routeName,
        headsign,
        sortedDepartures.join(","),
      );
    }
  });
  insertRows();
  console.log(`  Active trips: ${activeTripsById.size.toLocaleString()}`);
  console.log(`  Stop times: ${stopTimeCount.toLocaleString()}`);
  console.log(`  Departure rows: ${departureMinutesByKey.size.toLocaleString()}`);
}

console.log("Creating indexes...");
db.exec(`
  CREATE INDEX idx_regional_stops_name ON stops(stop_name);
  CREATE INDEX idx_regional_stops_agency ON stops(agency_id);
  CREATE INDEX idx_regional_stop_routes_stop ON stop_routes(stop_id);
  CREATE INDEX idx_regional_stop_routes_route ON stop_routes(route_name);
  CREATE INDEX idx_regional_departures_lookup ON stop_departures(agency_id, stop_id, route_name, headsign);
`);

db.pragma("wal_checkpoint(TRUNCATE)");
db.exec("VACUUM;");
db.close();

console.log(`Regional GTFS arrivals database ready: ${dbPath}`);
