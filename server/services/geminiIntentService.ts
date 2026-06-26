export type TransitAssistantIntent =
  | "eta"
  | "delay"
  | "weather"
  | "traffic"
  | "events"
  | "holidays"
  | "crowding"
  | "navigation"
  | "recommendation"
  | "guide"
  | "help"
  | "out-of-scope";

export interface TransitAssistantIntentResult {
  intent: TransitAssistantIntent;
  confidence: number;
  reason?: string;
  scope?: TransitAssistantIntentScope;
}

export interface TransitAssistantIntentScope {
  kind: "none" | "current" | "place";
  place?: string;
  phrase?: string;
}

export interface TransitAssistantAnswerVerificationRequest {
  input: string;
  draftAnswer: string;
  matchedIntent: TransitAssistantIntent;
  confidence: number;
  context?: TransitAssistantIntentContext;
}

export interface TransitAssistantAnswerVerificationResult {
  isCorrect: boolean;
  answer: string;
  confidence: number;
  reason?: string;
}

export interface TransitAssistantIntentContext {
  stopId?: string;
  routeId?: number;
  direction?: string;
  destinationId?: string;
  lastIntent?: TransitAssistantIntent;
  aroundScope?: TransitAssistantIntentScope;
}

const VALID_INTENTS = new Set<TransitAssistantIntent>([
  "eta",
  "delay",
  "weather",
  "traffic",
  "events",
  "holidays",
  "crowding",
  "navigation",
  "recommendation",
  "guide",
  "help",
  "out-of-scope",
]);

const DEFAULT_MODEL = "gemini-2.0-flash";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function isIntentDebugEnabled(): boolean {
  return process.env.GEMINI_INTENT_DEBUG === "true";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini intent response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function normalizeIntentResult(value: unknown): TransitAssistantIntentResult {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini intent response was not an object");
  }

  const record = value as Record<string, unknown>;
  const intent = record.intent;
  const confidence = Number(record.confidence);
  const scopeRecord = record.scope && typeof record.scope === "object"
    ? record.scope as Record<string, unknown>
    : undefined;
  const scopeKind = scopeRecord?.kind;
  const scope = scopeKind === "current" || scopeKind === "place" || scopeKind === "none"
    ? {
      kind: scopeKind,
      place: typeof scopeRecord?.place === "string" && scopeRecord.place.trim()
        ? scopeRecord.place.trim()
        : undefined,
      phrase: typeof scopeRecord?.phrase === "string" && scopeRecord.phrase.trim()
        ? scopeRecord.phrase.trim()
        : undefined,
    } satisfies TransitAssistantIntentScope
    : undefined;

  if (typeof intent !== "string" || !VALID_INTENTS.has(intent as TransitAssistantIntent)) {
    throw new Error("Gemini intent response had an invalid intent");
  }

  return {
    intent: intent as TransitAssistantIntent,
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 60,
    reason: typeof record.reason === "string" ? record.reason : undefined,
    scope,
  };
}

function normalizeAnswerVerificationResult(
  value: unknown,
  fallbackAnswer: string,
): TransitAssistantAnswerVerificationResult {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini answer verification response was not an object");
  }

  const record = value as Record<string, unknown>;
  const confidence = Number(record.confidence);
  const answer = typeof record.answer === "string" && record.answer.trim()
    ? record.answer.trim()
    : fallbackAnswer;

  return {
    isCorrect: record.isCorrect === true,
    answer,
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 60,
    reason: typeof record.reason === "string" ? record.reason : undefined,
  };
}

async function requestGeminiJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${details}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini response was empty");
  }

  return extractJson(text);
}

