import app from "../server/index";

export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  if (req.url && !req.url.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }

  return app(req, res);
}
