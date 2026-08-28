const DEFAULT_CLOUDFLARE_IMAGE_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

// Only Cloudflare image models explicitly approved for the zero-cost policy.
// Do not add metered image models without revisiting this allowlist.
const FREE_IMAGE_MODELS = new Set([
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/runwayml/stable-diffusion-v1-5-img2img",
]);

export interface CloudflareImageInput {
  /** Optional for text-to-image; required for image-edit/background workflows. */
  imageUrl?: string;
  prompt: string;
  width?: number;
  height?: number;
  strength?: number;
  guidance?: number;
  numSteps?: number;
}

export interface CloudflareImageResult {
  dataUrl: string;
  model: string;
  provider: "cloudflare-workers-ai";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function configuredFreeModel(hasSourceImage: boolean): string {
  const configured = Deno.env.get("CLOUDFLARE_BACKGROUND_MODEL")?.trim();
  if (configured && FREE_IMAGE_MODELS.has(configured)) {
    // Runway entry is img2img-only in this project; never select it for txt2img.
    if (!hasSourceImage && configured.includes("img2img")) {
      console.warn(`[cloudflare-image] ${configured} requires an input image. Using ${DEFAULT_CLOUDFLARE_IMAGE_MODEL}.`);
      return DEFAULT_CLOUDFLARE_IMAGE_MODEL;
    }
    return configured;
  }
  if (configured) {
    console.warn(`[cloudflare-image] BLOCKED model outside free allowlist: ${configured}. Using ${DEFAULT_CLOUDFLARE_IMAGE_MODEL}.`);
  }
  return DEFAULT_CLOUDFLARE_IMAGE_MODEL;
}

async function sourceImageBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:image")) {
    const match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!match) throw new Error("Invalid source data URL");
    return match[1];
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Source image HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.startsWith("image/")) throw new Error("Source URL is not an image");
  return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
}

export async function generateCloudflareImage(input: CloudflareImageInput): Promise<CloudflareImageResult> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_AI_API_TOKEN");
  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.");
  }

  const hasSourceImage = Boolean(input.imageUrl);
  const model = configuredFreeModel(hasSourceImage);
  const imageB64 = input.imageUrl ? await sourceImageBase64(input.imageUrl) : undefined;
  const width = Math.max(256, Math.min(2048, Math.round(input.width || 1024)));
  const height = Math.max(256, Math.min(2048, Math.round(input.height || 1024)));

  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    negative_prompt: "different product, changed product shape, altered color, duplicate product, text, watermark, logo, monochrome, grayscale, low quality, distortion",
    guidance: input.guidance ?? 9,
    num_steps: input.numSteps ?? 20,
    width,
    height,
  };
  if (imageB64) {
    payload.image_b64 = imageB64;
    payload.strength = input.strength ?? 0.35;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`Cloudflare Workers AI ${response.status}: ${detail}`);
  }

  const contentType = response.headers.get("content-type") || "";
  let outputBase64 = "";
  let mimeType = "image/png";

  if (contentType.includes("application/json")) {
    const json = await response.json();
    outputBase64 = json?.result?.image || json?.result?.image_b64 || json?.image || "";
    if (typeof outputBase64 === "string" && outputBase64.startsWith("data:image")) {
      return { dataUrl: outputBase64, model, provider: "cloudflare-workers-ai" };
    }
  } else {
    mimeType = contentType.split(";")[0] || "image/png";
    outputBase64 = bytesToBase64(new Uint8Array(await response.arrayBuffer()));
  }

  if (!outputBase64) throw new Error("Cloudflare Workers AI returned no image");
  return { dataUrl: `data:${mimeType};base64,${outputBase64}`, model, provider: "cloudflare-workers-ai" };
}

export async function generateCloudflareBackground(input: CloudflareImageInput & { imageUrl: string }): Promise<CloudflareImageResult> {
  return generateCloudflareImage(input);
}

export const CLOUDFLARE_FREE_BACKGROUND_MODEL = DEFAULT_CLOUDFLARE_IMAGE_MODEL;
export const CLOUDFLARE_FREE_BACKGROUND_MODELS = [...FREE_IMAGE_MODELS] as const;
