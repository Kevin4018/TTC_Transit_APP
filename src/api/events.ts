import { apiRequest } from "./request";

export type CityEventKind = "sports" | "entertainment" | "festival" | "other";

export interface CityEvent {
  id: string;
  kind: CityEventKind;
  title: string;
  venueName: string;
  description: string;
  startsAt: string;
  lat: number;
  lng: number;
  distanceKm: number;
  delayMin: number;
  source: "ticketmaster" | "mock";
  url?: string;
}

export interface EventImpact {
  source: "ticketmaster" | "mock";
  eventDelayMin: number;
  events: CityEvent[];
}

export function getEventImpact(
  lat: number,
  lng: number,
  routeId?: number,
  at?: string,
): Promise<EventImpact> {
  return apiRequest<EventImpact>("/api/events/impact", {
    params: { lat, lng, routeId, at },
  });
}
