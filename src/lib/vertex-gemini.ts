const GEMINI_VERTEX_ENDPOINT =
  "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent";

const DEFAULT_RETRY_DELAYS_MS = [900, 1800, 3600];

export type VertexChatMessage = {
  role: "user" | "model";
  text: string;
};

export type VertexPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export class VertexGeminiError extends Error {
  status: number;
  bodyText: string;
  retryAfterSeconds: number | null;

  constructor({
    status,
    bodyText,
    retryAfterSeconds,
  }: {
    status: number;
    bodyText: string;
    retryAfterSeconds?: number | null;
  }) {
    super(`Vertex Gemini error ${status}: ${bodyText}`);
    this.name = "VertexGeminiError";
    this.status = status;
    this.bodyText = bodyText;
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}

export function isVertexGeminiQuotaError(error: unknown): boolean {
  if (error instanceof VertexGeminiError) {
    return (
      error.status === 429 ||
      error.bodyText.includes("RESOURCE_EXHAUSTED") ||
      error.bodyText.toLowerCase().includes("resource exhausted")
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Vertex Gemini error 429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("límite temporal de cuota") ||
    message.includes("limite temporal de cuota") ||
    message.includes("Gemini alcanzó") ||
    message.includes("Gemini alcanzo") ||
    message.toLowerCase().includes("resource exhausted")
  );
}

export function getVertexGeminiPublicErrorMessage(error: unknown): string {
  if (isVertexGeminiQuotaError(error)) {
    return "Gemini alcanzó el límite temporal de cuota. La solicitud puede reintentarse automáticamente en unos segundos.";
  }

  return error instanceof Error ? error.message : String(error);
}

export function getVertexGeminiRetryAfterSeconds(error: unknown): number | null {
  if (error instanceof VertexGeminiError) {
    return error.retryAfterSeconds;
  }

  return null;
}

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }

  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(1, Math.ceil((dateMs - Date.now()) / 1000));
  }

  return null;
}

function shouldRetryVertexResponse(status: number, bodyText: string): boolean {
  return (
    status === 429 ||
    status === 503 ||
    bodyText.includes("RESOURCE_EXHAUSTED") ||
    bodyText.toLowerCase().includes("resource exhausted")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTextFromGeminiResponse(payload: unknown): string {
  const parts = (
    payload as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    }
  )?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function parseVertexGeminiTextResponse(bodyText: string): {
  text: string;
  finishReason: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`Respuesta no-JSON de Vertex Gemini: ${bodyText}`);
  }

  const candidate = (
    parsed as {
      candidates?: Array<{ finishReason?: string; content?: unknown }>;
    }
  )?.candidates?.[0];

  return {
    text: extractTextFromGeminiResponse(parsed),
    finishReason: candidate?.finishReason ?? null,
  };
}

function shouldContinueGeminiResponse(
  text: string,
  finishReason: string | null,
): boolean {
  if (finishReason === "MAX_TOKENS") return true;

  const normalized = text.trimEnd();
  if (!normalized) return false;

  const lastLine = normalized.split(/\r?\n/).filter(Boolean).at(-1) ?? "";
  const pipeCount = (lastLine.match(/\|/g) ?? []).length;

  return (
    lastLine.endsWith("-") ||
    lastLine.endsWith(":") ||
    lastLine.endsWith("**") ||
    (lastLine.startsWith("|") && pipeCount < 2) ||
    /\|\s*[^|]+$/.test(lastLine) ||
    /\b(NO INCL|INCL|NO INCLU|NO INCLUY)$/i.test(lastLine)
  );
}

function buildGeminiContinuationPrompt(previousText: string): string {
  return `La respuesta anterior quedó cortada. Continúa EXACTAMENTE desde el punto donde se interrumpió, sin repetir nada de lo ya escrito. Devuelve solo la continuación y mantén el mismo formato, tono y markdown si lo estabas usando.

TEXTO YA ENTREGADO:
${previousText}`.trim();
}

export async function fetchVertexGeminiWithRetry({
  apiKey,
  body,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}: {
  apiKey: string;
  body: unknown;
  retryDelaysMs?: number[];
}): Promise<string> {
  let lastError: VertexGeminiError | null = null;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetch(`${GEMINI_VERTEX_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const bodyText = await response.text();
    if (response.ok) {
      return bodyText;
    }

    lastError = new VertexGeminiError({
      status: response.status,
      bodyText,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers.get("retry-after")),
    });

    const retryAfterMs = lastError.retryAfterSeconds
      ? lastError.retryAfterSeconds * 1000
      : retryDelaysMs[attempt];

    if (
      attempt < retryDelaysMs.length &&
      shouldRetryVertexResponse(response.status, bodyText) &&
      retryAfterMs
    ) {
      await delay(retryAfterMs);
      continue;
    }

    throw lastError;
  }

  throw lastError ?? new Error("Vertex Gemini no respondió.");
}

export async function runVertexGeminiText({
  apiKey,
  messages,
  generationConfig,
  retryDelaysMs,
}: {
  apiKey: string;
  messages: VertexChatMessage[];
  generationConfig: Record<string, unknown>;
  retryDelaysMs?: number[];
}): Promise<string> {
  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const bodyText = await fetchVertexGeminiWithRetry({
    apiKey,
    body: { contents, generationConfig },
    retryDelaysMs,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`Respuesta no-JSON de Vertex Gemini: ${bodyText}`);
  }

  const text = extractTextFromGeminiResponse(parsed);
  if (!text) {
    throw new Error("Vertex Gemini no devolvió texto.");
  }

  return text;
}

export async function runVertexGeminiTextWithContinuation({
  apiKey,
  messages,
  generationConfig,
  maxPasses = 6,
}: {
  apiKey: string;
  messages: VertexChatMessage[];
  generationConfig: Record<string, unknown>;
  maxPasses?: number;
}): Promise<string> {
  let accumulatedText = "";
  let nextMessages = [...messages];

  for (let attempt = 0; attempt < maxPasses; attempt += 1) {
    const contents = nextMessages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const bodyText = await fetchVertexGeminiWithRetry({
      apiKey,
      body: { contents, generationConfig },
    });

    const { text, finishReason } = parseVertexGeminiTextResponse(bodyText);
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Vertex Gemini no devolvió texto.");
    }

    accumulatedText = accumulatedText
      ? `${accumulatedText.trimEnd()}\n${trimmedText}`
      : trimmedText;

    if (!shouldContinueGeminiResponse(trimmedText, finishReason)) {
      return accumulatedText.trim();
    }

    nextMessages = [
      ...messages,
      { role: "model", text: accumulatedText },
      { role: "user", text: buildGeminiContinuationPrompt(accumulatedText) },
    ];
  }

  return accumulatedText.trim();
}

export async function runVertexGeminiParts({
  apiKey,
  parts,
  generationConfig,
}: {
  apiKey: string;
  parts: VertexPart[];
  generationConfig: Record<string, unknown>;
}): Promise<string> {
  const bodyText = await fetchVertexGeminiWithRetry({
    apiKey,
    body: {
      contents: [{ role: "user", parts }],
      generationConfig,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`Respuesta no-JSON de Vertex Gemini: ${bodyText}`);
  }

  const text = extractTextFromGeminiResponse(parsed);
  if (!text) {
    throw new Error("Vertex Gemini no devolvió texto.");
  }

  return text;
}
