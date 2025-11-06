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
    const { imageUrl, productTitle, resolution = "2000x2000" } = await req.json();
    if (!imageUrl) throw new Error("Image URL is required");

    console.log("🧠 Generating pure white background for:", productTitle);

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 🧠 Build prompt
    const prompt = `
You are a professional product retoucher.
Your task is to remove the background and place the product on a pure white background (RGB 255,255,255).

PHOTOGRAPHY REQUIREMENTS:
- Resolution: ${resolution} pixels
- Product perfectly centered in the frame
- Soft studio lighting with subtle shadow
- Product occupies 75–85% of the image area
- Keep all fine details, colors, reflections and textures
- No crop, no distortion
- Output must look like a professional e-commerce photo
Product: ${productTitle || "product"}
    `.trim();

    // 🧩 Generate new image with Lovable AI (Gemini 2.5 Flash Image)
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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Lovable AI error:", response.status, errText);
      throw new Error(`Lovable AI error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) throw new Error("No image returned from Lovable AI.");

    console.log("✅ White background generated successfully");

    // Track usage: 1 image generation = 5 optimizations
    if (user) {
      try {
        await supabaseClient.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: 5
        });
        console.log("✅ Usage tracked: 5 optimizations");
      } catch (trackError) {
        console.error("⚠️ Failed to track usage:", trackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          model: "google/gemini-2.5-flash-image-preview",
          resolution,
          productTitle,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("💥 Error in generate-white-background:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        suggestion: "Try a higher-quality product photo or simpler background.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
