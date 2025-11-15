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
    const { imageUrl, productTitle, style = "contextual", imageType = "primary" } = await req.json();

    if (!imageUrl || !productTitle) {
      return new Response(
        JSON.stringify({ error: "imageUrl and productTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎨 Generating beautiful contextual background for:", productTitle, "imageType:", imageType);

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

    // Create contextual prompt based on product title and image type
    const isMainImage = imageType === "primary";
    const contextualPrompt = `
You are a professional e-commerce product photographer with expertise in creating stunning product images.

PRODUCT: ${productTitle}
IMAGE TYPE: ${isMainImage ? "MAIN PRODUCT IMAGE" : "SECONDARY/LIFESTYLE IMAGE"}

YOUR MISSION:
Create a beautiful, high-quality product photo with a contextual background that complements and enhances the product.

REQUIREMENTS:
${isMainImage ? `
1. MAIN IMAGE REQUIREMENTS (CRITICAL):
   - Product MUST be perfectly centered and sharp
   - Product occupies 70-80% of the frame
   - Product should face the camera directly
   - All product details must be clearly visible
   - Preserve all product details, textures, and colors
   - Natural product shadows for depth
   - Clean, professional look suitable for main product listing
` : `
1. LIFESTYLE/AMBIANCE IMAGE:
   - Creative composition (centering not mandatory)
   - Product can be positioned artistically
   - More creative freedom with framing and angles
   - Contextual, lifestyle setting
   - Preserve product details but focus on atmosphere
`}

2. BACKGROUND STYLE - ELEGANT & TRENDY (NEVER WHITE):
   - Create a beautiful, elegant, and trendy background that relates to "${productTitle}"
   - Use sophisticated color palettes (jewel tones, earth tones, pastels, etc.)
   - Add depth with subtle bokeh, gradient effects, or premium textures
   - Background should enhance product luxury and appeal
   - Think high-end editorial photography style
   - NEVER use plain white background (there's a separate function for that)
   - CREATE CONTEXTUAL LIFESTYLE SCENES with decorative elements:
     * Furniture → Place in beautifully styled room with complementary pieces (sofa, cushions, plants, art)
     * Kitchen products → Modern kitchen counter with fresh ingredients, elegant dishware
     * Tech gadgets → Stylish desk with books, coffee, plants, warm lighting
     * Fashion → Boutique atmosphere with mirrors, hangers, elegant textures
     * Food items → Attractive table setting with plates, utensils, mood lighting
     * Home accessories → Cozy living space with harmonious decor
   - Examples: marble textures, velvet surfaces, wooden aesthetics, soft gradients, lifestyle settings

3. TECHNICAL SPECS:
   - Square format (1024×1024)
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos
   - Ready for ${isMainImage ? "main product listing (Shopify/Amazon)" : "lifestyle/gallery display"}

4. CREATIVE DIRECTION:
   - If product is food: warm, appetizing environment with elegant plating
   - If product is tech: modern, sleek setting with premium materials
   - If product is fashion: elegant, stylish backdrop with luxury feel
   - If product is home decor: cozy, sophisticated lifestyle scene
   - Match the mood to the product category with upscale aesthetic

RESULT: A stunning, professional ${isMainImage ? "main product photo with centered, clear product" : "lifestyle/ambiance photo"} that looks like it was shot by a top e-commerce photographer for a luxury brand.
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
              { type: "text", text: contextualPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"],
        generationConfig: {
          aspectRatio: "1:1"
        }
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

    console.log("🎨 Beautiful background generated successfully");

    // Track usage: fond blanc = 3 optimizations, arrière-plan IA = 5 optimizations
    if (user) {
      try {
        const optimizationCost = style === "white" ? 3 : 5;
        await supabaseClient.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: optimizationCost
        });
        console.log(`✅ Usage tracked: ${optimizationCost} optimizations (${style})`);
      } catch (trackError) {
        console.error("⚠️ Failed to track usage:", trackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productTitle,
          style,
          imageType,
          model: "google/gemini-2.5-flash-image-preview",
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 Error in generate-product-background:", error);
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
