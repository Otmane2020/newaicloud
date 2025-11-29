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
    
    // 🆕 CRITICAL: Format dimensions mapping for image generation
    const formatInstructions: Record<string, string> = {
      "square": "MANDATORY OUTPUT: Square format 1:1 ratio. The final image MUST be perfectly SQUARE (same width and height). Example: 2000x2000 pixels.",
      "portrait": "MANDATORY OUTPUT: Portrait format 3:4 ratio (vertical). The final image MUST be taller than wide. Example: 1500x2000 pixels.",
      "landscape": "MANDATORY OUTPUT: Landscape format 4:3 ratio (horizontal). The final image MUST be wider than tall. Example: 2000x1500 pixels."
    };
    const formatKey = (format as string) || "square";
    const formatInstruction = formatInstructions[formatKey] || formatInstructions["square"];

    // Google Shopping optimized prompt for maximum CTR and Merchant Center compliance
    // Now includes 3D effect, SERP enrichment, and STRICT format enforcement
    const googleShoppingPrompt = `
🎯 GOOGLE SHOPPING PROFESSIONAL PRODUCT IMAGE - MAXIMUM CTR & 3D EFFECT

📐 **CRITICAL FORMAT REQUIREMENT - READ FIRST**:
${formatInstruction}
Aspect ratio: ${aspectRatio}
Target resolution: ${dimensions}
⚠️ DO NOT OUTPUT AN IMAGE WITH A DIFFERENT ASPECT RATIO. THE FORMAT MUST BE ${format.toUpperCase()} (${aspectRatio}).

PRODUCT CONTEXT: ${enrichedContext}

🎨 STUDIO PHOTOGRAPHY REQUIREMENTS:

1️⃣ **PURE WHITE BACKGROUND** (#FFFFFF / RGB 255,255,255):
   - Remove ALL existing background completely
   - Replace with perfectly uniform pure white
   - No gradients, no shadows on background, no textures

2️⃣ **PROFESSIONAL 3D DEPTH EFFECT**:
   - Add a soft, realistic DROP SHADOW under the product
   - Shadow should be: subtle, diffused, natural-looking
   - Shadow direction: slightly below and behind the product
   - Shadow opacity: 15-25% black, soft edges
   - This creates a professional "floating" 3D effect
   - The shadow makes the product look premium and tactile

3️⃣ **STUDIO LIGHTING**:
   - Soft, even lighting from above-front (key light)
   - Gentle fill light to reduce harsh shadows ON the product
   - Subtle rim/edge lighting to separate product from background
   - Highlight product textures (wood grain, fabric weave, metal shine)

4️⃣ **PRODUCT PRESERVATION** (CRITICAL):
   - DO NOT regenerate, redraw, or recreate the product
   - Keep EXACT same colors, textures, materials, details
   - Only perform background removal and studio lighting enhancement
   - Product must look IDENTICAL to original, just with better lighting

5️⃣ **GOOGLE MERCHANT CENTER COMPLIANCE**:
   - Product occupies 75-85% of frame (not cropped, not too small)
   - Product perfectly centered
   - No text, watermarks, logos, or promotional elements
   - High resolution with sharp details
   - Professional e-commerce quality

6️⃣ **ASPECT RATIO ENFORCEMENT**:
   - OUTPUT MUST BE ${format.toUpperCase()} FORMAT
   - ${aspectRatio} aspect ratio is MANDATORY
   - ${dimensions} target resolution
   - If product is not this ratio, add white padding to achieve ${aspectRatio}

✅ SUCCESS = Original product + Pure white background + Soft 3D drop shadow + Studio lighting + ${aspectRatio} format
❌ FAILURE = Wrong aspect ratio, changed product, no shadow, colored background

OUTPUT: Professional ${format} (${aspectRatio}) product photo on pure white with subtle 3D drop shadow at ${dimensions}.
    `.trim();

    // Standard white background prompt (simplified)
    const standardPrompt = `
🎯 BACKGROUND REMOVAL & WHITE REPLACEMENT

📐 **MANDATORY FORMAT**: ${formatInstruction}
Aspect ratio: ${aspectRatio} | Resolution: ${dimensions}

PRODUCT: ${enrichedContext}

TASK: Extract product from current background and place on PURE WHITE (#FFFFFF).

REQUIREMENTS:
1. Remove ALL background elements (walls, floors, furniture, props)
2. Keep product EXACTLY as it appears (same colors, textures, details)
3. Place on pure white background (#FFFFFF)
4. Add subtle drop shadow underneath for 3D depth
5. Center product, occupying 75-85% of frame
6. OUTPUT MUST BE ${format.toUpperCase()} (${aspectRatio}) format

⚠️ CRITICAL: 
- DO NOT change the product appearance
- DO NOT output wrong aspect ratio
- The format MUST be ${aspectRatio}

OUTPUT: Product on white background with soft shadow, ${aspectRatio} aspect ratio, ${dimensions} resolution.
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
