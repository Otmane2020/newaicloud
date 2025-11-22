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

// ---------------------------------------------------------
//  🔥 OPENAI GPT-4o Vision
// ---------------------------------------------------------
async function callOpenAIVision(prompt: string, imageData: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content:
            "You are an expert vision model specialized in ecommerce product analysis. Always output strict JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageData}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI Vision Error:", await res.text());
    throw new Error("OPENAI_VISION_FAILED");
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

// ---------------------------------------------------------
//  MAIN FUNCTION
// ---------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not configured");

    const body: VisionRequest = await req.json();
    const { imageUrl, productContext } = body;
    if (!imageUrl) throw new Error("imageUrl is required");

    // ----------------------------------------------
    // Convert to Base64
    // ----------------------------------------------
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
      ? `Contexte produit: ${productContext.title || ""} ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    // ----------------------------------------------
    // Prompt JSON strict
    // ----------------------------------------------
    const prompt = `
Analyse cette image d'un produit ecommerce et retourne STRICTEMENT un JSON.

${ctx}

JSON attendu :

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
}

Retourne uniquement du JSON valide.
`;

    // ----------------------------------------------
    // CALL OPENAI VISON
    // ----------------------------------------------
    const raw = await callOpenAIVision(prompt, imageData, OPENAI_KEY);
    if (!raw) throw new Error("No analysis returned from OpenAI Vision");

    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch (err) {
      console.error("❌ Invalid JSON from OpenAI:", raw);
      throw new Error("OpenAI returned invalid JSON");
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
