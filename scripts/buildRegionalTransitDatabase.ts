import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";

type TransitFile = {
  id: string;
  agencyId: string;
  kind: "schedule" | "realtime-trip-updates" | "realtime-vehicle-positions";
  filename: string;
  sourcePath: string;
};

const outputPath = process.env.REGIONAL_TRANSIT_DATABASE_PATH ?? "./data/regional-transit.sqlite";

const files: TransitFile[] = [
  {
    id: "miway-schedule",
    agencyId: "miway",
    kind: "schedule",
    filename: "miway.gtfs.zip",
    sourcePath: "./vendor/regional-transit/miway/miway.gtfs.zip",
  },
  {
    id: "miway-trip-updates",
    agencyId: "miway",
    kind: "realtime-trip-updates",
    filename: "TripUpdates.pb",
    sourcePath: "./vendor/regional-transit/miway/realtime/TripUpdates.pb",
  },
  {
    id: "miway-vehicle-positions",
    agencyId: "miway",
    kind: "realtime-vehicle-positions",
    filename: "VehiclePositions.pb",
    sourcePath: "./vendor/regional-transit/miway/realtime/VehiclePositions.pb",
  },
  {
    id: "yrt-viva-schedule",
    agencyId: "yrt-viva",
    kind: "schedule",
    filename: "yrt-viva.gtfs.zip",
    sourcePath: "./vendor/regional-transit/yrt-viva/yrt-viva.gtfs.zip",
  },
  {
    id: "yrt-viva-trip-updates",
    agencyId: "yrt-viva",
    kind: "realtime-trip-updates",
    filename: "TripUpdates.pb",
    sourcePath: "./vendor/regional-transit/yrt-viva/realtime/TripUpdates.pb",
  },
  {
    id: "yrt-viva-vehicle-positions",
    agencyId: "yrt-viva",
    kind: "realtime-vehicle-positions",
    filename: "VehiclePositions.pb",
    sourcePath: "./vendor/regional-transit/yrt-viva/realtime/VehiclePositions.pb",
  },
];

mkdirSync(path.dirname(outputPath), { recursive: true });
rmSync(outputPath, { force: true });

const db = new Database(outputPath);

db.pragma("journal_mode = DELETE");
db.pragma("synchronous = FULL");
db.exec(`
  CREATE TABLE regional_transit_files (
    id TEXT PRIMARY KEY,
    agency_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    source_path TEXT NOT NULL,
    content BLOB NOT NULL
  );
`);

const insert = db.prepare(`
  INSERT INTO regional_transit_files (
    id,
    agency_id,
    kind,
    filename,
    size_bytes,
    sha256,
    source_path,
    content
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((entries: TransitFile[]) => {
  for (const file of entries) {
    if (!existsSync(file.sourcePath)) {
      throw new Error(`Missing regional transit source file: ${file.sourcePath}`);
    }

    const content = readFileSync(file.sourcePath);
    const sizeBytes = statSync(file.sourcePath).size;
    const sha256 = createHash("sha256").update(content).digest("hex");
    insert.run(
      file.id,
      file.agencyId,
      file.kind,
      file.filename,
      sizeBytes,
      sha256,
      file.sourcePath,
      content,
    );
  }
});

insertMany(files);
db.exec("VACUUM;");
db.close();

console.log(`Regional transit database ready: ${outputPath}`);
