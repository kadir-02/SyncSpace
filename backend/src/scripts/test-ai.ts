/**
 * Checks that the AI provider settings in .env actually work.
 * Run:  npm run ai:test
 */
import "dotenv/config";
import { aiConfig, isAiConfigured } from "../config/ai.js";
import { createChatCompletion } from "../services/ai-client.service.js";

const run = async () => {
  console.log("Provider :", aiConfig.provider, `(${aiConfig.baseUrl})`);
  console.log("Model    :", aiConfig.model);
  console.log("API key  :", aiConfig.apiKey ? "set" : "NOT SET");

  if (!isAiConfigured()) {
    console.error("\nSet AI_API_KEY (or HF_TOKEN) in .env first.");
    process.exit(1);
  }

  const started = Date.now();
  const reply = await createChatCompletion(
    [{ role: "user", content: "Reply with the single word: pong" }],
    { maxTokens: 200 },
  );

  console.log(`\nReply    : ${reply.slice(0, 80)}`);
  console.log(`Latency  : ${Date.now() - started} ms`);
  console.log("\n✓ AI provider works.");
};

run().catch((error) => {
  console.error("\n✗ AI check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
