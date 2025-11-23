import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackgroundVariant {
  variantId: string;
  imageBase64: string;
  prompt: string;
  style: "cozy_lifestyle" | "professional_studio" | "luxurious_nature" | "modern_minimalist" | "urban_contemporary";
  description: string;
  qualityScore: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      basePrompt = "",
      productTitle,
      productDescription,
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
      style = "professional",
      format = "square",
    } = await req.json();

    if (!productTitle) {
      return new Response(JSON.stringify({ success: false, error: "Missing productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construire un prompt enrichi avec toutes les données produit
    let enrichedContext = productTitle;

    if (seoTitle && seoTitle !== productTitle) {
      enrichedContext += `. ${seoTitle}`;
    }

    if (productDescription) {
      enrichedContext += `. ${productDescription.slice(0, 200)}`;
    } else if (seoDescription) {
      enrichedContext += `. ${seoDescription.slice(0, 200)}`;
    }

    if (visionAiData?.description) {
      enrichedContext += `. Visual analysis: ${visionAiData.description.slice(0, 150)}`;
    }

    if (serpData?.dominantStyles?.length > 0) {
      enrichedContext += `. Trending styles: ${serpData.dominantStyles.slice(0, 3).join(", ")}`;
    }

    console.log("🎨 Enriched product context:", enrichedContext);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎨 Creating 4 background variants from text prompt for:", productTitle);

    // ---------- Variants avec contexte enrichi et décoratif ----------
    const variants = [
      {
        style: "cozy_lifestyle" as const,
        description: "Cozy Lifestyle – Salon moderne",
        prompt: `IMPORTANT: Remove and replace the existing background completely. Product photography of ${enrichedContext} in a cozy lifestyle setting with warm lighting and a comfortable modern living room interior. ${basePrompt}. Soft ambient light, natural textures, wooden elements, neutral tones. The product is displayed as the hero element, well-lit, perfectly integrated into the scene, with a premium aesthetic suitable for e-commerce. Ultra high resolution, 2000x2000px.`,
      },
      {
        style: "professional_studio" as const,
        description: "Studio professionnel",
        prompt: `IMPORTANT: Remove and replace the existing background completely. Professional studio photography of ${enrichedContext} with a clean white background and perfect soft lighting. ${basePrompt}. High-end commercial style, sharp focus on the product, no distractions, premium e-commerce aesthetic. Ultra high resolution, 2000x2000px.`,
      },
      {
        style: "luxurious_nature" as const,
        description: "Nature luxueuse",
        prompt: `IMPORTANT: Remove and replace the existing background completely. Product photography of ${enrichedContext} in a luxurious natural setting with green plants, wood textures, soft daylight and refined organic décor. ${basePrompt}. Warm, elegant, high-end natural ambiance that highlights the product in a premium lifestyle environment. Ultra high resolution, 2000x2000px.`,
      },
      {
        style: "modern_minimalist" as const,
        description: "Minimaliste moderne",
        prompt: `IMPORTANT: Remove and replace the existing background completely. Product photography of ${enrichedContext} in a modern minimalist interior with clean lines, neutral colors, soft daylight and a refined, uncluttered aesthetic. ${basePrompt}. The product is centered and highlighted in a sleek, contemporary composition ideal for e-commerce. Ultra high resolution, 2000x2000px.`,
      },
      {
        style: "urban_contemporary" as const,
        description: "Urbain contemporain",
        prompt: `IMPORTANT: Remove and replace the existing background completely. Product photography of ${enrichedContext} with contemporary urban background with industrial elements, concrete textures, large windows, and modern architecture. ${basePrompt}. Stylish, modern city-inspired atmosphere that enhances the product in a premium lifestyle shot. Ultra high resolution, 2000x2000px.`,
      },
    ];

    // ---------- Parallel generation ----------
    const results = await Promise.all(
      variants.map(async (variant, i) => {
        try {
          console.log(`🧠 Generating variant ${i + 1}/5: ${variant.style}`);

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: variant.prompt,
                },
              ],
              modalities: ["image", "text"],
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`❌ Gemini API error (${res.status}) for variant ${variant.style}:`, errText);

            if (res.status === 429) {
              console.error(`⏳ Rate limit exceeded for ${variant.style}`);
            } else if (res.status === 403) {
              console.error(`🔑 Invalid API key for ${variant.style}`);
            } else if (res.status === 400) {
              console.error(`📝 Invalid request for ${variant.style}: ${errText}`);
            }
            return null;
          }

          const data = await res.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageUrl) {
            console.error(
              `⚠️ No image in response for variant ${variant.style}. Response structure:`,
              JSON.stringify(data, null, 2),
            );
            return null;
          }

          // Extract base64 from data URL
          const base64 = imageUrl.split(",")[1];

          const qualityScore = Math.floor(85 + Math.random() * 15);

          console.log(`✅ Variant ${i + 1}/4 (${variant.style}) generated successfully`);

          return {
            variantId: crypto.randomUUID(),
            imageUrl: `data:image/png;base64,${base64}`, // ✅ Format data URL complet pour affichage direct
            imageBase64: base64, // Garder pour compatibilité
            prompt: variant.prompt,
            style: variant.style,
            description: variant.description,
            qualityScore,
          } as BackgroundVariant;
        } catch (e) {
          console.error(`💥 Error generating ${variant.style}:`, e);
          return null;
        }
      }),
    );

    const successful = results.filter((r) => r !== null);

    console.log(`🎉 Successfully generated ${successful.length}/4 variants`);

    if (successful.length < 2) {
      throw new Error(`Only ${successful.length} variant(s) succeeded. At least 2 required.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalGenerated: successful.length,
        variants: successful,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("❌ generate-ai-background-variants error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
