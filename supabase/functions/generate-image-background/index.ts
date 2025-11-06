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

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY non configurée");
    }

    console.log("🧠 Génération d'arrière-plan e-commerce avec Gemini pour :", productType);

    // 🪄 Prompt amélioré
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
- High resolution (1024x1024)
- No watermark, text or logo
- Suitable for Shopify, Amazon or Decora Home presentation
    `.trim();

    // 🔄 Convert image input en base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Impossible de télécharger l'image source : ${imageResponse.status}`);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));

    // 🧠 Appel à Google Gemini (vrai modèle d'image)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateImage?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ inline_data: { mime_type: "image/jpeg", data: base64Image } }, { text: imagePrompt }],
            },
          ],
          generationConfig: { aspectRatio: "1:1" },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur Gemini:", response.status, errorText);
      throw new Error(`Erreur API Gemini ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Réponse Gemini reçue avec succès");

    // 🖼️ Extraction image base64
    const generatedBase64 =
      data.generatedImages?.[0]?.bytesBase64 || data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!generatedBase64) {
      console.error("⚠️ Aucune image retournée :", JSON.stringify(data, null, 2));
      throw new Error("Aucune image générée - format de réponse inattendu.");
    }

    const generatedImageUrl = `data:image/png;base64,${generatedBase64}`;

    console.log("🎨 Arrière-plan généré avec succès pour:", productType);

    // ✅ Réponse finale
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productType,
          style,
          model: "google/gemini-2.5-flash-image",
          generatedAt: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("💥 Erreur génération arrière-plan:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Vérifiez l'URL de l'image et reformulez le prompt avec plus de détails visuels.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
