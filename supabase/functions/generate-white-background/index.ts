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
      mode = "google_shopping", // 🆕 Default to google_shopping mode
      // 🆕 SERP enrichment data
      serpData,
      visionAiData,
      productDescription,
      seoTitle,
      seoDescription,
      // 🆕 Background style for smart background
      backgroundStyle = "shopping"
    } = body;

    // 📝 DETAILED LOGGING for debugging SERP/Vision data
    console.log(`[white-bg] 📦 Received serpData:`, serpData ? JSON.stringify(serpData).slice(0, 300) : 'null');
    console.log(`[white-bg] 📦 Received visionAiData:`, visionAiData ? JSON.stringify(visionAiData).slice(0, 300) : 'null');
    console.log(`[white-bg] 📦 Received productDescription:`, productDescription ? productDescription.slice(0, 100) : 'null');

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
    console.log(`[white-bg] 📐 Format: ${format} -> Aspect Ratio: ${aspectRatio}, Dimensions: ${dimensions}, Mode: ${mode}, Style: ${backgroundStyle}`);

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

    // 🆕 Background style instructions
    const backgroundStyleInstructions: Record<string, string> = {
      "shopping": "Pure white e-commerce background (#FFFFFF). Clean, professional, product-focused. Subtle drop shadow for 3D depth.",
      "lifestyle": "Warm, inviting lifestyle context. Natural light, soft tones. Product in realistic home/daily use setting. Beige/cream ambient tones.",
      "moderne": "Modern minimalist design. Clean lines, contemporary aesthetic. Geometric elements, neutral gray or off-white backdrop. Sleek and sophisticated.",
      "living_room": "Cozy living room interior. Product placed in realistic home setting with furniture hints. Warm ambient lighting, wooden accents.",
      "studio": "HIGH-END STUDIO PHOTOGRAPHY: Product placed on a clean, visible surface/table/pedestal with SOFT SHADOWS. Background is warm neutral cream/beige/off-white gradient (NOT pure white). Professional softbox lighting from front-left creating elegant soft shadows on the surface. The surface must be visible - product sits ON a table/platform. Think luxury product catalog: Gentle ambient light, smooth surface reflections, 3D depth from shadow. Art gallery or museum display aesthetic.",
      "nature": "Natural outdoor setting. Soft daylight, plants, greenery. Organic textures. Product harmonized with natural elements."
    };
    
    const styleInstruction = backgroundStyleInstructions[backgroundStyle] || backgroundStyleInstructions["shopping"];
    console.log(`[white-bg] 🎨 Style instruction: ${styleInstruction.slice(0, 80)}...`);

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
    // Using explicit pixel dimensions to force Gemini to output correct format
    const formatDimensions: Record<string, { width: number; height: number; ratio: string }> = {
      "square": { width: 1024, height: 1024, ratio: "1:1" },
      "portrait": { width: 768, height: 1024, ratio: "3:4" },
      "landscape": { width: 1024, height: 768, ratio: "4:3" },
    };
    const formatKey = (format as string) || "square";
    const targetDims = formatDimensions[formatKey] || formatDimensions["square"];
    
    // Ultra-strict format instruction with canvas metaphor
    const formatInstruction = `
⚠️⚠️⚠️ ABSOLUTE FORMAT REQUIREMENT - THIS IS NON-NEGOTIABLE ⚠️⚠️⚠️
You MUST output an image that is EXACTLY ${targetDims.width}x${targetDims.height} pixels.
The canvas size is ${targetDims.width} pixels WIDE and ${targetDims.height} pixels TALL.
${formatKey === "square" ? "WIDTH = HEIGHT. The image must be a PERFECT SQUARE. Same width and height." : ""}
${formatKey === "portrait" ? "HEIGHT > WIDTH. The image must be TALLER than it is wide (vertical orientation)." : ""}
${formatKey === "landscape" ? "WIDTH > HEIGHT. The image must be WIDER than it is tall (horizontal orientation)." : ""}
Ratio: ${targetDims.ratio}
    `.trim();

    // Google Shopping optimized prompt - ULTRA STRICT FORMAT + PRODUCT PRESERVATION
    const googleShoppingPrompt = `
⚠️⚠️⚠️ MOST IMPORTANT RULE - READ THIS FIRST ⚠️⚠️⚠️

YOU MUST KEEP THE EXACT SAME PRODUCT from the input image. Do NOT generate a different product. 
Do NOT create a similar product. Use the EXACT product shown in the input image.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK:
1. LOOK at the product in the input image carefully
2. REMOVE only the background from the input image
3. PLACE the EXACT SAME product (unchanged) onto a new ${backgroundStyle} background
4. DO NOT modify, recreate, or interpret the product - use it AS-IS from the input

📐 **FORMAT REQUIREMENT - NON-NEGOTIABLE**:
${formatInstruction}

⛔ FAILURE CONDITIONS:
- Generating a DIFFERENT product than the input = FAILURE
- Wrong aspect ratio = FAILURE
- Modifying the product's appearance = FAILURE

✅ SUCCESS CONDITIONS:
- SAME exact product from input image
- Clean ${backgroundStyle} background
- ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio})

🎨 **BACKGROUND STYLE**: ${styleInstruction}

STEP BY STEP:
1. CREATE a ${targetDims.width}x${targetDims.height} canvas
2. EXTRACT the exact product from the input image (background removal)
3. PLACE the extracted product centered on your canvas (fill 70-80%)
4. ADD subtle drop shadow for 3D depth
5. DO NOT recreate or reinterpret the product - it must be identical to input

BACKGROUND STYLE DETAILS:
${backgroundStyle === 'shopping' ? '- Pure white (#FFFFFF) e-commerce background, clean and professional' : ''}
${backgroundStyle === 'lifestyle' ? '- Warm lifestyle setting with natural light, beige/cream tones' : ''}
${backgroundStyle === 'moderne' ? '- Modern minimalist with clean lines, gray/white backdrop' : ''}
${backgroundStyle === 'living_room' ? '- Cozy living room interior, furniture hints, warm lighting' : ''}
${backgroundStyle === 'studio' ? '- STUDIO PHOTOGRAPHY: Place product ON a visible clean surface/table. Soft shadow cast on surface. Warm neutral cream/beige background gradient. Professional softbox lighting. Think luxury catalog or art gallery display. NOT floating - product must sit on a surface with visible shadow.' : ''}
${backgroundStyle === 'nature' ? '- Natural outdoor setting, plants, soft daylight' : ''}

FINAL CHECK: The output must show THE EXACT SAME "${productTitle || 'product'}" from the input, just with a new background.
    `.trim();

    // Standard white background prompt (simplified but with strict format + product preservation)
    const standardPrompt = `
⚠️ MOST IMPORTANT: KEEP THE EXACT SAME PRODUCT from the input image. Do NOT generate a different product.

The product is: "${productTitle || 'Unknown product'}"

🎯 BACKGROUND REMOVAL & WHITE REPLACEMENT

📐 **MANDATORY FORMAT - NON-NEGOTIABLE**:
${formatInstruction}

YOUR TASK:
1. LOOK at the exact product in the input image
2. REMOVE only the background
3. PLACE the EXACT SAME product (unchanged) on a pure white (#FFFFFF) background

STEPS:
1. Create ${targetDims.width}x${targetDims.height} white canvas
2. EXTRACT the exact product from input (do not recreate it)
3. Center extracted product on canvas (70-80% of frame)
4. Add subtle drop shadow for 3D depth

⚠️ CRITICAL: 
- Keep the EXACT product from input (same colors, shape, details)
- Output MUST be ${targetDims.ratio} ratio (${targetDims.width}x${targetDims.height} pixels)

OUTPUT: ${targetDims.width}x${targetDims.height} image with THE SAME product on white background.
    `.trim();

    // 3D Google Shopping prompt - Product rendered in 3D on white 1:1 background
    const threeD_ShoppingPrompt = `
⚠️⚠️⚠️ CRITICAL 3D GOOGLE SHOPPING MODE ⚠️⚠️⚠️

You MUST recreate this product in HIGH-QUALITY 3D rendering style.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK - 3D PRODUCT VISUALIZATION:
1. ANALYZE the product in the input image carefully (shape, colors, materials, details)
2. RECREATE the product as a PHOTOREALISTIC 3D render
3. Place it on a PURE WHITE (#FFFFFF) background
4. Format: SQUARE 1:1 (1024x1024 pixels) - MANDATORY

📐 **FORMAT REQUIREMENT - NON-NEGOTIABLE**:
Output MUST be EXACTLY 1024x1024 pixels (1:1 SQUARE).
The canvas is a PERFECT SQUARE. Same width and height.

🎨 **3D RENDERING STYLE**:
- Professional 3D modeling/rendering aesthetic
- Studio lighting with soft shadows
- Product appears tangible, with depth and volume
- Slightly elevated angle to show 3D dimensionality
- Subtle reflection on floor/surface
- Google Shopping compliant: clean, no text, no watermarks

✅ QUALITY REQUIREMENTS:
- Ultra-realistic 3D visualization
- Product fills 70-80% of the frame
- Pure white background for e-commerce
- Professional catalog quality
- Emphasize material textures (wood grain, fabric weave, metal sheen)

OUTPUT: 1024x1024 pixel 3D rendered product on white background.
    `.trim();

    // 3D Generate prompt - Full 3D recreation with custom background
    const threeD_GeneratePrompt = `
⚠️⚠️⚠️ CREATIVE 3D PRODUCT RECREATION MODE ⚠️⚠️⚠️

RECREATE this product as a stunning 3D visualization in a beautiful environment.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK - CREATIVE 3D VISUALIZATION:
1. ANALYZE the product in the input image (shape, colors, materials, ALL details)
2. RECREATE it as a PHOTOREALISTIC 3D model
3. Place it in a beautiful ${backgroundStyle} environment
4. Create a magazine-quality 3D product visualization

📐 **FORMAT REQUIREMENT**:
${formatInstruction}

🎨 **BACKGROUND STYLE**: ${styleInstruction}

🖼️ **3D RENDERING SPECIFICATIONS**:
- Cinematic 3D rendering quality
- Professional studio/environmental lighting
- Product with realistic shadows and reflections
- Beautiful depth of field
- Premium catalog aesthetic
- Material textures emphasized (wood, fabric, metal, glass)

✨ **CREATIVE DIRECTION**:
- Make the product look DESIRABLE and PREMIUM
- Environment should complement the product
- Lighting should highlight product features
- Think high-end furniture/product catalog
- 3D visualization that tells a story

⚠️ IMPORTANT:
- Recreate the SAME product from the input (same shape, proportions, features)
- But render it as a beautiful 3D visualization
- NOT a photo edit - this should look like 3D CGI

OUTPUT: Beautiful 3D rendered product in ${backgroundStyle} environment.
    `.trim();

    // Select prompt based on mode
    let photographyPrompt: string;
    if (mode === "3d_google_shopping") {
      photographyPrompt = threeD_ShoppingPrompt;
    } else if (mode === "3d_generate") {
      photographyPrompt = threeD_GeneratePrompt;
    } else if (mode === "google_shopping") {
      photographyPrompt = googleShoppingPrompt;
    } else {
      photographyPrompt = standardPrompt;
    }

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
            modalities: ["image", "text"]
            // ❌ REMOVED: generationConfig.aspectRatio is NOT supported by Gemini
            // The aspect ratio is enforced via prompt instructions instead
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