export async function classifyTransitAssistantIntent(
  input: string,
  context: TransitAssistantIntentContext = {},
): Promise<TransitAssistantIntentResult> {
  const prompt = [
    "Classify this Toronto/GTA transit assistant user message into exactly one intent.",
    "Also identify whether the message limits the answer to an around/near/by location scope.",
    "Return only JSON with this schema: {\"intent\":\"eta|delay|weather|traffic|events|holidays|crowding|navigation|recommendation|guide|help|out-of-scope\",\"confidence\":0-100,\"scope\":{\"kind\":\"none|current|place\",\"place\":\"place name if kind is place\",\"phrase\":\"short original scope phrase\"},\"reason\":\"short\"}.",
    "Intent meanings:",
    "- eta: arrival time, next bus/streetcar/subway/train, route/stop timing.",
    "- delay: lateness, causes, accidents, construction, why slow.",
    "- weather: weather or weather impact.",
    "- traffic: road traffic or congestion impact.",
    "- events: sports games, concerts, festivals, venues, large entertainment activity.",
    "- holidays: public holidays, statutory holidays, long weekends, holiday greetings.",
    "- crowding: passenger load, seats, packed vehicles.",
    "- navigation: directions, trip planning, how to get to a destination, departure-time planning, and route options across Toronto/GTA transit, including messages like 'plan a trip tomorrow to CN Tower', 'I want to go to Union at 8', 'from Oakville to Union', or Chinese equivalents.",
    "- recommendation: direct requests for recommended places, restaurants, food, cafes, attractions, parks, shopping, or things to do, especially with wording like recommend, suggestions, best, any good, where to eat, restaurants around CN Tower, parks near me.",
    "- guide: broader travel guide, itinerary, tourism plan, day plan, date ideas, family plans, rainy-day plans, or multi-stop Toronto plans.",
    "- help: transit-related but missing needed details or clarification.",
    "- out-of-scope: not about Toronto/GTA transit, commuting, routing, stops, traffic, weather, events, holidays, or crowding.",
    "Transit scope includes TTC, GO Transit, MiWay, YRT/Viva, Brampton Transit, Oakville Transit, Durham Region Transit, and similar GTA local transit.",
    "Use context for follow-ups like 'what about now' or 'why'.",
    "Scope rules:",
    "- scope only applies to weather, traffic, events, crowding, recommendation, and guide.",
    "- Use scope.kind='current' for around me, near me, nearby me, my location, current location, or here.",
    "- Use scope.kind='place' and place='<place name>' for around/near/by a named place, landmark, venue, area, address, stop, or station.",
    "- Use scope.kind='none' for navigation, eta, delay, holidays, help, out-of-scope, or when no around/near/by range is present.",
    "- Do not put the trip destination itself in scope for navigation questions.",
    `Context: ${JSON.stringify(context)}`,
    `User message: ${input}`,
  ].join("\n");

  try {
    const result = normalizeIntentResult(await requestGeminiJson(prompt));

    if (isIntentDebugEnabled()) {
      console.log("[milkbot intent]", {
        input,
        context,
        model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
        intent: result.intent,
        confidence: result.confidence,
        reason: result.reason,
      });
    }

    return result;
  } catch (error) {
    if (isIntentDebugEnabled()) {
      console.log("[milkbot intent error]", {
        input,
        context,
        model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

export async function verifyTransitAssistantAnswer(
  request: TransitAssistantAnswerVerificationRequest,
): Promise<TransitAssistantAnswerVerificationResult> {
  const prompt = [
    "You are checking the final answer for Milk bot, a Toronto/GTA transit assistant.",
    "Decide whether the draft answer correctly answers the user and is consistent with the provided context.",
    "Milk bot can answer TTC arrivals plus Toronto/GTA transit routing, departure-time trip planning, route options, recommendations, guides, and itinerary questions when useful for local travel planning.",
    "If the draft is correct, return it unchanged.",
    "If the draft is irrelevant, misleading, contradictory, or fails to answer a simple question, rewrite it.",
    "Do not invent precise arrivals, routes, stops, weather, traffic, events, or holidays that are not present in the draft/context.",
    "Do not mention internal data sources, feed formats, provider implementation details, or API names in the final user-facing answer.",
    "For simple general questions such as current time, greetings, or capability questions, answer directly and briefly.",
    "Use the same language as the user message: Chinese in Chinese, English in English, French in French.",
    "Format every final answer clearly like a compact ChatGPT reply.",
    "Use short paragraphs, useful line breaks, and numbered or hyphen lists when there are multiple points.",
    "Avoid one dense paragraph. Put labels such as Steps, Main factors, Before going, or Next step on their own line when useful.",
    "Keep the answer readable inside a narrow mobile chat bubble.",
    "Return only JSON with this schema: {\"isCorrect\":true|false,\"answer\":\"final answer\",\"confidence\":0-100,\"reason\":\"short\"}.",
    `User message: ${request.input}`,
    `Draft intent: ${request.matchedIntent}`,
    `Draft confidence: ${request.confidence}`,
    `Context: ${JSON.stringify(request.context ?? {})}`,
    `Draft answer: ${request.draftAnswer}`,
  ].join("\n");

  try {
    const result = normalizeAnswerVerificationResult(
      await requestGeminiJson(prompt),
      request.draftAnswer,
    );

    if (isIntentDebugEnabled()) {
      console.log("[milkbot answer check]", {
        input: request.input,
        matchedIntent: request.matchedIntent,
        isCorrect: result.isCorrect,
        confidence: result.confidence,
        reason: result.reason,
      });
    }

    return result;
  } catch (error) {
    if (isIntentDebugEnabled()) {
      console.log("[milkbot answer check error]", {
        input: request.input,
        matchedIntent: request.matchedIntent,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}
