// Shared OpenRouter helper with sequential free-model fallback.
// All AI text generation in this project routes through here.

export const FREE_MODELS_FALLBACK = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-2-9b-it:free",
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

/**
 * Call OpenRouter, iterating manually through the free-model chain on
 * 429 / 402 / 5xx errors (upstream rate-limit, quota, provider failure).
 */
export async function callOpenRouter(opts: OpenRouterOptions): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");

  const chain = opts.model
    ? [opts.model, ...FREE_MODELS_FALLBACK.filter((m) => m !== opts.model)]
    : [...FREE_MODELS_FALLBACK];

  let lastErr = "";
  for (const model of chain) {
    const body: Record<string, unknown> = { model, messages: opts.messages };
    if (opts.temperature !== undefined) body.temperature = opts.temperature;
    if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;
    if (opts.response_format) body.response_format = opts.response_format;

    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://vendix.sale",
          "X-Title": "Vendix",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastErr = `network ${model}: ${(e as Error).message}`;
      console.warn(`[openrouter] ${lastErr}`);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === "string" && content.trim()) {
        return content;
      }
      lastErr = `empty content from ${model}`;
      console.warn(`[openrouter] ${lastErr}`);
      continue;
    }

    const text = await res.text();
    lastErr = `OpenRouter ${res.status} on ${model}: ${text.slice(0, 300)}`;
    if (res.status === 429 || res.status === 402 || res.status === 404 || res.status === 410 || res.status >= 500) {
      console.warn(`[openrouter] ${model} ${res.status} -> trying next model`);
      continue;
    }
    throw new Error(lastErr);
  }

  throw new Error(`All free models exhausted. Last error: ${lastErr}`);
}
