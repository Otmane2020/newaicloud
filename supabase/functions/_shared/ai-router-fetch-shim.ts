import { routeAI, type AIMessage } from "./ai-router.ts";
import { routeImage } from "./image-router.ts";

declare global {
  // deno-lint-ignore no-var
  var __STRICT_AI_NATIVE_FETCH__: typeof fetch | undefined;
  // deno-lint-ignore no-var
  var __STRICT_AI_FETCH_SHIM_INSTALLED__: boolean | undefined;
}

const OPENAI_COMPATIBLE_HOSTS = new Set([
  "ai.gateway.lovable.dev",
  "api.openai.com",
  "api.deepseek.com",
  "openrouter.ai",
  "api.moonshot.ai",
]);

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function legacyEndpointKind(urlString: string): "openai-compatible" | "gemini" | null {
  try {
    const url = new URL(urlString);
    if (OPENAI_COMPATIBLE_HOSTS.has(url.hostname) && url.pathname.includes("/chat/completions")) {
      return "openai-compatible";
    }
    if (url.hostname === "generativelanguage.googleapis.com" && url.pathname.includes(":generateContent")) {
      return "gemini";
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeMessages(messages: any[]): AIMessage[] {
  return messages
    .filter((message) => message && ["system", "user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role as "system" | "user" | "assistant",
      content: typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
        ? message.content
        : String(message.content ?? ""),
    }));
}

function geminiPartsText(parts: any[]): string {
  return (parts || []).map((part: any) => typeof part?.text === "string" ? part.text : "").filter(Boolean).join("\n");
}

function normalizeGeminiMessages(body: any): AIMessage[] {
  const messages: AIMessage[] = [];
  const systemText = geminiPartsText(body?.system_instruction?.parts || body?.systemInstruction?.parts || []);
  if (systemText) messages.push({ role: "system", content: systemText });
  for (const item of body?.contents || []) {
    const text = geminiPartsText(item?.parts || []);
    if (!text) continue;
    messages.push({ role: item?.role === "model" ? "assistant" : "user", content: text });
  }
  return messages;
}

function extractOpenAIImageRequest(body: any): { prompt: string; imageUrls: string[]; aspectRatio?: string } | null {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const wantsImage = Array.isArray(body?.modalities) && body.modalities.includes("image");
  if (!wantsImage) return null;

  const texts: string[] = [];
  const imageUrls: string[] = [];
  for (const message of messages) {
    if (typeof message?.content === "string") {
      texts.push(message.content);
      continue;
    }
    if (!Array.isArray(message?.content)) continue;
    for (const part of message.content) {
      if (part?.type === "text" && typeof part.text === "string") texts.push(part.text);
      const url = part?.image_url?.url || part?.image_url || part?.url;
      if (typeof url === "string" && url) imageUrls.push(url);
    }
  }

  return {
    prompt: texts.join("\n").trim() || "Create a professional e-commerce image.",
    imageUrls,
    aspectRatio: body?.generationConfig?.aspectRatio,
  };
}

function extractGeminiImageRequest(body: any): { prompt: string; imageUrls: string[] } | null {
  const modalities = body?.generationConfig?.responseModalities || body?.generationConfig?.response_modalities || [];
  if (!Array.isArray(modalities) || !modalities.some((value: any) => String(value).toUpperCase() === "IMAGE")) return null;

  const texts: string[] = [];
  const imageUrls: string[] = [];
  for (const item of body?.contents || []) {
    for (const part of item?.parts || []) {
      if (typeof part?.text === "string") texts.push(part.text);
      const inline = part?.inlineData || part?.inline_data;
      if (inline?.data) {
        imageUrls.push(`data:${inline.mimeType || inline.mime_type || "image/jpeg"};base64,${inline.data}`);
      }
      const file = part?.fileData || part?.file_data;
      if (file?.fileUri || file?.file_uri) imageUrls.push(file.fileUri || file.file_uri);
    }
  }

  return {
    prompt: texts.join("\n").trim() || "Create a professional e-commerce image.",
    imageUrls,
  };
}

function openAICompatibleResponse(content: string, provider: string, model: string, stream = false): Response {
  if (stream) {
    const chunk = {
      id: `strict-router-${crypto.randomUUID()}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      provider,
      choices: [{ index: 0, delta: { content }, finish_reason: "stop" }],
    };
    return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-AI-Provider": provider, "X-AI-Model": model },
    });
  }

  return new Response(JSON.stringify({
    id: `strict-router-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    provider,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-AI-Provider": provider, "X-AI-Model": model },
  });
}

function openAIImageCompatibleResponse(imageUrl: string, provider: string, model: string): Response {
  return new Response(JSON.stringify({
    id: `strict-image-router-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    provider,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: "Image generated successfully.",
        images: [{ image_url: { url: imageUrl } }],
      },
      finish_reason: "stop",
    }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-AI-Provider": provider, "X-AI-Model": model },
  });
}

function geminiCompatibleResponse(content: string, provider: string, model: string): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { role: "model", parts: [{ text: content }] }, finishReason: "STOP", index: 0 }],
    modelVersion: model,
    provider,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-AI-Provider": provider, "X-AI-Model": model },
  });
}

async function geminiImageCompatibleResponse(imageUrl: string, provider: string, model: string): Promise<Response> {
  let inlineData: any = null;
  const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (match) {
    inlineData = { mimeType: match[1], data: match[2] };
  } else {
    const nativeFetch = globalThis.__STRICT_AI_NATIVE_FETCH__ || fetch;
    const response = await nativeFetch(imageUrl);
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      inlineData = { mimeType: response.headers.get("content-type")?.split(";")[0] || "image/png", data: btoa(binary) };
    }
  }

  if (!inlineData) {
    return new Response(JSON.stringify({ error: { message: "Generated image could not be normalized", type: "strict_image_router_error" } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    candidates: [{
      content: { role: "model", parts: [{ inlineData }] },
      finishReason: "STOP",
      index: 0,
    }],
    modelVersion: model,
    provider,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-AI-Provider": provider, "X-AI-Model": model },
  });
}

/**
 * Compatibility layer for legacy Edge Functions.
 * Text calls are routed through the shared text router.
 * Image generation/edit calls are routed through Cloudflare -> Gemini -> OpenAI -> Lovable.
 */
export function installAIRouterFetchShim(): void {
  if (globalThis.__STRICT_AI_FETCH_SHIM_INSTALLED__) return;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.__STRICT_AI_NATIVE_FETCH__ = nativeFetch;
  globalThis.__STRICT_AI_FETCH_SHIM_INSTALLED__ = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    const endpointKind = legacyEndpointKind(url);
    if (!endpointKind) return nativeFetch(input, init);

    try {
      const rawBody = typeof init?.body === "string" ? init.body : "";
      const body = rawBody ? JSON.parse(rawBody) : {};

      if (endpointKind === "gemini") {
        const imageRequest = extractGeminiImageRequest(body);
        if (imageRequest) {
          console.log(`[ai-router-shim] Intercepting legacy Gemini image generation`);
          const result = await routeImage(imageRequest);
          console.log(`[ai-router-shim] Image routed to ${result.provider} (${result.model})`);
          return geminiImageCompatibleResponse(result.imageUrl, result.provider, result.model);
        }

        const normalizedMessages = normalizeGeminiMessages(body);
        if (!normalizedMessages.length) return nativeFetch(input, init);
        const result = await routeAI({
          messages: normalizedMessages,
          maxTokens: body?.generationConfig?.maxOutputTokens || 4096,
          temperature: typeof body?.generationConfig?.temperature === "number" ? body.generationConfig.temperature : 0.3,
        });
        return geminiCompatibleResponse(result.content, result.provider, result.model);
      }

      const imageRequest = extractOpenAIImageRequest(body);
      if (imageRequest) {
        console.log(`[ai-router-shim] Intercepting legacy image generation: ${new URL(url).hostname}`);
        const result = await routeImage(imageRequest);
        console.log(`[ai-router-shim] Image routed to ${result.provider} (${result.model})`);
        return openAIImageCompatibleResponse(result.imageUrl, result.provider, result.model);
      }

      const messages = Array.isArray(body?.messages) ? body.messages : [];
      const normalizedMessages = normalizeMessages(messages);
      if (!normalizedMessages.length) return nativeFetch(input, init);

      const result = await routeAI({
        messages: normalizedMessages,
        maxTokens: body?.max_tokens || body?.max_completion_tokens || 4096,
        temperature: typeof body?.temperature === "number" ? body.temperature : 0.3,
        preferredFreeModel: body?.openrouter_model,
      });

      return openAICompatibleResponse(result.content, result.provider, result.model, body?.stream === true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ai-router-shim] Strict routing failed:", message);
      return new Response(JSON.stringify({ error: { message, type: "strict_ai_router_error" } }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
