export type CloudflareImageInput = {
  prompt: string;
  imageUrl?: string;
  imageBytes?: Uint8Array;
  mimeType?: string;
  width?: number;
  height?: number;
  strength?: number;
  guidance?: number;
  numSteps?: number;
  negativePrompt?: string;
};

export type CloudflareImageResult = {
  imageUrl: string;
  model: string;
  provider: "cloudflare-workers-ai";
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function resolveSource(input: CloudflareImageInput): Promise<string | undefined> {
  if (input.imageBytes?.length) return bytesToBase64(input.imageBytes);
  if (!input.imageUrl) return undefined;

  const dataMatch = input.imageUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s);
  if (dataMatch) return dataMatch[1];

  const response = await fetch(input.imageUrl);
  if (!response.ok) throw new Error(`Source image HTTP ${response.status}`);
  return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
}

export async function generateCloudflareImage(
  input: CloudflareImageInput,
): Promise<CloudflareImageResult | null> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_AI_API_TOKEN");
  if (!accountId || !apiToken) {
    console.warn("[cloudflare-image] CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_AI_API_TOKEN not configured");
    return null;
  }

  const model = Deno.env.get("CLOUDFLARE_IMAGE_MODEL") || "@cf/stabilityai/stable-diffusion-xl-base-1.0";

  try {
    const imageB64 = await resolveSource(input);
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt ||
        "different product, altered product shape, wrong color, changed material, added parts, removed parts, text, watermark, logo, low quality",
      guidance: input.guidance ?? 8,
      num_steps: input.numSteps ?? 20,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
    };

    if (imageB64) {
      payload.image_b64 = imageB64;
      payload.strength = input.strength ?? 0.28;
    }

    const response = await fetch(
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
      const details = await response.text();
      console.error(`[cloudflare-image] ${model} failed (${response.status}): ${details.slice(0, 600)}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const raw = data?.result?.image ?? data?.image ?? (typeof data?.result === "string" ? data.result : undefined);
      if (typeof raw !== "string" || !raw) {
        console.error("[cloudflare-image] JSON response did not contain an image");
        return null;
      }
      const imageUrl = raw.startsWith("data:image/") ? raw : `data:image/png;base64,${raw}`;
      return { imageUrl, model, provider: "cloudflare-workers-ai" };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) {
      console.error("[cloudflare-image] Empty image response");
      return null;
    }
    const mime = contentType.startsWith("image/") ? contentType.split(";")[0] : "image/png";
    return {
      imageUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
      model,
      provider: "cloudflare-workers-ai",
    };
  } catch (error) {
    console.error("[cloudflare-image] generation exception", error);
    return null;
  }
}
