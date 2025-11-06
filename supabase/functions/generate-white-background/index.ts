import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    // 🪄 Fetch and convert input image to base64
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image (${imgResponse.status})`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = encodeBase64(new Uint8Array(imgBuffer));

    // 🧠 Build Gemini prompt
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

    // 🧩 Generate new image with Gemini 2.5 Flash Image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateImage?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ inline_data: { mime_type: "image/jpeg", data: base64Image } }, { text: prompt }],
            },
          ],
          generationConfig: { aspectRatio: "1:1" },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    const generatedBase64 =
      data.generatedImages?.[0]?.bytesBase64 || data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!generatedBase64) throw new Error("No image returned from Gemini.");

    const generatedImageUrl = `data:image/png;base64,${generatedBase64}`;
    console.log("✅ White background generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          model: "gemini-2.5-flash-image",
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
