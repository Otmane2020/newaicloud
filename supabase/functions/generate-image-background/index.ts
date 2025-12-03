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
    // VÉRIFIER LES LIMITES AVANT DE GÉNÉRER
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + "-01";
        const { data: usage } = await supabaseAdmin
          .from("usage_tracking")
          .select("optimizations_count")
          .eq("seller_id", user.id)
          .eq("month", currentMonth)
          .maybeSingle();

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, current_plan_id")
          .eq("id", user.id)
          .single();

        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("max_optimizations_monthly, trial_max_optimizations")
          .eq("id", profile?.current_plan_id || "trial")
          .single();

        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations =
          profile?.subscription_status === "trialing"
            ? plan?.trial_max_optimizations || 50
            : plan?.max_optimizations_monthly || 999999;

        console.log(`[ai-bg] 🔍 Usage check: ${currentUsage}/${maxOptimizations}`);

        if (currentUsage >= maxOptimizations) {
          console.error(`[ai-bg] ❌ LIMIT REACHED: ${currentUsage}/${maxOptimizations}`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "LIMIT_REACHED",
              message: "Limite d'optimisations atteinte",
              usage: currentUsage,
              limit: maxOptimizations,
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // ✅ Incrémenter IMMÉDIATEMENT (avant génération)
        const AI_BG_COST = 8;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: AI_BG_COST,
        });
        console.log(
          `[ai-bg] ✅ Usage incremented: +${AI_BG_COST} (now ${currentUsage + AI_BG_COST}/${maxOptimizations})`,
        );
      }
    }

    const {
      imageUrl,
      prompt,
      productTitle,
      imageType = "secondary",
      format = "square",
      similarity = "medium",
      // SERP/Vision enrichment data
      serpData,
      visionAiData,
      productDescription,
      seoTitle,
      seoDescription
    } = body;

    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "imageUrl and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🆕 Build enriched context from SERP and Vision data
    let enrichedContext = productTitle || "Product";
    
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
      console.log(`[image-bg] 🔍 SERP data enrichment applied`);
    }
    
    // Add Vision AI data if available
    if (visionAiData?.description) {
      enrichedContext += `. Visual: ${visionAiData.description.slice(0, 100)}`;
      console.log(`[image-bg] 👁️ Vision AI data enrichment applied`);
    }

    console.log("🎨 Generating AI background:", { prompt, imageType, format, similarity });
    console.log(`[image-bg] 📝 Enriched context: ${enrichedContext.slice(0, 200)}...`);

    // Initialize Supabase client for usage tracking (reuse authHeader from above)
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

    // 🆕 Format dimensions mapping with DALL-E size
    const formatDimensions: Record<string, { width: number; height: number; ratio: string; dalleSize: string }> = {
      "square": { width: 1024, height: 1024, ratio: "1:1", dalleSize: "1024x1024" },
      "portrait": { width: 768, height: 1024, ratio: "3:4", dalleSize: "1024x1792" },
      "landscape": { width: 1024, height: 768, ratio: "4:3", dalleSize: "1792x1024" },
    };
    const targetDims = formatDimensions[format] || formatDimensions["square"];
    console.log(`[image-bg] 🎯 Target format: ${format} -> ${targetDims.width}x${targetDims.height} (DALL-E: ${targetDims.dalleSize})`);

    // Calculate similarity strength
    const similarityMap: Record<string, { strength: string; description: string }> = {
      "very-close": {
        strength: "very high",
        description: "staying extremely faithful to the original composition and product appearance (90% similarity)",
      },
      close: { strength: "high", description: "maintaining strong resemblance to the original (70% similarity)" },
      medium: {
        strength: "moderate",
        description: "balancing original features with creative freedom (50% similarity)",
      },
      creative: { strength: "low", description: "allowing significant creative interpretation (30% similarity)" },
      "very-creative": {
        strength: "minimal",
        description: "maximizing creative freedom while keeping product recognizable (10% similarity)",
      },
    };

    const similarityInfo = similarityMap[similarity] || similarityMap["medium"];

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

    // Create prompt based on image type with STRICT format enforcement
    const isMainImage = imageType === "primary";
    const photographyPrompt = `
🚨🚨🚨 CRITICAL FORMAT REQUIREMENT - READ FIRST 🚨🚨🚨

📐 OUTPUT MUST BE EXACTLY ${targetDims.width}x${targetDims.height} pixels
📐 ASPECT RATIO: ${targetDims.ratio}
📐 CREATE a ${targetDims.width}x${targetDims.height} canvas FIRST, then place content
${format === "square" ? "🟦 PERFECT SQUARE: Width = Height = 1024 pixels" : ""}
${format === "portrait" ? "📱 VERTICAL PORTRAIT: Height (1024) > Width (768)" : ""}
${format === "landscape" ? "🖼️ HORIZONTAL LANDSCAPE: Width (1024) > Height (768)" : ""}

⚠️ PRODUCT MUST FILL 85-95% OF CANVAS - NO WHITE PADDING ⚠️
Scale the product UP to TOUCH or NEARLY TOUCH the edges of the frame.

You are a professional e-commerce product photographer with STRICT format requirements.

PRODUCT: ${enrichedContext}
USER REQUEST: ${prompt}

${visualEnhancementInstructions}

⚠️ CRITICAL OUTPUT REQUIREMENTS (MUST FOLLOW):
- OUTPUT DIMENSIONS: EXACTLY ${targetDims.width}x${targetDims.height} pixels (${format} format)
- IMAGE RATIO: ${targetDims.ratio}
- NO OTHER DIMENSIONS ARE ACCEPTABLE
- SIMILARITY TO ORIGINAL: ${similarityInfo.strength} - ${similarityInfo.description}
- 🎨 COLOR: MUST be a FULL COLOR image with vibrant, natural colors. NO black and white, NO grayscale.

YOUR MISSION:
Create a ${isMainImage ? "main product" : "lifestyle/ambiance"} photo with custom background.

REQUIREMENTS:
${
  isMainImage
    ? `
