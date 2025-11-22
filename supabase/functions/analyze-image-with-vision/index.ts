import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionRequest {
  imageUrl: string;
  productContext?: {
    title?: string;
    category?: string;
    type?: string;
  };
}

// Nettoyage du JSON (supprime les ``` et texte parasite)
function cleanJSON(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const body: VisionRequest = await req.json();
    const { imageUrl, productContext } = body;

    if (!imageUrl) throw new Error("imageUrl is required");

    console.log(`🔍 Analyzing image with Gemini Vision…`);

    // -----------------------------------------
    // 🔄 CONVERT IMAGE TO BASE64
    // -----------------------------------------
    let imageData = "";

    if (imageUrl.startsWith("data:image")) {
      imageData = imageUrl.split(",")[1];
    } else {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);

      const buffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Chunk conversion → évite crash UTF-16
      let binary = "";
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }

      imageData = btoa(binary);
    }

    const contextInfo = productContext
      ? `\nContexte produit: ${productContext.title || ""} ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    // -----------------------------------------
    // 📌 PROMPT
    // -----------------------------------------
    const prompt = `
Tu es un expert en vision IA spécialisé ecommerce.
Analyse l’image et retourne **UNIQUEMENT un JSON valide**.

${contextInfo}

Exige JSON strict :
{
  "visualAttributes": {
    "primaryColor": "string",
    "secondaryColors": ["string"],
    "materials": ["string"],
    "style": ["string"],
    "finish": "string",
    "texture": "string",
    "roomType": ["string"],
    "features": ["string"],
    "technicalDimensions": {
      "length": number | null,
      "length_unit": "string" | null,
      "width": number | null,
      "width_unit": "string" | null,
      "height": number | null,
      "height_unit": "string" | null,
      "diameter": number | null,
      "diameter_unit": "string" | null,
      "depth": number | null,
      "depth_unit": "string" | null,
      "weight": number | null,
      "weight_unit": "string" | null
    }
  },
  "visualContext": {
    "hasTechnicalSchema": boolean,
    "presentationQuality": number,
    "craftmanshipLevel": "standard" | "premium" | "luxury",
    "lightingType": "string",
    "backgroundStyle": "string"
  },
  "confidence": number
}`;

    // -----------------------------------------
    // 📡 GEMINI VISION CALL
    // -----------------------------------------
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageData,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      console.error(await geminiRes.text());
      throw new Error("Gemini Vision failed");
    }

    const geminiJSON = await geminiRes.json();
    const raw = geminiJSON?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!raw) throw new Error("Empty response from Gemini");

    // -----------------------------------------
    // 🧹 CLEAN + PARSE JSON
    // -----------------------------------------
    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch (e) {
      console.error("JSON PARSE ERROR:", raw);
      throw new Error("Invalid JSON from Gemini");
    }

    return new Response(
      JSON.stringify({
        success: true,
        visualAttributes: parsed.visualAttributes,
        visualContext: parsed.visualContext,
        confidence: parsed.confidence,
        rawAnalysis: raw,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("❌ Vision analysis error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
