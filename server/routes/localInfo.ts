import { Router } from "express";

import { searchLocalInfo } from "../services/googleLocalInfoService";

const router = Router();

const parseNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

router.post("/query", async (req, res, next) => {
  try {
    const query = String(req.body?.query ?? "").trim();
    const lat = parseNumber(req.body?.lat);
    const lng = parseNumber(req.body?.lng);
    const language = String(req.body?.language ?? "en");

    if (!query) {
      res.status(400).json({ message: "query is required" });
      return;
    }

    res.json(await searchLocalInfo({
      query,
      lat,
      lng,
      language: language === "zh" || language === "fr" ? language : "en",
      maxResults: parseNumber(req.body?.maxResults),
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
