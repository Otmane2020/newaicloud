import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { generateLifestyleContext, generateLifestylePromptSection } from "../_shared/lifestyle-context.ts";
import { autoSyncImageToShopify } from "../_shared/auto-sync-to-shopify.ts";

/**
 * POST-PROCESSING: Force exact format dimensions using FIT (not crop)
 * This preserves the ENTIRE product without cutting anything off
 * Product is scaled to FIT within the canvas and centered
 */
async function enforceImageFormat(
  base64Image: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  try {
    console.log(`[POST-PROCESS] 📐 Enforcing format (FIT mode): ${targetWidth}x${targetHeight}`);
    
    // Extract base64 data
    const base64Match = base64Image.match(/data:image\/[^;]+;base64,(.+)/);
    const base64Data = base64Match ? base64Match[1] : base64Image;
    
    // Decode base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decode image
    const image = await Image.decode(bytes);
    const srcWidth = image.width;
    const srcHeight = image.height;
    
    console.log(`[POST-PROCESS] 📐 Source: ${srcWidth}x${srcHeight} -> Target: ${targetWidth}x${targetHeight}`);
    
    // Calculate scale to FIT image within target (preserve aspect ratio, no cropping)
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const scale = Math.min(scaleX, scaleY); // Use smaller scale to ensure entire image fits
    
    const newWidth = Math.round(srcWidth * scale);
    const newHeight = Math.round(srcHeight * scale);
    
    console.log(`[POST-PROCESS] 🔄 Scaling: ${srcWidth}x${srcHeight} -> ${newWidth}x${newHeight} (scale: ${scale.toFixed(3)})`);
    
    // Resize the image to fit within target dimensions
    const resized = image.resize(newWidth, newHeight);
    
    // Create a new canvas with target dimensions (white background)
    const canvas = new Image(targetWidth, targetHeight);
    canvas.fill(0xFFFFFFFF); // White background (RGBA)
    
    // Calculate position to center the resized image on canvas
    const offsetX = Math.round((targetWidth - newWidth) / 2);
    const offsetY = Math.round((targetHeight - newHeight) / 2);
    
    console.log(`[POST-PROCESS] 📍 Centering: offset (${offsetX}, ${offsetY})`);
    
    // Composite the resized image onto the white canvas
    canvas.composite(resized, offsetX, offsetY);
    
    // Encode back to PNG
    const outputBytes = await canvas.encode();
    
    // Convert to base64
    let binary = '';
    const len = outputBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(outputBytes[i]);
    }
    const outputBase64 = btoa(binary);
    
    console.log(`[POST-PROCESS] ✅ Format enforced (FIT): ${targetWidth}x${targetHeight} - product preserved entirely`);
    
    return `data:image/png;base64,${outputBase64}`;
  } catch (error) {
    console.error(`[POST-PROCESS] ❌ Failed to enforce format:`, error);
    // Return original if post-processing fails
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
      backgroundStyle = "shopping",
      // 🆕 Custom user prompt for additional instructions
      customPrompt,
      // 🆕 Gallery images for multi-image context (all product photos)
      galleryImages = []
    } = body;
    
    // Log custom prompt if provided
    if (customPrompt) {
      console.log(`[white-bg] 🎨 Custom prompt received: ${customPrompt.slice(0, 100)}...`);
    }

    // 📝 Log gallery images for multi-image context
    if (galleryImages && galleryImages.length > 0) {
      console.log(`[white-bg] 🖼️ Gallery context: ${galleryImages.length} additional images provided for better understanding`);
    }

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
    
    // 🆕 Generate lifestyle context based on product title
    const lifestyleContext = generateLifestyleContext(productTitle || "");
    const lifestylePromptSection = generateLifestylePromptSection(productTitle || "");
    console.log(`[white-bg] 🏠 Lifestyle context: ${lifestyleContext.slice(0, 100)}...`);
    
    console.log(`[white-bg] 📝 Enriched context: ${enrichedContext.slice(0, 200)}...`);

    // 🆕 Background style instructions
    const backgroundStyleInstructions: Record<string, string> = {
      "shopping": "Pure white e-commerce background (#FFFFFF). Clean, professional, product-focused. Subtle drop shadow for 3D depth.",
      "luxury_showroom": "LUXURY 3D SHOWROOM: Dark elegant showroom background (deep charcoal/black gradient). GLOSSY MARBLE FLOOR with PERFECT MIRROR REFLECTION of product. DRAMATIC SPOTLIGHT from above creating VOLUMETRIC LIGHT BEAMS. GOLDEN RAYS and FLOATING SPARKLE PARTICLES radiating from product. Professional RIM LIGHTING on product edges. 8K photorealistic CGI render quality. Think: Roche Bobois, EURODESIGN luxury furniture catalog.",
      "lifestyle": `Warm, inviting lifestyle context. ${lifestyleContext}. Natural light, soft tones. Product in realistic home/daily use setting.`,
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
    const formatDimensions: Record<string, { width: number; height: number; ratio: string; dalleSize: string }> = {
      "square": { width: 1024, height: 1024, ratio: "1:1", dalleSize: "1024x1024" },
      "portrait": { width: 768, height: 1024, ratio: "3:4", dalleSize: "1024x1792" },
      "landscape": { width: 1024, height: 768, ratio: "4:3", dalleSize: "1792x1024" },
    };
    const formatKey = (format as string) || "square";
    const targetDims = formatDimensions[formatKey] || formatDimensions["square"];
    console.log(`[white-bg] 🎯 Target format: ${formatKey} -> ${targetDims.width}x${targetDims.height} (DALL-E: ${targetDims.dalleSize})`);
    
    
    // Ultra-strict format instruction with canvas metaphor and extreme repetition
    const formatInstruction = `
🚨🚨🚨 ABSOLUTE FORMAT REQUIREMENT - THIS IS NON-NEGOTIABLE 🚨🚨🚨
🚨🚨🚨 READ THIS 3 TIMES BEFORE STARTING 🚨🚨🚨

STEP 1: CREATE A CANVAS FIRST
📐 Create a blank canvas that is EXACTLY ${targetDims.width} pixels WIDE × ${targetDims.height} pixels TALL
📐 Canvas dimensions: ${targetDims.width}px WIDTH × ${targetDims.height}px HEIGHT
📐 Aspect ratio: ${targetDims.ratio}

${formatKey === "square" ? `
🟦 PERFECT SQUARE REQUIRED 🟦
- Width = Height = ${targetDims.width} pixels
- This is a SQUARE. Not a rectangle. SQUARE.
- Same number of pixels horizontally and vertically
- 1:1 ratio means IDENTICAL width and height
- ${targetDims.width} × ${targetDims.width} pixels SQUARE canvas
` : ""}

${formatKey === "portrait" ? `
📱 VERTICAL PORTRAIT FORMAT 📱
- Height (${targetDims.height}px) > Width (${targetDims.width}px)
- TALLER than wide (vertical orientation)
- Portrait like a phone screen
- ${targetDims.width} × ${targetDims.height} pixels
` : ""}

${formatKey === "landscape" ? `
🖼️ HORIZONTAL LANDSCAPE FORMAT 🖼️
- Width (${targetDims.width}px) > Height (${targetDims.height}px)
- WIDER than tall (horizontal orientation)
- Landscape like a monitor screen
- ${targetDims.width} × ${targetDims.height} pixels
` : ""}

STEP 2: PLACE PRODUCT ON THIS CANVAS (FILL IT COMPLETELY)
Only AFTER creating your ${targetDims.width}×${targetDims.height} canvas, place the product on it.

🚨🚨🚨 CRITICAL: NO WHITE PADDING / NO EMPTY SPACE 🚨🚨🚨
THE PRODUCT MUST FILL THE ENTIRE ${targetDims.width}×${targetDims.height} CANVAS:
- Product should occupy 85-95% of the canvas area (NOT 70-80%)
- NO empty white space or padding around the product
- The product should TOUCH or NEARLY TOUCH the edges of the canvas
- Scale the product UP to fill the entire frame edge-to-edge
- Imagine ZOOMING IN on the product until it fills the ${targetDims.width}×${targetDims.height} frame

⚠️ FAILURE: If there is visible white padding around the product = REJECT
⚠️ FAILURE: If the product looks small/centered with empty space = REJECT
✅ SUCCESS: Product fills the frame edge-to-edge with minimal empty space

⚠️ IF YOU OUTPUT ANY OTHER SIZE, THIS WILL BE A COMPLETE FAILURE ⚠️
⚠️ The output MUST be ${targetDims.width}×${targetDims.height} pixels ⚠️
⚠️ ${targetDims.ratio} ratio is MANDATORY ⚠️
    `.trim();

    // Google Shopping optimized prompt - ULTRA STRICT FORMAT + PRODUCT PRESERVATION
    const googleShoppingPrompt = `
🚨🚨🚨 CRITICAL FORMAT INSTRUCTION - READ FIRST 🚨🚨🚨

${formatInstruction}

⚠️⚠️⚠️ SECOND MOST IMPORTANT RULE ⚠️⚠️⚠️

YOU MUST KEEP THE EXACT SAME PRODUCT from the input image. Do NOT generate a different product. 
Do NOT create a similar product. Use the EXACT product shown in the input image.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK:
1. CREATE your ${targetDims.width}×${targetDims.height} canvas FIRST
2. LOOK at the product in the input image carefully
3. REMOVE only the background from the input image
4. PLACE the EXACT SAME product (unchanged) onto your ${targetDims.width}×${targetDims.height} canvas
5. DO NOT modify, recreate, or interpret the product - use it AS-IS from the input

⛔ FAILURE CONDITIONS:
- Output is NOT ${targetDims.width}×${targetDims.height} pixels = COMPLETE FAILURE
- Wrong aspect ratio (not ${targetDims.ratio}) = COMPLETE FAILURE
- Generating a DIFFERENT product than the input = FAILURE
- Modifying the product's appearance = FAILURE

✅ SUCCESS CONDITIONS:
- Output is EXACTLY ${targetDims.width}×${targetDims.height} pixels (${targetDims.ratio})
- SAME exact product from input image
- Clean ${backgroundStyle} background

🎨 **BACKGROUND STYLE**: ${styleInstruction}

STEP BY STEP EXECUTION:
1. CREATE a ${targetDims.width}×${targetDims.height} pixels canvas (${targetDims.ratio} ratio)
2. EXTRACT the exact product from the input image (background removal only)
3. SCALE UP the product to fill 85-95% of canvas (TOUCH THE EDGES, NO PADDING)
4. PLACE the enlarged product centered on your ${targetDims.width}×${targetDims.height} canvas
5. ADD subtle drop shadow for 3D depth
6. VERIFY output is ${targetDims.width}×${targetDims.height} pixels with product filling the frame
7. DO NOT recreate or reinterpret the product - it must be identical to input

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
🚨🚨🚨 FORMAT FIRST - READ THIS BEFORE ANYTHING ELSE 🚨🚨🚨

${formatInstruction}

⚠️ SECOND: KEEP THE EXACT SAME PRODUCT from the input image. Do NOT generate a different product.

The product is: "${productTitle || 'Unknown product'}"

🎯 BACKGROUND REMOVAL & WHITE REPLACEMENT

YOUR TASK:
1. CREATE a ${targetDims.width}×${targetDims.height} pixels white canvas FIRST
2. LOOK at the exact product in the input image
3. REMOVE only the background from the input
4. PLACE the EXACT SAME product (unchanged) on your white canvas

EXECUTION STEPS:
1. Create ${targetDims.width}×${targetDims.height} white canvas (#FFFFFF)
2. EXTRACT the exact product from input (do not recreate it)
3. SCALE UP product to fill 85-95% of canvas (EDGE-TO-EDGE, NO WHITE PADDING)
4. Center enlarged product on your ${targetDims.width}×${targetDims.height} canvas
5. Add subtle drop shadow for 3D depth
6. VERIFY product fills the frame with NO empty white space around it

⚠️ CRITICAL REQUIREMENTS: 
- Output MUST be EXACTLY ${targetDims.width}×${targetDims.height} pixels
- Output MUST be ${targetDims.ratio} aspect ratio
- Keep the EXACT product from input (same colors, shape, details)

FINAL OUTPUT: ${targetDims.width}×${targetDims.height} pixels image with THE SAME product on white background.
    `.trim();

    // 3D Google Shopping prompt - LUXURY SHOWROOM STYLE (inspired by Creative Studio)
    const threeD_ShoppingPrompt = `
🚨🚨🚨 FORMAT INSTRUCTION - ABSOLUTE PRIORITY 🚨🚨🚨

📐 CREATE A 1024×1024 PIXELS SQUARE CANVAS FIRST
📐 This is a PERFECT SQUARE: 1024 pixels wide × 1024 pixels tall
📐 WIDTH = HEIGHT = 1024 pixels
📐 1:1 ratio means IDENTICAL width and height
📐 Not 1024×768. Not 1024×1536. EXACTLY 1024×1024.

⚠️⚠️⚠️ LUXURY 3D SHOWROOM VISUALIZATION MODE ⚠️⚠️⚠️

RECREATE this product as a STUNNING 3D visualization in a LUXURY SHOWROOM environment.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${visionAiData?.description ? `👁️ Visual: ${visionAiData.description.slice(0, 150)}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK - LUXURY 3D SHOWROOM:
1. CREATE your 1024×1024 SQUARE canvas FIRST
2. ANALYZE the product in the input image carefully (shape, colors, materials, ALL details)
3. RECREATE the product as a PHOTOREALISTIC 3D CGI render
4. Place it in a DARK ELEGANT SHOWROOM with DRAMATIC LIGHTING

🖼️ **MANDATORY LUXURY SHOWROOM ELEMENTS**:
- 🌑 DARK ELEGANT SHOWROOM BACKGROUND (deep charcoal/black gradient)
- 🪞 GLOSSY MARBLE FLOOR with PERFECT MIRROR REFLECTION of product
- 💡 DRAMATIC SPOTLIGHT from above creating VOLUMETRIC LIGHT BEAMS
- ✨ GOLDEN RAYS and FLOATING SPARKLE PARTICLES radiating from product
- 🔆 PROFESSIONAL RIM LIGHTING on product edges (subtle gold/warm tones)
- 🎭 FLOATING DUST/SPARKLE particles in the light beams

📐 **FORMAT VERIFICATION CHECKLIST**:
✓ Canvas created: 1024×1024 pixels? (SQUARE)
✓ Width = 1024 pixels?
✓ Height = 1024 pixels?
✓ Ratio = 1:1? (SQUARE)

🎨 **3D RENDERING QUALITY**:
- 8K photorealistic CGI render quality
- Professional 3D studio lighting (3-point with dramatic key light)
- Product appears PREMIUM, LUXURIOUS, DESIRABLE
- Think: Roche Bobois, EURODESIGN, luxury furniture catalog
- Material textures emphasized (wood grain, fabric weave, metal sheen, glass reflections)

✨ **LIGHTING SPECIFICATIONS**:
- Main spotlight: Warm white from above-front
- Fill light: Soft blue/cool tones from sides
- Rim light: Golden accent on product edges
- Volumetric rays: Visible light beams in atmosphere
- Floor reflection: 40-60% opacity mirror effect

✅ QUALITY REQUIREMENTS:
- Product is the HERO - Large, centered, fills 70-80% of frame
- Ultra-realistic 3D CGI visualization
- Dark background makes product POP
- Luxury showroom atmosphere
- Ready for premium e-commerce/Google Shopping

OUTPUT: 1024x1024 pixel LUXURY 3D rendered product in dark showroom with dramatic lighting.
    `.trim();

    // 3D Generate prompt - CINEMATIC 3D with custom background (Creative Studio quality)
    const threeD_GeneratePrompt = `
🚨🚨🚨 FORMAT REQUIREMENT - READ THIS FIRST 🚨🚨🚨

${formatInstruction}

⚠️⚠️⚠️ CINEMATIC 3D PRODUCT VISUALIZATION MODE ⚠️⚠️⚠️

RECREATE this product as a STUNNING CINEMATIC 3D visualization with DRAMATIC effects.

The product is: "${productTitle || 'Unknown product'}"
${serpData?.dimensions ? `📏 Dimensions: ${serpData.dimensions}` : ''}
${serpData?.materials?.length > 0 ? `🪵 Materials: ${serpData.materials.join(', ')}` : ''}
${visionAiData?.description ? `👁️ Visual: ${visionAiData.description.slice(0, 150)}` : ''}
${productDescription ? `📝 Description: ${productDescription.slice(0, 200)}` : ''}

🎯 YOUR TASK - CINEMATIC 3D VISUALIZATION:
1. CREATE your ${targetDims.width}×${targetDims.height} canvas FIRST (${targetDims.ratio} ratio)
2. ANALYZE the product in the input image (shape, colors, materials, ALL details)
3. RECREATE it as a PHOTOREALISTIC 3D CGI model
4. Place it in a DRAMATIC ${backgroundStyle} environment with CINEMATIC LIGHTING
5. Ensure final output is EXACTLY ${targetDims.width}×${targetDims.height} pixels

🎨 **BACKGROUND STYLE**: ${styleInstruction}

🖼️ **MANDATORY CINEMATIC ELEMENTS**:
- 🌑 ${backgroundStyle === 'shopping' ? 'Dark elegant showroom with subtle gradient' : 'Beautiful ' + backgroundStyle + ' environment'}
- 🪞 GLOSSY FLOOR with MIRROR REFLECTION of product (marble, polished concrete, or glass)
- 💡 DRAMATIC KEY LIGHTING from above creating depth and drama
- ✨ FLOATING PARTICLES (sparkles, dust motes, or bokeh in light beams)
- 🔆 RIM LIGHTING on product edges (golden/warm accent)
- 🎭 VOLUMETRIC LIGHT RAYS visible in atmosphere

📸 **3D CGI QUALITY SPECIFICATIONS**:
- 8K photorealistic render quality
- Professional 3-point lighting setup:
  * Key light: Dramatic from above-front
  * Fill light: Soft from opposite side
  * Rim light: Accent on product edges
- Cinematic depth of field (slight background blur)
- Material textures emphasized and realistic
- Reflections and shadows add 3D depth

✨ **CREATIVE DIRECTION**:
- Product is the HERO - large, centered, DOMINATING the frame
- Make it look like a LUXURY BRAND advertisement
- Think: Roche Bobois, EURODESIGN, Apple product photography level
- Environment COMPLEMENTS the product perfectly
- Lighting creates DESIRE and PREMIUM feel
- NOT a simple photo edit - this is 3D CGI ART

⚠️ CRITICAL:
- Recreate the SAME product from the input (same shape, proportions, features)
- Render it as BEAUTIFUL 3D CGI visualization
- Add DRAMA with lighting, particles, and reflections

OUTPUT: ${targetDims.width}×${targetDims.height} pixel CINEMATIC 3D rendered product with dramatic lighting.
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

    // 🆕 Inject custom user prompt if provided
    if (customPrompt && customPrompt.trim()) {
      photographyPrompt += `

🎨 ADDITIONAL USER INSTRUCTIONS (VERY IMPORTANT):
${customPrompt.trim()}

Please incorporate these specific instructions into the final image generation while respecting all format and product requirements above.
`;
      console.log(`[white-bg] 🎨 Custom prompt injected into photography prompt`);
    }

    console.log(`[white-bg] 📝 Prompt generated (${photographyPrompt.length} chars)`);

    // Helper function to convert URL to base64
    async function imageUrlToBase64(url: string): Promise<string | null> {
      try {
        if (url.startsWith('data:')) {
          const match = url.match(/data:image\/[^;]+;base64,(.+)/);
          return match ? match[1] : null;
        }
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      } catch (error) {
        console.error("❌ Failed to convert image to base64:", error);
        return null;
      }
    }

    // 🆕 Helper function to try Gemini DIRECT (cheaper than Lovable AI)
    async function tryGeminiDirect(): Promise<{ imageUrl: string; model: string } | null> {
      const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
      if (!GOOGLE_GEMINI_API_KEY) {
        console.log("⚠️ GOOGLE_GEMINI_API_KEY not configured, skipping direct Gemini");
        return null;
      }

      try {
        console.log("📝 Trying Gemini Direct (cheaper)...");
        
        // Convert main image URL to base64
        const base64Image = await imageUrlToBase64(imageUrl);
        if (!base64Image) {
          console.error("❌ Failed to convert image to base64 for Gemini");
          return null;
        }

        // Determine mime type
        const mimeType = imageUrl.includes('.png') ? 'image/png' : 'image/jpeg';

        // 🆕 Build parts array with main image + gallery images for context
        const parts: any[] = [];
        
        // Add gallery context instruction if gallery images exist
        let promptWithGalleryContext = photographyPrompt;
        if (galleryImages && galleryImages.length > 0) {
          promptWithGalleryContext = `
🖼️ GALLERY REFERENCE IMAGES PROVIDED:
I'm providing ${galleryImages.length} additional reference images from this product's gallery. 
Use these to understand the product from multiple angles:
- Study ALL angles, colors, textures, and details from these reference images
- The product should look IDENTICAL to what you see in these images
- Pay attention to materials, finishes, and proportions visible in ALL angles

${photographyPrompt}
`;
          console.log(`[white-bg] 🖼️ Added ${galleryImages.length} gallery images to prompt context`);
        }
        
        parts.push({ text: promptWithGalleryContext });
        
        // Add main image (the one to process)
        parts.push({ 
          inlineData: { 
            mimeType: mimeType, 
            data: base64Image 
          } 
        });
        
        // 🆕 Add gallery images for context (limit to 4 for API limits)
        if (galleryImages && galleryImages.length > 0) {
          const galleryLimit = Math.min(galleryImages.length, 4);
          for (let i = 0; i < galleryLimit; i++) {
            const galleryUrl = galleryImages[i];
            if (galleryUrl && galleryUrl !== imageUrl) {
              const galleryBase64 = await imageUrlToBase64(galleryUrl);
              if (galleryBase64) {
                const galleryMime = galleryUrl.includes('.png') ? 'image/png' : 'image/jpeg';
                parts.push({
                  inlineData: {
                    mimeType: galleryMime,
                    data: galleryBase64
                  }
                });
                console.log(`[white-bg] 🖼️ Added gallery image ${i + 1}/${galleryLimit} for context`);
              }
            }
          }
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: parts
                }
              ],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"]
              }
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini Direct error (${response.status}):`, errorText);
          return null;
        }

        const data = await response.json();
        
        // Extract base64 image from Gemini response
        const responseParts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = responseParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
        
        if (!imagePart?.inlineData?.data) {
          console.error("⚠️ No image in Gemini Direct response");
          return null;
        }

        const generatedImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        
        console.log("✅ Gemini Direct succeeded (cheaper!)");
        return { imageUrl: generatedImageUrl, model: "gemini-2.0-flash-exp-image-generation (Direct)" };
      } catch (error) {
        console.error("❌ Gemini Direct exception:", error);
        return null;
      }
    }

    // Helper function to try Lovable AI (fallback)
    async function tryLovableAI(): Promise<{ imageUrl: string; model: string } | null> {
      try {
        console.log("📝 Trying Lovable AI (fallback)...");
        
        // 🆕 Build content array with gallery context
        const contentParts: any[] = [];
        
        let promptWithGalleryContext = photographyPrompt;
        if (galleryImages && galleryImages.length > 0) {
          promptWithGalleryContext = `
🖼️ GALLERY REFERENCE: ${galleryImages.length} additional product images provided for context.
Study ALL angles to understand the product's appearance from every side.

${photographyPrompt}
`;
        }
        
        contentParts.push({ type: "text", text: promptWithGalleryContext });
        contentParts.push({ type: "image_url", image_url: { url: imageUrl } });
        
        // Add gallery images (limit to 3 for API)
        if (galleryImages && galleryImages.length > 0) {
          const galleryLimit = Math.min(galleryImages.length, 3);
          for (let i = 0; i < galleryLimit; i++) {
            if (galleryImages[i] && galleryImages[i] !== imageUrl) {
              contentParts.push({ type: "image_url", image_url: { url: galleryImages[i] } });
            }
          }
        }
        
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
                content: contentParts
              }
            ],
            modalities: ["image", "text"]
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

    // Helper function to try OpenAI DALL-E with correct format dimensions
    async function tryOpenAI(): Promise<{ imageUrl: string; model: string } | null> {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      console.log(`[OpenAI] 🎯 Using size: ${targetDims.dalleSize} for format: ${formatKey}`);
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

        // Use DALL-E to generate the image with correct format dimensions
        console.log(`[DALL-E] 📐 Generating with size: ${targetDims.dalleSize}`);
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: `${enhancedPrompt}. Pure white background (#FFFFFF). Professional product photography. OUTPUT SIZE: ${targetDims.dalleSize} pixels (${targetDims.ratio} aspect ratio).`.substring(0, 4000),
            n: 1,
            size: targetDims.dalleSize,
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

    // Try providers in order: Gemini Direct (cheaper) → Lovable AI → OpenAI
    let result = await tryGeminiDirect();
    
    if (!result) {
      console.log("🔄 Gemini Direct failed, trying Lovable AI...");
      result = await tryLovableAI();
    }
    
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

    let { imageUrl: generatedImageUrl, model: usedModel } = result;
    const processingTime = Date.now() - startTime;
    console.log(`✅ White background generated successfully using ${usedModel}`, {
      processingTime: `${processingTime}ms`,
      productTitle,
      imageType,
      promptLength: photographyPrompt.length
    });

    // 🆕 POST-PROCESSING: Force exact format dimensions (Gemini ignores format instructions)
    if (generatedImageUrl.startsWith('data:')) {
      console.log(`[white-bg] 📐 Applying post-processing to enforce format: ${formatKey} (${targetDims.width}x${targetDims.height})`);
      generatedImageUrl = await enforceImageFormat(generatedImageUrl, targetDims.width, targetDims.height);
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

    // 🆕 AUTO-SYNC TO SHOPIFY
    let shopifySyncResult = null;
    if (product_id && user && finalImageUrl && !finalImageUrl.startsWith('data:')) {
      console.log(`[white-bg] 🚀 Auto-syncing to Shopify...`);
      shopifySyncResult = await autoSyncImageToShopify({
        productId: product_id,
        imageUrl: finalImageUrl,
        altText: productTitle || "Product image - white background",
        userId: user.id,
        autoSyncEnabled: body.autoSyncToShopify !== false // default true
      });
      
      if (shopifySyncResult.success && !shopifySyncResult.skipped) {
        console.log(`[white-bg] ✅ Auto-synced to Shopify: ${shopifySyncResult.shopifyImageId}`);
      } else if (shopifySyncResult.skipped) {
        console.log(`[white-bg] ⏭️ Shopify sync skipped: ${shopifySyncResult.skipReason}`);
      } else {
        console.error(`[white-bg] ❌ Shopify sync failed: ${shopifySyncResult.error}`);
      }
    }

    // ✅ CREATE HISTORY ENTRY for this AI-generated image
    // This ensures the image appears in the history panel with "is_current: true"
    if (product_id && user && finalImageUrl && !finalImageUrl.startsWith('data:')) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        // Find the product_image that was just created (if it exists)
        const { data: productImage } = await supabaseAdmin
          .from('product_images')
          .select('id')
          .eq('product_id', product_id)
          .eq('src', finalImageUrl)
          .maybeSingle();
        
        if (productImage) {
          // Get next version number
          const { data: maxVersion } = await supabaseAdmin.rpc('get_next_image_version', { 
            p_image_id: productImage.id 
          });
          
          // Create history entry
          const { error: historyError } = await supabaseAdmin
            .from('product_image_history')
            .insert({
              product_id: product_id,
              image_id: productImage.id,
              user_id: user.id,
              optimization_type: mode === 'lifestyle' ? 'ai_lifestyle' : 'ai_background',
              original_url: imageUrl, // Original source image
              optimized_url: finalImageUrl,
              version_number: maxVersion || 1,
              is_current: true,
              ai_model: usedModel,
              ai_prompt: photographyPrompt.slice(0, 500), // Store truncated prompt
            });
          
          if (historyError) {
            console.error('[white-bg] ⚠️ Failed to create history entry:', historyError);
          } else {
            console.log('[white-bg] ✅ History entry created for AI image');
          }
        } else {
          console.log('[white-bg] ⚠️ No product_image found to create history for');
        }
      } catch (historyErr) {
        console.error('[white-bg] ⚠️ Error creating history:', historyErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        usedProvider: usedModel,
        shopifySync: shopifySyncResult,
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
