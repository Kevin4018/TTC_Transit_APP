import { apiRequest } from "./request";

export interface CurrentWeather {
  source: "mock" | "weatherapi";
  locationName: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: string;
  humidity: number;
  windKph: number;
  precipitationMm?: number;
  observedAt: string;
}

export interface WeatherForecastHour {
  time: string;
  temperatureC: number;
  condition: string;
  precipitationProbability: number;
  windKph: number;
}

export interface WeatherForecast {
  source: "mock" | "weatherapi";
  locationName: string;
  hours: WeatherForecastHour[];
}

export function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeather> {
  return apiRequest<CurrentWeather>("/api/weather/current", {
    params: { lat, lng },
  });
}

export function getWeatherForecast(
  lat: number,
  lng: number,
): Promise<WeatherForecast> {
  return apiRequest<WeatherForecast>("/api/weather/forecast", {
    params: { lat, lng },
  });
}
