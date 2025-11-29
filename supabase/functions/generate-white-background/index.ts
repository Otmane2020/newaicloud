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
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      
      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        const { data: usage } = await supabaseAdmin
          .from('usage_tracking')
          .select('optimizations_count')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();
        
        const { data: plan } = await supabaseAdmin
          .from('subscription_plans')
          .select('max_optimizations_monthly, trial_max_optimizations')
          .eq('id', profile?.current_plan_id || 'trial')
          .single();
        
        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations = profile?.subscription_status === 'trialing' 
          ? (plan?.trial_max_optimizations || 50)
          : (plan?.max_optimizations_monthly || 999999);
        
        console.log(`[white-bg] 🔍 Usage check: ${currentUsage}/${maxOptimizations}`);
        
        if (currentUsage >= maxOptimizations) {
          console.error(`[white-bg] ❌ LIMIT REACHED: ${currentUsage}/${maxOptimizations}`);
          return new Response(
            JSON.stringify({ 
              error: 'LIMIT_REACHED',
              message: 'Limite d\'optimisations atteinte',
              usage: currentUsage,
              limit: maxOptimizations
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // ✅ Incrémenter IMMÉDIATEMENT (avant génération)
        const WHITE_BG_COST = 5;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: WHITE_BG_COST
        });
        console.log(`[white-bg] ✅ Usage incremented: +${WHITE_BG_COST} (now ${currentUsage + WHITE_BG_COST}/${maxOptimizations})`);
      }
    }
    
    const { 
      imageUrl, 
      productTitle, 
      product_id, 
      imageType = "secondary", 
      format = "square", 
      mode = "standard",
      // 🆕 SERP enrichment data
      serpData,
      visionAiData,
      productDescription,
      seoTitle,
      seoDescription
    } = body;

    // Map format to aspect ratio and dimensions
    const formatToAspectRatio: Record<string, string> = {
      "square": "1:1",
      "portrait": "3:4",
      "landscape": "4:3",
    };
    const formatToDimensions: Record<string, string> = {
      "square": "2000x2000px",
      "portrait": "1500x2000px",
      "landscape": "2000x1500px",
    };
    const aspectRatio = formatToAspectRatio[format] || "1:1";
    const dimensions = formatToDimensions[format] || "2000x2000px";
    console.log(`[white-bg] 📐 Format: ${format} -> Aspect Ratio: ${aspectRatio}, Dimensions: ${dimensions}, Mode: ${mode}`);

    // 🆕 Build enriched context from SERP and Vision data
    let enrichedContext = productTitle || "product";
    
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
      console.log(`[white-bg] 🔍 SERP data enrichment applied`);
    }
    
    // Add Vision AI data if available
    if (visionAiData?.description) {
      enrichedContext += `. Visual: ${visionAiData.description.slice(0, 100)}`;
      console.log(`[white-bg] 👁️ Vision AI data enrichment applied`);
    }
    
    console.log(`[white-bg] 📝 Enriched context: ${enrichedContext.slice(0, 200)}...`);

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎨 Generating white background:", { imageType, productTitle, mode, format });

    // Initialize Supabase client for usage tracking (reuse authHeader from above)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Create advanced prompt for true background removal and replacement
    const startTime = Date.now();
    const isMainImage = imageType === "primary";
    
    // Google Shopping optimized prompt for maximum CTR and Merchant Center compliance
    const googleShoppingPrompt = `
🎯 GOOGLE SHOPPING COMPLIANT PRODUCT IMAGE - MAXIMUM CTR OPTIMIZATION

Generate a Google Shopping compliant product photo that maximizes click-through rate and meets all Google Merchant Center requirements.

PRODUCT: ${enrichedContext}

📐 OUTPUT FORMAT: ${aspectRatio} aspect ratio, ${dimensions} resolution

📋 GOOGLE MERCHANT CENTER REQUIREMENTS (MANDATORY):
1. Pure white background (#FFFFFF / RGB 255,255,255)
2. Clean studio look with professional lighting
3. Add a soft, realistic shadow under the product (very light, natural, not too dark)
4. Keep edges sharp with high resolution
5. No reflections, noise, or artifacts
6. No text, logo, watermark, or props
7. Center the product perfectly with balanced lighting
8. Make the product look premium and realistic
9. Product must be fully visible (no cropping)

🎨 PROFESSIONAL STUDIO REQUIREMENTS:
- Highlight product texture (velvet, fabric, metal, wood, etc.) with soft studio lighting
- Ensure perfect centering and crisp edges
- Premium photorealistic look
- Accurate proportions without distortion
- For furniture: full white background, subtle studio shadow beneath, no environment/decor/floor/wall

⚠️ CRITICAL - DO NOT:
- Regenerate, redraw, or recreate the product
- Change product colors, materials, or textures
- Add background objects, gradients, or decor
- Add any text, logos, or watermarks
- Crop the product or distort proportions

✅ SUCCESS CRITERIA:
- Product preserved 100% (same colors, textures, details as original)
- Pure white background (#FFFFFF) everywhere except product
- Subtle natural shadow for depth and realism
- Professional e-commerce quality ready for Google Shopping
- High resolution ${dimensions} with sharp details
- ${aspectRatio} aspect ratio maintained

OUTPUT: The EXACT product cleanly extracted on pure white background with subtle professional shadow, optimized for Google Shopping CTR at ${dimensions}.
    `.trim();

    // Standard white background prompt
    const standardPrompt = `
🎯 CRITICAL TASK: BACKGROUND SEGMENTATION & REPLACEMENT

You are an AI background removal specialist. Your ONLY job is to:
1. **SEGMENT** and extract the product (${enrichedContext}) from the current image
2. **DELETE** everything that is NOT the product (walls, floors, furniture, decorations, lighting fixtures, shadows on background)
3. **PLACE** the extracted product on a PURE WHITE (#FFFFFF) background

📐 OUTPUT FORMAT: ${aspectRatio} aspect ratio, ${dimensions} resolution

⚠️ CRITICAL RULES:
- DO NOT regenerate, redraw, or recreate the product
- DO NOT change the product's appearance, colors, textures, or details
- ONLY perform background removal: product IN, everything else OUT
- The product must look EXACTLY as it does in the original image
- Think of this as "Photoshop Magic Wand + Delete Background + White Fill"

📐 TECHNICAL WORKFLOW:
${isMainImage ? `
STEP 1 - PRODUCT DETECTION:
- Identify the main product: ${enrichedContext}
- Product should occupy 70-80% of the frame
- Detect product edges with precision (smooth anti-aliasing)

