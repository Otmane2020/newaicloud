import { routeImage } from "./image-router.ts";

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
  provider: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function inferAspectRatio(width?: number, height?: number): string | undefined {
  if (!width || !height) return undefined;
  const ratio = width / height;
  const candidates = [
    { id: "1:1", value: 1 },
    { id: "4:5", value: 4 / 5 },
    { id: "5:4", value: 5 / 4 },
    { id: "9:16", value: 9 / 16 },
    { id: "16:9", value: 16 / 9 },
    { id: "3:4", value: 3 / 4 },
    { id: "4:3", value: 4 / 3 },
    { id: "2:3", value: 2 / 3 },
    { id: "3:2", value: 3 / 2 },
  ];
  candidates.sort((a, b) => Math.abs(a.value - ratio) - Math.abs(b.value - ratio));
  return candidates[0]?.id;
}

/**
 * Legacy compatibility wrapper.
 *
 * Existing callers still import generateCloudflareImage, but generation is now
 * routed through the shared resilient image router: Cloudflare first, then
 * Gemini image generation when Cloudflare is unavailable or fails.
 */
export async function generateCloudflareImage(
  input: CloudflareImageInput,
): Promise<CloudflareImageResult | null> {
  try {
    let sourceImage = input.imageUrl;
    if (!sourceImage && input.imageBytes?.length) {
      sourceImage = `data:${input.mimeType || "image/png"};base64,${bytesToBase64(input.imageBytes)}`;
    }

    const width = input.width ? Math.round(input.width) : undefined;
    const height = input.height ? Math.round(input.height) : undefined;
    const size = width && height ? `${width}x${height}` : undefined;

    const generated = await routeImage({
      prompt: input.prompt,
      imageUrls: sourceImage ? [sourceImage] : [],
      aspectRatio: inferAspectRatio(width, height),
      size,
    });

    return {
      imageUrl: generated.imageUrl,
      model: generated.model,
      provider: generated.provider,
    };
  } catch (error) {
    console.error("[cloudflare-image] resilient image routing failed", error);
    return null;
  }
}
