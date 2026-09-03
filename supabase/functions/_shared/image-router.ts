export type ImageRouteResult = {
  imageUrl: string;
  provider: string;
  model: string;
};

export type ImageRouteOptions = {
  prompt: string;
  imageUrls?: string[];
  aspectRatio?: string;
  size?: string;
};

const STRICT_AI_PLACEHOLDER = "__STRICT_AI_ROUTER_PLACEHOLDER__";

function envSecret(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value !== STRICT_AI_PLACEHOLDER) return value;
  }
  return undefined;
}

async function providerFetch(input: any, init?: RequestInit): Promise<Response> {
  const nativeFetch = (globalThis as any).__STRICT_AI_NATIVE_FETCH__ as typeof fetch | undefined;
  return nativeFetch ? nativeFetch(input, init) : fetch(input, init);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const dataMatch = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (dataMatch) {
    const binary = atob(dataMatch[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mimeType: dataMatch[1] };
  }

  const response = await providerFetch(url);
  if (!response.ok) throw new Error(`Source image fetch failed: ${response.status}`);
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error("Source image is not an image");
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType };
}

function resolveDimensions(options: ImageRouteOptions): { width: number; height: number } {
  const sizeMatch = options.size?.match(/^(\d+)x(\d+)$/);
  if (sizeMatch) {
    const width = Math.max(256, Math.min(2048, Number(sizeMatch[1])));
    const height = Math.max(256, Math.min(2048, Number(sizeMatch[2])));
    return { width, height };
  }

  switch (options.aspectRatio) {
    case "16:9": return { width: 1344, height: 768 };
    case "9:16": return { width: 768, height: 1344 };
    case "4:5": return { width: 1024, height: 1280 };
    case "5:4": return { width: 1280, height: 1024 };
    case "4:3": return { width: 1024, height: 768 };
    case "3:4": return { width: 768, height: 1024 };
    default: return { width: 1024, height: 1024 };
  }
}

function normalizeAspectRatio(value?: string): string {
  const supported = new Set(["1:1", "16:9", "9:16", "4:5", "5:4", "4:3", "3:4", "3:2", "2:3"]);
  return value && supported.has(value) ? value : "1:1";
}

