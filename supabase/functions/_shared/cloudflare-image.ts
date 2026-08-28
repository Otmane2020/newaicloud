const DEFAULT_CLOUDFLARE_IMAGE_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

// Only models explicitly approved for the project's zero-cost background policy.
// Do not add metered image-edit models here without revisiting the policy.
const FREE_BACKGROUND_MODELS = new Set([
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "@cf/runwayml/stable-diffusion-v1-5-img2img",
]);

export interface CloudflareBackgroundInput {
  imageUrl: string;
  prompt: string;
  width?: number;
  height?: number;
  strength?: number;
  guidance?: number;
  numSteps?: number;
}

export interface CloudflareBackgroundResult {
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

function configuredFreeModel(): string {
  const configured = Deno.env.get("CLOUDFLARE_BACKGROUND_MODEL")?.trim();
  if (!configured) return DEFAULT_CLOUDFLARE_IMAGE_MODEL;
  if (FREE_BACKGROUND_MODELS.has(configured)) return configured;
  console.warn(`[cloudflare-image] BLOCKED model outside free allowlist: ${configured}. Using ${DEFAULT_CLOUDFLARE_IMAGE_MODEL}.`);
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
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("Source URL is not an image");
  }
  return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
}

export async function generateCloudflareBackground(
  input: CloudflareBackgroundInput,
): Promise<CloudflareBackgroundResult> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_AI_API_TOKEN");
  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.");
  }

  const model = configuredFreeModel();
  const imageB64 = await sourceImageBase64(input.imageUrl);
  const width = Math.max(256, Math.min(2048, Math.round(input.width || 1024)));
  const height = Math.max(256, Math.min(2048, Math.round(input.height || 1024)));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt,
        negative_prompt: "different product, changed product shape, altered color, duplicate product, text, watermark, logo, monochrome, grayscale, low quality, distortion",
        image_b64: imageB64,
        strength: input.strength ?? 0.35,
        guidance: input.guidance ?? 9,
        num_steps: input.numSteps ?? 20,
        width,
        height,
      }),
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
    if (outputBase64.startsWith("data:image")) {
      return { dataUrl: outputBase64, model, provider: "cloudflare-workers-ai" };
    }
  } else {
    mimeType = contentType.split(";")[0] || "image/png";
    outputBase64 = bytesToBase64(new Uint8Array(await response.arrayBuffer()));
  }

  if (!outputBase64) throw new Error("Cloudflare Workers AI returned no image");
  return {
    dataUrl: `data:${mimeType};base64,${outputBase64}`,
    model,
    provider: "cloudflare-workers-ai",
  };
}

export const CLOUDFLARE_FREE_BACKGROUND_MODEL = DEFAULT_CLOUDFLARE_IMAGE_MODEL;
export const CLOUDFLARE_FREE_BACKGROUND_MODELS = [...FREE_BACKGROUND_MODELS] as const;
