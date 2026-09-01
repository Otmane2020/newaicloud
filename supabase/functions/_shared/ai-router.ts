export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

type AIProvider = "openai" | "gemini" | "kimi" | "deepseek" | "openrouter-free";

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

const STRICT_AI_PLACEHOLDER = "__STRICT_AI_ROUTER_PLACEHOLDER__";

function envSecret(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value !== STRICT_AI_PLACEHOLDER) return value;
  }
  return undefined;
}

// When the legacy generation shim is installed it saves the original network
// fetch here. Provider calls MUST use it to avoid recursively intercepting the
// router's own requests.
async function providerFetch(input: any, init?: RequestInit): Promise<Response> {
  const nativeFetch = (globalThis as any).__STRICT_AI_NATIVE_FETCH__ as typeof fetch | undefined;
  return nativeFetch ? nativeFetch(input, init) : fetch(input, init);
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
    text.includes("format json") ||
    text.includes("json valide") ||
    text.includes("uniquement avec un objet json") ||
    text.includes("uniquement du json")
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

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

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
  const apiKey = envSecret("OPENAI_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini";
  const expectsJson = requestExpectsJson(options);
  const response = await providerFetch("https://api.openai.com/v1/chat/completions", {
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
      ...(expectsJson ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    console.warn(`[ai-router] OpenAI ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "openai", model: data?.model || model } : null;
}

async function tryGemini(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = envSecret("GOOGLE_GEMINI_API_KEY", "GEMINI_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";
  const system = options.messages
    .filter((message) => message.role === "system")
    .map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content))
    .join("\n");
  const contents = options.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(message.content),
    }));
  const expectsJson = requestExpectsJson(options);

  const response = await providerFetch(
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
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    console.warn(`[ai-router] Gemini ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
    return null;
  }

  const content = textFromGemini(await response.json());
  return content ? { content, provider: "gemini", model } : null;
}

async function tryKimi(options: RouteOptions): Promise<AIRouteResult | null> {
  if (options.vision) return null;

  // IMPORTANT: Kimi is direct-only here. OpenRouter must never be used inside
  // the Kimi attempt, otherwise it can run before DeepSeek.
  const apiKey = envSecret("KIMI_API_KEY", "MOONSHOT_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("KIMI_TEXT_MODEL") || "moonshot-v1-8k";
  const response = await providerFetch("https://api.moonshot.ai/v1/chat/completions", {
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
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    console.warn(`[ai-router] Kimi ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "kimi", model: data?.model || model } : null;
}

async function tryDeepSeek(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = envSecret("DEEPSEEK_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = Deno.env.get("DEEPSEEK_TEXT_MODEL") || "deepseek-chat";
  const response = await providerFetch("https://api.deepseek.com/chat/completions", {
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
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    console.warn(`[ai-router] DeepSeek ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "deepseek", model: data?.model || model } : null;
}

async function tryOpenRouter(options: RouteOptions): Promise<AIRouteResult | null> {
  const apiKey = envSecret("OPENROUTER_API_KEY");
  if (!apiKey || options.vision) return null;

  const model = options.preferredFreeModel?.trim() || Deno.env.get("OPENROUTER_TEXT_MODEL") || "openrouter/free";
  const response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
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
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    console.warn(`[ai-router] OpenRouter ${model} failed: ${response.status}${detail ? ` ${detail}` : ""}`);
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { content, provider: "openrouter-free", model: data?.model || model } : null;
}

/**
 * Text generation order is STRICT and must not be changed locally:
 * OpenRouter (free) -> Gemini -> Kimi (direct key) -> DeepSeek -> OpenAI (last resort).
 *
 * For JSON prompts, a provider is accepted only if its response can be parsed
 * as JSON; otherwise the router automatically tries the next provider.
 */
export async function routeAI(options: RouteOptions): Promise<AIRouteResult> {
  if (options.vision) {
    return routeVision(options.messages, options.maxTokens || 600);
  }

  const expectsJson = requestExpectsJson(options);
  const attempts: Array<{ provider: AIProvider; run: () => Promise<AIRouteResult | null> }> = [
    { provider: "openrouter-free", run: () => tryOpenRouter(options) },
    { provider: "gemini", run: () => tryGemini(options) },
    { provider: "kimi", run: () => tryKimi(options) },
    { provider: "deepseek", run: () => tryDeepSeek(options) },
    { provider: "openai", run: () => tryOpenAI(options) },
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
      : "No AI provider is available. Configure OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY/GEMINI_API_KEY, KIMI_API_KEY/MOONSHOT_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY.",
  );
}

/**
 * Vision remains a specialised route because not every text provider supports
 * the same multimodal payload. It uses the direct Moonshot/Kimi vision API and
 * never consumes the OpenRouter text fallback.
 */
export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  const baseOptions: RouteOptions = {
    messages,
    maxTokens,
    temperature: 0.15,
  };

  // Gemini accepts the same multimodal message structures used by this project
  // and is free-tier friendly, so it leads the vision chain. A failure simply
  // falls through to the next provider (Kimi direct, then OpenRouter, then OpenAI).
  try {
    const result = await tryGemini(baseOptions);
    if (result?.content) return result;
  } catch (error) {
    console.warn("[ai-router] Gemini vision failed", error);
  }


  // Kimi direct vision fallback.
  const kimiKey = envSecret("MOONSHOT_API_KEY", "KIMI_API_KEY");
  if (kimiKey) {
    const model = Deno.env.get("KIMI_VISION_MODEL") || "kimi-k2.6";
    try {
      const response = await providerFetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kimiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          thinking: { type: "disabled" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { content, provider: "kimi", model: data?.model || model };
      } else {
        console.warn(`[ai-router] Kimi vision ${model} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      }
    } catch (error) {
      console.warn("[ai-router] Kimi vision failed", error);
    }
  }

  // OpenRouter vision is optional because not every free model accepts images.
  // When OPENROUTER_VISION_MODEL is configured we use it as the last rescue.
  const openRouterKey = envSecret("OPENROUTER_API_KEY");
  const openRouterVisionModel = Deno.env.get("OPENROUTER_VISION_MODEL");
  if (openRouterKey && openRouterVisionModel) {
    try {
      const response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
          "X-Title": "CatalogOptimize AI",
        },
        body: JSON.stringify({
          model: openRouterVisionModel,
          messages,
          max_tokens: maxTokens,
          temperature: 0.15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { content, provider: "openrouter-free", model: data?.model || openRouterVisionModel };
      } else {
        console.warn(`[ai-router] OpenRouter vision ${openRouterVisionModel} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      }
    } catch (error) {
      console.warn("[ai-router] OpenRouter vision failed", error);
    }
  }

  throw new Error(
    "No vision provider succeeded. Configure a working OpenAI, Gemini, Kimi/Moonshot, or OPENROUTER_VISION_MODEL provider.",
  );
}
