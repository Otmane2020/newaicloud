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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: enhancedPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high", // Pour une meilleure qualité d'image
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));

    // Extraction améliorée de l'URL de l'image
    let generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Alternative extraction path
    if (!generatedImageUrl && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (imageMatch) {
        generatedImageUrl = imageMatch[1];
      }
    }

    if (!generatedImageUrl) {
      console.error("No image URL found in response:", data);
      throw new Error("No image generated - check the API response format");
    }

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
