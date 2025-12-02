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

    const { product, template } = body;
    
    if (!product) {
      throw new Error("Product is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("🎨 Generating creative for:", product.title);
    console.log("📐 Template:", template?.id);

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

    // Build rich prompt for stunning ad creative
    const imagePrompt = `Create a STUNNING ${aspectHint} professional advertising creative for social media.

PRODUCT TO FEATURE:
- Name: ${product.title}
${product.vendor ? `- Brand: ${product.vendor}` : ''}
${product.product_type ? `- Category: ${product.product_type}` : ''}
${product.description ? `- Description: ${product.description.substring(0, 200)}` : ''}

PRICING (display prominently):
${discount > 0 ? `- DISCOUNT: -${discount}% (make this VERY visible with a badge/burst)` : ''}
${salePrice > 0 ? `- Price: ${salePrice}€` : ''}
${discount > 0 && originalPrice > 0 ? `- Original: ${originalPrice}€ (crossed out)` : ''}

STYLE DIRECTION:
- Aesthetic: ${template?.style || "promotional, eye-catching"}
- Accent color: ${template?.accentColor || "#FFD700"}
- Mood: ${template?.category || "promo"}

CRITICAL COMPOSITION RULES:
1. The PRODUCT IMAGE must be the HERO - large, centered, dramatic lighting, drop shadow
2. Add depth: reflections, glow effects, floating particles, light rays
3. Background should be ${template?.category === 'neon' ? 'dark with glowing neon effects, cyberpunk grid lines, pink/cyan accents' : 
   template?.category === 'luxury' ? 'elegant dark or gold gradients, subtle shine, premium feel' :
   template?.category === 'minimal' ? 'clean, simple, soft shadows, lots of breathing room' :
   template?.category === 'bold' ? 'vibrant gradient colors, dynamic shapes, energetic' :
   template?.category === 'seasonal' ? 'seasonal themed elements matching the color palette' :
   'promotional energy with dynamic shapes and gradients'}
4. Add decorative elements: geometric shapes, light bursts, abstract patterns
5. Include a clear "SHOP NOW" call-to-action button
6. ${discount > 0 ? 'Make the DISCOUNT BADGE extremely visible - bright, bold, attention-grabbing' : 'Display the price prominently'}

IMPORTANT:
- DO NOT put the product name/title as text on the image (it goes in the caption)
- Focus on making the PRODUCT visually stunning and the PRICE/DISCOUNT eye-catching
- The final result should look like a paid ad from a major brand
- Professional quality, no watermarks`;

    let generatedImageBase64: string | null = null;

    // Generate with product image
    if (product.image) {
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
                { type: "image_url", image_url: { url: product.image } }
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

Style: ${template?.style || "promotional"}
Make it look like a professional social media ad with bold design, prominent pricing, and a "SHOP NOW" button.`;

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
