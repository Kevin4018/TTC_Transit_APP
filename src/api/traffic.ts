import { apiRequest } from "./request";

export type TrafficEventType = "traffic" | "accident" | "construction";

export interface TrafficEvent {
  id: string;
  type: TrafficEventType;
  title: string;
  description: string;
  lat?: number;
  lng?: number;
  delayMin: number;
  source: "mock" | "toronto-open-data" | "tomtom";
}

export interface TrafficImpact {
  source: "mock" | "toronto-open-data" | "tomtom";
  trafficDelayMin: number;
  accidentDelayMin: number;
  constructionDelayMin: number;
  events: TrafficEvent[];
}

export function getTrafficImpact(
  lat: number,
  lng: number,
  routeId: number,
  at?: string,
): Promise<TrafficImpact> {
  return apiRequest<TrafficImpact>("/api/traffic/impact", {
    params: { lat, lng, routeId, at },
  });
}
