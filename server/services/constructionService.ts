import { existsSync, readFileSync } from "node:fs";

export interface ConstructionEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  distanceKm: number;
  delayMin: number;
  source: "geojson" | "mock";
}

export interface ConstructionImpact {
  source: "geojson" | "mock";
  constructionDelayMin: number;
  events: ConstructionEvent[];
}

interface LoadedConstructionEvent extends ConstructionEvent {
  positions: Position[];
}

type Position = [number, number];

interface GeoJsonFeature {
  id?: string | number;
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: unknown;
  } | null;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

let cachedFeatures: LoadedConstructionEvent[] | null = null;

const getDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number";

const collectPositions = (coordinates: unknown): Position[] => {
  if (isPosition(coordinates)) return [coordinates];
  if (!Array.isArray(coordinates)) return [];

  return coordinates.flatMap(collectPositions);
};

const getFeatureCenter = (feature: GeoJsonFeature) => {
  const positions = collectPositions(feature.geometry?.coordinates);
  if (positions.length === 0) return null;

  const totals = positions.reduce(
    (acc, [lng, lat]) => ({
      lat: acc.lat + lat,
      lng: acc.lng + lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / positions.length,
    lng: totals.lng / positions.length,
  };
};

const getClosestDistanceKm = (lat: number, lng: number, positions: Position[]) => {
  if (positions.length === 0) return Number.POSITIVE_INFINITY;

  return positions.reduce((closest, [featureLng, featureLat]) => {
    const distanceKm = getDistanceKm(lat, lng, featureLat, featureLng);
    return Math.min(closest, distanceKm);
  }, Number.POSITIVE_INFINITY);
};

const getPropertyText = (
  properties: Record<string, unknown> | undefined,
  names: string[],
) => {
  if (!properties) return "";

  const entry = Object.entries(properties).find(([key, value]) =>
    names.some((name) => key.toLowerCase().includes(name)) &&
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "",
  );

  return entry ? String(entry[1]) : "";
};

const loadConstructionFeatures = () => {
  if (cachedFeatures) return cachedFeatures;

  const path = process.env.CONSTRUCTION_GEOJSON_PATH;
  if (!path || !existsSync(path)) {
    cachedFeatures = [];
    return cachedFeatures;
  }

  const geojson = JSON.parse(readFileSync(path, "utf8")) as GeoJsonFeatureCollection;
  const features = Array.isArray(geojson.features) ? geojson.features : [];

  cachedFeatures = features
    .map((feature, index) => {
      const positions = collectPositions(feature.geometry?.coordinates);
      const center = getFeatureCenter(feature);
      if (!center || positions.length === 0) return null;

      const title =
        getPropertyText(feature.properties, ["project", "title", "name", "street"]) ||
        "Road reconstruction project";
      const description =
        getPropertyText(feature.properties, ["description", "work", "scope", "status"]) ||
        "A road reconstruction project is listed near this area.";

      return {
        id: String(feature.id ?? `construction-${index}`),
        title,
        description,
        lat: center.lat,
        lng: center.lng,
        distanceKm: 0,
        delayMin: 0,
        source: "geojson" as const,
        positions,
      };
    })
    .filter((event): event is LoadedConstructionEvent => event !== null);

  return cachedFeatures;
};

const getDelayForDistance = (distanceKm: number, title: string, description: string) => {
  const text = `${title} ${description}`.toLowerCase();
  const majorWork =
    /closure|closed|reconstruction|rehabilitation|watermain|bridge|track|streetcar/.test(text);
  const lightWork = /planning|planned|design|study|minor|sidewalk/.test(text);
  let delay = 0;

  if (distanceKm <= 0.18) delay = 3;
  else if (distanceKm <= 0.45) delay = 2;
  else if (distanceKm <= 0.9) delay = 1;

  if (delay > 0 && majorWork) delay += 1;
  if (delay > 0 && lightWork) delay -= 1;

  return Math.max(0, Math.min(4, delay));
};

export function getConstructionImpact(lat: number, lng: number): ConstructionImpact {
  const events = loadConstructionFeatures()
    .map((event) => {
      const distanceKm = getClosestDistanceKm(lat, lng, event.positions);
      const { positions: _positions, ...publicEvent } = event;
      return {
        ...publicEvent,
        distanceKm,
        delayMin: getDelayForDistance(distanceKm, event.title, event.description),
      };
    })
    .filter((event) => event.delayMin > 0)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  if (events.length === 0) {
    return {
      source: process.env.CONSTRUCTION_GEOJSON_PATH ? "geojson" : "mock",
      constructionDelayMin: 0,
      events: [],
    };
  }

  return {
    source: "geojson",
    constructionDelayMin: Math.min(4, events.reduce((max, event) => Math.max(max, event.delayMin), 0)),
    events,
  };
}
