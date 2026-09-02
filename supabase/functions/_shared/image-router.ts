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



async function tryCloudflare(options: ImageRouteOptions): Promise<ImageRouteResult | null> {
  const accountId = envSecret("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = envSecret("CLOUDFLARE_AI_API_TOKEN", "CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) {
    console.warn("[image-router] Cloudflare skipped: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured");

    return null;
  }
  const sourceUrl = options.imageUrls?.[0];

  try {
    const model = Deno.env.get("CLOUDFLARE_IMAGE_MODEL") || "@cf/stabilityai/stable-diffusion-xl-base-1.0";
    const payload: Record<string, unknown> = {
      prompt: options.prompt,
      negative_prompt: "different product, altered product, wrong shape, wrong color, text, watermark, low quality",
      guidance: 9,
      num_steps: 20,
    };

    // img2img only when a source image is provided; otherwise pure text-to-image.
    if (sourceUrl) {
      const source = await fetchImage(sourceUrl);
      payload.image_b64 = bytesToBase64(source.bytes);
      payload.strength = 0.3;
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
      console.warn(`[image-router] Cloudflare ${model} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      return null;
    }


    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const image = data?.result?.image || data?.image;
      if (!image) return null;
      return { imageUrl: `data:image/png;base64,${image}`, provider: "cloudflare", model };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return { imageUrl: `data:image/png;base64,${bytesToBase64(bytes)}`, provider: "cloudflare", model };
  } catch (error) {
    console.warn("[image-router] Cloudflare failed", error);
    return null;
  }
}

async function tryGemini(options: ImageRouteOptions): Promise<ImageRouteResult | null> {
  const apiKey = envSecret("GOOGLE_GEMINI_API_KEY", "GEMINI_API_KEY");
  if (!apiKey) return null;

  const models = Array.from(new Set([
    Deno.env.get("GEMINI_IMAGE_MODEL"),
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-exp-image-generation",
  ].filter(Boolean))) as string[];


  const parts: any[] = [{ text: options.prompt }];
  for (const url of (options.imageUrls || []).slice(0, 4)) {
    try {
      const image = await fetchImage(url);
      parts.push({ inlineData: { mimeType: image.mimeType, data: bytesToBase64(image.bytes) } });
    } catch (error) {
      console.warn("[image-router] Gemini source image skipped", error);
    }
  }

  for (const model of models) {
    try {
      const response = await providerFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        },
      );

      if (!response.ok) {
        console.warn(`[image-router] Gemini ${model} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
        continue;
      }

      const data = await response.json();
      const outputParts = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = outputParts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
      const inline = imagePart?.inlineData || imagePart?.inline_data;
      if (!inline?.data) continue;
      return {
        imageUrl: `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`,
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
 * A provider failure never stops the chain.
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

  throw new Error("No configured image provider succeeded. Check Cloudflare/Gemini image credentials and models.");
}
