import { apiRequest } from "./request";

export type LocalInfoIntent =
  | "nearby_places"
  | "ticket_info"
  | "price_compare"
  | "gas_price"
  | "distance_route"
  | "retail"
  | "local_service";

export type SourceConfidence = "high" | "medium" | "low" | "needs_confirmation";

export interface LocalInfoResult {
  name: string;
  category: string;
  address?: string;
  distanceKm?: number;
  driveTimeMin?: number;
  rating?: number;
  reviews?: number;
  openNow?: boolean;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  priceLevel?: string;
  priceInfo?: {
    type: "ticket" | "fuel" | "service" | "general";
    value?: string;
    source: "official_website" | "google_places" | "third_party" | "not_available";
    confidence: SourceConfidence;
    note: string;
  };
  sourceLabels: string[];
  sourceConfidence: SourceConfidence;
}

export interface LocalInfoResponse {
  intent: LocalInfoIntent;
  category: string;
  query: string;
  realTimeNeeded: boolean;
  locationNeeded: boolean;
  sourceSummary: string;
  caveats: string[];
  results: LocalInfoResult[];
}

export function queryLocalInfo({
  query,
  lat,
  lng,
  language,
  maxResults = 6,
}: {
  query: string;
  lat?: number;
  lng?: number;
  language?: "en" | "zh" | "fr";
  maxResults?: number;
}): Promise<LocalInfoResponse> {
  return apiRequest<LocalInfoResponse>("/api/local-info/query", {
    method: "POST",
    body: { query, lat, lng, language, maxResults },
  });
}
