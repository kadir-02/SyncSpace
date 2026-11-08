/**
 * AI provider settings. Any OpenAI-compatible chat-completions API works.
 * Quick start: set AI_PROVIDER (groq | huggingface | ollama) and AI_API_KEY.
 * Read lazily so values from .env are picked up after dotenv loads.
 */
const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  huggingface: { baseUrl: "https://router.huggingface.co/v1", model: "openai/gpt-oss-20b" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const preset = () => PRESETS[(process.env.AI_PROVIDER ?? "").trim().toLowerCase()];

export const aiConfig = {
  get provider() {
    const name = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
    return preset() ? name : process.env.AI_BASE_URL ? "custom" : "huggingface";
  },
  get apiKey() {
    return process.env.AI_API_KEY || process.env.HF_TOKEN || "";
  },
  get baseUrl() {
    return (
      process.env.AI_BASE_URL ||
      preset()?.baseUrl ||
      PRESETS.huggingface.baseUrl
    ).replace(/\/+$/, "");
  },
  get model() {
    return process.env.AI_MODEL || preset()?.model || PRESETS.huggingface.model;
  },
  get requestTimeoutMs() {
    return toNumber(process.env.AI_TIMEOUT_MS, 60_000);
  },
  get summariesPerUserPerHour() {
    return toNumber(process.env.AI_SUMMARIES_PER_HOUR, 10);
  },
  // Free tiers cap tokens per minute, so default to small requests.
  get chunkChars() {
    return toNumber(process.env.AI_CHUNK_CHARS, 6000);
  },
  get maxChunks() {
    return toNumber(process.env.AI_MAX_CHUNKS, 6);
  },
  // How long we'll wait out a provider rate limit before giving up.
  get maxRetryWaitMs() {
    return toNumber(process.env.AI_MAX_RETRY_WAIT_MS, 30_000);
  },

  maxMessages: 1500,
  maxMessageChars: 800,
  maxOutputTokens: 1500,
  maxRangeDays: 30,
  cacheTtlSeconds: 60 * 60 * 24,
};

// Ollama and other local servers don't need a key, but hosted providers do.
export const isAiConfigured = () =>
  Boolean(aiConfig.apiKey) || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(aiConfig.baseUrl);
