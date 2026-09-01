export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

type AIProvider = "openai" | "openrouter-free" | "gemini" | "kimi" | "deepseek";

export type AIRouteResult = {
  content: string;
  provider: AIProvider;
  model: string;
};

type RouteOptions = {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  vision?: boolean;
  preferredFreeModel?: string;
};

function textFromGemini(data: any): string {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || "")
    .join("")
    .trim() || "";
}

function toGeminiParts(content: AIMessage["content"]): any[] {
  if (typeof content === "string") return [{ text: content }];

  return (content as any[]).flatMap((part: any): any[] => {
    if (part?.type === "text") return [{ text: part.text || "" }];
    const url = part?.image_url?.url;
    if (!url) return [];
    const match = String(url).match(/^data:([^;]+);base64,(.+)$/);
    if (match) return [{ inline_data: { mime_type: match[1], data: match[2] } }];
    return [{ file_data: { mime_type: "image/jpeg", file_uri: url } }];
  });
}

function requestExpectsJson(options: RouteOptions): boolean {
  const text = options.messages
    .map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content))
    .join("\n")
    .toLowerCase();

  return (
    text.includes("valid json") ||
    text.includes("only in json") ||
    text.includes("only json") ||
    text.includes("json object") ||
    text.includes("format json")
  );
}

function canParseJsonResponse(content: string): boolean {
  if (!content || !content.trim()) return false;

  const trimmed = content.trim();
  const candidates: string[] = [trimmed];

  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFence?.[1]) candidates.push(jsonFence[1].trim());

  const genericFence = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericFence?.[1]) candidates.push(genericFence[1].trim());

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const cleaned = trimmed
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim();
  if (cleaned !== trimmed) candidates.push(cleaned);

  for (const candidate of candidates) {
    try {
      JSON.parse(candidate);
      return true;
    } catch {
      // Try the next representation.
    }
  }

  return false;
}

async function tryOpenAI(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey || options.vision) return null;
  const model = Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini";
  const expectsJson = requestExpectsJson(options);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
      ...(expectsJson ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!response.ok) {
    console.warn(`[ai-router] OpenAI ${model} failed: ${response.status}`);
    return null;
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "openai", model: data?.model || model } : null;
}

async function tryOpenRouter(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey || options.vision) return null;
  const model = options.preferredFreeModel?.trim() || "openrouter/free";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
        "X-Title": "CatalogOptimize AI",
      },
      body: JSON.stringify({ model, messages: options.messages, max_tokens: options.maxTokens || 4096, temperature: options.temperature ?? 0.3 }),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.warn(`[ai-router] OpenRouter ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content ? { content, provider: "openrouter-free", model: data?.model || model } : null;
  } catch (error) {
    console.warn(`[ai-router] OpenRouter ${model} request failed`, error);
    return null;
  }
}

/**
 * Vision always uses Moonshot's official Kimi API directly.
 * No OpenRouter proxy is used for image understanding.
 * Kimi K2.6 expects image_url content as base64 data URLs.
 */
async function tryKimiVision(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("MOONSHOT_API_KEY") || Deno.env.get("KIMI_API_KEY");
  if (!apiKey) {
    console.warn("[ai-router] Kimi vision unavailable: MOONSHOT_API_KEY/KIMI_API_KEY is missing");
    return null;
  }

  const model = Deno.env.get("KIMI_VISION_MODEL") || "kimi-k2.6";

  try {
    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens || 1200,
        thinking: { type: "disabled" },
      }),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      console.warn(`[ai-router] Direct Kimi vision ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content ? { content, provider: "kimi", model: data?.model || model } : null;
  } catch (error) {
    console.warn(`[ai-router] Direct Kimi vision ${model} request failed`, error);
    return null;
  }
}

async function tryGemini(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3-flash-preview";
  const system = options.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: toGeminiParts(m.content) }));
  const expectsJson = requestExpectsJson(options);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3,
          ...(expectsJson ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );

  if (!response.ok) {
    console.warn(`[ai-router] Gemini failed: ${response.status}`);
    return null;
  }
  const content = textFromGemini(await response.json());
  return content ? { content, provider: "gemini", model } : null;
}

async function tryKimi(options: RouteOptions): Promise<AIRouteResult | null> {
  if (options.vision) return null;
  const directKey = Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY");
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!directKey && !openRouterKey) return null;

  const direct = Boolean(directKey);
  const model = direct
    ? (Deno.env.get("KIMI_TEXT_MODEL") || "moonshot-v1-8k")
    : (Deno.env.get("KIMI_OPENROUTER_MODEL") || "moonshotai/kimi-k2.5");

  const response = await fetch(
    direct ? "https://api.moonshot.ai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${directKey || openRouterKey}`,
        "Content-Type": "application/json",
        ...(!direct ? {
          "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
          "X-Title": "CatalogOptimize AI",
        } : {}),
      },
      body: JSON.stringify({ model, messages: options.messages, max_tokens: options.maxTokens || 4096, temperature: options.temperature ?? 0.3 }),
    },
  );

  if (!response.ok) {
    console.warn(`[ai-router] Kimi ${model} failed: ${response.status}`);
    return null;
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "kimi", model: data?.model || model } : null;
}

async function tryDeepSeek(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey || options.vision) return null;
  const model = Deno.env.get("DEEPSEEK_TEXT_MODEL") || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: options.messages, max_tokens: options.maxTokens || 4096, temperature: options.temperature ?? 0.3 }),
  });
  if (!response.ok) {
    console.warn(`[ai-router] DeepSeek failed: ${response.status}`);
    return null;
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "deepseek", model } : null;
}

/**
 * Text routing prioritizes OpenAI for reliability, then Gemini, Kimi and DeepSeek.
 * OpenRouter free is kept as a last-resort fallback. For JSON requests, a provider
 * response is accepted only if it can actually be parsed as JSON.
 * Vision remains direct Kimi-only by design.
 */
export async function routeAI(options: RouteOptions): Promise<AIRouteResult> {
  if (options.vision) {
    const result = await tryKimiVision(options);
    if (result) return result;
    throw new Error("Kimi direct vision is unavailable. Configure MOONSHOT_API_KEY or KIMI_API_KEY for the official Moonshot API.");
  }

  const expectsJson = requestExpectsJson(options);
  const attempts: Array<{ provider: AIProvider; run: () => Promise<AIRouteResult | null> }> = [
    { provider: "openai", run: () => tryOpenAI(options) },
    { provider: "gemini", run: () => tryGemini(options) },
    { provider: "kimi", run: () => tryKimi(options) },
    { provider: "deepseek", run: () => tryDeepSeek(options) },
    { provider: "openrouter-free", run: () => tryOpenRouter(options) },
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt.run();
      if (!result) continue;

      if (expectsJson && !canParseJsonResponse(result.content)) {
        console.warn(`[ai-router] ${result.provider} (${result.model}) returned invalid JSON; trying next provider`);
        continue;
      }

      return result;
    } catch (error) {
      console.warn(`[ai-router] ${attempt.provider} failed`, error);
    }
  }

  throw new Error(
    expectsJson
      ? "No AI provider returned valid JSON. Check provider API keys/models and Edge Function logs."
      : "No AI provider is available. Configure OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY, KIMI_API_KEY/MOONSHOT_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY.",
  );
}

export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  return routeAI({
    messages,
    maxTokens,
    temperature: 0.15,
    vision: true,
  });
}
