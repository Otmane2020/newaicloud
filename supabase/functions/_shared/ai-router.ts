export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type AIRouteResult = {
  content: string;
  provider: "openrouter-free" | "gemini" | "kimi" | "deepseek";
  model: string;
};

type RouteOptions = {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  vision?: boolean;
  /** Optional free model hint. It is never allowed to bypass the free-only guard. */
  preferredFreeModel?: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_GENERIC_FREE_MODEL = "openrouter/free";
const KIMI_FREE_MODEL = "moonshotai/kimi-k2.6:free";
const DEEPSEEK_FREE_MODEL = "deepseek/deepseek-r1:free";
const GEMINI_FREE_MODEL = "gemini-3.5-flash-lite";

// Keep Gemini pinned to models that currently expose a Google AI Studio free tier.
// Unknown/custom model ids are ignored so a paid Gemini SKU cannot be enabled accidentally.
const GEMINI_FREE_MODELS = new Set([
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
]);

function isOpenRouterFreeModel(model: string | undefined | null): boolean {
  if (!model) return false;
  const value = model.trim();
  return value === OPENROUTER_GENERIC_FREE_MODEL || value.endsWith(":free");
}

function freeOpenRouterModel(candidate: string | undefined | null, fallback: string): string {
  if (isOpenRouterFreeModel(candidate)) return candidate!.trim();
  if (candidate?.trim()) {
    console.warn(`[ai-router] Refusing non-free OpenRouter model: ${candidate}. Using ${fallback}.`);
  }
  return fallback;
}

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

async function callOpenRouter(
  options: RouteOptions,
  model: string,
  provider: "openrouter-free" | "kimi" | "deepseek",
): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  // Absolute zero-cost guard: never send a non-free OpenRouter model.
  if (!isOpenRouterFreeModel(model)) {
    console.error(`[ai-router] BLOCKED non-free OpenRouter model: ${model}`);
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
        "X-Title": "CatalogOptimize AI",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens || (options.vision ? 1200 : 4096),
        temperature: options.temperature ?? (options.vision ? 0.15 : 0.3),
      }),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.warn(`[ai-router] ${provider}/${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content ? { content, provider, model: data?.model || model } : null;
  } catch (error) {
    console.warn(`[ai-router] ${provider}/${model} request failed`, error);
    return null;
  }
}

/** Priority 1: OpenRouter free router. */
async function tryOpenRouter(options: RouteOptions): Promise<AIRouteResult | null> {
  if (options.vision) return null;
  const configured = Deno.env.get("OPENROUTER_FREE_MODEL");
  const model = freeOpenRouterModel(configured, OPENROUTER_GENERIC_FREE_MODEL);
  return callOpenRouter(options, model, "openrouter-free");
}

/** Vision policy: Kimi multimodal free only. No Gemini/OpenAI vision fallback. */
async function tryKimiVision(options: RouteOptions): Promise<AIRouteResult | null> {
  const configured = Deno.env.get("KIMI_OPENROUTER_VISION_MODEL")
    || Deno.env.get("OPENROUTER_VISION_MODEL")
    || options.preferredFreeModel;
  const model = freeOpenRouterModel(configured, KIMI_FREE_MODEL);

  if (!model.toLowerCase().includes("kimi")) {
    console.warn(`[ai-router] Vision model must be Kimi. Falling back to ${KIMI_FREE_MODEL}.`);
    return callOpenRouter(options, KIMI_FREE_MODEL, "kimi");
  }
  return callOpenRouter(options, model, "kimi");
}

/** Priority 2: Gemini model eligible for Google AI Studio free tier. */
async function tryGemini(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey || options.vision) return null;

  const configured = (Deno.env.get("GEMINI_FREE_TEXT_MODEL") || Deno.env.get("GEMINI_TEXT_MODEL") || "").trim();
  const model = GEMINI_FREE_MODELS.has(configured) ? configured : GEMINI_FREE_MODEL;
  if (configured && configured !== model) {
    console.warn(`[ai-router] Refusing Gemini model outside free allowlist: ${configured}. Using ${model}.`);
  }

  const system = options.messages
    .filter((m) => m.role === "system")
    .map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content))
    .join("\n");
  const contents = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: toGeminiParts(m.content) }));

  try {
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
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.warn(`[ai-router] Gemini free ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
      return null;
    }
    const content = textFromGemini(await response.json());
    return content ? { content, provider: "gemini", model } : null;
  } catch (error) {
    console.warn(`[ai-router] Gemini free ${model} request failed`, error);
    return null;
  }
}

