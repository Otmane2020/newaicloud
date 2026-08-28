export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type AIRouteResult = {
  content: string;
  provider: "openai" | "openrouter-free" | "gemini" | "kimi" | "deepseek";
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

async function tryOpenAI(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
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
  if (!apiKey) return null;

  // An explicitly configured model is tried first. For vision, always fall back to
  // OpenRouter's free router, which dynamically selects a free model supporting image input.
  // This prevents a stale/removed vision model slug from turning into a hard failure.
  const models = Array.from(new Set([
    options.preferredFreeModel?.trim(),
    "openrouter/free",
  ].filter(Boolean))) as string[];

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
          "X-Title": "CatalogueOptimize AI",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.3,
        }),
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 300);
        console.warn(`[ai-router] OpenRouter ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content) {
        return { content, provider: "openrouter-free", model: data?.model || model };
      }

      console.warn(`[ai-router] OpenRouter ${model} returned no content`);
    } catch (error) {
      console.warn(`[ai-router] OpenRouter ${model} request failed`, error);
    }
  }

  return null;
}

async function tryGemini(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3-flash-preview";
  const system = options.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    }));

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
          "X-Title": "CatalogueOptimize AI",
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.3,
      }),
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
    }),
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
 * Resilient text routing, cost-first:
 * 1. OpenRouter free
 * 2. Gemini
 * 3. Kimi (Moonshot directly, or through OpenRouter)
 * 4. DeepSeek
 *
 * Vision routing:
 * 1. Optional OPENROUTER_VISION_MODEL override
 * 2. OpenRouter free multimodal router
 * 3. Gemini fallback
 *
 * DeepSeek is intentionally never used for vision.
 */
export async function routeAI(options: RouteOptions): Promise<AIRouteResult> {
  const attempts = options.vision
    ? [
        () => tryOpenRouter(options),
        () => tryGemini(options),
      ]
    : [
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
      console.warn("[ai-router] provider failed", error);
    }
  }

  throw new Error("No AI provider is available. Configure OPENROUTER_API_KEY, GOOGLE_GEMINI_API_KEY, KIMI_API_KEY/MOONSHOT_API_KEY, or DEEPSEEK_API_KEY.");
}

export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  return routeAI({
    messages,
    maxTokens,
    temperature: 0.15,
    vision: true,
    preferredFreeModel: Deno.env.get("OPENROUTER_VISION_MODEL") || undefined,
  });
}
