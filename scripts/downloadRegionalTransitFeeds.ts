import "dotenv/config";
import Database from "better-sqlite3";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

type FeedConfig = {
  id: string;
  name?: string;
  url?: string;
  localPath?: string;
  databasePath?: string;
  databaseFileId?: string;
  enabled?: boolean;
  filename?: string;
};

const feedsFile =
  process.env.REGIONAL_TRANSIT_FEEDS_FILE ??
  process.env.GTHA_GTFS_FEEDS_FILE ??
  "./config/regional-transit-feeds.json";
const outputDir =
  process.env.REGIONAL_TRANSIT_OUTPUT_DIR ??
  process.env.GTHA_GTFS_OUTPUT_DIR ??
  "./data/otp";
const dryRun =
  process.env.REGIONAL_TRANSIT_DRY_RUN === "true" ||
  process.env.GTHA_GTFS_DRY_RUN === "true";

const ensureDir = (dir: string) => mkdirSync(dir, { recursive: true });

const sanitizeId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseInlineFeeds = (value: string): FeedConfig[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        throw new Error(`Invalid regional feed entry: ${entry}. Use id=https://feed.zip`);
      }

      const id = sanitizeId(entry.slice(0, separatorIndex));
      const url = entry.slice(separatorIndex + 1).trim();
      return { id, url };
    });

const readFeeds = (): FeedConfig[] => {
  const inlineFeeds =
    process.env.REGIONAL_TRANSIT_FEEDS?.trim() ??
    process.env.GTHA_GTFS_FEEDS?.trim();
  if (inlineFeeds) return parseInlineFeeds(inlineFeeds);

  if (!existsSync(feedsFile)) {
    throw new Error(
      [
        `Regional transit feed config is missing: ${feedsFile}`,
        "Create it from config/regional-transit-feeds.example.json, or set REGIONAL_TRANSIT_FEEDS=id=https://feed.zip,...",
      ].join("\n"),
    );
  }

  const parsed = JSON.parse(readFileSync(feedsFile, "utf8")) as unknown;
  const feeds = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "feeds" in parsed && Array.isArray((parsed as { feeds?: unknown }).feeds)
      ? (parsed as { feeds: unknown[] }).feeds
      : null;

  if (!feeds) {
    throw new Error(`${feedsFile} must be a JSON array or an object with a feeds array.`);
  }

  return feeds.map((feed) => {
    if (typeof feed !== "object" || feed === null) {
      throw new Error("Each regional transit feed entry must be an object.");
    }

    const candidate = feed as Partial<FeedConfig>;
    if (!candidate.id || (!candidate.url && !candidate.localPath && !candidate.databaseFileId)) {
      throw new Error("Each regional transit feed entry needs id and one of url, localPath, or databaseFileId.");
    }

    return {
      ...candidate,
      id: sanitizeId(candidate.id),
      url: candidate.url?.trim(),
      localPath: candidate.localPath?.trim(),
      databasePath: candidate.databasePath?.trim(),
      databaseFileId: candidate.databaseFileId?.trim(),
    };
  });
};

const zipDirectory = (sourceDir: string, destination: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("zip", ["-qr", destination, "."], {
      cwd: sourceDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip exited with code ${code}`));
      }
    });
  });

const copyLocalFeed = async (feed: FeedConfig, destination: string) => {
  if (!feed.localPath) return false;

  const source = path.resolve(feed.localPath);
  if (!existsSync(source)) {
    throw new Error(`Local regional transit feed is missing for ${feed.id}: ${source}`);
  }

  const stats = statSync(source);
  console.log(`Using local ${feed.name ?? feed.id}`);
  console.log(`  ${source}`);
  console.log(`  -> ${destination}`);

  if (stats.isDirectory()) {
    await zipDirectory(source, destination);
  } else {
    copyFileSync(source, destination);
  }

  return true;
};

const copyDatabaseFeed = (feed: FeedConfig, destination: string) => {
  if (!feed.databaseFileId) return false;

  const databasePath = path.resolve(feed.databasePath ?? "./data/regional-transit.sqlite");
  if (!existsSync(databasePath)) {
    throw new Error(`Regional transit database is missing for ${feed.id}: ${databasePath}`);
  }

  console.log(`Using database ${feed.name ?? feed.id}`);
  console.log(`  ${databasePath}#${feed.databaseFileId}`);
  console.log(`  -> ${destination}`);

  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare(
        `
          SELECT content
          FROM regional_transit_files
          WHERE id = ?
        `,
      )
      .get(feed.databaseFileId) as { content?: Buffer } | undefined;

    if (!row?.content) {
      throw new Error(`Regional transit database file is missing: ${feed.databaseFileId}`);
    }

    writeFileSync(destination, row.content);
  } finally {
    db.close();
  }

  return true;
};

const downloadFile = async (feed: FeedConfig) => {
  const filename = feed.filename ?? `${feed.id}.gtfs.zip`;
  const destination = path.resolve(outputDir, filename);

  ensureDir(outputDir);

  if (copyDatabaseFeed(feed, destination)) {
    return;
  }

  if (await copyLocalFeed(feed, destination)) {
    return;
  }

  if (!feed.url) {
    throw new Error(`Regional transit feed ${feed.id} has no url or localPath.`);
  }

  console.log(`Downloading ${feed.name ?? feed.id}`);
  console.log(`  ${feed.url}`);
  console.log(`  -> ${destination}`);

  const response = await fetch(feed.url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${feed.id}: HTTP ${response.status}`);
  }

  const fileStream = createWriteStream(destination);
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
};

const feeds = readFeeds().filter((feed) => feed.enabled !== false);

if (feeds.length === 0) {
  throw new Error("No enabled regional transit feeds are configured.");
}

console.log(`Writing regional transit feeds to ${outputDir}`);
for (const feed of feeds) {
  if (dryRun) {
    console.log(`Would use ${feed.name ?? feed.id}: ${feed.databaseFileId ?? feed.localPath ?? feed.url}`);
  } else {
    await downloadFile(feed);
  }
}

console.log(dryRun ? "Regional transit feed dry run complete." : "Regional transit feed downloads complete.");
if (!dryRun) {
  console.log("Rebuild routing with: npm run routing:build:regional");
}
