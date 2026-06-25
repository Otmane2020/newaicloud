// Shared OpenRouter helper with free-model fallback chain.
// All AI text generation in this project routes through here.

export const FREE_MODELS_FALLBACK = [
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
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
 * Call OpenRouter with automatic free-model fallback.
 * Returns the assistant text content.
 */
export async function callOpenRouter(opts: OpenRouterOptions): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");

  // OpenRouter limits the `models` array to 3 entries (primary + 2 fallbacks).
  const chain = opts.model
    ? [opts.model, ...FREE_MODELS_FALLBACK.filter((m) => m !== opts.model)]
    : FREE_MODELS_FALLBACK;
  const models = chain.slice(0, 3);

  const body: Record<string, unknown> = {
    model: models[0],
    models, // OpenRouter native multi-model fallback (max 3)
    messages: opts.messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;
  if (opts.response_format) body.response_format = opts.response_format;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vendix.sale",
      "X-Title": "Vendix",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
