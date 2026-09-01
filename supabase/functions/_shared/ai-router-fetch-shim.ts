import { routeAI, type AIMessage } from "./ai-router.ts";

declare global {
  // deno-lint-ignore no-var
  var __STRICT_AI_NATIVE_FETCH__: typeof fetch | undefined;
  // deno-lint-ignore no-var
  var __STRICT_AI_FETCH_SHIM_INSTALLED__: boolean | undefined;
}

const TEXT_CHAT_HOSTS = new Set([
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

function isTextChatCompletion(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (!TEXT_CHAT_HOSTS.has(url.hostname)) return false;
    return url.pathname.includes("/chat/completions");
  } catch {
    return false;
  }
}

function containsMultimodalContent(messages: any[]): boolean {
  return messages.some((message) => {
    if (!Array.isArray(message?.content)) return false;
    return message.content.some((part: any) =>
      part?.type === "image_url" ||
      part?.type === "input_image" ||
      part?.image_url ||
      part?.inline_data ||
      part?.file_data
    );
  });
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
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-AI-Provider": provider,
        "X-AI-Model": model,
      },
    });
  }

  return new Response(JSON.stringify({
    id: `strict-router-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    provider,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop",
    }],
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-AI-Provider": provider,
      "X-AI-Model": model,
    },
  });
}

/**
 * Compatibility layer for older Edge Functions that still call an LLM endpoint
 * directly. Pure text chat-completion calls are transparently re-routed through
 * the strict shared order:
 *
 * OpenAI -> Gemini -> Kimi -> DeepSeek -> OpenRouter (final rescue only).
 *
 * Multimodal/image calls are intentionally left untouched.
 */
export function installAIRouterFetchShim(): void {
  if (globalThis.__STRICT_AI_FETCH_SHIM_INSTALLED__) return;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.__STRICT_AI_NATIVE_FETCH__ = nativeFetch;
  globalThis.__STRICT_AI_FETCH_SHIM_INSTALLED__ = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    if (!isTextChatCompletion(url)) {
      return nativeFetch(input, init);
    }

    try {
      const rawBody = typeof init?.body === "string" ? init.body : "";
      const body = rawBody ? JSON.parse(rawBody) : {};
      const messages = Array.isArray(body?.messages) ? body.messages : [];

      // Image/vision payloads keep their specialised provider path.
      if (
        containsMultimodalContent(messages) ||
        (Array.isArray(body?.modalities) && body.modalities.includes("image"))
      ) {
        return nativeFetch(input, init);
      }

      const normalizedMessages = normalizeMessages(messages);
      if (!normalizedMessages.length) {
        return nativeFetch(input, init);
      }

      console.log(`[ai-router-shim] Intercepting legacy text generation: ${new URL(url).hostname}`);
      const result = await routeAI({
        messages: normalizedMessages,
        maxTokens: body?.max_tokens || body?.max_completion_tokens || 4096,
        temperature: typeof body?.temperature === "number" ? body.temperature : 0.3,
        preferredFreeModel: body?.openrouter_model,
      });

      console.log(`[ai-router-shim] Routed to ${result.provider} (${result.model})`);
      return openAICompatibleResponse(result.content, result.provider, result.model, body?.stream === true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[ai-router-shim] Strict routing failed:", message);
      return new Response(JSON.stringify({
        error: {
          message,
          type: "strict_ai_router_error",
        },
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
