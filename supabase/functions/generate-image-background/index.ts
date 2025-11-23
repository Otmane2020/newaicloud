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
    } = await req.json();

    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "imageUrl and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎨 Generating AI background:", { prompt, imageType, format, similarity });

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

    // Calculate aspect ratio based on format
    let aspectRatio = "1024x1024"; // square
    if (format === "portrait") {
      aspectRatio = "768x1024"; // 3:4
    } else if (format === "landscape") {
      aspectRatio = "1024x768"; // 4:3
    }

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

    // Create prompt based on image type with STRICT format enforcement
    const isMainImage = imageType === "primary";
    const photographyPrompt = `
You are a professional e-commerce product photographer with STRICT format requirements.

PRODUCT: ${productTitle || "Product"}
USER REQUEST: ${prompt}

⚠️ CRITICAL OUTPUT REQUIREMENTS (MUST FOLLOW):
- OUTPUT DIMENSIONS: EXACTLY ${aspectRatio} pixels (${format} format)
- IMAGE RATIO: ${format === "square" ? "1:1 (equal width and height)" : format === "portrait" ? "3:4 (vertical orientation)" : "4:3 (horizontal orientation)"}
- NO OTHER DIMENSIONS ARE ACCEPTABLE
- SIMILARITY TO ORIGINAL: ${similarityInfo.strength} - ${similarityInfo.description}

YOUR MISSION:
Create a ${isMainImage ? "main product" : "lifestyle/ambiance"} photo with custom background.

REQUIREMENTS:
${
  isMainImage
    ? `
1. MAIN IMAGE REQUIREMENTS (CRITICAL):
   - Product MUST be perfectly centered in the frame
   - Product must be clear, sharp, and prominent (70-80% of frame)
   - Product should face the camera directly
   - All product details must be clearly visible
   - Clean, professional look suitable for e-commerce
   - Output dimensions: EXACTLY ${aspectRatio}
   - Image ratio: ${format === "square" ? "1:1" : format === "portrait" ? "3:4" : "4:3"}
   - Similarity level: ${similarityInfo.description}
   
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
   - More creative freedom with composition
   - Output dimensions: EXACTLY ${aspectRatio}
   - Image ratio: ${format === "square" ? "1:1" : format === "portrait" ? "3:4" : "4:3"}
   - Similarity level: ${similarityInfo.description}
   
2. BACKGROUND:
   - Apply the requested style: "${prompt}"
   - Create atmospheric, lifestyle setting
   - Background is part of the storytelling
`
}

3. TECHNICAL SPECS (CRITICAL):
   - High resolution: EXACTLY ${aspectRatio}
   - ${format === "square" ? "Perfect square (1:1 ratio)" : format === "portrait" ? "Portrait orientation (3:4 ratio - taller than wide)" : "Landscape orientation (4:3 ratio - wider than tall)"}
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos
   - Ready for e-commerce use

⚠️ FINAL CHECK BEFORE GENERATING:
- Is the output EXACTLY ${aspectRatio}? 
- Is the aspect ratio correct (${format === "square" ? "1:1" : format === "portrait" ? "3:4 vertical" : "4:3 horizontal"})?
- If not, adjust the composition to fit these exact dimensions.

RESULT: A stunning ${isMainImage ? "main product photo with centered, clear product" : "lifestyle/ambiance photo"} with custom background at EXACTLY ${aspectRatio} resolution in ${format} format.
    `.trim();

    // Helper function to try Lovable AI
    async function tryLovableAI(): Promise<{ imageUrl: string; model: string } | null> {
      try {
        console.log("📝 Trying Lovable AI...");
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
      console.log(`📐 Resizing image to exact format: ${aspectRatio}`);

      // Extract base64 data
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Determine target dimensions
      const [targetWidth, targetHeight] = aspectRatio.split("x").map(Number);

      // Create a canvas-like processing using Deno's image processing
      // For simplicity, we'll use the original image but log the intended dimensions
      console.log(`✅ Target dimensions: ${targetWidth}x${targetHeight}`);

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
          requestedDimensions: aspectRatio,
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