/** Priority 3: Kimi through OpenRouter free SKU only. Direct Moonshot API is intentionally forbidden. */
async function tryKimi(options: RouteOptions): Promise<AIRouteResult | null> {
  if (options.vision) return null;
  const preferred = options.preferredFreeModel?.toLowerCase().includes("kimi")
    ? options.preferredFreeModel
    : undefined;
  const configured = Deno.env.get("KIMI_OPENROUTER_MODEL") || preferred;
  const model = freeOpenRouterModel(configured, KIMI_FREE_MODEL);

  if (!model.toLowerCase().includes("kimi")) {
    console.warn(`[ai-router] Kimi fallback must use a Kimi model. Using ${KIMI_FREE_MODEL}.`);
    return callOpenRouter(options, KIMI_FREE_MODEL, "kimi");
  }
  return callOpenRouter(options, model, "kimi");
}

/** Priority 4: DeepSeek through OpenRouter free SKU only. Direct DeepSeek API is intentionally forbidden. */
async function tryDeepSeek(options: RouteOptions): Promise<AIRouteResult | null> {
  if (options.vision) return null;
  const configured = Deno.env.get("DEEPSEEK_OPENROUTER_MODEL");
  const model = freeOpenRouterModel(configured, DEEPSEEK_FREE_MODEL);

  if (!model.toLowerCase().includes("deepseek")) {
    console.warn(`[ai-router] DeepSeek fallback must use a DeepSeek model. Using ${DEEPSEEK_FREE_MODEL}.`);
    return callOpenRouter(options, DEEPSEEK_FREE_MODEL, "deepseek");
  }
  return callOpenRouter(options, model, "deepseek");
}

/**
 * CatalogOptimize zero-cost text policy, in this exact order:
 * 1. OpenRouter free router
 * 2. Gemini free-tier eligible Flash-Lite
 * 3. Kimi :free through OpenRouter
 * 4. DeepSeek :free through OpenRouter
 *
 * There is deliberately NO OpenAI, paid Kimi, paid DeepSeek, or Lovable-credit fallback.
 */
export async function routeAI(options: RouteOptions): Promise<AIRouteResult> {
  if (options.vision) {
    const result = await tryKimiVision(options);
    if (result) return result;
    throw new Error("Kimi free vision is unavailable. Configure OPENROUTER_API_KEY.");
  }

  const attempts = [
    () => tryOpenRouter(options),
    () => tryGemini(options),
    () => tryKimi(options),
    () => tryDeepSeek(options),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result) return result;
    } catch (error) {
      console.warn("[ai-router] free provider failed", error);
    }
  }

  throw new Error(
    "No free AI provider is available. Configure OPENROUTER_API_KEY and/or GOOGLE_GEMINI_API_KEY. Paid fallbacks are disabled by policy.",
  );
}

export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  return routeAI({
    messages,
    maxTokens,
    temperature: 0.15,
    vision: true,
    preferredFreeModel: Deno.env.get("KIMI_OPENROUTER_VISION_MODEL") || KIMI_FREE_MODEL,
  });
}

export const FREE_AI_POLICY = {
  textOrder: [OPENROUTER_GENERIC_FREE_MODEL, GEMINI_FREE_MODEL, KIMI_FREE_MODEL, DEEPSEEK_FREE_MODEL],
  visionModel: KIMI_FREE_MODEL,
} as const;
