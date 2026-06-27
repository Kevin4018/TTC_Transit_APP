import { Router } from "express";

import {
  getRegionalNearbyStops,
  getRegionalPrediction,
  getRegionalStopMeta,
  searchRegionalStops,
} from "../services/regionalTransitService";

const router = Router();

const parseNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

router.get("/stops/search", (req, res, next) => {
  try {
    res.json(searchRegionalStops(String(req.query.q ?? "")));
  } catch (error) {
    next(error);
  }
});

router.get("/stops/nearby", (req, res, next) => {
  try {
    res.json(getRegionalNearbyStops(parseNumber(req.query.lat), parseNumber(req.query.lng)));
  } catch (error) {
    next(error);
  }
});

router.get("/stops/:stopId", (req, res, next) => {
  try {
    res.json(getRegionalStopMeta(req.params.stopId));
  } catch (error) {
    next(error);
  }
});

router.get("/prediction", (req, res, next) => {
  try {
    res.json(getRegionalPrediction({
      agencyId: String(req.query.agencyId ?? "") || undefined,
      stopId: String(req.query.stopId ?? "") || undefined,
      stopQuery: String(req.query.stopQuery ?? "") || undefined,
      routeName: String(req.query.routeName ?? req.query.route ?? "") || undefined,
      headsign: String(req.query.headsign ?? req.query.direction ?? "") || undefined,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
