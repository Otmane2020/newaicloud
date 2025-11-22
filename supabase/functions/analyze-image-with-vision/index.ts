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

function cleanJSON(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

// --------------------------------------------------
//  GEMINI VISION ONLY  — No DeepSeek, No image_url
// --------------------------------------------------
async function callGeminiVision(prompt: string, imageData: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const body = {
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
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Gemini Vision Error:", await res.text());
    throw new Error("GEMINI_FAILED");
  }

  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ENV
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const body: VisionRequest = await req.json();
    const { imageUrl, productContext } = body;

    if (!imageUrl) throw new Error("imageUrl is required");

    // --------------------------------------------------
    // Convert Image → Base64
    // --------------------------------------------------
    let imageData = "";

    if (imageUrl.startsWith("data:image")) {
      imageData = imageUrl.split(",")[1];
    } else {
      const r = await fetch(imageUrl);
      if (!r.ok) throw new Error("Cannot fetch image");

      const buf = await r.arrayBuffer();
      const bytes = new Uint8Array(buf);

      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      imageData = btoa(binary);
    }

    const ctx = productContext
      ? `Contexte: ${productContext.title || ""} ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    // --------------------------------------------------
    // Prompt JSON STRICT
    // --------------------------------------------------
    const prompt = `
Tu es un expert en vision IA spécialisé ecommerce.
Retourne **UNIQUEMENT un JSON strict**, rien d'autre.

${ctx}

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

    // --------------------------------------------------
    // CALL GEMINI
    // --------------------------------------------------
    const raw = await callGeminiVision(prompt, imageData, GEMINI_KEY);
    if (!raw) throw new Error("No analysis returned from Gemini");

    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch {
      console.error("❌ JSON parse error from Gemini:", raw);
      throw new Error("Invalid JSON returned by Gemini");
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
