import { installAIRouterFetchShim } from "./ai-router-fetch-shim.ts";

// Some legacy generators abort before making a request when their old provider
// secret is missing. A non-secret sentinel lets those functions reach the fetch
// shim; the shared router explicitly treats this value as "not configured".
export const STRICT_AI_PLACEHOLDER = "__STRICT_AI_ROUTER_PLACEHOLDER__";

for (const key of [
  "LOVABLE_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GEMINI_API_KEY",
  "KIMI_API_KEY",
  "MOONSHOT_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
]) {
  if (!Deno.env.get(key)) {
    try {
      Deno.env.set(key, STRICT_AI_PLACEHOLDER);
    } catch {
      // If the runtime ever disallows env mutation, normal routing still works;
      // only very old provider-specific prechecks may keep their old behavior.
    }
  }
}

// Global guard for legacy generation Edge Functions.
// Pure text generation is always routed in this strict order:
// OpenAI -> Gemini -> Kimi -> DeepSeek -> OpenRouter (final rescue only).
// Multimodal/image requests are intentionally left on their specialised pipelines.
installAIRouterFetchShim();
