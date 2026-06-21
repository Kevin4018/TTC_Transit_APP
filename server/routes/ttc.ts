import { Router } from "express";

import {
  getBusReport,
  getNavigationRoute,
  getNearbyStops,
  getPrediction,
  getStopMeta,
  searchDestinations,
  searchStops,
} from "../services/ttcService";
import {
  classifyTransitAssistantIntent,
  verifyTransitAssistantAnswer,
  type TransitAssistantIntent,
  type TransitAssistantIntentContext,
} from "../services/geminiIntentService";
import type { NavigationMode } from "../services/ttcService";

const router = Router();

const parseNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseNavigationMode = (value: unknown): NavigationMode => {
  const mode = String(value ?? "bus");
  return mode === "car" || mode === "walk" || mode === "bike" ? mode : "bus";
};

const formatDebugOtpDateTime = () => {
  const configured = process.env.OTP_PLAN_DATETIME;
  if (configured && configured !== "match-weekday") return configured;

  const feedStart = process.env.OTP_GTFS_SERVICE_START_DATE ?? "2026-06-21";
  const [year, month, day] = feedStart.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const torontoNow = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
  const candidate = new Date(year, month - 1, day, Number(torontoNow.hour), Number(torontoNow.minute), Number(torontoNow.second));
  const torontoToday = new Date(Number(torontoNow.year), Number(torontoNow.month) - 1, Number(torontoNow.day));
  const dayOffset = (torontoToday.getDay() - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + dayOffset);

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}T${torontoNow.hour}:${torontoNow.minute}:${torontoNow.second}-04:00`;
};

router.get("/debug/otp", async (_req, res) => {
  const otpBaseUrl = process.env.OTP_BASE_URL ?? "http://localhost:8080";
  const url = new URL("/otp/gtfs/v1", otpBaseUrl.replace(/\/$/, ""));
  const planDateTime = formatDebugOtpDateTime();
  const query = `
    query DebugOtp($planDateTime: OffsetDateTime!) {
      planConnection(
        origin: { label: "Origin", location: { coordinate: { latitude: 43.6639, longitude: -79.3832 } } }
        destination: { label: "CN Tower", location: { coordinate: { latitude: 43.6426, longitude: -79.3871 } } }
        dateTime: { earliestDeparture: $planDateTime }
        modes: { transit: { access: [WALK], egress: [WALK], transfer: [WALK] } transitOnly: true }
        searchWindow: 7200
        first: 1
      ) {
        routingErrors { code description }
        edges {
          node {
            duration
            legs {
              mode
              transitLeg
              route { shortName longName }
              from { name }
              to { name }
            }
          }
        }
      }
    }
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        variables: { planDateTime },
      }),
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Keep the raw response text for debugging non-JSON failures.
    }

    const data = body as {
      data?: {
        planConnection?: {
          routingErrors?: unknown[];
          edges?: Array<{ node?: { legs?: unknown[] } }>;
        };
      };
      errors?: unknown[];
    };

    res.json({
      otpBaseUrl,
      otpUrl: url.toString(),
      otpPlanDateTime: process.env.OTP_PLAN_DATETIME ?? null,
      otpGtfsServiceStartDate: process.env.OTP_GTFS_SERVICE_START_DATE ?? null,
      resolvedPlanDateTime: planDateTime,
      reachable: response.ok,
      status: response.status,
      statusText: response.statusText,
      errors: data.errors ?? [],
      routingErrors: data.data?.planConnection?.routingErrors ?? [],
      legs: data.data?.planConnection?.edges?.[0]?.node?.legs ?? [],
      rawBody: response.ok ? undefined : body,
    });
  } catch (error) {
    res.status(502).json({
      otpBaseUrl,
      otpUrl: url.toString(),
      otpPlanDateTime: process.env.OTP_PLAN_DATETIME ?? null,
      otpGtfsServiceStartDate: process.env.OTP_GTFS_SERVICE_START_DATE ?? null,
      resolvedPlanDateTime: planDateTime,
      reachable: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

router.get("/stops/search", (req, res) => {
  res.json(searchStops(String(req.query.q ?? "")));
});

router.get("/destinations/search", async (req, res, next) => {
  try {
    res.json(await searchDestinations(String(req.query.q ?? "")));
  } catch (error) {
    next(error);
  }
});

router.get("/stops/nearby", (req, res) => {
  const lat = parseNumber(req.query.lat);
  const lng = parseNumber(req.query.lng);

  res.json(getNearbyStops(lat, lng));
});

router.get("/stops/:stopId", (req, res, next) => {
  try {
    res.json(getStopMeta(req.params.stopId));
  } catch (error) {
    next(error);
  }
});

router.get("/prediction", (req, res, next) => {
  try {
    res.json(
      getPrediction(
        String(req.query.stopId ?? ""),
        parseNumber(req.query.routeId),
        String(req.query.direction ?? ""),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/bus-report", (req, res, next) => {
  try {
    res.json(
      getBusReport(
        String(req.query.stopId ?? ""),
        parseNumber(req.query.routeId),
        String(req.query.direction ?? ""),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/navigation", async (req, res, next) => {
  try {
    const originLat = Number(req.query.originLat);
    const originLng = Number(req.query.originLng);
    const originCoordinates =
      Number.isFinite(originLat) && Number.isFinite(originLng)
        ? { lat: originLat, lng: originLng }
        : undefined;

    res.json(
      await getNavigationRoute(
        String(req.query.origin ?? ""),
        String(req.query.destination ?? ""),
        originCoordinates,
        parseNavigationMode(req.query.mode),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/assistant/intent", async (req, res, next) => {
  try {
    const input = String(req.body?.input ?? "").trim();
    const context = (req.body?.context ?? {}) as TransitAssistantIntentContext;

    if (!input) {
      res.status(400).json({ message: "input is required" });
      return;
    }

    res.json(await classifyTransitAssistantIntent(input, context));
  } catch (error) {
    next(error);
  }
});

router.post("/assistant/verify-answer", async (req, res, next) => {
  try {
    const input = String(req.body?.input ?? "").trim();
    const draftAnswer = String(req.body?.draftAnswer ?? "").trim();
    const matchedIntent = String(req.body?.matchedIntent ?? "help") as TransitAssistantIntent;
    const confidence = parseNumber(req.body?.confidence, 60);
    const context = (req.body?.context ?? {}) as TransitAssistantIntentContext;

    if (!input || !draftAnswer) {
      res.status(400).json({ message: "input and draftAnswer are required" });
      return;
    }

    res.json(
      await verifyTransitAssistantAnswer({
        input,
        draftAnswer,
        matchedIntent,
        confidence,
        context,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
