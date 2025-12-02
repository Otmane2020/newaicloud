import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { product, template, whiteBgImage, mode = "showcase" } = body;
    
    if (!product) {
      throw new Error("Product is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("🎨 Generating creative for:", product.title);
    console.log("📐 Template:", template?.id);
    console.log("🎯 AI Style:", template?.aiPromptStyle?.substring(0, 100));
    console.log("🎭 Mode:", mode);
    console.log("📊 Enrichment:", JSON.stringify(product.vision_attributes || {}).substring(0, 100));

    // Calculate discount
    const originalPrice = parseFloat(product.compare_at_price) || 0;
    const salePrice = parseFloat(product.price) || 0;
    const discount = originalPrice > salePrice && salePrice > 0
      ? Math.round((1 - salePrice / originalPrice) * 100)
      : 0;

    // Determine dimensions based on template size
    let aspectHint = "square 1:1 (1024x1024)";
    if (template?.size === "story") {
      aspectHint = "vertical 9:16 story format (576x1024)";
    } else if (template?.size === "landscape") {
      aspectHint = "horizontal 16:9 banner (1024x576)";
    }

    // Use the template's aiPromptStyle for realistic generation - THIS IS CRITICAL
    const visualStyle = template?.aiPromptStyle || "premium furniture ad, professional lighting, clean background";

    // Build enrichment details from vision_attributes
    const enrichmentDetails = product.vision_attributes ? `
PRODUCT CHARACTERISTICS (from AI vision analysis):
${product.vision_attributes.color ? `- Color: ${product.vision_attributes.color}` : ''}
${product.vision_attributes.material ? `- Material: ${product.vision_attributes.material}` : ''}
${product.vision_attributes.style ? `- Style: ${product.vision_attributes.style}` : ''}
${product.vision_attributes.shape ? `- Shape: ${product.vision_attributes.shape}` : ''}
${product.vision_attributes.features?.length ? `- Features: ${product.vision_attributes.features.join(', ')}` : ''}
` : '';

    // Build mode-specific prompt
    const modePrompt = mode === "strengths" ? `
CONTENT FOCUS: STRENGTHS & USP (Point fort mode)
- Highlight product key benefits and unique selling points
- Add subtle icon-style graphics for quality indicators
- Show premium quality cues (material textures, craftsmanship details)
- Include strength badges or quality seals
- Display trust indicators (warranty, quality certifications)
` : `
CONTENT FOCUS: SHOWCASE (Mise en valeur mode)
- Hero product presentation with dramatic lighting
- Luxury showroom atmosphere
- Spotlight effect on the product
- Premium lifestyle context
- Elegant, aspirational feeling
`;

    // Build rich prompt for stunning ad creative
    const imagePrompt = `Create a STUNNING ${aspectHint} professional advertising creative for social media.

VISUAL STYLE (FOLLOW THIS EXACTLY - THIS IS THE SELECTED TEMPLATE STYLE):
${visualStyle}

${modePrompt}

PRODUCT TO FEATURE (CENTER HERO):
- Name: ${product.title}
${product.vendor ? `- Brand: ${product.vendor}` : ''}
${product.product_type ? `- Category: ${product.product_type}` : ''}
${enrichmentDetails}

PRICING (display prominently with accent color ${template?.accentColor || "#FFD700"}):
${discount > 0 ? `- DISCOUNT: -${discount}% (make this VERY visible with a glowing badge/burst)` : ''}
${salePrice > 0 ? `- Price: ${salePrice}€ (large, bold)` : ''}
${discount > 0 && originalPrice > 0 ? `- Original: ${originalPrice}€ (crossed out, smaller)` : ''}

CRITICAL COMPOSITION RULES:
1. PRODUCT is the HERO - large, centered, with dramatic spotlight and floor reflection
2. Add realistic effects: glossy floor reflection, volumetric light beams, floating sparkle particles
3. Background must match the visual style "${visualStyle}" EXACTLY - this is what makes each template unique
4. Add decorative elements matching the template: ${template?.category === 'luxury' ? 'gold rays, premium sparkles' : 
   template?.category === 'promo' ? 'explosion rays, urgency elements' : 
   template?.category === 'neon' ? 'neon glows, cyberpunk elements' :
   template?.category === 'minimal' ? 'clean space, soft shadows' :
   'dynamic commercial elements'}
5. Include a premium "SHOP NOW" CTA button (gold gradient, rounded, at bottom)
6. ${discount > 0 ? 'DISCOUNT BADGE must GLOW and be extremely visible - top corner, bright accent color' : 'Price displayed prominently in accent color'}

IMPORTANT - DO NOT:
- DO NOT put product name/title text on the image (caption will have it)
- DO NOT use generic stock backgrounds
- DO NOT make it look amateur
- DO NOT ignore the template style "${template?.id || 'default'}" - each template MUST look different

IMPORTANT - DO:
- Make it look like a REAL paid ad from a luxury furniture brand
- Product must have realistic shadows and reflections
- Background must have depth matching "${visualStyle}"
- Professional 8K quality render`;

    let generatedImageBase64: string | null = null;
    
    // Use whiteBgImage if available, otherwise product.image
    const productImageUrl = whiteBgImage || product.image;

    // Generate with product image
    if (productImageUrl) {
      console.log("🖼️ Generating with product image:", productImageUrl.substring(0, 80));
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: imagePrompt },
                { type: "image_url", image_url: { url: productImageUrl } }
              ]
            }],
            modalities: ["image", "text"]
          })
        });

        if (!response.ok) {
          console.error("❌ AI error:", response.status);
          throw new Error(`AI error: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageUrl?.startsWith("data:image")) {
          generatedImageBase64 = imageUrl.split(",")[1];
          console.log("✅ Image generated successfully");
        }
      } catch (err) {
        console.error("⚠️ Generation failed:", err);
      }
    }

    // Fallback generation
    if (!generatedImageBase64) {
      console.log("🔄 Fallback generation...");
      
      const fallbackPrompt = `Create a stunning ${aspectHint} promotional banner:

Product: ${product.title}
${discount > 0 ? `Discount: -${discount}%` : ''}
${salePrice > 0 ? `Price: ${salePrice}€` : ''}
${product.vendor ? `Brand: ${product.vendor}` : ''}

Visual Style: ${visualStyle}

Make it look like a professional social media ad with:
- Dramatic lighting and reflections
- ${template?.category === 'showcase' ? 'Luxury gold rays and sparkles' : 
   template?.category === 'promo' ? 'Energetic explosion rays' : 
   'Premium clean design'}
- Bold pricing display
- "SHOP NOW" CTA button`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: fallbackPrompt }],
          modalities: ["image", "text"]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl?.startsWith("data:image")) {
          generatedImageBase64 = imageUrl.split(",")[1];
        }
      }
    }

    if (!generatedImageBase64) {
      throw new Error("Failed to generate image");
    }

    return new Response(
      JSON.stringify({ base64: generatedImageBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
