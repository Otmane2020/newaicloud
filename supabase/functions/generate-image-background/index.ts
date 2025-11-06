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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Generating e-commerce background with OpenAI gpt-image-1 for product:", productType);

    // Enhanced prompt for e-commerce
    const fullPrompt = `Professional e-commerce product photography: ${prompt}

Product type: ${productType || "general product"}
Style: High-quality professional e-commerce photography with clean, attractive background
Requirements:
- Professional studio lighting
- Clean, uncluttered background that complements the product
- Sharp focus and high resolution
- Commercial product photography style
- Background that enhances product appeal without distracting`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI image generated successfully");

    // Extract base64 image from OpenAI response
    const generatedImageBase64 = data.data?.[0]?.b64_json;

    if (!generatedImageBase64) {
      console.error("No image data in response:", data);
      throw new Error("No image generated");
    }

    // Convert base64 to data URL
    const generatedImageUrl = `data:image/png;base64,${generatedImageBase64}`;

    console.log("E-commerce background generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productType: productType,
          model: model,
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
