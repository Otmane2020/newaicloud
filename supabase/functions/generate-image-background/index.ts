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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating e-commerce background with Lovable AI for product:", productType);

    // Enhanced prompt for e-commerce
    const imagePrompt = `Professional e-commerce product photography: ${prompt}

Product type: ${productType || "general product"}
Style: High-quality professional e-commerce photography with clean, attractive background
Requirements:
- Professional studio lighting
- Clean, uncluttered background that complements the product
- Sharp focus and high resolution
- Commercial product photography style
- Background that enhances product appeal without distracting`;

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
              {
                type: "text",
                text: imagePrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits depleted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Lovable AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Lovable AI image generated successfully");

    // Extract image from Lovable AI response
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error("No image data in response:", data);
      throw new Error("No image generated");
    }

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
