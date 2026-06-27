import { apiRequest } from "./request";

export interface FeedbackPayload {
  message: string;
  email?: string;
  page?: string;
  deviceInfo?: string;
}

export function sendFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/api/feedback", {
    method: "POST",
    body: payload,
  });
}
