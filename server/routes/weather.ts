import { Router } from "express";

import {
  getCurrentWeather,
  getWeatherForecast,
} from "../services/weatherService";

const router = Router();

const parseCoordinate = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/current", async (req, res, next) => {
  const lat = parseCoordinate(req.query.lat, 43.6532);
  const lng = parseCoordinate(req.query.lng, -79.3832);

  try {
    res.json(await getCurrentWeather(lat, lng));
  } catch (error) {
    next(error);
  }
});

router.get("/forecast", async (req, res, next) => {
  const lat = parseCoordinate(req.query.lat, 43.6532);
  const lng = parseCoordinate(req.query.lng, -79.3832);

  try {
    res.json(await getWeatherForecast(lat, lng));
  } catch (error) {
    next(error);
  }
});

export default router;
