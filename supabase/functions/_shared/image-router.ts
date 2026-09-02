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

async function tryCloudflare(options: ImageRouteOptions): Promise<ImageRouteResult | null> {
  const accountId = envSecret("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = envSecret("CLOUDFLARE_AI_API_TOKEN", "CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) {
    console.warn("[image-router] Cloudflare skipped: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN not configured");
    return null;
  }

  const sourceUrl = options.imageUrls?.[0];
  const { width, height } = resolveDimensions(options);

  try {
    const model = Deno.env.get("CLOUDFLARE_IMAGE_MODEL") || "@cf/stabilityai/stable-diffusion-xl-base-1.0";
    const payload: Record<string, unknown> = {
      prompt: options.prompt,
      negative_prompt: "different product, altered product shape, wrong color, changed material, added parts, removed parts, text, watermark, logo, low quality",
      guidance: 8,
      num_steps: 20,
      width,
      height,
    };

    if (sourceUrl) {
      const source = await fetchImage(sourceUrl);
      payload.image_b64 = bytesToBase64(source.bytes);
      payload.strength = 0.28;
    }

    if ((options.imageUrls?.length || 0) > 1) {
      console.log(`[image-router] Cloudflare uses the primary image reference; ${options.imageUrls!.length - 1} secondary reference(s) are not sent as image inputs.`);
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
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const raw = data?.result?.image ?? data?.image ?? (typeof data?.result === "string" ? data.result : undefined);
      if (typeof raw !== "string" || !raw) return null;
      return {
        imageUrl: raw.startsWith("data:image/") ? raw : `data:image/png;base64,${raw}`,
        provider: "cloudflare",
        model,
      };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) return null;
    const mime = contentType.startsWith("image/") ? contentType.split(";")[0] : "image/png";
    return {
      imageUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
      provider: "cloudflare",
      model,
    };
  } catch (error) {
    console.warn("[image-router] Cloudflare failed", error);
    return null;
  }
}

/**
 * Image generation / editing route.
 * Cloudflare Workers AI is the canonical image provider.
 */
export async function routeImage(options: ImageRouteOptions): Promise<ImageRouteResult> {
  const result = await tryCloudflare(options);
  if (result?.imageUrl) return result;

  throw new Error(
    "Cloudflare image generation failed. Check CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_API_TOKEN and CLOUDFLARE_IMAGE_MODEL.",
  );
}
