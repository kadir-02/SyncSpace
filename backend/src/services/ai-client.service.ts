import { aiConfig, isAiConfigured } from "../config/ai.js";
import { AppError } from "../utils/app-error.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
}

const providerError = (status: number): AppError => {
  switch (status) {
    case 401:
    case 403:
      return new AppError("The AI provider rejected this server's API key", 502);
    case 402:
      return new AppError(
        "The AI provider has no credits left for this server. Ask whoever runs it to add credits or switch to a free provider.",
        503,
      );
    case 413:
      return new AppError(
        "That period has too much text for the AI's free limits. Try a shorter period.",
        413,
      );
    case 429:
      return new AppError("The AI is busy right now. Try again in a minute.", 429);
    case 400:
    case 404:
      return new AppError(
        "The configured AI model isn't available. Check AI_MODEL on the server.",
        502,
      );
    default:
      return new AppError("The AI provider returned an error", 502);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Providers send "Retry-After: <seconds>"; fall back to a short pause.
const retryDelayMs = (response: Response) => {
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header >= 0 ? Math.ceil(header * 1000) : 15_000;
};

// Some reasoning models wrap their thinking in <think> tags.
const stripThinking = (text: string) =>
  text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

/** One chat-completion call against any OpenAI-compatible endpoint. */
export const createChatCompletion = async (
  messages: ChatMessage[],
  { maxTokens = aiConfig.maxOutputTokens, temperature = 0.2 }: CompletionOptions = {},
): Promise<string> => {
  if (!isAiConfigured()) {
    throw new AppError("AI is not configured on this server", 503);
  }

  const body = JSON.stringify({
    model: aiConfig.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  // Free tiers cap requests/tokens per minute. When the provider says "retry in
  // N seconds" and N is short, wait instead of failing the whole summary.
  const MAX_ATTEMPTS = 3;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), aiConfig.requestTimeoutMs);

    try {
      response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(aiConfig.apiKey ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {}),
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(
          "The AI took too long to respond. Try a shorter period.",
          504,
        );
      }

      throw new AppError("Could not reach the AI provider", 502);
    } finally {
      clearTimeout(timer);
    }

    if (response.status !== 429 || attempt === MAX_ATTEMPTS) break;

    const waitMs = retryDelayMs(response);

    if (waitMs > aiConfig.maxRetryWaitMs) break; // too long to sit and wait

    await sleep(waitMs);
  }

  if (!response || !response.ok) {
    // Log provider detail for the operator; never forward it to the client.
    const detail = await response?.text().catch(() => "");
    console.error(`[ai] provider error ${response?.status}:`, (detail ?? "").slice(0, 300));
    throw providerError(response?.status ?? 502);
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;

  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !stripThinking(content)) {
    throw new AppError("The AI returned an empty response", 502);
  }

  return stripThinking(content);
};