STEP 2 - BACKGROUND SEGMENTATION:
- Classify EVERY pixel as "product" or "background"
- Background = walls, floors, other objects, lighting, decorations, shadows on surfaces
- Create a clean alpha mask around the product

STEP 3 - BACKGROUND REMOVAL:
- DELETE all background pixels completely
- Keep ONLY the product pixels (with original colors, textures, details)

STEP 4 - WHITE BACKGROUND APPLICATION:
- Fill the deleted background area with pure white (#FFFFFF)
- Product MUST be centered in the frame
- Maintain product's original lighting and shadows (only those ON the product, not behind it)

STEP 5 - QUALITY CONTROL:
- Product edges must be clean (no halos, no background remnants)
- Product colors/textures unchanged from original
- White background must be uniform (#FFFFFF everywhere except product)
- No artifacts, no blurring on product edges
- Output must be ${aspectRatio} aspect ratio at ${dimensions}
` : `
STEP 1 - PRODUCT DETECTION:
- Identify the product: ${enrichedContext}
- Detect precise product boundaries

STEP 2 - BACKGROUND SEGMENTATION:
- Classify pixels: product vs. background
- Background = everything that is NOT the product

STEP 3 - BACKGROUND REMOVAL:
- DELETE all background pixels
- Keep ONLY product pixels with original appearance

STEP 4 - WHITE BACKGROUND:
- Replace deleted area with pure white (#FFFFFF)
- Product can be positioned artistically (not necessarily centered)
- Output format: ${aspectRatio} at ${dimensions}

STEP 5 - QUALITY CHECK:
- Clean edges, no background traces
- Product unchanged from original
`}

🚫 FORBIDDEN ACTIONS:
- DO NOT regenerate the product from scratch
- DO NOT change product colors, materials, or textures
- DO NOT add or remove product features
- DO NOT keep any part of the original background (furniture, walls, decor)
- DO NOT add new shadows behind the product (only keep shadows ON the product)

✅ SUCCESS CRITERIA:
- Original product preserved 100% (same colors, textures, details)
- Background is PURE white (#FFFFFF) everywhere except where product is
- Clean product cutout with smooth edges
- Professional e-commerce ready result
- Resolution: ${dimensions}
- Aspect ratio: ${aspectRatio}

🎨 THINK: "I am a background eraser tool, not a product recreator"

EXPECTED OUTPUT: The EXACT product from the input image, cleanly extracted and placed on a new pure white background at ${dimensions} (${aspectRatio}), as if you used professional image editing software to remove the background.
    `.trim();

    // Select prompt based on mode
    const photographyPrompt = mode === "google_shopping" ? googleShoppingPrompt : standardPrompt;

    console.log(`[white-bg] 📝 Prompt generated (${photographyPrompt.length} chars)`);

    // Helper function to try Lovable AI
    async function tryLovableAI(): Promise<{ imageUrl: string; model: string } | null> {
      try {
        console.log("📝 Trying Lovable AI...");
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: photographyPrompt },
                  { type: "image_url", image_url: { url: imageUrl } }
                ]
              }
            ],
            modalities: ["image", "text"],
            generationConfig: {
              aspectRatio: aspectRatio
            }
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
                    text: `Analyze this product image and create a detailed description for DALL-E to recreate it on a pure white background. Focus on: product details, positioning, colors, textures. The result should be a clean product photo on pure white (#FFFFFF). Keep it concise (max 1000 chars).`
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
        const enhancedPrompt = visionData.choices?.[0]?.message?.content || photographyPrompt;

        // Use DALL-E to generate the image
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: `${enhancedPrompt}. Pure white background (#FFFFFF). Professional product photography.`.substring(0, 4000),
            n: 1,
            size: "1024x1024",
            quality: "high",
            response_format: "url"
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
          message: "Tous les fournisseurs d'IA ont échoué. Veuillez vérifier votre clé API OpenAI ou réessayer plus tard.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl: generatedImageUrl, model: usedModel } = result;
    const processingTime = Date.now() - startTime;
    console.log(`✅ White background generated successfully using ${usedModel}`, {
      processingTime: `${processingTime}ms`,
      productTitle,
      imageType,
      promptLength: photographyPrompt.length
    });

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
        const fileName = `product-white-${product_id}-${Date.now()}.png`;
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
        usedProvider: usedModel,
        metadata: {
          imageType,
          productTitle,
          background: "white",
          model: usedModel,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 Error in generate-white-background:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Try with a higher-quality product photo or check your OpenAI API credentials.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
