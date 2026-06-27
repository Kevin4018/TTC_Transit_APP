import cors from "cors";
import "dotenv/config";
import express from "express";
import { pathToFileURL } from "node:url";

import constructionRouter from "./routes/construction";
import eventsRouter from "./routes/events";
import feedbackRouter from "./routes/feedback";
import holidaysRouter from "./routes/holidays";
import localInfoRouter from "./routes/localInfo";
import placesRouter from "./routes/places";
import regionalTransitRouter from "./routes/regionalTransit";
import ttcRouter from "./routes/ttc";
import trafficRouter from "./routes/traffic";
import weatherRouter from "./routes/weather";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/weather", weatherRouter);
app.use("/api/ttc", ttcRouter);
app.use("/api/traffic", trafficRouter);
app.use("/api/construction", constructionRouter);
app.use("/api/events", eventsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/holidays", holidaysRouter);
app.use("/api/places", placesRouter);
app.use("/api/local-info", localInfoRouter);
app.use("/api/regional-transit", regionalTransitRouter);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    console.error(error);
    res.status(500).json({ message });
  },
);

const isDirectRun = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

export default app;
