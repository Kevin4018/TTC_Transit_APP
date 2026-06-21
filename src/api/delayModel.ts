import type { ConstructionImpact } from "./construction";
import type { EventImpact } from "./events";
import type { HolidayImpact } from "./holidays";
import type { TrafficImpact } from "./traffic";
import type { CurrentWeather } from "./weather";

export type TransitMode = "bus" | "streetcar" | "subway" | "transit";

export interface DelayFactor {
  value: number;
  description: string;
}

export interface UnifiedDelayResult {
  weather?: DelayFactor;
  traffic?: DelayFactor;
  accidents?: DelayFactor;
  construction?: DelayFactor;
  events?: DelayFactor;
  holidays?: DelayFactor;
  confidenceAdjustment: number;
}

export interface UnifiedDelayInput {
  weather?: CurrentWeather | null;
  trafficImpact?: TrafficImpact | null;
  constructionImpact?: ConstructionImpact | null;
  eventImpact?: EventImpact | null;
  holidayImpact?: HolidayImpact | null;
  routeId?: number | null;
  mode?: TransitMode;
}

interface WeatherSeverity {
  score: number;
  reasons: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function inferTransitMode(routeId?: number | null): TransitMode {
  if (routeId === undefined || routeId === null) return "transit";
  if (routeId >= 1 && routeId <= 4) return "subway";
  if (routeId >= 500 && routeId < 600) return "streetcar";
  return "bus";
}

function getModeWeatherMultiplier(mode: TransitMode) {
  if (mode === "subway") return 0.35;
  if (mode === "streetcar") return 0.85;
  if (mode === "bus") return 1;
  return 0.8;
}

function estimateWeatherSeverity(weather: CurrentWeather): WeatherSeverity {
  const condition = weather.condition.toLowerCase();
  const precipitation = weather.precipitationMm ?? 0;
  const reasons: string[] = [];
  let score = 0;

  if (/thunder|storm|blizzard/.test(condition)) {
    score += 4;
    reasons.push("storm conditions");
  } else if (/freezing|sleet|ice/.test(condition)) {
    score += 3;
    reasons.push("icy precipitation");
  } else if (/snow/.test(condition)) {
    score += 2.5;
    reasons.push("snow");
  } else if (/heavy rain|downpour/.test(condition)) {
    score += 2.25;
    reasons.push("heavy rain");
  } else if (/rain|drizzle|shower/.test(condition)) {
    score += 1.25;
    reasons.push("rain");
  } else if (/fog|mist/.test(condition)) {
    score += 1;
    reasons.push("low visibility");
  } else if (/overcast/.test(condition)) {
    score += 0.4;
    reasons.push("overcast sky");
  }

  if (precipitation >= 5) {
    score += 2;
    reasons.push(`${precipitation} mm precipitation`);
  } else if (precipitation >= 2) {
    score += 1.25;
    reasons.push(`${precipitation} mm precipitation`);
  } else if (precipitation > 0) {
    score += 0.5;
    reasons.push("measurable precipitation");
  }

  if (weather.windKph >= 55) {
    score += 1.75;
    reasons.push(`${Math.round(weather.windKph)} km/h wind`);
  } else if (weather.windKph >= 40) {
    score += 1;
    reasons.push(`${Math.round(weather.windKph)} km/h wind`);
  } else if (weather.windKph >= 30) {
    score += 0.5;
    reasons.push(`${Math.round(weather.windKph)} km/h wind`);
  }

  if (weather.feelsLikeC <= -10 || weather.feelsLikeC >= 32) {
    score += 0.75;
    reasons.push(`feels like ${Math.round(weather.feelsLikeC)} C`);
  }

  return {
    score: clamp(score, 0, 6),
    reasons,
  };
}

function describeWeatherDelay(
  weather: CurrentWeather,
  delay: number,
  severity: WeatherSeverity,
  mode: TransitMode,
) {
  const base = `WeatherAPI reports ${weather.condition.toLowerCase()}, ${weather.temperatureC} C, wind ${weather.windKph} km/h.`;

  if (delay === 0) {
    return `${base} No meaningful weather delay is expected for this ${mode} trip.`;
  }

  const reasonText = severity.reasons.length > 0
    ? ` Main signal: ${severity.reasons.slice(0, 3).join(", ")}.`
    : "";

  return `${base}${reasonText} Current conditions may add about ${delay} min to this trip.`;
}

function describeTrafficDelay(impact: TrafficImpact | null | undefined, delay: number, weatherInteraction: number) {
  const event = impact?.events.find(item => item.type === "traffic");

  if (event) {
    const interaction = weatherInteraction > 0
      ? ` Weather conditions add about ${weatherInteraction} min of road friction.`
      : "";
    return `${event.title}. ${event.description}${interaction}`;
  }

  if (delay > 0) {
    return `Traffic is elevated for this trip. Weather conditions add about ${weatherInteraction} min of road friction.`;
  }

  return "Traffic is normal, no additional delay expected.";
}

function describeAccidentDelay(impact: TrafficImpact | null | undefined, delay: number) {
  const event = impact?.events.find(item => item.type === "accident");
  if (event) return `${event.title}. ${event.description}`;
  if (delay > 0) return "A traffic incident may slow this route.";
  return "No traffic incidents are reported near this route.";
}

function describeConstructionDelay(
  constructionImpact: ConstructionImpact | null | undefined,
  trafficImpact: TrafficImpact | null | undefined,
  delay: number,
  weatherInteraction: number,
) {
  const constructionEvent = constructionImpact?.events[0];
  if (constructionEvent) {
    const interaction = weatherInteraction > 0
      ? ` Weather may add about ${weatherInteraction} min around the work zone.`
      : "";
    return `${constructionEvent.title}. ${constructionEvent.description} (${constructionEvent.distanceKm.toFixed(1)} km away).${interaction}`;
  }

  const trafficEvent = trafficImpact?.events.find(item => item.type === "construction");
  if (trafficEvent) return `${trafficEvent.title}. ${trafficEvent.description}`;
  if (delay > 0) return "Construction activity may slow this route.";
  return "No construction activity is reported near this route.";
}

function describeEventDelay(impact: EventImpact | null | undefined, delay: number, weatherInteraction: number) {
  const event = impact?.events[0];
  if (event) {
    const interaction = weatherInteraction > 0
      ? ` Poor weather may add about ${weatherInteraction} min to passenger loading and walking time.`
      : "";
    return `${event.description} (${event.distanceKm.toFixed(1)} km away).${interaction}`;
  }
  if (delay > 0) return "A nearby event may increase passenger loading for this trip.";
  return "No nearby sports games, concerts, or major entertainment events are expected to affect this trip window.";
}

function describeHolidayDelay(impact: HolidayImpact | null | undefined, delay: number) {
  if (impact?.holidays[0]) return impact.description;
  if (delay > 0) return "Holiday service patterns may affect this trip.";
  return "No Ontario public holiday is detected for this trip date.";
}

export function estimateUnifiedDelays(input: UnifiedDelayInput): UnifiedDelayResult {
  const mode = input.mode ?? inferTransitMode(input.routeId);
  const weatherSeverity = input.weather ? estimateWeatherSeverity(input.weather) : null;
  const modeWeatherMultiplier = getModeWeatherMultiplier(mode);
  const weatherDelay = weatherSeverity
    ? clamp(Math.round(weatherSeverity.score * modeWeatherMultiplier), 0, mode === "subway" ? 2 : 6)
    : undefined;

  const baseTrafficDelay = input.trafficImpact?.trafficDelayMin ?? 0;
  const baseAccidentDelay = input.trafficImpact?.accidentDelayMin ?? 0;
  const baseConstructionDelay = input.constructionImpact?.constructionDelayMin
    ?? input.trafficImpact?.constructionDelayMin
    ?? 0;
  const baseEventDelay = input.eventImpact?.eventDelayMin ?? 0;
  const baseHolidayDelay = input.holidayImpact?.holidayDelayMin ?? 0;

  const roadWeather = weatherSeverity ? weatherSeverity.score * modeWeatherMultiplier : 0;
  const trafficWeatherBoost = roadWeather >= 3 && baseTrafficDelay >= 2
    ? 2
    : roadWeather >= 2 && baseTrafficDelay >= 1
      ? 1
      : 0;
  const constructionWeatherBoost = roadWeather >= 2.5 && baseConstructionDelay >= 1 ? 1 : 0;
  const eventWeatherBoost = roadWeather >= 2.5 && baseEventDelay >= 1 ? 1 : 0;

  const trafficDelay = clamp(baseTrafficDelay + trafficWeatherBoost, 0, 6);
  const constructionDelay = clamp(baseConstructionDelay + constructionWeatherBoost, 0, 6);
  const eventDelay = clamp(baseEventDelay + eventWeatherBoost, 0, 6);

  const result: UnifiedDelayResult = {
    confidenceAdjustment: -(
      (weatherDelay ?? 0) +
      trafficWeatherBoost +
      constructionWeatherBoost +
      eventWeatherBoost
    ),
  };

  if (input.weather && weatherDelay !== undefined && weatherSeverity) {
    result.weather = {
      value: weatherDelay,
      description: describeWeatherDelay(input.weather, weatherDelay, weatherSeverity, mode),
    };
  }

  if (input.trafficImpact) {
    result.traffic = {
      value: trafficDelay,
      description: describeTrafficDelay(input.trafficImpact, trafficDelay, trafficWeatherBoost),
    };
    result.accidents = {
      value: baseAccidentDelay,
      description: describeAccidentDelay(input.trafficImpact, baseAccidentDelay),
    };
  }

  if (input.constructionImpact || input.trafficImpact) {
    result.construction = {
      value: constructionDelay,
      description: describeConstructionDelay(
        input.constructionImpact,
        input.trafficImpact,
        constructionDelay,
        constructionWeatherBoost,
      ),
    };
  }

  if (input.eventImpact) {
    result.events = {
      value: eventDelay,
      description: describeEventDelay(input.eventImpact, eventDelay, eventWeatherBoost),
    };
  }

  if (input.holidayImpact) {
    result.holidays = {
      value: baseHolidayDelay,
      description: describeHolidayDelay(input.holidayImpact, baseHolidayDelay),
    };
  }

  return result;
}
