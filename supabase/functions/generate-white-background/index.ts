import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHITE_BG_COST = 5;

type ImageFormat = "square" | "portrait" | "landscape";
type ProviderResult = { imageUrl: string; model: string; provider: string };

type ImagePayload = {
  bytes: Uint8Array;
  mimeType: string;
};

const formatDimensions: Record<ImageFormat, { width: number; height: number; openAiSize: string }> = {
  square: { width: 1024, height: 1024, openAiSize: "1024x1024" },
  portrait: { width: 768, height: 1024, openAiSize: "1024x1536" },
  landscape: { width: 1024, height: 768, openAiSize: "1536x1024" },
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseDataUrl(dataUrl: string): ImagePayload | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], bytes: base64ToBytes(match[2]) };
}

async function fetchImagePayload(url: string): Promise<ImagePayload> {
  const parsed = parseDataUrl(url);
  if (parsed) return parsed;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SOURCE_IMAGE_FETCH_FAILED:${response.status}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("SOURCE_IMAGE_INVALID_CONTENT_TYPE");
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType,
  };
}

async function prepareProviderSource(payload: ImagePayload): Promise<ImagePayload> {
  const MAX_DIMENSION = 1024;
  const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

  if (payload.bytes.length <= MAX_SOURCE_BYTES) {
    try {
      const probe = await Image.decode(payload.bytes);
      if (Math.max(probe.width, probe.height) <= MAX_DIMENSION) return payload;
    } catch {
      return payload;
    }
  }

  try {
    const source = await Image.decode(payload.bytes);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const resized = source.resize(width, height);
    const bytes = await resized.encode();
    console.log("[white-bg] Prepared provider source", {
      originalBytes: payload.bytes.length,
      preparedBytes: bytes.length,
      width,
      height,
    });
    return { bytes, mimeType: "image/png" };
  } catch (error) {
    console.warn("[white-bg] Source normalization failed; using original image", error);
    return payload;
  }
}

async function enforceImageFormat(
  payload: ImagePayload,
  targetWidth: number,
  targetHeight: number,
): Promise<ImagePayload> {
  try {
    const source = await Image.decode(payload.bytes);
    const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const resized = source.resize(width, height);
    const canvas = new Image(targetWidth, targetHeight);
    canvas.fill(0xffffffff);
    canvas.composite(
      resized,
      Math.round((targetWidth - width) / 2),
      Math.round((targetHeight - height) / 2),
    );
    return { bytes: await canvas.encode(), mimeType: "image/png" };
  } catch (error) {
    console.warn("[white-bg] Format post-processing failed, keeping provider output", error);
    return payload;
  }
}

