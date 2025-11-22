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
//  🔥 VISION VIA VERTEX AI (Gemini Pro Vision)
// ---------------------------------------------------------
async function callVertexAIVision(
  prompt: string, 
  imageData: string, 
  apiKey: string,
  projectId: string
) {
  const location = "us-central1"; // ou europe-west1
  const model = "gemini-1.5-pro-002";
  
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageData
            }
          }
        ]
      }
    ],
    generation_config: {
      temperature: 0.1,
      max_output_tokens: 2048,
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Vertex AI Vision Error:", res.status, errorText);
    throw new Error(`VERTEX_VISION_FAILED_${res.status}`);
  }

  const json = await res.json();
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  return content;
}

// ---------------------------------------------------------
//  MAIN FUNCTION
// ---------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERTEX_API_KEY = Deno.env.get("VERTEX_AI_API_KEY");
    const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
    
    if (!VERTEX_API_KEY) throw new Error("VERTEX_AI_API_KEY not configured");
    if (!GOOGLE_PROJECT_ID) throw new Error("GOOGLE_CLOUD_PROJECT_ID not configured");

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
    // CALL VERTEX AI VISION
    // ----------------------------------------------
    const raw = await callVertexAIVision(prompt, imageData, VERTEX_API_KEY, GOOGLE_PROJECT_ID);
    if (!raw) throw new Error("No analysis returned from Vertex AI Vision");

    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch (err) {
      console.error("❌ Invalid JSON from Vertex AI Vision:", raw);
      throw new Error("Vertex AI Vision returned invalid JSON");
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
