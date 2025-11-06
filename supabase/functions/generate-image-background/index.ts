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

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    console.log("Generating e-commerce background for product:", productType);

    // Prompt optimisé pour l'e-commerce
    const enhancedPrompt = `
      EN: Create a professional e-commerce product background. ${prompt}
      - Keep the main product perfectly intact and unchanged
      - Create a clean, professional background suitable for online store
      - Use natural lighting and professional photography style
      - Ensure the background complements the product without distracting
      - Maintain high resolution and sharp product details
      - Background should be consistent with product type: ${productType || "general product"}
      
      FR: Créez un arrière-plan professionnel pour produit e-commerce. ${prompt}
      - Gardez le produit principal parfaitement intact et inchangé
      - Créez un arrière-plan propre et professionnel adapté à la vente en ligne
      - Utilisez un éclairage naturel et un style photographique professionnel
      - Assurez-vous que l'arrière-plan met en valeur le produit sans le distraire
      - Maintenez une haute résolution et des détails produits nets
      - L'arrière-plan doit être cohérent avec le type de produit : ${productType || "produit général"}
    `;

    // Fetch and convert image to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: enhancedPrompt,
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini Response received");

    // Extract generated image from Gemini response
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.error("No parts found in response:", data);
      throw new Error("No image generated - invalid API response");
    }

    // Find the image in the parts array
    let generatedImageBase64 = null;
    for (const part of parts) {
      if (part.inline_data?.data) {
        generatedImageBase64 = part.inline_data.data;
        break;
      }
    }

    if (!generatedImageBase64) {
      console.error("No image data found in response:", data);
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
