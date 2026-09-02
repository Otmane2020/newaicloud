import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { generateLifestyleContext, generateLifestylePromptSection } from "../_shared/lifestyle-context.ts";

/**
 * POST-PROCESSING: Force exact format dimensions using FIT (not crop)
 * This preserves the ENTIRE product without cutting anything off
 */
async function enforceImageFormat(
  base64Image: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  try {
    console.log(`[POST-PROCESS] 📐 Enforcing format (FIT mode): ${targetWidth}x${targetHeight}`);
    
    const base64Match = base64Image.match(/data:image\/[^;]+;base64,(.+)/);
    const base64Data = base64Match ? base64Match[1] : base64Image;
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const image = await Image.decode(bytes);
    const srcWidth = image.width;
    const srcHeight = image.height;
    
    console.log(`[POST-PROCESS] 📐 Source: ${srcWidth}x${srcHeight} -> Target: ${targetWidth}x${targetHeight}`);
    
    // Calculate scale to FIT image within target (preserve aspect ratio, no cropping)
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const newWidth = Math.round(srcWidth * scale);
    const newHeight = Math.round(srcHeight * scale);
    
    console.log(`[POST-PROCESS] 🔄 Scaling: ${srcWidth}x${srcHeight} -> ${newWidth}x${newHeight} (scale: ${scale.toFixed(3)})`);
    
    // Resize the image to fit within target dimensions
    const resized = image.resize(newWidth, newHeight);
    
    // Create a new canvas with target dimensions (white background)
    const canvas = new Image(targetWidth, targetHeight);
    canvas.fill(0xFFFFFFFF); // White background
    
    // Calculate position to center the resized image on canvas
    const offsetX = Math.round((targetWidth - newWidth) / 2);
    const offsetY = Math.round((targetHeight - newHeight) / 2);
    
    console.log(`[POST-PROCESS] 📍 Centering: offset (${offsetX}, ${offsetY})`);
    
    // Composite the resized image onto the white canvas
    canvas.composite(resized, offsetX, offsetY);
    
    const outputBytes = await canvas.encode();
    
    let binary = '';
    for (let i = 0; i < outputBytes.byteLength; i++) {
      binary += String.fromCharCode(outputBytes[i]);
    }
    
    console.log(`[POST-PROCESS] ✅ Format enforced (FIT): ${targetWidth}x${targetHeight}`);
    return `data:image/png;base64,${btoa(binary)}`;
  } catch (error) {
    console.error(`[POST-PROCESS] ❌ Failed:`, error);
    return base64Image;
  }
}

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
      // 🔒 FORCE SQUARE FORMAT - ignore any other format requested
      format: _requestedFormat,
      // SERP/Vision enrichment data
      serpData,
      visionAiData,
      productDescription,
      seoTitle,
      seoDescription
    } = body;

    // 🔒 FORCE SQUARE FORMAT ONLY - 1:1 ratio mandatory for e-commerce
    const format = "square";
    const targetDims = { width: 1024, height: 1024, ratio: "1:1" };

    if (!imageUrl || !productTitle) {
      return new Response(JSON.stringify({ error: "imageUrl and productTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎨 Generating SQUARE background for:", productTitle, "imageType:", imageType, "format:", format);

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
    
    // 🆕 Build SERP-based orientation instructions
    let orientationInstructions = "";
    if (serpData) {
      orientationInstructions = `
🔄 ORIENTATION SELON LES STANDARDS DU MARCHÉ 🔄
${serpData.dominantStyles?.length ? `📊 Styles de présentation populaires: ${serpData.dominantStyles.slice(0, 3).join(", ")}` : ""}
${serpData.dimensions ? `📏 Dimensions produit: ${serpData.dimensions} - Orienter le produit pour montrer ces proportions correctement` : ""}

⚠️ NE PAS RETOURNER, INVERSER OU MAL ORIENTER LE PRODUIT
Le produit doit être présenté dans son orientation NATURELLE comme chez les concurrents.
Si c'est un canapé → vue de FACE ou légère 3/4
Si c'est une chaise → légère rotation pour montrer la profondeur
Si c'est un lit → angle montrant la tête de lit et la longueur
`;
    }
    
    // Add Vision AI data if available
    if (visionAiData?.description) {
      enrichedContext += `. Visual: ${visionAiData.description.slice(0, 100)}`;
      console.log(`[product-bg] 👁️ Vision AI data enrichment applied`);
    }

    console.log(`[product-bg] 📝 Enriched context: ${enrichedContext.slice(0, 200)}...`);

    // 🆕 Generate lifestyle context based on product title
    const lifestyleContext = generateLifestyleContext(productTitle);
    const lifestylePromptSection = generateLifestylePromptSection(productTitle);
    console.log(`[product-bg] 🏠 Lifestyle context: ${lifestyleContext.slice(0, 100)}...`);

    // Format already set at line 110-111

    // 🆕 Visual Enhancement Instructions for Professional E-Commerce Quality
    // 🛑 PRODUCT PRESERVATION IS ABSOLUTE - DO NOT MODIFY THE PRODUCT
    const visualEnhancementInstructions = `
🛑🛑🛑 CRITICAL E-COMMERCE REQUIREMENT: PRODUCT PRESERVATION 🛑🛑🛑

⚠️ THIS IMAGE IS FOR SELLING THE EXACT PRODUCT SHOWN
The customer will receive EXACTLY this product - it MUST look identical.

🚫 ABSOLUTE PROHIBITIONS (ZERO TOLERANCE):
- DO NOT modify the product's SHAPE, FORM, or SILHOUETTE
- DO NOT change product COLORS (fabric, wood finish, metal, etc.)
- DO NOT alter PROPORTIONS, DIMENSIONS, or RELATIVE SIZES
- DO NOT add, remove, or modify ANY product details
- DO NOT change product orientation, angle, or rotation
- DO NOT "improve" or "stylize" the product design
- The product must remain EXACTLY as photographed

✅ WHAT YOU CAN DO:
1. REPLACE ONLY the background with requested environment
2. Apply professional lighting that ILLUMINATES without changing colors
3. Add soft shadows for depth
4. Ensure product occupies 85-95% of canvas

🎨 LIGHTING (without changing product appearance):
- Professional studio lighting: key + fill + rim
- Soft, flattering shadows for depth
- Colors must remain TRUE to original product
- Sharp focus on all product details

⚠️ LEGAL REQUIREMENT:
Product appearance must match what customer receives.
Any modification = potential customer complaint.
`;

    // Create contextual prompt based on product title and image type
    const isMainImage = imageType === "primary";
    const contextualPrompt = `
🚨🚨🚨 CRITICAL FORMAT REQUIREMENT 🚨🚨🚨

📐 OUTPUT MUST BE EXACTLY ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio} ratio)
📐 CREATE a ${targetDims.width}x${targetDims.height} canvas FIRST, then place content
🟦 PERFECT SQUARE: Width = Height = 1024 pixels (MANDATORY 1:1 RATIO)

⚠️ PRODUCT MUST FILL 85-95% OF CANVAS - NO WHITE PADDING ⚠️
Scale the product UP to TOUCH or NEARLY TOUCH the edges of the frame.

You are a professional e-commerce product photographer with expertise in creating stunning product images.

${lifestylePromptSection}

PRODUCT: ${enrichedContext}
IMAGE TYPE: ${isMainImage ? "MAIN PRODUCT IMAGE" : "SECONDARY/LIFESTYLE IMAGE"}
🏠 LIFESTYLE CONTEXT: ${lifestyleContext}

${orientationInstructions}

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

    // Cloudflare Workers AI image editing.
    const cloudflareResult = await generateCloudflareImage({
      prompt: contextualPrompt,
      imageUrl,
      width: targetDims.width,
      height: targetDims.height,
      strength: 0.28,
    });

    if (!cloudflareResult?.imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CLOUDFLARE_IMAGE_GENERATION_FAILED",
          message: "Cloudflare Workers AI image generation failed or is not configured.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generatedImageUrl = cloudflareResult.imageUrl;
    const usedModel = `${cloudflareResult.model} (Cloudflare Workers AI)`;
    console.log(`Background generated successfully via ${usedModel}`);

    // 🆕 POST-PROCESSING: Force exact format dimensions
    let processedImageUrl = generatedImageUrl;
    if (generatedImageUrl.startsWith('data:')) {
      console.log(`[product-bg] 📐 Applying post-processing to enforce format: ${format} (${targetDims.width}x${targetDims.height})`);
      processedImageUrl = await enforceImageFormat(generatedImageUrl, targetDims.width, targetDims.height);
    }

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
    let finalImageUrl = processedImageUrl;
    
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
          model: usedModel,
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
        suggestion: "Try with a higher-quality product photo or verify Cloudflare Workers AI configuration.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