function buildPrompt(body: Record<string, any>, format: ImageFormat): string {
  const dims = formatDimensions[format];
  const productTitle = body.productTitle || "product";
  const backgroundStyle = body.backgroundStyle || "shopping";
  const mode = body.mode || "google_shopping";
  const productDescription = body.productDescription ? String(body.productDescription).replace(/<[^>]+>/g, " ").slice(0, 500) : "";
  const customPrompt = body.customPrompt ? String(body.customPrompt).slice(0, 800) : "";
  const serpData = body.serpData || {};
  const visionAiData = body.visionAiData || {};

  const styleInstructions: Record<string, string> = {
    shopping: "pure white #FFFFFF e-commerce background, professional studio lighting, subtle natural shadow",
    lifestyle: "warm realistic lifestyle interior, natural light, neutral premium tones",
    moderne: "modern minimalist interior, clean lines, neutral gray and off-white tones",
    living_room: "realistic cozy living room, warm ambient light, tasteful furniture context",
    studio: "premium studio photography, cream or off-white seamless background, softbox lighting, visible natural shadow",
    nature: "natural setting with plants, organic materials and soft daylight",
    luxury_showroom: "luxury dark showroom, premium dramatic lighting, glossy floor and restrained reflections",
  };

  const context = [
    `Product: ${productTitle}`,
    productDescription ? `Description: ${productDescription}` : "",
    serpData?.dimensions ? `Known dimensions: ${serpData.dimensions}` : "",
    Array.isArray(serpData?.materials) && serpData.materials.length ? `Materials: ${serpData.materials.slice(0, 5).join(", ")}` : "",
    visionAiData?.description ? `Visual description: ${String(visionAiData.description).slice(0, 300)}` : "",
  ].filter(Boolean).join("\n");

  const preserveInstruction = `Use the EXACT SAME product from the input photo. Preserve its geometry, proportions, colors, materials, doors, drawers, handles, legs, slats, edges and every visible detail. Do not invent a similar product, remove parts, add parts or alter the design.`;

  const layoutInstruction = `Final canvas must be ${dims.width}x${dims.height}px. Keep the complete product visible, centered and large in frame (about 80-90% of the useful area) without cropping important product parts.`;

  if (mode === "3d_google_shopping" || mode === "3d_generate") {
    return `${preserveInstruction}\n${layoutInstruction}\n${context}\nCreate a photorealistic premium 3D-style product visualization using the input product as the strict visual reference. Background style: ${styleInstructions[backgroundStyle] || styleInstructions.luxury_showroom}. ${customPrompt}`.trim();
  }

  if (backgroundStyle === "shopping" || mode === "google_shopping" || mode === "standard") {
    return `${preserveInstruction}\n${layoutInstruction}\n${context}\nRemove only the existing background and replace it with a pure white #FFFFFF e-commerce background. Keep realistic contact/drop shadows. No text, watermark, logo, props or decorative objects. ${customPrompt}`.trim();
  }

  return `${preserveInstruction}\n${layoutInstruction}\n${context}\nReplace only the background with: ${styleInstructions[backgroundStyle] || styleInstructions.lifestyle}. Keep the product itself unchanged and photorealistic. No text or watermark. ${customPrompt}`.trim();
}


