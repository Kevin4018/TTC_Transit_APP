import "dotenv/config";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const dataDir = process.env.DATA_DIR ?? "./data";
const sourceDir = path.join(dataDir, "source");
const gtfsZipPath = process.env.GTFS_ZIP_PATH ?? path.join(sourceDir, "ttc-gtfs.zip");
const gtfsSourceDir = process.env.GTFS_SOURCE_DIR ?? path.join(sourceDir, "gtfs");
const gtfsDbPath = process.env.GTFS_DB_PATH ?? path.join(dataDir, "gtfs.sqlite");
const gtfsSlimDbPath = process.env.GTFS_SLIM_DB_PATH;
const gtfsImportMode = (process.env.GTFS_IMPORT_MODE ?? "full").toLowerCase();
const constructionPath =
  process.env.CONSTRUCTION_GEOJSON_PATH ??
  path.join(dataDir, "construction", "road-reconstruction-program.geojson");
const planetPath = process.env.PLANET_DATA_PATH ?? path.join(dataDir, "planet.osm.pbf");

const gtfsZipUrl = process.env.GTFS_ZIP_URL;
const constructionUrl = process.env.CONSTRUCTION_GEOJSON_URL;
const planetUrl = process.env.PLANET_DATA_URL;

const ensureDir = (dir: string) => mkdirSync(dir, { recursive: true });
const requiredGtfsFiles = [
  "stops.txt",
  "routes.txt",
  "trips.txt",
  "stop_times.txt",
  "calendar.txt",
];

const hasGtfsSource = () =>
  requiredGtfsFiles.every((filename) => existsSync(path.join(gtfsSourceDir, filename)));

const downloadFile = async (url: string, destination: string) => {
  ensureDir(path.dirname(destination));

  console.log(`Downloading ${url}`);
  console.log(`-> ${destination}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const fileStream = createWriteStream(destination);
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
};

const runCommand = (command: string, args: string[], env = process.env) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

const extractZip = async (zipPath: string, destination: string) => {
  ensureDir(path.dirname(destination));
  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }
  ensureDir(destination);

  console.log(`Extracting ${zipPath}`);
  console.log(`-> ${destination}`);

  if (process.platform === "win32") {
    await runCommand("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
    ]);
    return;
  }

  await runCommand("unzip", ["-q", "-o", zipPath, "-d", destination]);
};

const ensureGtfsZip = async () => {
  if (!existsSync(gtfsZipPath)) {
    if (!gtfsZipUrl) {
      throw new Error(
        [
          `GTFS zip is missing: ${gtfsZipPath}`,
          "Set GTFS_ZIP_URL in .env, or place the zip at GTFS_ZIP_PATH.",
        ].join("\n"),
      );
    }

    await downloadFile(gtfsZipUrl, gtfsZipPath);
  } else {
    console.log(`GTFS zip already exists: ${gtfsZipPath}`);
  }
};

const ensureGtfsSource = async () => {
  if (hasGtfsSource()) {
    console.log(`GTFS source already exists: ${gtfsSourceDir}`);
    return;
  }

  await ensureGtfsZip();
  await extractZip(gtfsZipPath, gtfsSourceDir);
};

const ensureGtfsDatabase = async () => {
  await ensureGtfsSource();

  if (existsSync(gtfsDbPath)) {
    console.log(`GTFS database already exists: ${gtfsDbPath}`);
    return;
  }

  if (gtfsImportMode === "window") {
    await runCommand("npx", ["tsx", "scripts/importGtfsWindow.ts"], {
      ...process.env,
      GTFS_SOURCE_DIR: gtfsSourceDir,
      GTFS_SLIM_DB_PATH: gtfsDbPath,
    });
    return;
  }

  await runCommand("npx", ["tsx", "scripts/importGtfs.ts"], {
    ...process.env,
    GTFS_DATA_DIR: gtfsSourceDir,
    GTFS_DB_PATH: gtfsDbPath,
  });
};

const ensureSlimGtfsDatabase = async () => {
  if (!gtfsSlimDbPath || gtfsImportMode === "window") return;

  await ensureGtfsSource();

  if (existsSync(gtfsSlimDbPath)) {
    console.log(`GTFS slim database already exists: ${gtfsSlimDbPath}`);
    return;
  }

  await runCommand("npx", ["tsx", "scripts/importGtfsWindow.ts"], {
    ...process.env,
    GTFS_SOURCE_DIR: gtfsSourceDir,
    GTFS_SLIM_DB_PATH: gtfsSlimDbPath,
  });
};

const ensureConstructionGeoJson = async () => {
  if (existsSync(constructionPath)) {
    console.log(`Construction GeoJSON already exists: ${constructionPath}`);
    return;
  }

  if (!constructionUrl) {
    console.log(
      `Construction GeoJSON is missing and CONSTRUCTION_GEOJSON_URL is not set: ${constructionPath}`,
    );
    return;
  }

  await downloadFile(constructionUrl, constructionPath);
};

const ensurePlanetData = async () => {
  if (existsSync(planetPath)) {
    console.log(`Planet data already exists: ${planetPath}`);
    return;
  }

  if (!planetUrl) {
    console.log(`Planet data is missing and PLANET_DATA_URL is not set: ${planetPath}`);
    return;
  }

  await downloadFile(planetUrl, planetPath);
};

ensureDir(dataDir);
ensureDir(sourceDir);
ensureDir(path.dirname(constructionPath));

await ensureGtfsDatabase();
await ensureSlimGtfsDatabase();
await ensureConstructionGeoJson();
await ensurePlanetData();

console.log("Data setup complete.");
console.log(`GTFS_DB_PATH=${gtfsDbPath}`);
console.log(`GTFS_SOURCE_DIR=${gtfsSourceDir}`);
console.log(`CONSTRUCTION_GEOJSON_PATH=${constructionPath}`);
console.log(`PLANET_DATA_PATH=${planetPath}`);