async function tryCloudflare(options: ImageRouteOptions): Promise<ImageRouteResult | null> {
  const accountId = envSecret("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = envSecret("CLOUDFLARE_AI_API_TOKEN", "CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) {
    console.warn("[image-router] Cloudflare skipped: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN not configured");
    return null;
  }

  const sourceUrl = options.imageUrls?.[0];
  const { width, height } = resolveDimensions(options);
  const configuredModel = Deno.env.get("CLOUDFLARE_IMAGE_MODEL");
  const models = Array.from(new Set([
    configuredModel,
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    "@cf/bytedance/stable-diffusion-xl-lightning",
  ].filter((value): value is string => Boolean(value))));

  let source: { bytes: Uint8Array; mimeType: string } | null = null;
  if (sourceUrl) {
    try {
      source = await fetchImage(sourceUrl);
    } catch (error) {
      console.warn("[image-router] Cloudflare source image could not be loaded", error);
      return null;
    }
  }

  for (const model of models) {
    try {
      const payload: Record<string, unknown> = {
        prompt: options.prompt,
        negative_prompt: "different product, altered product shape, wrong color, changed material, added parts, removed parts, text, watermark, logo, low quality",
        guidance: 8,
        num_steps: 20,
        width,
        height,
      };

      if (source) {
        payload.image_b64 = bytesToBase64(source.bytes);
        payload.strength = 0.28;
      }

      const response = await providerFetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        console.warn(`[image-router] Cloudflare ${model} failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const raw = data?.result?.image ?? data?.image ?? (typeof data?.result === "string" ? data.result : undefined);
        if (typeof raw !== "string" || !raw) {
          console.warn(`[image-router] Cloudflare ${model} returned JSON without image data`);
          continue;
        }
        return {
          imageUrl: raw.startsWith("data:image/") ? raw : `data:image/png;base64,${raw}`,
          provider: "cloudflare",
          model,
        };
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) {
        console.warn(`[image-router] Cloudflare ${model} returned an empty image`);
        continue;
      }
      const mime = contentType.startsWith("image/") ? contentType.split(";")[0] : "image/png";
      return {
        imageUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
        provider: "cloudflare",
        model,
      };
    } catch (error) {
      console.warn(`[image-router] Cloudflare ${model} failed`, error);
    }
  }

  return null;
}

function extractGeminiImage(payload: any): { data: string; mimeType: string } | null {
  const direct = payload?.output_image || payload?.outputImage;
  if (direct?.data) {
    return { data: direct.data, mimeType: direct.mime_type || direct.mimeType || "image/png" };
  }

  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (const step of steps) {
    if (step?.type !== "model_output" || !Array.isArray(step?.content)) continue;
    for (const block of step.content) {
      if (block?.type === "image" && block?.data) {
        return { data: block.data, mimeType: block.mime_type || block.mimeType || "image/png" };
      }
    }
  }

  const outputs = Array.isArray(payload?.outputs) ? payload.outputs : [];
  for (const block of outputs) {
    if (block?.type === "image" && block?.data) {
      return { data: block.data, mimeType: block.mime_type || block.mimeType || "image/png" };
    }
  }

  return null;
}

async function tryGemini(options: ImageRouteOptions): Promise<ImageRouteResult | null> {
  const apiKey = envSecret("GOOGLE_GEMINI_API_KEY", "GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("[image-router] Gemini skipped: GOOGLE_GEMINI_API_KEY / GEMINI_API_KEY not configured");
    return null;
  }

  const configuredModel = Deno.env.get("GEMINI_IMAGE_MODEL");
  const models = Array.from(new Set([
    configuredModel,
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
  ].filter((value): value is string => Boolean(value))));

  const input: any[] = [{ type: "text", text: options.prompt }];
  for (const imageUrl of (options.imageUrls || []).slice(0, 5)) {
    try {
      const source = await fetchImage(imageUrl);
      input.push({
        type: "image",
        mime_type: source.mimeType,
        data: bytesToBase64(source.bytes),
      });
    } catch (error) {
      console.warn("[image-router] Gemini source image skipped", error);
    }
  }

  const aspectRatio = normalizeAspectRatio(options.aspectRatio);

  for (const model of models) {
    try {
      const response = await providerFetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input,
            response_format: {
              type: "image",
              mime_type: "image/png",
              aspect_ratio: aspectRatio,
              image_size: "1K",
            },
          }),
        },
      );

      if (!response.ok) {
        console.warn(`[image-router] Gemini ${model} failed: ${response.status} ${(await response.text()).slice(0, 700)}`);
        continue;
      }

      const payload = await response.json();
      const image = extractGeminiImage(payload);
      if (!image?.data) {
        console.warn(`[image-router] Gemini ${model} returned no image block`);
        continue;
      }

      return {
        imageUrl: `data:${image.mimeType};base64,${image.data}`,
        provider: "gemini",
        model,
      };
    } catch (error) {
      console.warn(`[image-router] Gemini ${model} failed`, error);
    }
  }

  return null;
}

/**
 * Resilient image generation / editing route.
 * Cloudflare is attempted first, then Gemini image models.
 */
export async function routeImage(options: ImageRouteOptions): Promise<ImageRouteResult> {
  const attempts = [
    () => tryCloudflare(options),
    () => tryGemini(options),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result?.imageUrl) return result;
    } catch (error) {
      console.warn("[image-router] provider attempt failed", error);
    }
  }

  throw new Error(
    "No image provider succeeded. Configure valid Cloudflare image credentials or GOOGLE_GEMINI_API_KEY/GEMINI_API_KEY and a supported image model.",
  );
}
