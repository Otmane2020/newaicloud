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

    const { product, template, whiteBgImage, mode = "showcase", language = "fr" } = body;
    
    if (!product) {
      throw new Error("Product is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("🎨 Generating creative for:", product.title);
    console.log("📐 Style:", template?.id, template?.name);
    console.log("🎭 Mode:", mode);
    console.log("🌐 Language:", language);

    // Calculate discount
    const originalPrice = parseFloat(product.compare_at_price) || 0;
    const salePrice = parseFloat(product.price) || 0;
    const discount = originalPrice > salePrice && salePrice > 0
      ? Math.round((1 - salePrice / originalPrice) * 100)
      : 0;

    // Determine dimensions based on template size
    let aspectHint = "square 1:1 (1024x1024 pixels)";
    if (template?.size === "story") {
      aspectHint = "vertical 9:16 story format (576x1024 pixels)";
    } else if (template?.size === "landscape") {
      aspectHint = "horizontal 16:9 banner (1024x576 pixels)";
    }

    // Use the template's aiPromptStyle - THIS IS THE KEY to different visuals
    const visualStyle = template?.aiPromptStyle || `LUXURY SHOWROOM STYLE:
- Dark elegant showroom background with marble floor
- Dramatic spotlight from above creating volumetric light beams
- Golden rays and sparkle particles radiating from product
- Glossy floor with perfect mirror reflection of product
- Professional 8K render quality, photorealistic lighting`;

    // Build enrichment details from vision_attributes
    const enrichmentDetails = product.vision_attributes ? `
PRODUCT VISUAL CHARACTERISTICS (from AI analysis):
${product.vision_attributes.color ? `- Primary Color: ${product.vision_attributes.color}` : ''}
${product.vision_attributes.material ? `- Material: ${product.vision_attributes.material}` : ''}
${product.vision_attributes.style ? `- Design Style: ${product.vision_attributes.style}` : ''}
${product.vision_attributes.shape ? `- Shape: ${product.vision_attributes.shape}` : ''}
${product.vision_attributes.features?.length ? `- Key Features: ${product.vision_attributes.features.join(', ')}` : ''}
Use these characteristics to enhance the scene lighting and environment colors.
` : '';

    // Language-specific text
    const ctaText = language === "fr" ? "ACHETER MAINTENANT" : "SHOP NOW";
    const discountLabel = language === "fr" ? "OFFRE" : "SALE";

    // Build the master prompt for stunning social media creative
    const imagePrompt = `CREATE A STUNNING ${aspectHint} PROFESSIONAL SOCIAL MEDIA ADVERTISING CREATIVE.

=== CRITICAL: FOLLOW THIS EXACT VISUAL STYLE ===
${visualStyle}

=== PRODUCT TO FEATURE (HERO ELEMENT) ===
Product Name: ${product.title}
${product.vendor ? `Brand: ${product.vendor}` : ''}
${product.product_type ? `Category: ${product.product_type}` : ''}
${enrichmentDetails}

=== PRICING DISPLAY (use accent color: ${template?.accentColor || "#FFD700"}) ===
${discount > 0 ? `
🔥 DISCOUNT BADGE: -${discount}% 
- Create a GLOWING, ATTENTION-GRABBING badge in top corner
- Use accent color with glow effect
- Make it IMPOSSIBLE to miss
` : ''}
${salePrice > 0 ? `💰 PRICE: ${salePrice}€ - Display LARGE and BOLD with accent color` : ''}
${discount > 0 && originalPrice > 0 ? `❌ ORIGINAL: ${originalPrice}€ - Show crossed out, smaller` : ''}

=== MANDATORY COMPOSITION RULES ===
1. PRODUCT IS THE HERO - Large, centered, dominating the frame
2. REALISTIC EFFECTS:
   - Glossy/reflective floor with mirror reflection
   - Volumetric light beams from spotlight above
   - Floating particles (sparkles, dust, or style-specific elements)
   - Professional rim lighting on product edges
3. ENVIRONMENT matches "${template?.category || 'luxury'}" category:
   - ${template?.category === 'luxury' ? 'Dark elegant showroom, gold accents, marble textures' : 
      template?.category === 'lifestyle' ? 'Cozy interior setting, natural light, warm tones' : 
      template?.category === 'minimal' ? 'Clean infinite background, soft shadows, pure simplicity' :
      template?.category === 'neon' ? 'Cyberpunk atmosphere, neon glows, futuristic elements' :
      template?.category === 'seasonal' ? 'Thematic decorations matching the season/event' :
      template?.category === 'editorial' ? 'Magazine-quality interior photography' :
      'Dynamic energy, motion effects, action-packed composition'}
4. CTA BUTTON: "${ctaText}" - Premium button at bottom (gold/accent gradient, rounded, professional)
5. BRAND QUALITY: Must look like a paid ad from a LUXURY furniture brand (think EURODESIGN, Roche Bobois level)

=== DO NOT ===
❌ DO NOT use plain/boring backgrounds
❌ DO NOT make it look amateur or stock-photo-like
❌ DO NOT ignore the visual style instructions above
❌ DO NOT add too much text - let the image speak

=== QUALITY REQUIREMENTS ===
✅ 8K render quality, photorealistic
✅ Professional advertising photography level
✅ Ready for Facebook/Instagram feed
✅ Must inspire DESIRE to purchase`;

    let generatedImageBase64: string | null = null;
    
    // Use whiteBgImage if available, otherwise product.image
    const productImageUrl = whiteBgImage || product.image;

    // Generate with product image
    if (productImageUrl) {
      console.log("🖼️ Generating with product image...");
      
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
          const errorText = await response.text();
          console.error("❌ AI error:", response.status, errorText);
          throw new Error(`AI error: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageUrl?.startsWith("data:image")) {
          generatedImageBase64 = imageUrl.split(",")[1];
          console.log("✅ Stunning creative generated successfully!");
        }
      } catch (err) {
        console.error("⚠️ Primary generation failed:", err);
      }
    }

    // Fallback generation without product image
    if (!generatedImageBase64) {
      console.log("🔄 Fallback generation without product image...");
      
      const fallbackPrompt = `Create a stunning ${aspectHint} promotional social media ad.

Product: ${product.title}
${product.vendor ? `Brand: ${product.vendor}` : ''}
${discount > 0 ? `Discount: -${discount}%` : ''}
${salePrice > 0 ? `Price: ${salePrice}€` : ''}

Visual Style: ${visualStyle}

Requirements:
- Professional luxury advertising quality
- Dramatic lighting with reflections
- "${ctaText}" button at bottom
- ${template?.category === 'luxury' ? 'Gold accents, dark background, sparkles' : 
   template?.category === 'neon' ? 'Neon glows, cyberpunk style' : 
   'Premium clean design'}
- Ready for social media posting`;

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
          console.log("✅ Fallback creative generated");
        }
      }
    }

    if (!generatedImageBase64) {
      throw new Error("Failed to generate creative image");
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
