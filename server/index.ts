import cors from "cors";
import "dotenv/config";
import express from "express";

import weatherRouter from "./routes/weather";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/weather", weatherRouter);

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

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
