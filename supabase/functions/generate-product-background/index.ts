import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const { 
      imageUrl, 
      productTitle, 
      product_id, 
      style = "contextual", 
      imageType = "primary",
      format = "square",
      // SERP/Vision enrichment data
      serpData,
      visionAiData,
      productDescription,
      seoTitle,
      seoDescription
    } = body;

    if (!imageUrl || !productTitle) {
      return new Response(JSON.stringify({ error: "imageUrl and productTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎨 Generating beautiful contextual background for:", productTitle, "imageType:", imageType, "format:", format);

    // Initialize Supabase client for usage tracking
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader! } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // 🆕 Build enriched context from SERP and Vision data
    let enrichedContext = productTitle;
    
    if (seoTitle && seoTitle !== productTitle) {
      enrichedContext += `. ${seoTitle}`;
    }
    
    if (productDescription) {
      enrichedContext += `. ${productDescription.slice(0, 150)}`;
    } else if (seoDescription) {
      enrichedContext += `. ${seoDescription.slice(0, 150)}`;
    }
    
    // Add SERP data if available
    if (serpData) {
      if (serpData.dimensions) {
        enrichedContext += `. Dimensions: ${serpData.dimensions}`;
      }
      if (serpData.materials?.length > 0) {
        enrichedContext += `. Materials: ${serpData.materials.slice(0, 3).join(", ")}`;
      }
      if (serpData.dominantStyles?.length > 0) {
        enrichedContext += `. Styles: ${serpData.dominantStyles.slice(0, 2).join(", ")}`;
      }
      console.log(`[product-bg] 🔍 SERP data enrichment applied`);
    }
    
    // Add Vision AI data if available
    if (visionAiData?.description) {
      enrichedContext += `. Visual: ${visionAiData.description.slice(0, 100)}`;
      console.log(`[product-bg] 👁️ Vision AI data enrichment applied`);
    }

    console.log(`[product-bg] 📝 Enriched context: ${enrichedContext.slice(0, 200)}...`);

    // 🆕 Format dimensions mapping
    const formatDimensions: Record<string, { width: number; height: number; ratio: string }> = {
      "square": { width: 1024, height: 1024, ratio: "1:1" },
      "portrait": { width: 768, height: 1024, ratio: "3:4" },
      "landscape": { width: 1024, height: 768, ratio: "4:3" },
    };
    const targetDims = formatDimensions[format] || formatDimensions["square"];
    console.log(`[product-bg] 🎯 Target format: ${format} -> ${targetDims.width}x${targetDims.height}`);

    // 🆕 Visual Enhancement Instructions for Professional E-Commerce Quality
    const visualEnhancementInstructions = `
🎨 VISUAL QUALITY ENHANCEMENT - PROFESSIONAL E-COMMERCE PHOTOGRAPHY

FABRIC & TEXTURE OPTIMIZATION:
- Enhance fabric textures to appear rich, luxurious, and tactile
- Show natural fabric drape, folds, and depth
- Highlight weave patterns, stitching quality, and material authenticity
- Make velvet appear velvety, leather appear supple, linen appear crisp
- Capture the "hand feel" of materials visually

LIGHTING FOR SALES APPEAL:
- Use professional studio lighting with main key light + fill light
- Add subtle rim lighting to separate product from background
- Create soft, flattering shadows that add depth without harsh contrast
- Ensure colors appear vibrant, accurate, and true to material

EYE-CATCHING COMMERCIAL QUALITY:
- Create "hero shot" quality - the image should make viewers WANT to buy
- Professional color grading that enhances product appeal
- Sharp focus on product details, slightly soft background if lifestyle
- Clean, premium look suitable for high-end e-commerce
- Think: IKEA catalog, West Elm, Roche Bobois photography quality

TEXTURE DETAIL ENHANCEMENT:
- Zoom-worthy detail on material textures
- Visible grain on wood, weave on fabric, sheen on leather
- Natural material variations that prove authenticity
- No plasticky or artificial-looking surfaces
`;

    // Create contextual prompt based on product title and image type
    const isMainImage = imageType === "primary";
    const contextualPrompt = `
🚨🚨🚨 CRITICAL FORMAT REQUIREMENT 🚨🚨🚨

📐 OUTPUT MUST BE EXACTLY ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio} ratio)
📐 CREATE a ${targetDims.width}x${targetDims.height} canvas FIRST, then place content
${format === "square" ? "🟦 PERFECT SQUARE: Width = Height = 1024 pixels" : ""}
${format === "portrait" ? "📱 VERTICAL: Height (1024) > Width (768)" : ""}
${format === "landscape" ? "🖼️ HORIZONTAL: Width (1024) > Height (768)" : ""}

⚠️ PRODUCT MUST FILL 85-95% OF CANVAS - NO WHITE PADDING ⚠️
Scale the product UP to TOUCH or NEARLY TOUCH the edges of the frame.

You are a professional e-commerce product photographer with expertise in creating stunning product images.

PRODUCT: ${enrichedContext}
IMAGE TYPE: ${isMainImage ? "MAIN PRODUCT IMAGE" : "SECONDARY/LIFESTYLE IMAGE"}

${visualEnhancementInstructions}

YOUR MISSION:
Create a beautiful, high-quality product photo with a contextual background that complements and enhances the product.

REQUIREMENTS:
${
  isMainImage
    ? `
1. MAIN IMAGE REQUIREMENTS (CRITICAL):
   - Product MUST be perfectly centered and sharp
   - Product occupies 85-95% of the frame (FILL THE CANVAS)
   - Product should face the camera directly
   - All product details must be clearly visible
   - Preserve all product details, textures, and colors
   - Natural product shadows for depth
   - Clean, professional look suitable for main product listing
   - NO white padding around the product
`
    : `
1. LIFESTYLE/AMBIANCE IMAGE:
   - Creative composition (centering not mandatory)
   - Product can be positioned artistically
   - More creative freedom with framing and angles
   - Contextual, lifestyle setting
   - Preserve product details but focus on atmosphere
   - Product still fills 80-90% of the canvas
`
}

2. LIGHTING & ATMOSPHERE (CRITICAL FOR SALES):
   - **NATURAL DAYLIGHT** - bright, well-lit scene with abundant natural light
   - Warm, inviting atmosphere with soft shadows
   - **Golden hour quality** - warm, flattering light that enhances the product
   - Professional photography lighting setup
   - Bright and cheerful ambiance that attracts buyers
   - NO dark, gloomy, or evening lighting

3. BACKGROUND STYLE - ELEGANT & TRENDY (NEVER WHITE):
   - Create a beautiful, elegant, and trendy background that relates to "${enrichedContext}"
   - Use sophisticated color palettes (jewel tones, earth tones, warm pastels)
   - Add depth with subtle bokeh, gradient effects, or premium textures
   - Background should enhance product luxury and appeal
   - Think high-end editorial photography style for luxury e-commerce
   - NEVER use plain white background

4. TECHNICAL SPECS:
   - OUTPUT: EXACTLY ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio})
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos
   - Ready for ${isMainImage ? "main product listing (Shopify/Amazon)" : "lifestyle/gallery display"}

FINAL CHECK:
- Is output EXACTLY ${targetDims.width}x${targetDims.height}? ✓
- Does product fill 85-95% of frame? ✓
- Is there NO white padding around product? ✓

RESULT: A stunning, professional ${isMainImage ? "main product photo with centered, clear product" : "lifestyle/ambiance photo"} that looks like it was shot by a top e-commerce photographer.
    `.trim();

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: contextualPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
        generationConfig: {
          aspectRatio: "1:1",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Lovable AI error:", response.status, errorText);

      // Handle rate limiting
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please try again in a few moments.",
            rateLimited: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Lovable AI response received");

    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error("⚠️ No image returned:", JSON.stringify(data, null, 2));
      throw new Error("No image generated - unexpected response format");
    }

    console.log("🎨 Beautiful background generated successfully");

    // Track usage: fond blanc = 3 optimizations, arrière-plan IA = 5 optimizations
    if (user) {
      try {
        const optimizationCost = style === "white" ? 3 : 5;
        await supabaseClient.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: optimizationCost,
        });
        console.log(`✅ Usage tracked: ${optimizationCost} optimizations (${style})`);
      } catch (trackError) {
        console.error("⚠️ Failed to track usage:", trackError);
      }
    }

    // ✅ Convert base64 to public URL (same as collections)
    let finalImageUrl = generatedImageUrl;
    
    if (product_id && generatedImageUrl.startsWith('data:')) {
      console.log('🔄 Converting base64 to public URL...');
      
      try {
        // Extract base64 data
        const base64Match = generatedImageUrl.match(/data:image\/[^;]+;base64,(.+)/);
        const base64Data = base64Match ? base64Match[1] : generatedImageUrl;
        const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        
        // Upload to Supabase Storage
        const fileName = `product-bg-${product_id}-${Date.now()}.png`;
        const { error: uploadError } = await supabaseClient.storage
          .from('generated-images')
          .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true });
        
        if (uploadError) {
          console.error('⚠️ Storage upload failed:', uploadError);
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabaseClient.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          
          finalImageUrl = publicUrl;
          console.log('✅ Image uploaded to storage:', publicUrl);
        }
      } catch (uploadErr) {
        console.error('⚠️ Failed to convert base64 to public URL:', uploadErr);
        // Continue with base64 if upload fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        metadata: {
          productTitle,
          style,
          imageType,
          model: "google/gemini-2.5-flash-image-preview",
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("💥 Error in generate-product-background:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Try with a higher-quality product photo or check your Lovable AI credits.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
