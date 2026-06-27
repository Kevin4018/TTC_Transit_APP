import { apiRequest } from "./request";

export interface FeedbackPayload {
  message: string;
  email?: string;
  page?: string;
  deviceInfo?: string;
}

export interface FeedbackResponse {
  ok: boolean;
  fallbackMailtoUrl?: string;
  message?: string;
}

export function sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  return apiRequest<FeedbackResponse>("/api/feedback", {
    method: "POST",
    body: payload,
  });
}
