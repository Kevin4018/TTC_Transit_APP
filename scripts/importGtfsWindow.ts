import Database from "better-sqlite3";
import "dotenv/config";
import { createReadStream, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const gtfsDir = process.env.GTFS_SOURCE_DIR ?? process.env.GTFS_DATA_DIR ?? "./data/source/gtfs";
const dbPath = process.env.GTFS_SLIM_DB_PATH ?? process.env.GTFS_DB_PATH ?? "./data/gtfs-slim.sqlite";
const windowDays = Number(process.env.GTFS_WINDOW_DAYS ?? 14);

if (!existsSync(gtfsDir)) {
  throw new Error(`GTFS source directory does not exist: ${gtfsDir}`);
}

mkdirSync(path.dirname(dbPath), { recursive: true });

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

async function readCsv(
  filename: string,
  onRow: (row: Record<string, string>) => void,
) {
  const filePath = path.join(gtfsDir, filename);
  if (!existsSync(filePath)) {
    throw new Error(`Missing GTFS file: ${filePath}`);
  }

  const reader = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
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

async function getActiveServiceIds() {
  const dates = getDateWindow();
  const activeByDate = new Map(dates.map((date) => [formatGtfsDate(date), new Set<string>()]));

  await readCsv("calendar.txt", (row) => {
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
  });

  const calendarDatesPath = path.join(gtfsDir, "calendar_dates.txt");
  if (existsSync(calendarDatesPath)) {
    await readCsv("calendar_dates.txt", (row) => {
      const services = activeByDate.get(row.date);
      if (!services || !row.service_id) return;

      if (row.exception_type === "1") services.add(row.service_id);
      if (row.exception_type === "2") services.delete(row.service_id);
    });
  }

  return new Set([...activeByDate.values()].flatMap((services) => [...services]));
}

const importCsv = async (
  db: Database.Database,
  filename: string,
  tableName: string,
  columns: string[],
  shouldImport: (row: Record<string, string>) => boolean = () => true,
  onImported?: (row: Record<string, string>) => void,
) => {
  const placeholders = columns.map(() => "?").join(", ");
  const insert = db.prepare(
    `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
  );
  const insertMany = db.transaction((rows: string[][]) => {
    rows.forEach((row) => insert.run(row));
  });
  let rowCount = 0;
  let batch: string[][] = [];

  await readCsv(filename, (row) => {
    if (!shouldImport(row)) return;

    batch.push(columns.map((column) => row[column] ?? ""));
    rowCount += 1;
    onImported?.(row);

    if (batch.length >= 5000) {
      insertMany(batch);
      batch = [];
      if (rowCount % 100000 === 0) {
        console.log(`Imported ${rowCount.toLocaleString()} rows from ${filename}`);
      }
    }
  });

  if (batch.length > 0) insertMany(batch);
  console.log(`Imported ${rowCount.toLocaleString()} rows from ${filename}`);
};

const activeServiceIds = await getActiveServiceIds();
console.log(`Active service IDs in next ${windowDays} days: ${activeServiceIds.size}`);

if (activeServiceIds.size === 0) {
  throw new Error("No active GTFS service IDs found for the selected date window.");
}

const activeTripIds = new Set<string>();
const routeNamesById = new Map<string, string>();
const activeTripsById = new Map<
  string,
  { routeName: string; headsign: string; servicePeriod: string }
>();
const departureMinutesByKey = new Map<string, Set<number>>();

const getDepartureKey = (
  stopId: string,
  routeName: string,
  headsign: string,
  servicePeriod: string,
) => [stopId, routeName, headsign, servicePeriod].join("\u001f");

const splitDepartureKey = (key: string) => {
  const [stopId, routeName, headsign, servicePeriod] = key.split("\u001f");
  return { stopId, routeName, headsign, servicePeriod };
};

if (existsSync(dbPath)) {
  rmSync(dbPath, { force: true });
}
if (existsSync(`${dbPath}-wal`)) {
  rmSync(`${dbPath}-wal`, { force: true });
}
if (existsSync(`${dbPath}-shm`)) {
  rmSync(`${dbPath}-shm`, { force: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
  DROP TABLE IF EXISTS stops;
  DROP TABLE IF EXISTS routes;
  DROP TABLE IF EXISTS trips;
  DROP TABLE IF EXISTS stop_times;
  DROP TABLE IF EXISTS stop_routes;
  DROP TABLE IF EXISTS stop_departures;

  CREATE TABLE stops (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    stop_lat REAL NOT NULL,
    stop_lon REAL NOT NULL
  );

  CREATE TABLE routes (
    route_id TEXT PRIMARY KEY,
    route_short_name TEXT,
    route_long_name TEXT
  );

  CREATE TABLE trips (
    route_id TEXT NOT NULL,
    service_id TEXT,
    trip_id TEXT PRIMARY KEY,
    trip_headsign TEXT,
    direction_id TEXT
  );

  CREATE TABLE stop_times (
    trip_id TEXT NOT NULL,
    arrival_time TEXT,
    departure_time TEXT,
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER
  );

  CREATE TABLE stop_routes (
    stop_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    headsign TEXT,
    service_period TEXT NOT NULL
  );

  CREATE TABLE stop_departures (
    stop_id TEXT NOT NULL,
    route_name TEXT NOT NULL,
    headsign TEXT,
    service_period TEXT NOT NULL,
    departure_minutes TEXT NOT NULL
  );
`);

await importCsv(db, "stops.txt", "stops", [
  "stop_id",
  "stop_name",
  "stop_lat",
  "stop_lon",
]);
await importCsv(db, "routes.txt", "routes", [
  "route_id",
  "route_short_name",
  "route_long_name",
], () => true, (row) => {
  routeNamesById.set(
    row.route_id,
    row.route_short_name || row.route_long_name || row.route_id,
  );
});

console.log("Reading active trips...");
await readCsv("trips.txt", (row) => {
  if (!activeServiceIds.has(row.service_id)) return;

  const routeName = routeNamesById.get(row.route_id) ?? row.route_id;
  activeTripIds.add(row.trip_id);
  activeTripsById.set(row.trip_id, {
    routeName,
    headsign: row.trip_headsign ?? "",
    servicePeriod:
      Number(routeName) >= 300 && Number(routeName) <= 399 ? "night" : "day",
  });
});

console.log(`Active trips in next ${windowDays} days: ${activeTripIds.size.toLocaleString()}`);

console.log("Compressing stop_times into stop_departures...");
let stopTimeCount = 0;
await readCsv("stop_times.txt", (row) => {
  const trip = activeTripsById.get(row.trip_id);
  if (!trip || !row.stop_id) return;

  const time = row.departure_time || row.arrival_time;
  if (!time) return;

  const minutes = parseGtfsTimeToMinutes(time);
  if (!Number.isFinite(minutes)) return;

  const key = getDepartureKey(
    row.stop_id,
    trip.routeName,
    trip.headsign,
    trip.servicePeriod,
  );
  const departures = departureMinutesByKey.get(key) ?? new Set<number>();
  departures.add(minutes);
  departureMinutesByKey.set(key, departures);
  stopTimeCount += 1;

  if (stopTimeCount % 100000 === 0) {
    console.log(`Compressed ${stopTimeCount.toLocaleString()} rows from stop_times.txt`);
  }
});
console.log(`Compressed ${stopTimeCount.toLocaleString()} rows from stop_times.txt`);

console.log("Writing compressed departure tables...");
const insertStopRoute = db.prepare(`
  INSERT INTO stop_routes (stop_id, route_name, headsign, service_period)
  VALUES (?, ?, ?, ?)
`);
const insertStopDeparture = db.prepare(`
  INSERT INTO stop_departures (
    stop_id,
    route_name,
    headsign,
    service_period,
    departure_minutes
  )
  VALUES (?, ?, ?, ?, ?)
`);
const insertCompressedRows = db.transaction(() => {
  for (const [key, departures] of departureMinutesByKey) {
    const { stopId, routeName, headsign, servicePeriod } = splitDepartureKey(key);
    const sortedDepartures = [...departures].sort((a, b) => a - b);
    insertStopRoute.run(stopId, routeName, headsign, servicePeriod);
    insertStopDeparture.run(
      stopId,
      routeName,
      headsign,
      servicePeriod,
      sortedDepartures.join(","),
    );
  }
});
insertCompressedRows();
console.log(`Wrote ${departureMinutesByKey.size.toLocaleString()} compressed departure rows.`);

console.log("Creating indexes...");
db.exec(`
  CREATE INDEX idx_stops_name ON stops(stop_name);
  CREATE INDEX idx_stop_routes_stop_period ON stop_routes(stop_id, service_period);
  CREATE INDEX idx_stop_routes_route_period ON stop_routes(route_name, service_period);
  CREATE INDEX idx_stop_departures_lookup
    ON stop_departures(stop_id, route_name, service_period, headsign);
`);

console.log("Removing stops without scheduled service...");
const deletedStops = db
  .prepare(`
    DELETE FROM stops
    WHERE NOT EXISTS (
      SELECT 1
      FROM stop_routes
      WHERE stop_routes.stop_id = stops.stop_id
    )
  `)
  .run();

console.log(`Removed ${deletedStops.changes.toLocaleString()} stops without service.`);

db.pragma("wal_checkpoint(TRUNCATE)");
db.exec("VACUUM");
db.close();

console.log(`GTFS window SQLite database ready: ${dbPath}`);
