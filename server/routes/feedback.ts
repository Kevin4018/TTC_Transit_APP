import { Router } from "express";

const router = Router();

const FEEDBACK_TO_EMAIL = "060518kevin@gmail.com";
const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

router.post("/", async (req, res, next) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    const page = String(req.body?.page ?? "").trim();
    const deviceInfo = String(req.body?.deviceInfo ?? "").trim();

    if (message.length < 3) {
      res.status(400).json({ message: "Feedback message is too short." });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      res.status(501).json({ message: "Feedback email is not configured. Set RESEND_API_KEY on the server." });
      return;
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM_EMAIL ?? "Milk Transit Feedback <onboarding@resend.dev>",
        to: FEEDBACK_TO_EMAIL,
        subject: "New feedback from Milk Transit",
        html: [
          "<h2>New Milk Transit Feedback</h2>",
          "<p><strong>Message</strong></p>",
          `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
          `<p><strong>User email:</strong> ${email ? escapeHtml(email) : "Not provided"}</p>`,
          `<p><strong>Page:</strong> ${page ? escapeHtml(page) : "Unknown"}</p>`,
          `<p><strong>Device:</strong> ${deviceInfo ? escapeHtml(deviceInfo) : "Unknown"}</p>`,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Resend feedback email failed: ${details || response.statusText}`);
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
