import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== MAIN FUNCTION =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      article_id,
      collection_id,
      product_type,
      style = "professional",
      type = "white",
    } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CONFIG ---
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY non configurée");
    }

    console.log("🧠 Generating Gemini image for:", prompt);

    // --- IMPROVED PROMPT ---
    const enhancedPrompt = `
You are a professional e-commerce photographer.

GOAL:
Generate a high-quality, realistic product photo for an online store.

PRODUCT:
${prompt}

CATEGORY: ${product_type || "general home decor"}
STYLE: ${style}

REQUIREMENTS:
- Square format (1:1)
- Resolution 1024x1024 or higher
- ${
      type === "white"
        ? "Pure white background (RGB 255,255,255), subtle ground shadow."
        : "Realistic lifestyle background (natural light, elegant room setting)."
    }
- Professional studio lighting
- Realistic texture, natural shadows, perfect focus
- No watermark, text, border or logo
- Commercial-grade quality, suitable for Shopify or Amazon
    `.trim();

    // --- GEMINI IMAGE GENERATION ---
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateImage?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: enhancedPrompt }],
            },
          ],
          generationConfig: { aspectRatio: "1:1" },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de taux dépassée. Réessayez dans quelques secondes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Erreur API Gemini: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Gemini response received");

    // --- EXTRACT IMAGE BASE64 ---
    const base64Image =
      data.generatedImages?.[0]?.bytesBase64 || data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!base64Image) {
      console.error("❌ Aucune image détectée :", JSON.stringify(data, null, 2));
      throw new Error("Aucune image générée - format inattendu.");
    }

    const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));

    // --- SUPABASE UPLOAD ---
    let publicUrl = null;
    let storageMetadata = null;

    if (collection_id || article_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const filename = `gemini_${collection_id || "product"}_${article_id || "img"}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage.from("generated-images").upload(filename, imageBuffer, {
          contentType: "image/png",
        });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("generated-images").getPublicUrl(filename);
          publicUrl = urlData.publicUrl;
          storageMetadata = {
            filename,
            bucket: "generated-images",
            uploaded_at: new Date().toISOString(),
          };
          console.log("☁️ Upload réussi:", filename);
        } else {
          console.error("Erreur upload Supabase:", uploadError);
        }
      }
    }

    // --- SUCCESS RESPONSE ---
    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl || `data:image/png;base64,${base64Image}`,
        metadata: {
          model: "gemini-2.5-flash-image",
          product_type,
          style,
          format: "square",
          resolution: "1024x1024",
          generated_at: new Date().toISOString(),
          storage: storageMetadata,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Image generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        suggestion: "Vérifiez votre prompt ou essayez un texte plus précis (couleur, matériau, ambiance).",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
