import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerationRequest {
  imageUrl: string;
  productTitle: string;
  productId: string;
  imageId: string;
  prompt: string;
  enrichedPrompt?: string;
  style: "professional" | "lifestyle" | "minimalist" | "creative";
  format: "square" | "portrait" | "landscape";
  targetType: "main" | "variant";
  variantOptions?: string; // e.g., "Red - Large"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Check usage limits first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

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

        console.log(`[ai-bg-gen] Usage: ${currentUsage}/${maxOptimizations}`);

        if (currentUsage >= maxOptimizations) {
          console.error(`[ai-bg-gen] LIMIT REACHED`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "LIMIT_REACHED",
              message: "Limite d'optimisations atteinte",
              usage: currentUsage,
              limit: maxOptimizations,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Increment usage immediately (8 credits per background generation)
        const AI_BG_COST = 8;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: AI_BG_COST,
        });
        console.log(`[ai-bg-gen] Usage incremented: +${AI_BG_COST}`);
      }
    }

    const {
      imageUrl,
      productTitle,
      productId,
      imageId,
      prompt,
      enrichedPrompt,
      style,
      format,
      targetType,
      variantOptions,
    } = (await req.json()) as GenerationRequest;

    if (!imageUrl || !productTitle || !prompt || !productId || !imageId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🎨 Generating AI background for: ${productTitle} (${targetType})`);
    if (variantOptions) {
      console.log(`   Variant: ${variantOptions}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build comprehensive prompt based on configuration
    const isMainImage = targetType === "main";
    const variantInfo = variantOptions ? ` (Variant: ${variantOptions})` : "";

    const styleDescriptions = {
      professional: "Clean studio lighting, neutral backdrop, professional e-commerce quality",
      lifestyle: "Natural environment, lifestyle setting, warm and inviting atmosphere",
      minimalist: "Modern minimalist aesthetic, clean geometric shapes, neutral tones",
      creative: "Artistic composition, creative lighting, unique and engaging perspective",
    };

    const formatSpecs = {
      square: "1024x1024 square format",
      portrait: "768x1024 portrait orientation (3:4)",
      landscape: "1024x768 landscape orientation (4:3)",
    };

    const comprehensivePrompt = `
You are a professional e-commerce product photographer creating a stunning product image.

PRODUCT: ${productTitle}${variantInfo}
IMAGE TYPE: ${isMainImage ? "MAIN PRODUCT IMAGE" : "VARIANT IMAGE"}
STYLE: ${styleDescriptions[style]}
FORMAT: ${formatSpecs[format]}

USER REQUEST: ${prompt}

CRITICAL REQUIREMENTS:
${
  isMainImage
    ? `
1. MAIN IMAGE REQUIREMENTS:
   - Product MUST be perfectly centered and sharp
   - Product occupies 70-80% of the frame
   - Product faces camera directly
   - All product details clearly visible
   - Preserve all textures, colors, and materials
   - Professional product listing quality
   - Natural shadows for depth
`
    : `
1. VARIANT IMAGE REQUIREMENTS:
   - Product prominently displayed
   - Clear visibility of variant-specific features (color, size, pattern)
   - Maintain product integrity and details
   - Professional gallery-quality image
   - Show product in context if applicable
`
}

2. BACKGROUND & LIGHTING:
   - ${prompt}
   - ${styleDescriptions[style]}
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos

3. TECHNICAL SPECS:
   - Format: ${formatSpecs[format]}
   - High resolution and sharp focus
   - Professional post-processing
   - E-commerce ready quality

4. CREATIVE EXECUTION:
   - Match mood to product category
   - Background enhances, never distracts
   - Professional photography aesthetic
   - Suitable for ${isMainImage ? "main product listing (Shopify/Amazon)" : "product gallery"}

RESULT: A stunning, professional product photo that looks like it was created by a top e-commerce photographer.
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
                  { type: "text", text: comprehensivePrompt },
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

    // Helper function to try DeepSeek
    async function tryDeepSeek(): Promise<{ imageUrl: string; model: string } | null> {
      const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
      if (!DEEPSEEK_API_KEY) {
        console.log("⚠️ DeepSeek API key not configured");
        return null;
      }

      try {
        console.log("📝 Trying DeepSeek...");
        // DeepSeek doesn't support image generation, skip it
        console.log("⚠️ DeepSeek doesn't support image generation");
        return null;
      } catch (error) {
        console.error("❌ DeepSeek exception:", error);
        return null;
      }
    }

    // Helper to convert ArrayBuffer to base64 without stack overflow
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      // Process byte by byte to avoid any stack issues
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    // Helper function to try Gemini Imagen 3
    async function tryGemini(): Promise<{ imageUrl: string; model: string } | null> {
      const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        console.log("⚠️ Gemini API key not configured");
        return null;
      }

      try {
        console.log("📝 Trying Gemini Imagen 3...");
        
        // Use Imagen 3 for image generation
        const imagenPrompt = `${comprehensivePrompt}\n\nReference image URL: ${imageUrl}\nCreate a professional product image with an enhanced contextual background based on this product.`;
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{
                prompt: imagenPrompt
              }],
              parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                personGeneration: "allow_all",
                safetySetting: "block_only_high",
                outputFormat: "jpeg"
              }
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Imagen 3 error (${response.status}):`, errorText);
          return null;
        }

        const data = await response.json();
        
        // Imagen 3 returns base64 encoded images in predictions array
        if (data.predictions && data.predictions.length > 0) {
          const imageData = data.predictions[0].bytesBase64Encoded || data.predictions[0].image;
          if (imageData) {
            const imageUrl = `data:image/jpeg;base64,${imageData}`;
            console.log("✅ Imagen 3 succeeded");
            return { imageUrl, model: "imagen-3.0-generate-001 (Gemini)" };
          }
        }
        
        console.log("⚠️ No image returned from Imagen 3");
        return null;
      } catch (error) {
        console.error("❌ Imagen 3 exception:", error);
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
        
        // First, use GPT-5 Vision to analyze the image
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
                    text: `Analyze this product image and create a detailed description for DALL-E to recreate it with a new background. Focus on: product details, current position, colors, textures. Then add this background style: ${prompt}. Keep it concise for DALL-E (max 1000 chars).`
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageUrl }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        if (!visionResponse.ok) {
          console.error(`❌ GPT Vision error (${visionResponse.status})`);
          return null;
        }

        const visionData = await visionResponse.json();
        const enhancedPrompt = visionData.choices?.[0]?.message?.content || comprehensivePrompt;

        // Then use DALL-E to generate the image
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
            size: format === "square" ? "1024x1024" : format === "portrait" ? "1024x1536" : "1536x1024",
            quality: "high",
            response_format: "url"
          }),
        });

        if (!dalleResponse.ok) {
          console.error(`❌ DALL-E error (${dalleResponse.status})`);
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

    // Try providers in order: Lovable AI → DeepSeek → Gemini → OpenAI
    const failures: string[] = [];
    let result = await tryLovableAI();
    
    if (!result) {
      failures.push("Lovable AI: Pas de crédits (402) - Ajoutez des crédits à votre workspace Lovable");
      console.log("🔄 Lovable AI failed, trying DeepSeek...");
      result = await tryDeepSeek();
    }
    
    if (!result) {
      failures.push("DeepSeek: Ne supporte pas la génération d'images");
      console.log("🔄 DeepSeek failed, trying Gemini...");
      result = await tryGemini();
    }
    
    if (!result) {
      failures.push("Gemini Imagen 3: Échec de génération");
      console.log("🔄 Gemini failed, trying OpenAI...");
      result = await tryOpenAI();
    }

    if (!result) {
      failures.push("OpenAI: Limite de taux atteinte (429) - Attendez quelques minutes ou vérifiez vos crédits OpenAI");
      
      console.error("❌ ALL PROVIDERS FAILED:", failures);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "ALL_PROVIDERS_FAILED",
          message: "Tous les fournisseurs d'IA ont échoué.",
          details: failures.join(" | "),
          suggestions: [
            "Ajoutez des crédits à votre workspace Lovable AI",
            "Attendez quelques minutes pour que la limite OpenAI se réinitialise",
            "Vérifiez que votre clé API OpenAI est valide et a des crédits"
          ]
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl: generatedImageUrl, model: usedModel } = result;
    console.log(`✅ Successfully generated AI background using ${usedModel}`);

    // Save to product_image_history if user is authenticated
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        try {
          // Get next version number
          const { data: versionData } = await supabaseAdmin
            .rpc('get_next_image_version', { p_image_id: imageId });
          
          const versionNumber = versionData || 1;

          // Mark all previous versions as not current
          await supabaseAdmin
            .from('product_image_history')
            .update({ is_current: false })
            .eq('image_id', imageId);

          // Insert new history entry
          await supabaseAdmin
            .from('product_image_history')
            .insert({
              product_id: productId,
              image_id: imageId,
              user_id: user.id,
              optimization_type: 'ai_background',
              original_url: imageUrl,
              optimized_url: generatedImageUrl,
              version_number: versionNumber,
              is_current: true,
              ai_model: usedModel,
              ai_prompt: enrichedPrompt || prompt,
              metadata: {
                style,
                format,
                targetType,
                variantOptions,
              }
            });

          console.log("✅ Saved to product_image_history");
        } catch (error) {
          console.error("⚠️ Failed to save to history:", error);
          // Continue even if history save fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productTitle,
          style,
          format,
          targetType,
          variantOptions,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("❌ generate-ai-product-background error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
