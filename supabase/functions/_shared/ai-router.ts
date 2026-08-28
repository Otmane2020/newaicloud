export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type AIRouteResult = {
  content: string;
  provider: "openrouter-free" | "gemini" | "deepseek";
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

async function tryOpenRouter(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  const model = options.preferredFreeModel || "openrouter/free";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://newai.sale",
      "X-Title": "NewAI",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    console.warn(`[ai-router] OpenRouter ${model} failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "openrouter-free", model: data?.model || model } : null;
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
 * Cost-first routing:
 * 1. OpenRouter free model/router
 * 2. Gemini free quota
 * 3. DeepSeek paid fallback for text
 */
export async function routeAI(options: RouteOptions): Promise<AIRouteResult> {
  const attempts = [
    () => tryOpenRouter(options),
    () => tryGemini(options),
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

  throw new Error("No AI provider is available. Configure OPENROUTER_API_KEY, GOOGLE_GEMINI_API_KEY or DEEPSEEK_API_KEY.");
}

export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  return routeAI({
    messages,
    maxTokens,
    temperature: 0.15,
    vision: true,
    preferredFreeModel: Deno.env.get("OPENROUTER_VISION_MODEL") || "moonshotai/kimi-k2.6:free",
  });
}
