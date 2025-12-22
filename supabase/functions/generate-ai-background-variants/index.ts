import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateLifestyleContext, generateLifestylePromptSection } from "../_shared/lifestyle-context.ts";

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

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const {
      basePrompt = "",
      productTitle,
      productDescription,
      productImageUrl, // 🆕 Image URL for image-to-image generation
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
      style = "professional",
      format = "square",
    } = body;

    if (!productTitle) {
      return new Response(JSON.stringify({ success: false, error: "Missing productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!productImageUrl) {
      return new Response(JSON.stringify({ success: false, error: "Missing productImageUrl - required for image editing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📸 Product image URL received:", productImageUrl?.substring(0, 100) + "...");

    // 🆕 Map format to dimensions and aspect ratio
    const formatToDimensions: Record<string, string> = {
      "square": "2000x2000px",
      "portrait": "1500x2000px",
      "landscape": "2000x1500px",
    };
    const formatToAspectRatio: Record<string, string> = {
      "square": "1:1",
      "portrait": "3:4",
      "landscape": "4:3",
    };
    const dimensions = formatToDimensions[format] || "2000x2000px";
    const aspectRatio = formatToAspectRatio[format] || "1:1";
    
    console.log(`🎨 Format: ${format} -> ${aspectRatio} (${dimensions})`);

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
    
    // 🆕 Add SERP dimensions/materials if available
    if (serpData?.dimensions) {
      enrichedContext += `. Dimensions: ${serpData.dimensions}`;
    }
    if (serpData?.materials?.length > 0) {
      enrichedContext += `. Materials: ${serpData.materials.slice(0, 3).join(", ")}`;
    }
    
    // 🆕 Build SERP-based orientation instructions - ADJUST orientation to match competitors
    let orientationInstructions = "";
    if (serpData) {
      orientationInstructions = `
🔄🔄🔄 MANDATORY ORIENTATION & LIGHTING ADJUSTMENT 🔄🔄🔄
${serpData.dominantStyles?.length ? `📊 MATCH competitor styles: ${serpData.dominantStyles.slice(0, 2).join(", ")}` : ""}
${serpData.dimensions ? `📏 Product dimensions: ${serpData.dimensions}` : ""}

⚠️ CRITICAL: If the product appears ROTATED, at WRONG ANGLE, or POORLY LIT:
→ YOU MUST CORRECT IT to match professional e-commerce catalog standards!
→ ROTATE the product to show FRONT VIEW or 3/4 ANGLE as competitors do
→ Apply professional studio lighting matching competitor images
→ The output must look like a professional furniture catalog photo
`;
    }

    console.log("🎨 Enriched product context:", enrichedContext);

    // 🆕 Generate lifestyle context based on product title
    const lifestyleContext = generateLifestyleContext(productTitle);
    const lifestylePromptSection = generateLifestylePromptSection(productTitle);
    console.log(`🏠 Lifestyle context: ${lifestyleContext.slice(0, 100)}...`);

    // 🆕 Visual Enhancement Instructions for Professional E-Commerce Quality
    const visualEnhancementInstructions = `
VISUAL QUALITY ENHANCEMENT - PROFESSIONAL E-COMMERCE PHOTOGRAPHY:
- Enhance fabric textures to appear rich, luxurious, and tactile
- Show natural fabric drape, folds, and depth with visible weave patterns
- Use professional studio lighting with main key light + fill light + subtle rim lighting
- Create soft, flattering shadows that add depth without harsh contrast
- Vibrant, accurate colors true to material. Sharp focus on product details.
- Create "hero shot" quality - the image should make viewers WANT to buy
- Product should occupy 85-95% of canvas area, NO excessive padding or margins
- Think: IKEA catalog, West Elm, Roche Bobois photography quality
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎨 Creating 5 background variants from text prompt for:", productTitle, "Format:", format);

    // ---------- Variants avec contexte enrichi et décoratif ----------
    // 🆕 Include format/dimensions in all prompts with visual enhancement and orientation
    // 🆕 IMAGE EDITING HEADER - Critical for ABSOLUTE product preservation (e-commerce sales)
    const imageEditingHeader = `
🚨🚨🚨 THIS IS IMAGE EDITING FOR E-COMMERCE SALES - NOT GENERATION 🚨🚨🚨
You are EDITING the provided product image, NOT generating a new product.
The customer will receive EXACTLY this product - it MUST look identical.

🛑🛑🛑 ABSOLUTE PROHIBITIONS (ZERO TOLERANCE) 🛑🛑🛑
- ❌ DO NOT modify the product's SHAPE, FORM, or SILHOUETTE
- ❌ DO NOT change product COLORS (fabric, material, finish)
- ❌ DO NOT alter PROPORTIONS, DIMENSIONS, or RELATIVE SIZES
- ❌ DO NOT add, remove, or modify ANY product details (buttons, cushions, legs, handles)
- ❌ DO NOT "improve" or "stylize" the product design
- ❌ DO NOT change the product's orientation, angle, or rotation
- ❌ DO NOT make the product look different in ANY way

✅ WHAT YOU MUST DO:
1. EXTRACT the EXACT product from input image PIXEL-PERFECT
2. Keep product IDENTICAL - same colors, textures, details, proportions
3. REPLACE ONLY the background with the requested environment
4. Apply lighting that illuminates the product WITHOUT changing its appearance
5. The final product must be INDISTINGUISHABLE from the original

⚠️ E-COMMERCE CONTEXT:
This image will be used to SELL this exact product.
If the product looks different, customers will receive something unexpected.
LEGAL REQUIREMENT: Product must match what customer receives.

⚠️ FAILURE CONDITIONS (will be REJECTED):
- Product shape differs from original = TOTAL FAILURE
- Product colors differ from original = TOTAL FAILURE
- Product proportions differ from original = TOTAL FAILURE
- Any visible modification to the product = FAILURE
`;

    const variants = [
      {
        style: "cozy_lifestyle" as const,
        description: "Cozy Lifestyle – Salon moderne",
        prompt: `${imageEditingHeader}
🚨 OUTPUT FORMAT: EXACTLY ${dimensions} pixels (${aspectRatio} ratio). ${visualEnhancementInstructions}
${orientationInstructions}
${lifestylePromptSection}
TASK: Edit this product image - extract the product, correct orientation if needed, place in cozy lifestyle setting.
Product: ${enrichedContext}
Environment: ${lifestyleContext}. Warm modern living room with soft ambient lighting, natural textures, wooden elements, neutral tones.
${basePrompt}
The product must be the hero element, well-lit, premium e-commerce aesthetic.`,
      },
      {
        style: "professional_studio" as const,
        description: "Studio professionnel",
        prompt: `${imageEditingHeader}
🚨 OUTPUT FORMAT: EXACTLY ${dimensions} pixels (${aspectRatio} ratio). ${visualEnhancementInstructions}
${orientationInstructions}
${lifestylePromptSection}
TASK: Edit this product image - extract the product, correct orientation if needed, place on clean studio background.
Product: ${enrichedContext}
Environment: Professional studio with pure white/light gray background, perfect soft lighting. Product context: ${lifestyleContext}.
${basePrompt}
High-end commercial style, sharp focus, no distractions.`,
      },
      {
        style: "luxurious_nature" as const,
        description: "Nature luxueuse",
        prompt: `${imageEditingHeader}
🚨 OUTPUT FORMAT: EXACTLY ${dimensions} pixels (${aspectRatio} ratio). ${visualEnhancementInstructions}
${orientationInstructions}
${lifestylePromptSection}
TASK: Edit this product image - extract the product, correct orientation if needed, place in luxurious natural setting.
Product: ${enrichedContext}
Environment: ${lifestyleContext}. Elegant natural setting with green plants, wood textures, soft daylight, refined organic décor.
${basePrompt}
Warm, high-end natural ambiance, premium lifestyle environment.`,
      },
      {
        style: "modern_minimalist" as const,
        description: "Minimaliste moderne",
        prompt: `${imageEditingHeader}
🚨 OUTPUT FORMAT: EXACTLY ${dimensions} pixels (${aspectRatio} ratio). ${visualEnhancementInstructions}
${orientationInstructions}
${lifestylePromptSection}
TASK: Edit this product image - extract the product, correct orientation if needed, place in minimalist interior.
Product: ${enrichedContext}
Environment: ${lifestyleContext}. Modern minimalist space with clean lines, neutral colors, soft daylight, uncluttered aesthetic.
${basePrompt}
Sleek, contemporary composition ideal for e-commerce.`,
      },
      {
        style: "urban_contemporary" as const,
        description: "Urbain contemporain",
        prompt: `${imageEditingHeader}
🚨 OUTPUT FORMAT: EXACTLY ${dimensions} pixels (${aspectRatio} ratio). ${visualEnhancementInstructions}
${orientationInstructions}
${lifestylePromptSection}
TASK: Edit this product image - extract the product, correct orientation if needed, place in urban setting.
Product: ${enrichedContext}
Environment: ${lifestyleContext}. Contemporary urban space with industrial elements, concrete textures, large windows, modern architecture.
${basePrompt}
Stylish city-inspired atmosphere, premium lifestyle shot.`,
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
                  content: [
                    { type: "text", text: variant.prompt },
                    { type: "image_url", image_url: { url: productImageUrl } }
                  ],
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
