import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateLifestyleContext } from "../_shared/lifestyle-context.ts";
import { autoSyncImageToShopify } from "../_shared/auto-sync-to-shopify.ts";
import { generateCloudflareBackground, CLOUDFLARE_FREE_BACKGROUND_MODEL } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formats: Record<string, { width: number; height: number; ratio: string }> = {
  square: { width: 1024, height: 1024, ratio: "1:1" },
  portrait: { width: 768, height: 1024, ratio: "3:4" },
  landscape: { width: 1024, height: 768, ratio: "4:3" },
};

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid generated image data URL");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime: match[1] };
}

async function persistGeneratedImage(supabase: any, dataUrl: string, productId: string, imageId: string): Promise<string> {
  try {
    const { bytes, mime } = dataUrlToBytes(dataUrl);
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const path = `ai-backgrounds/${productId}/${imageId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data?.publicUrl || dataUrl;
  } catch (error) {
    console.warn("[ai-bg-gen] Could not persist generated image; returning data URL", error);
    return dataUrl;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({
      ok: true,
      provider: "cloudflare-workers-ai",
      model: CLOUDFLARE_FREE_BACKGROUND_MODEL,
      policy: "cloudflare-only",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const {
      imageUrl,
      productTitle,
      productDescription,
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
      productId,
      imageId,
      prompt,
      enrichedPrompt,
      style = "lifestyle",
      format = "square",
      targetType = "main",
      variantOptions,
      autoSyncToShopify = true,
    } = body;

    if (!imageUrl || !productTitle || !productId || !imageId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dims = formats[format] || formats.square;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Validate ownership whenever the caller is authenticated.
    if (userId) {
      const { data: product } = await supabase
        .from("shopify_products")
        .select("seller_id")
        .eq("id", productId)
        .maybeSingle();
      if (product?.seller_id && product.seller_id !== userId) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const lifestyle = generateLifestyleContext(productTitle || "");
    const productContext = [
      productTitle,
      seoTitle && seoTitle !== productTitle ? seoTitle : "",
      productDescription || seoDescription || "",
      variantOptions ? `Variant: ${variantOptions}` : "",
      visionAiData?.description ? `Visible product details: ${visionAiData.description}` : "",
      serpData?.dimensions ? `Dimensions: ${serpData.dimensions}` : "",
      serpData?.materials?.length ? `Materials: ${serpData.materials.slice(0, 4).join(", ")}` : "",
    ].filter(Boolean).join(". ").slice(0, 1800);

    const backgroundInstruction = enrichedPrompt || prompt || lifestyle;
    const finalPrompt = `
IMAGE EDITING TASK: replace ONLY the background/environment of the supplied ecommerce product image.

PRODUCT TO PRESERVE:
${productContext}

NEW BACKGROUND REQUEST:
${backgroundInstruction}

STYLE: ${style}
TARGET: ${targetType}
FORMAT: ${dims.width}x${dims.height} (${dims.ratio})
LIFESTYLE CONTEXT: ${lifestyle}

NON-NEGOTIABLE RULES:
- Keep the exact same product identity, shape, proportions, colors, materials and visible details.
- Do not invent a replacement product and do not duplicate the product.
- Change the background/environment only.
- Preserve natural product orientation; use a clean front or 3/4 ecommerce presentation.
- Product should remain the visual focus and occupy roughly 80-95% of the useful frame.
- Produce a realistic premium ecommerce photograph in full natural color.
- No text, watermark, logo, grayscale, monochrome or fake labels.
- Use realistic lighting, contact shadows and reflections so the product is naturally integrated.
`.trim();

    // Background policy: Cloudflare only. No Lovable/Gemini/OpenAI fallback.
    const generated = await generateCloudflareBackground({
      imageUrl,
      prompt: finalPrompt,
      width: dims.width,
      height: dims.height,
      strength: targetType === "main" ? 0.28 : 0.38,
      guidance: 9,
      numSteps: 20,
    });

    const persistedUrl = await persistGeneratedImage(supabase, generated.dataUrl, productId, imageId);

    if (userId) {
      try {
        await supabase.rpc("increment_usage", {
          p_seller_id: userId,
          p_field: "optimizations_count",
          p_increment: 8,
        });
      } catch (error) {
        console.warn("[ai-bg-gen] usage tracking failed", error);
      }

      try {
        const { data: versionData } = await supabase.rpc("get_next_image_version", { p_image_id: imageId });
        await supabase.from("product_image_history").update({ is_current: false }).eq("image_id", imageId);
        await supabase.from("product_image_history").insert({
          product_id: productId,
          image_id: imageId,
          user_id: userId,
          optimization_type: "ai_background",
          original_url: imageUrl,
          optimized_url: persistedUrl,
          version_number: versionData || 1,
          is_current: true,
          ai_model: `${generated.model} (Cloudflare Workers AI)`,
          ai_prompt: backgroundInstruction,
          metadata: { style, format, targetType, variantOptions, provider: generated.provider, policy: "cloudflare-only" },
        });
      } catch (error) {
        console.warn("[ai-bg-gen] history save failed", error);
      }
    }

    let shopifySyncResult = null;
    if (productId && userId && persistedUrl && !persistedUrl.startsWith("data:")) {
      shopifySyncResult = await autoSyncImageToShopify({
        productId,
        imageUrl: persistedUrl,
        imageId,
        altText: productTitle || "Product image - AI background",
        userId,
        autoSyncEnabled: autoSyncToShopify !== false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: persistedUrl,
        shopifySync: shopifySyncResult,
        provider: generated.provider,
        model: generated.model,
        policy: "cloudflare-only",
        metadata: { productTitle, style, format, targetType, variantOptions, width: dims.width, height: dims.height },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-ai-product-background] error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "GENERATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        provider: "cloudflare-workers-ai",
        policy: "cloudflare-only",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
