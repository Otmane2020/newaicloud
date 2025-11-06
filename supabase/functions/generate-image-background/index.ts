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
    const { imageUrl, prompt, productType, style = "professional" } = await req.json();

    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "imageUrl et prompt sont requis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    console.log("🧠 Génération d'arrière-plan e-commerce avec Lovable AI pour :", productType);

    // --- Prompt IA ---
    const imagePrompt = `
Create a high-quality e-commerce product photo.

PRODUCT: ${productType || "general item"}
PROMPT: ${prompt}
STYLE: ${style}

PHOTOGRAPHY REQUIREMENTS:
- Professional lighting and realistic texture
- ${
      style === "professional"
        ? "Clean, white or soft neutral gradient studio background"
        : "Natural lifestyle scene with warm light and contextually realistic environment"
    }
- Product perfectly centered
- Sharp focus, subtle reflection or shadow beneath
- High resolution (1024×1024)
- No watermark, text or logo
- Suitable for Shopify, Amazon or Decora Home presentation
    `.trim();

    // --- Appel à Lovable AI (Gemini 2.5 Flash Image) ---
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
              { type: "text", text: imagePrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur Lovable AI :", response.status, errorText);
      throw new Error(`Erreur API Lovable AI ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Réponse Lovable AI reçue avec succès");

    // --- Extraction image base64 ---
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error("⚠️ Aucune image retournée :", JSON.stringify(data, null, 2));
      throw new Error("Aucune image générée — format de réponse inattendu.");
    }

    console.log("🎨 Arrière-plan généré avec succès pour :", productType);

    // --- Réponse finale ---
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productType,
          style,
          model: "google/gemini-2.5-flash-image-preview",
          generatedAt: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("💥 Erreur génération arrière-plan :", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Vérifiez l'URL de l'image et reformulez le prompt avec plus de détails visuels.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
