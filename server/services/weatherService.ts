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
  coordinates: {
    lat: number;
    lng: number;
  };
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
  coordinates: {
    lat: number;
    lng: number;
  };
  hours: WeatherForecastHour[];
}

interface WeatherApiCurrentResponse {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  current: {
    last_updated: string;
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    condition: {
      text: string;
    };
  };
}

interface WeatherApiForecastResponse extends WeatherApiCurrentResponse {
  forecast: {
    forecastday: Array<{
      hour: Array<{
        time: string;
        temp_c: number;
        chance_of_rain: number;
        chance_of_snow: number;
        wind_kph: number;
        condition: {
          text: string;
        };
      }>;
    }>;
  };
}

const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1";

const buildWeatherApiUrl = (
  endpoint: "current.json" | "forecast.json",
  lat: number,
  lng: number,
  extraParams?: Record<string, string | number>,
) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("WEATHER_API_KEY is not configured");
  }

  const url = new URL(`${WEATHER_API_BASE_URL}/${endpoint}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${lat},${lng}`);

  Object.entries(extraParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url;
};

const requestWeatherApi = async <T>(url: URL): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
        ? data.error.message
        : `Weather API request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
};

const getMockCurrentWeather = (lat: number, lng: number): CurrentWeather => ({
  source: "mock",
  locationName: "Toronto",
  temperatureC: 22,
  feelsLikeC: 24,
  condition: "Cloudy",
  humidity: 68,
  windKph: 14,
  precipitationMm: 0,
  observedAt: new Date().toISOString(),
  coordinates: { lat, lng },
});

const getMockWeatherForecast = (lat: number, lng: number): WeatherForecast => {
  const now = Date.now();

  return {
    source: "mock",
    locationName: "Toronto",
    coordinates: { lat, lng },
    hours: Array.from({ length: 48 }, (_, index) => ({
      time: new Date(now + index * 60 * 60 * 1000).toISOString(),
      temperatureC: 22 - Math.floor(index / 8),
      condition: index < 10 ? "Cloudy" : index < 28 ? "Light rain" : "Partly cloudy",
      precipitationProbability: index < 10 ? 20 : index < 28 ? 45 : 25,
      windKph: 14 + (index % 8),
    })),
  };
};

export const getCurrentWeather = async (
  lat: number,
  lng: number,
): Promise<CurrentWeather> => {
  if (!process.env.WEATHER_API_KEY) {
    return getMockCurrentWeather(lat, lng);
  }

  const data = await requestWeatherApi<WeatherApiCurrentResponse>(
    buildWeatherApiUrl("current.json", lat, lng, { aqi: "no" }),
  );

  return {
    source: "weatherapi",
    locationName: data.location.name,
    temperatureC: data.current.temp_c,
    feelsLikeC: data.current.feelslike_c,
    condition: data.current.condition.text,
    humidity: data.current.humidity,
    windKph: data.current.wind_kph,
    precipitationMm: data.current.precip_mm,
    observedAt: data.current.last_updated,
    coordinates: {
      lat: data.location.lat,
      lng: data.location.lon,
    },
  };
};

export const getWeatherForecast = async (
  lat: number,
  lng: number,
): Promise<WeatherForecast> => {
  if (!process.env.WEATHER_API_KEY) {
    return getMockWeatherForecast(lat, lng);
  }

  const data = await requestWeatherApi<WeatherApiForecastResponse>(
    buildWeatherApiUrl("forecast.json", lat, lng, {
      days: 2,
      aqi: "no",
      alerts: "no",
    }),
  );

  const currentTime = Date.now();
  const hours = data.forecast.forecastday
    .flatMap((day) => day.hour)
    .filter((hour) => new Date(hour.time).getTime() >= currentTime)
    .slice(0, 48)
    .map((hour) => ({
      time: hour.time,
      temperatureC: hour.temp_c,
      condition: hour.condition.text,
      precipitationProbability: Math.max(
        hour.chance_of_rain,
        hour.chance_of_snow,
      ),
      windKph: hour.wind_kph,
    }));

  return {
    source: "weatherapi",
    locationName: data.location.name,
    coordinates: {
      lat: data.location.lat,
      lng: data.location.lon,
    },
    hours,
  };
};
