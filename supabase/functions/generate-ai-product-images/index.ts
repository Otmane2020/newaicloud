import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareBackground } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  productId: string;
  productTitle: string;
  productType: string;
  sourceImageUrl: string;
  imageTypes: string[];
  includeDecor: boolean;
  decorType: "living_room" | "bedroom" | "office" | "dining_room";
  language: string;
  productDescription?: string;
  galleryImages?: string[];
  variantLabel?: string;
}

const labels: Record<string, { fr: string; en: string }> = {
  front: { fr: "Face", en: "Front" },
  angle45: { fr: "45°", en: "45°" },
  profile: { fr: "Profil", en: "Profile" },
  back: { fr: "Arrière", en: "Back" },
  top: { fr: "Dessus", en: "Top" },
  low_angle: { fr: "Contre-plongée", en: "Low angle" },
  zoom_fabric: { fr: "Zoom tissu", en: "Fabric zoom" },
  zoom_legs: { fr: "Zoom pieds", en: "Legs zoom" },
  zoom_detail: { fr: "Zoom détail", en: "Detail zoom" },
  decor: { fr: "En décor", en: "In decor" },
};

const viewInstructions: Record<string, string> = {
  front: "professional direct front-view ecommerce presentation on pure white background",
  angle45: "professional three-quarter 45-degree ecommerce presentation showing depth",
  profile: "professional side/profile ecommerce presentation",
  back: "professional rear-view ecommerce presentation only if the source image provides enough product evidence",
  top: "professional top-down presentation only if the source image provides enough product evidence",
  low_angle: "subtle professional low-angle ecommerce presentation",
  zoom_fabric: "tight macro crop emphasizing the real visible material/fabric texture",
  zoom_legs: "tight detail crop emphasizing the real visible legs/structure and finish",
  zoom_detail: "tight detail crop emphasizing a real visible product construction detail",
};

const decorInstructions: Record<string, string> = {
  living_room: "modern bright living room, light flooring, restrained decor, natural daylight",
  dining_room: "elegant warm dining room, refined table setting, natural daylight",
  bedroom: "calm modern bedroom, neutral tones, soft daylight, minimal decor",
  office: "modern professional office, natural light, restrained premium styling",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const {
      productId,
      productTitle,
      productType,
      sourceImageUrl,
      imageTypes = [],
      includeDecor = false,
      decorType = "living_room",
      language = "en",
      productDescription,
      variantLabel,
    } = body;

    if (!sourceImageUrl) {
      return new Response(JSON.stringify({ success: false, error: "Source image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "fr" ? "fr" : "en";
    const context = [
      productTitle,
      productType,
      variantLabel ? `Variant: ${variantLabel}` : "",
      productDescription ? productDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 700) : "",
    ].filter(Boolean).join(". ");

    const generatedImages: Array<{ url: string; type: string; label: string; provider: string; model: string }> = [];
    const sorted = [...imageTypes].sort((a, b) => (a === "profile" ? -1 : b === "profile" ? 1 : a === "front" ? -1 : b === "front" ? 1 : 0));

    for (const imageType of sorted) {
      const view = viewInstructions[imageType];
      if (!view) continue;

      const prompt = `
Edit the supplied ecommerce product image using image-to-image generation.
Product context: ${context}
Requested presentation: ${view}.

Rules:
- Preserve the same product identity, colors, materials, proportions and recognizable design.
- Never invent hidden product parts. If the requested angle is not reliably inferable, stay close to the source angle instead of hallucinating.
- Pure white #FFFFFF background for catalog views unless the request is a macro crop.
- Realistic soft contact shadow, professional studio lighting, sharp ecommerce detail.
- Square 1024x1024, no text, watermark or logo.
`.trim();

      try {
        const result = await generateCloudflareBackground({
          imageUrl: sourceImageUrl,
          prompt,
          width: 1024,
          height: 1024,
          strength: imageType.startsWith("zoom_") ? 0.28 : 0.34,
          guidance: 9,
          numSteps: 20,
        });
        generatedImages.push({
          url: result.dataUrl,
          type: imageType,
          label: labels[imageType]?.[lang] || imageType,
          provider: result.provider,
          model: result.model,
        });
      } catch (error) {
        console.error(`[generate-ai-product-images] ${imageType} failed`, error);
      }
    }

    if (includeDecor) {
      const decor = decorInstructions[decorType] || decorInstructions.living_room;
      const prompt = `
Edit the supplied ecommerce image. Preserve the exact same product identity, shape, proportions, colors, materials and visible details.
Product context: ${context}
Replace ONLY the environment with: ${decor}.
Use realistic contact shadows and lighting. Premium photorealistic catalog quality. Landscape 1024x768. No text, watermark or logo.
`.trim();
      try {
        const result = await generateCloudflareBackground({
          imageUrl: sourceImageUrl,
          prompt,
          width: 1024,
          height: 768,
          strength: 0.38,
          guidance: 9,
          numSteps: 20,
        });
        generatedImages.push({
          url: result.dataUrl,
          type: "decor",
          label: labels.decor[lang],
          provider: result.provider,
          model: result.model,
        });
      } catch (error) {
        console.error("[generate-ai-product-images] decor failed", error);
      }
    }

    return new Response(JSON.stringify({
      success: generatedImages.length > 0,
      images: generatedImages,
      metadata: {
        productId,
        productTitle,
        totalGenerated: generatedImages.length,
        requestedTypes: imageTypes,
        includeDecor,
        decorType,
        provider: "cloudflare-workers-ai",
        policy: "free-only",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
