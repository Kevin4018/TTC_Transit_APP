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

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      location?: {
        latitude?: string;
        longitude?: string;
      };
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
}

const TICKETMASTER_API_BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TORONTO_TIME_ZONE = "America/Toronto";

const MAJOR_TORONTO_VENUES = [
  { name: "Scotiabank Arena", lat: 43.6435, lng: -79.3791, capacity: 19800, keywords: ["leafs", "raptors", "concert"] },
  { name: "Rogers Centre", lat: 43.6414, lng: -79.3894, capacity: 49000, keywords: ["blue jays", "concert"] },
  { name: "BMO Field", lat: 43.6332, lng: -79.4186, capacity: 30000, keywords: ["toronto fc", "argos", "concert"] },
  { name: "Budweiser Stage", lat: 43.6294, lng: -79.4151, capacity: 16000, keywords: ["concert", "festival"] },
  { name: "Coca-Cola Coliseum", lat: 43.6355, lng: -79.4150, capacity: 8000, keywords: ["marlies", "concert"] },
  { name: "Meridian Hall", lat: 43.6469, lng: -79.3760, capacity: 3200, keywords: ["theatre", "concert"] },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const radiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toTicketmasterDateTime = (date: Date) =>
  date.toISOString().replace(/\.\d{3}Z$/, "Z");

const parseTargetDate = (at?: string) => {
  const parsed = at ? new Date(at) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getEventKind = (segment?: string, genre?: string): CityEventKind => {
  const text = `${segment ?? ""} ${genre ?? ""}`.toLowerCase();
  if (/sport|hockey|basketball|baseball|soccer|football/.test(text)) return "sports";
  if (/music|arts|theatre|comedy|concert|show/.test(text)) return "entertainment";
  if (/festival|community/.test(text)) return "festival";
  return "other";
};

const getEventDelay = (
  distanceKm: number,
  startsAt: string,
  kind: CityEventKind,
  capacityHint = 8000,
  referenceTime = new Date(),
) => {
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) return 0;

  const hoursUntilStart = (startMs - referenceTime.getTime()) / (60 * 60 * 1000);
  const eventWindowScore =
    hoursUntilStart >= -1 && hoursUntilStart <= 1.5 ? 1
      : hoursUntilStart > 1.5 && hoursUntilStart <= 4 ? 0.75
      : hoursUntilStart > -3 && hoursUntilStart < -1 ? 0.5
      : 0;
  if (eventWindowScore === 0) return 0;

  const distanceScore =
    distanceKm <= 0.6 ? 1
      : distanceKm <= 1.5 ? 0.75
      : distanceKm <= 3 ? 0.45
      : 0;
  if (distanceScore === 0) return 0;

  const capacityScore = capacityHint >= 35000 ? 1 : capacityHint >= 15000 ? 0.75 : 0.45;
  const kindScore = kind === "sports" ? 1 : kind === "entertainment" ? 0.82 : 0.65;
  return Math.min(6, Math.max(1, Math.round(6 * eventWindowScore * distanceScore * capacityScore * kindScore)));
};

const formatTorontoEventTime = (date: Date) =>
  date.toLocaleString("en-CA", {
    timeZone: TORONTO_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const getMockEvents = (lat: number, lng: number, targetTime: Date): CityEvent[] => {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TORONTO_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(targetTime),
  );
  const isLikelyEventPeriod = hour >= 17 && hour <= 22;
  if (!isLikelyEventPeriod) return [];

  return MAJOR_TORONTO_VENUES
    .map((venue, index) => {
      const startsAt = new Date(targetTime);
      startsAt.setMinutes(0, 0, 0);
      const distanceKm = getDistanceKm(lat, lng, venue.lat, venue.lng);
      const kind: CityEventKind = venue.keywords.some(keyword => /leafs|raptors|blue jays|toronto fc|argos|marlies/.test(keyword))
        ? "sports"
        : "entertainment";
      const delayMin = getEventDelay(distanceKm, startsAt.toISOString(), kind, venue.capacity, targetTime);

      return {
        id: `mock-event-${index}`,
        kind,
        title: `Major ${kind === "sports" ? "game" : "show"} window`,
        venueName: venue.name,
        description: `No event API key is configured, so the app is estimating event pressure from major Toronto venues near ${venue.name} around ${formatTorontoEventTime(startsAt)}.`,
        startsAt: startsAt.toISOString(),
        lat: venue.lat,
        lng: venue.lng,
        distanceKm,
        delayMin,
        source: "mock" as const,
      };
    })
    .filter(event => event.delayMin > 0)
    .sort((a, b) => b.delayMin - a.delayMin || a.distanceKm - b.distanceKm)
    .slice(0, 3);
};

const requestTicketmasterEvents = async (
  lat: number,
  lng: number,
  targetTime: Date,
): Promise<CityEvent[]> => {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  const start = new Date(targetTime.getTime() - 3 * 60 * 60 * 1000);
  const end = new Date(targetTime.getTime() + 8 * 60 * 60 * 1000);
  const url = new URL(TICKETMASTER_API_BASE_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("city", "Toronto");
  url.searchParams.set("countryCode", "CA");
  url.searchParams.set("startDateTime", toTicketmasterDateTime(start));
  url.searchParams.set("endDateTime", toTicketmasterDateTime(end));
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", "20");

  const response = await fetch(url);
  const data = await response.json() as TicketmasterResponse;
  if (!response.ok) {
    throw new Error(`Ticketmaster request failed with status ${response.status}`);
  }

  return (data._embedded?.events ?? [])
    .map((event) => {
      const venue = event._embedded?.venues?.[0];
      const venueLat = Number(venue?.location?.latitude);
      const venueLng = Number(venue?.location?.longitude);
      const startsAt =
        event.dates?.start?.dateTime ??
        (event.dates?.start?.localDate && event.dates?.start?.localTime
          ? `${event.dates.start.localDate}T${event.dates.start.localTime}`
          : event.dates?.start?.localDate);

      if (!startsAt || !Number.isFinite(venueLat) || !Number.isFinite(venueLng)) return null;

      const classification = event.classifications?.[0];
      const kind = getEventKind(classification?.segment?.name, classification?.genre?.name);
      const distanceKm = getDistanceKm(lat, lng, venueLat, venueLng);
      const venueCapacity = MAJOR_TORONTO_VENUES.find(majorVenue =>
        venue?.name?.toLowerCase().includes(majorVenue.name.toLowerCase()) ||
        majorVenue.name.toLowerCase().includes(venue?.name?.toLowerCase() ?? ""),
      )?.capacity ?? 8000;
      const delayMin = getEventDelay(distanceKm, startsAt, kind, venueCapacity, targetTime);

      return {
        id: event.id,
        kind,
        title: event.name,
        venueName: venue?.name ?? "Toronto venue",
        description: `${event.name} at ${venue?.name ?? "a Toronto venue"} starts around ${formatTorontoEventTime(new Date(startsAt))}. Nearby large-event traffic can affect TTC arrivals before and after the event.`,
        startsAt: new Date(startsAt).toISOString(),
        lat: venueLat,
        lng: venueLng,
        distanceKm,
        delayMin,
        source: "ticketmaster" as const,
        url: event.url,
      };
    })
    .filter((event): event is CityEvent => event !== null && event.delayMin > 0)
    .sort((a, b) => b.delayMin - a.delayMin || a.distanceKm - b.distanceKm)
    .slice(0, 5);
};

export async function getEventImpact(
  lat: number,
  lng: number,
  _routeId: unknown,
  at?: string,
): Promise<EventImpact> {
  const targetTime = parseTargetDate(at);

  if (process.env.TICKETMASTER_API_KEY) {
    const events = await requestTicketmasterEvents(lat, lng, targetTime);

    return {
      source: "ticketmaster",
      eventDelayMin: Math.min(6, events.reduce((max, event) => Math.max(max, event.delayMin), 0)),
      events,
    };
  }

  const events = getMockEvents(lat, lng, targetTime);
  return {
    source: "mock",
    eventDelayMin: Math.min(6, events.reduce((max, event) => Math.max(max, event.delayMin), 0)),
    events,
  };
}
