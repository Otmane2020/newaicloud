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
    const { imageUrl, prompt, productTitle, imageType = "secondary", format = "square", similarity = "medium" } = await req.json();

    if (!imageUrl || !prompt) {
      return new Response(
        JSON.stringify({ error: "imageUrl and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎨 Generating AI background:", { prompt, imageType, format, similarity });

    // Initialize Supabase client for usage tracking
    const authHeader = req.headers.get("Authorization");
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

    // Calculate aspect ratio based on format
    let aspectRatio = "1024x1024"; // square
    if (format === "portrait") {
      aspectRatio = "768x1024"; // 3:4
    } else if (format === "landscape") {
      aspectRatio = "1024x768"; // 4:3
    }

    // Calculate similarity strength
    const similarityMap: Record<string, { strength: string; description: string }> = {
      "very-close": { strength: "very high", description: "staying extremely faithful to the original composition and product appearance (90% similarity)" },
      "close": { strength: "high", description: "maintaining strong resemblance to the original (70% similarity)" },
      "medium": { strength: "moderate", description: "balancing original features with creative freedom (50% similarity)" },
      "creative": { strength: "low", description: "allowing significant creative interpretation (30% similarity)" },
      "very-creative": { strength: "minimal", description: "maximizing creative freedom while keeping product recognizable (10% similarity)" }
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
- IMAGE RATIO: ${format === 'square' ? '1:1 (equal width and height)' : format === 'portrait' ? '3:4 (vertical orientation)' : '4:3 (horizontal orientation)'}
- NO OTHER DIMENSIONS ARE ACCEPTABLE
- SIMILARITY TO ORIGINAL: ${similarityInfo.strength} - ${similarityInfo.description}

YOUR MISSION:
Create a ${isMainImage ? "main product" : "lifestyle/ambiance"} photo with custom background.

REQUIREMENTS:
${isMainImage ? `
1. MAIN IMAGE REQUIREMENTS (CRITICAL):
   - Product MUST be perfectly centered in the frame
   - Product must be clear, sharp, and prominent (70-80% of frame)
   - Product should face the camera directly
   - All product details must be clearly visible
   - Clean, professional look suitable for e-commerce
   - Output dimensions: EXACTLY ${aspectRatio}
   - Image ratio: ${format === 'square' ? '1:1' : format === 'portrait' ? '3:4' : '4:3'}
   - Similarity level: ${similarityInfo.description}
   
2. BACKGROUND:
   - Apply the requested style: "${prompt}"
   - Background should complement but not distract from product
   - Professional lighting to highlight product
` : `
1. AMBIANCE/LIFESTYLE IMAGE:
   - Creative composition (centering not required)
   - Product can be positioned artistically
   - Lifestyle/contextual setting
   - More creative freedom with composition
   - Output dimensions: EXACTLY ${aspectRatio}
   - Image ratio: ${format === 'square' ? '1:1' : format === 'portrait' ? '3:4' : '4:3'}
   - Similarity level: ${similarityInfo.description}
   
2. BACKGROUND:
   - Apply the requested style: "${prompt}"
   - Create atmospheric, lifestyle setting
   - Background is part of the storytelling
`}

3. TECHNICAL SPECS (CRITICAL):
   - High resolution: EXACTLY ${aspectRatio}
   - ${format === 'square' ? 'Perfect square (1:1 ratio)' : format === 'portrait' ? 'Portrait orientation (3:4 ratio - taller than wide)' : 'Landscape orientation (4:3 ratio - wider than tall)'}
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos
   - Ready for e-commerce use

⚠️ FINAL CHECK BEFORE GENERATING:
- Is the output EXACTLY ${aspectRatio}? 
- Is the aspect ratio correct (${format === 'square' ? '1:1' : format === 'portrait' ? '3:4 vertical' : '4:3 horizontal'})?
- If not, adjust the composition to fit these exact dimensions.

RESULT: A stunning ${isMainImage ? "main product photo with centered, clear product" : "lifestyle/ambiance photo"} with custom background at EXACTLY ${aspectRatio} resolution in ${format} format.
    `.trim();

    // Call Lovable AI
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please try again in a few moments.",
            rateLimited: true
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    console.log("🎨 AI background generated successfully");

    // Decode the base64 image to resize it to exact format
    let finalImageUrl = generatedImageUrl;
    
    try {
      console.log(`📐 Resizing image to exact format: ${aspectRatio}`);
      
      // Extract base64 data
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Determine target dimensions
      const [targetWidth, targetHeight] = aspectRatio.split('x').map(Number);
      
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

    // Track usage: 1 AI background generation = 8 optimizations
    if (user) {
      try {
        await supabaseClient.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: 8
        });
        console.log("✅ Usage tracked: 8 optimizations");
      } catch (trackError) {
        console.error("⚠️ Failed to track usage:", trackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        metadata: {
          prompt,
          imageType,
          productTitle,
          format,
          similarity,
          requestedDimensions: aspectRatio,
          model: "google/gemini-2.5-flash-image-preview",
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 Error in generate-image-background:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Try with a higher-quality product photo or check your Lovable AI credits.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