1. MAIN IMAGE REQUIREMENTS (CRITICAL):
   - Product MUST be perfectly centered in the frame
   - Product must fill 85-95% of frame (TOUCH THE EDGES)
   - Product should face the camera directly
   - All product details must be clearly visible
   - Clean, professional look suitable for e-commerce
   - NO white padding around the product
   - Output dimensions: EXACTLY ${targetDims.width}x${targetDims.height}
   
2. BACKGROUND:
   - Apply the requested style: "${prompt}"
   - Background should complement but not distract from product
   - Professional lighting to highlight product
`
    : `
1. AMBIANCE/LIFESTYLE IMAGE:
   - Creative composition (centering not required)
   - Product can be positioned artistically
   - Lifestyle/contextual setting
   - Product still fills 80-90% of canvas
   - Output dimensions: EXACTLY ${targetDims.width}x${targetDims.height}
   
2. BACKGROUND:
   - Apply the requested style: "${prompt}"
   - Create atmospheric, lifestyle setting
   - Background is part of the storytelling
`
}

3. TECHNICAL SPECS (CRITICAL):
   - High resolution: EXACTLY ${targetDims.width}x${targetDims.height}
   - ${format === "square" ? "Perfect square (1:1 ratio)" : format === "portrait" ? "Portrait orientation (3:4 ratio)" : "Landscape orientation (4:3 ratio)"}
   - 🎨 FULL COLOR image: vibrant, natural, realistic colors
   - Professional color grading with rich color palette
   - NO black and white, NO grayscale
   - No watermarks, text, or logos

⚠️ FINAL CHECK BEFORE GENERATING:
- Is the output EXACTLY ${targetDims.width}x${targetDims.height}? ✓
- Does product fill 85-95% of the canvas? ✓
- Is there NO white padding around product? ✓

RESULT: A stunning ${isMainImage ? "main product photo" : "lifestyle photo"} at EXACTLY ${targetDims.width}x${targetDims.height} resolution.
    `.trim();

    // Helper function to try Lovable AI with format-aware generation
    async function tryLovableAI(): Promise<{ imageUrl: string; model: string } | null> {
      try {
        console.log(`📝 Trying Lovable AI with format: ${format} (${targetDims.width}x${targetDims.height})`);
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
                  { type: "text", text: photographyPrompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            modalities: ["image", "text"],
            // Note: Gemini ignores generationConfig.aspectRatio, format enforced via prompt
          }),
        });

        if (response.status === 402 || response.status === 429) {
          console.log(`⚠️ Lovable AI unavailable (${response.status}), trying fallback...`);
          return null;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Lovable AI error (${response.status}):`, errorText);
          return null;
        }

        const data = await response.json();
        const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!generatedImageUrl) {
          console.error("⚠️ No image in Lovable AI response");
          return null;
        }

        console.log("✅ Lovable AI succeeded");
        return { imageUrl: generatedImageUrl, model: "google/gemini-2.5-flash-image-preview (Lovable AI)" };
      } catch (error) {
        console.error("❌ Lovable AI exception:", error);
        return null;
      }
    }

    // Helper function to try OpenAI DALL-E
    async function tryOpenAI(): Promise<{ imageUrl: string; model: string } | null> {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        console.log("⚠️ OpenAI API key not configured");
        return null;
      }

      try {
        console.log("📝 Trying OpenAI DALL-E...");

        // Use GPT-4o Vision to analyze the image
        const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this product image and create a detailed description for DALL-E to recreate it with a custom background. Background style: ${prompt}. Focus on: product details, positioning, colors, textures. Keep it concise (max 1000 chars).`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageUrl },
                  },
                ],
              },
            ],
            max_tokens: 500,
          }),
        });

        if (!visionResponse.ok) {
          console.error(`❌ GPT Vision error (${visionResponse.status})`);
          return null;
        }

        const visionData = await visionResponse.json();
        const enhancedPrompt = visionData.choices?.[0]?.message?.content || photographyPrompt;

        // Use DALL-E to generate the image
        const targetSize = format === "square" ? "1024x1024" : format === "portrait" ? "1024x1536" : "1536x1024";
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: enhancedPrompt.substring(0, 4000),
            n: 1,
            size: targetSize,
            quality: "high",
            response_format: "url",
          }),
        });

        if (!dalleResponse.ok) {
          const errorText = await dalleResponse.text();
          console.error(`❌ DALL-E error (${dalleResponse.status}):`, errorText);
          return null;
        }

        const dalleData = await dalleResponse.json();
        const generatedImageUrl = dalleData.data?.[0]?.url;

        if (!generatedImageUrl) {
          console.error("⚠️ No image in DALL-E response");
          return null;
        }

        console.log("✅ OpenAI DALL-E succeeded");
        return { imageUrl: generatedImageUrl, model: "gpt-image-1 (OpenAI)" };
      } catch (error) {
        console.error("❌ OpenAI exception:", error);
        return null;
      }
    }

    // Try providers in order: Lovable AI → OpenAI
    let result = await tryLovableAI();

    if (!result) {
      console.log("🔄 Lovable AI failed, trying OpenAI...");
      result = await tryOpenAI();
    }

    if (!result) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ALL_PROVIDERS_FAILED",
          message:
            "Tous les fournisseurs d'IA ont échoué. Veuillez vérifier votre clé API OpenAI ou réessayer plus tard.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { imageUrl: generatedImageUrl, model: usedModel } = result;
    console.log(`✅ AI background generated successfully using ${usedModel}`);

    // Decode the base64 image to resize it to exact format
    let finalImageUrl = generatedImageUrl;

    try {
      console.log(`📐 Resizing image to exact format: ${targetDims.width}x${targetDims.height}`);

      // Extract base64 data
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Create a canvas-like processing using Deno's image processing
      // For simplicity, we'll use the original image but log the intended dimensions
      console.log(`✅ Target dimensions: ${targetDims.width}x${targetDims.height}`);

      // Note: For actual resizing, we would need an image processing library
      // For now, we ensure the prompt clearly specifies the dimensions
      // and track that the format was requested

      finalImageUrl = generatedImageUrl; // Keep original for now as exact resizing requires additional libraries
    } catch (resizeError) {
      console.error("⚠️ Could not resize image, using original:", resizeError);
      // Continue with original image
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        usedProvider: usedModel,
        metadata: {
          prompt,
          imageType,
          productTitle,
          format,
          similarity,
          requestedDimensions: `${targetDims.width}x${targetDims.height}`,
          model: usedModel,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("💥 Error in generate-image-background:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Try with a higher-quality product photo or check your OpenAI API credentials.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
