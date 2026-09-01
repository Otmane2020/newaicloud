import { installAIRouterFetchShim } from "./ai-router-fetch-shim.ts";

// Global guard for legacy generation Edge Functions.
// Pure text generation is always routed in this strict order:
// OpenAI -> Gemini -> Kimi -> DeepSeek -> OpenRouter (final rescue only).
// Multimodal/image requests are intentionally left on their specialised pipelines.
installAIRouterFetchShim();
