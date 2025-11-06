import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt, model = "google/gemini-2.5-flash-image-preview", productType } = await req.json();

    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    console.log("Generating e-commerce background with Google Gemini for product:", productType);

    // Enhanced prompt for e-commerce
    const imagePrompt = `Professional e-commerce product photography: ${prompt}

Product type: ${productType || "general product"}
Style: High-quality professional e-commerce photography with clean, attractive background
Requirements:
- Professional studio lighting
- Clean, commercial-ready composition  
- High resolution suitable for e-commerce
- Product-focused framing
- Commercial product photography style
- Background that enhances product appeal without distracting`;

    // Fetch and convert image to base64
    const imgResponse = await fetch(imageUrl);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: base64Image } },
              { text: imagePrompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["image"]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Gemini error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Google Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Google Gemini image generated successfully");

    // Extract base64 image from Gemini response
    const generatedBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!generatedBase64) {
      console.error("No image data in response:", data);
      throw new Error("No background generated");
    }

    const generatedImageUrl = `data:image/png;base64,${generatedBase64}`;

    console.log("E-commerce background generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productType: productType,
          model: "google/gemini-2.5-flash-image-preview",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error generating e-commerce background:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
        suggestion: "Please check your image URL and try again with a more specific prompt",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
