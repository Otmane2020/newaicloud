import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stylePrompts: Record<string, string> = {
  shopping: "Replace the background with a pure clean white #FFFFFF ecommerce studio background. Keep a subtle realistic contact shadow only.",
  luxury_showroom: "Replace the background with a refined luxury showroom, restrained premium lighting, elegant dark neutral materials, realistic floor contact and no visual clutter.",
  lifestyle: "Replace the background with a warm premium lifestyle interior using natural daylight and restrained neutral decor.",
  moderne: "Replace the background with a modern minimalist interior, clean architectural lines and neutral gray/off-white tones.",
  living_room: "Replace the background with a realistic contemporary living room, warm natural light and subtle furniture context.",
  studio: "Replace the background with a high-end neutral studio setting, visible clean surface, softbox lighting and realistic soft contact shadow.",
  nature: "Replace the background with a refined natural setting, soft daylight and restrained greenery while keeping the product dominant.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true, provider: "cloudflare-workers-ai", policy: "cloudflare-only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = body.productId || body.product_id || "background-only";
    const imageId = body.imageId || body.image_id || productId;
    const backgroundStyle = body.backgroundStyle || "shopping";
    const baseInstruction = stylePrompts[backgroundStyle] || stylePrompts.shopping;
    const prompt = [baseInstruction, body.customPrompt || ""].filter(Boolean).join(" ");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");

    const forwarded = {
      ...body,
      productId,
      imageId,
      productTitle: body.productTitle || "Ecommerce product",
      prompt,
      enrichedPrompt: prompt,
      targetType: body.imageType === "primary" ? "main" : "variant",
      style: backgroundStyle === "shopping" || backgroundStyle === "studio" ? "professional" : "lifestyle",
      format: body.format || "square",
      autoSyncToShopify: Boolean(body.imageId || body.image_id) && body.autoSyncToShopify !== false,
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-product-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
        "apikey": req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body: JSON.stringify(forwarded),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "X-Image-Provider": "cloudflare-workers-ai",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      provider: "cloudflare-workers-ai",
      policy: "cloudflare-only",
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
