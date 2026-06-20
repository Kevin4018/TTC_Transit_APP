import { Router } from "express";

import { getTrafficImpact } from "../services/trafficService";

const router = Router();

const parseNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.get("/impact", (req, res) => {
  res.json(
    getTrafficImpact(
      parseNumber(req.query.lat, 43.6532),
      parseNumber(req.query.lng, -79.3832),
      req.query.routeId,
      typeof req.query.at === "string" ? req.query.at : undefined,
    ),
  );
});

export default router;
