import { apiRequest } from "./request";

export interface RegionalStopResult {
  source: "regional-gtfs";
  agencyId: string;
  agencyName: string;
  id: string;
  name: string;
  routes: string;
  distance: string;
  pos?: [number, number];
}

export interface RegionalPrediction {
  source: "regional-gtfs";
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

export function searchRegionalStops(query: string): Promise<RegionalStopResult[]> {
  return apiRequest<RegionalStopResult[]>("/api/regional-transit/stops/search", {
    params: { q: query },
  });
}

export function getRegionalPrediction(params: {
  agencyId?: string;
  stopId?: string;
  stopQuery?: string;
  routeName?: string;
  headsign?: string;
}): Promise<RegionalPrediction> {
  return apiRequest<RegionalPrediction>("/api/regional-transit/prediction", {
    params,
  });
}