async function tryOpenAI(
  prompt: string,
  source: ImagePayload,
  format: ImageFormat,
): Promise<ProviderResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("[white-bg] OPENAI_API_KEY not configured; skipping OpenAI");
    return null;
  }

  try {
    const form = new FormData();
    const extension = source.mimeType.includes("png") ? "png" : source.mimeType.includes("webp") ? "webp" : "jpg";
    form.append("model", "gpt-image-1");
    form.append("image", new File([source.bytes], `product.${extension}`, { type: source.mimeType }));
    form.append("prompt", prompt.slice(0, 8000));
    form.append("size", formatDimensions[format].openAiSize);
    form.append("quality", "high");
    form.append("n", "1");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      console.warn(`[white-bg] OpenAI failed (${response.status}):`, (await response.text()).slice(0, 800));
      return null;
    }

    const data = await response.json();
    const first = data?.data?.[0];
    const imageUrl = first?.b64_json
      ? `data:image/png;base64,${first.b64_json}`
      : first?.url;
    if (!imageUrl) return null;

    return { imageUrl, model: "gpt-image-1", provider: "openai" };
  } catch (error) {
    console.warn("[white-bg] OpenAI exception", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) return jsonResponse(200, { ok: true, version: 4 });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, {
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_SERVER_CONFIGURATION_MISSING");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) {
      return jsonResponse(401, {
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or expired session",
      });
    }

    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrl) {
      return jsonResponse(400, {
        success: false,
        error: "IMAGE_URL_REQUIRED",
        message: "imageUrl is required",
      });
    }

    const format: ImageFormat = ["square", "portrait", "landscape"].includes(body.format)
      ? body.format
      : "square";
    const galleryImages = Array.isArray(body.galleryImages)
      ? body.galleryImages.filter((value: unknown) => typeof value === "string" && value && value !== imageUrl).slice(0, 4)
      : [];

    const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
    const { data: usage } = await admin
      .from("usage_tracking")
      .select("optimizations_count")
      .eq("seller_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_status, current_plan_id")
      .eq("id", user.id)
      .maybeSingle();

    let maxOptimizations = profile?.subscription_status === "trialing" ? 50 : 999999;
    if (profile?.current_plan_id) {
      const { data: plan } = await admin
        .from("subscription_plans")
        .select("max_optimizations_monthly, trial_max_optimizations")
        .eq("id", profile.current_plan_id)
        .maybeSingle();
      maxOptimizations = profile?.subscription_status === "trialing"
        ? (plan?.trial_max_optimizations ?? 50)
        : (plan?.max_optimizations_monthly ?? 999999);
    }

    const currentUsage = usage?.optimizations_count || 0;
    if (currentUsage + WHITE_BG_COST > maxOptimizations) {
      return jsonResponse(429, {
        success: false,
        error: "LIMIT_REACHED",
        message: "Optimization limit reached",
        usage: currentUsage,
        cost: WHITE_BG_COST,
        limit: maxOptimizations,
      });
    }

    const source = await fetchImagePayload(imageUrl);
    const providerSource = await prepareProviderSource(source);
    const prompt = buildPrompt(body, format);

    console.log("[white-bg] Starting provider fallback", {
      productTitle: body.productTitle,
      format,
      mode: body.mode,
      backgroundStyle: body.backgroundStyle,
      galleryCount: galleryImages.length,
      usage: `${currentUsage}/${maxOptimizations}`,
    });

    let result: ProviderResult | null = await generateCloudflareImage({
      prompt,
      imageBytes: providerSource.bytes,
      mimeType: providerSource.mimeType,
      width: formatDimensions[format].width,
      height: formatDimensions[format].height,
      strength: 0.28,
    });
    if (!result) result = await tryOpenAI(prompt, providerSource, format);

    if (!result) {
      return jsonResponse(200, {
        success: false,
        error: "ALL_PROVIDERS_FAILED",
        message: "AI image providers are temporarily unavailable. Please try again.",
        retryable: true,
      });
    }

    const generatedPayload = await fetchImagePayload(result.imageUrl);
    const dims = formatDimensions[format];
    const finalPayload = await enforceImageFormat(generatedPayload, dims.width, dims.height);
    const productId = typeof body.product_id === "string" && body.product_id ? body.product_id : "preview";
    const fileName = `product-white-${productId}-${Date.now()}.png`;

    const { error: uploadError } = await admin.storage
      .from("generated-images")
      .upload(fileName, finalPayload.bytes, {
        contentType: finalPayload.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[white-bg] Storage upload failed", uploadError);
      return jsonResponse(500, {
        success: false,
        error: "STORAGE_UPLOAD_FAILED",
        message: uploadError.message,
      });
    }

    const { data: publicUrlData } = admin.storage.from("generated-images").getPublicUrl(fileName);
    const finalImageUrl = publicUrlData.publicUrl;

    const { error: usageError } = await admin.rpc("increment_usage", {
      p_seller_id: user.id,
      p_field: "optimizations_count",
      p_increment: WHITE_BG_COST,
    });
    if (usageError) {
      console.warn("[white-bg] Generation succeeded but usage increment failed", usageError);
    }

    // Preview generation must not mutate the Shopify catalog. Sync happens only after the user clicks Apply.
    let shopifySync: unknown = null;
    if (body.autoSyncToShopify === true && body.product_id) {
      console.warn("[white-bg] autoSyncToShopify=true ignored in preview-safe v2; apply flow owns Shopify synchronization");
      shopifySync = { skipped: true, reason: "preview_safe_generation" };
    }

    return jsonResponse(200, {
      success: true,
      imageUrl: finalImageUrl,
      usedProvider: result.model,
      provider: result.provider,
      shopifySync,
      chargedOptimizations: WHITE_BG_COST,
      metadata: {
        productTitle: body.productTitle || null,
        format,
        width: dims.width,
        height: dims.height,
        backgroundStyle: body.backgroundStyle || "shopping",
        mode: body.mode || "google_shopping",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[white-bg] Unhandled error", error);
    return jsonResponse(500, {
      success: false,
      error: "WHITE_BACKGROUND_GENERATION_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
