import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateLifestyleContext } from "../_shared/lifestyle-context.ts";
import { generateCloudflareBackground } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const variants = [
  { style: "cozy_lifestyle", description: "Cozy Lifestyle – Salon moderne", scene: "warm modern living room, natural textures, refined wood, neutral tones, soft daylight" },
  { style: "professional_studio", description: "Studio professionnel", scene: "premium ecommerce studio, clean white to light-gray background, soft controlled lighting" },
  { style: "luxurious_nature", description: "Nature luxueuse", scene: "luxurious natural interior, tasteful plants, wood textures, soft daylight, refined organic decor" },
  { style: "modern_minimalist", description: "Minimaliste moderne", scene: "modern minimalist interior, clean architectural lines, neutral palette, uncluttered setting" },
  { style: "urban_contemporary", description: "Urbain contemporain", scene: "contemporary urban interior, subtle concrete texture, large windows, premium modern architecture" },
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true, provider: "cloudflare-workers-ai", policy: "cloudflare-only" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      basePrompt = "",
      productTitle,
      productDescription,
      productImageUrl,
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
    } = body;

    if (!productTitle || !productImageUrl) {
      return new Response(JSON.stringify({ success: false, error: "productTitle and productImageUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lifestyle = generateLifestyleContext(productTitle);
    const productContext = [
      productTitle,
      seoTitle && seoTitle !== productTitle ? seoTitle : "",
      productDescription || seoDescription || "",
      visionAiData?.description ? `Visible details: ${visionAiData.description}` : "",
      serpData?.dimensions ? `Dimensions: ${serpData.dimensions}` : "",
      serpData?.materials?.length ? `Materials: ${serpData.materials.slice(0, 4).join(", ")}` : "",
    ].filter(Boolean).join(". ").slice(0, 1800);

    const jobs = variants.map(async (variant, index) => {
      const prompt = `
IMAGE EDITING ONLY. Preserve the exact ecommerce product from the supplied source image.
Product: ${productContext}
Scene: ${variant.scene}.
Lifestyle context: ${lifestyle}.
${basePrompt ? `Additional request: ${basePrompt}` : ""}

Rules:
- Replace the background/environment only.
- Preserve exact product identity, shape, proportions, colors, materials and visible details.
- Do not add, remove, duplicate or redesign product parts.
- Keep natural ecommerce orientation and realistic contact shadows.
- Premium photorealistic catalog result, full natural color, square 1024x1024.
- No text, watermark, logo, grayscale or fake labels.
`.trim();

      try {
        const result = await generateCloudflareBackground({
          imageUrl: productImageUrl,
          prompt,
          width: 1024,
          height: 1024,
          strength: variant.style === "professional_studio" ? 0.25 : 0.38,
          guidance: 9,
          numSteps: 20,
        });
        const base64 = result.dataUrl.split(",")[1] || "";
        return {
          variantId: crypto.randomUUID(),
          imageUrl: result.dataUrl,
          imageBase64: base64,
          prompt,
          style: variant.style,
          description: variant.description,
          qualityScore: 90,
          provider: result.provider,
          model: result.model,
          order: index + 1,
        };
      } catch (error) {
        console.error(`[generate-ai-background-variants] ${variant.style} failed`, error);
        return null;
      }
    });

    const results = await Promise.all(jobs);
    const successful = results.filter(Boolean);
    if (successful.length < 1) throw new Error("Cloudflare could not generate any background variant");

    return new Response(JSON.stringify({
      success: true,
      totalGenerated: successful.length,
      variants: successful,
      provider: "cloudflare-workers-ai",
      policy: "cloudflare-only",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
