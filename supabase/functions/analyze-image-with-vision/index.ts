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
//  🔥 VISION VIA LOVABLE AI (Gemini 2.5 Pro)
// ---------------------------------------------------------
async function callLovableVision(prompt: string, imageData: string, apiKey: string) {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";

  const body = {
    model: "google/gemini-2.5-pro",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageData}` },
          },
        ],
      },
    ],
    modalities: ["image", "text"],
    temperature: 0.1,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Lovable Vision Error:", res.status, errorText);

    let isRegionRestricted = false;
    try {
      const parsedError = JSON.parse(errorText);
      const raw = parsedError?.error?.metadata?.raw;
      if (typeof raw === "string" && raw.includes("Image generation is not available in your country")) {
        isRegionRestricted = true;
      }
    } catch {
      // Ignore JSON parsing issues and fall back to generic error handling
    }

    if (isRegionRestricted) {
      throw new Error("VISION_REGION_RESTRICTED");
    }

    throw new Error(`VISION_FAILED_${res.status}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

// ---------------------------------------------------------
//  MAIN FUNCTION
// ---------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  try {
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
    // CALL LOVABLE VISION (Gemini 2.5 Pro)
    // ----------------------------------------------
    const raw = await callLovableVision(prompt, imageData, LOVABLE_KEY);
    if (!raw) throw new Error("No analysis returned from Lovable Vision");

    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch (err) {
      console.error("❌ Invalid JSON from Lovable Vision:", raw);
      throw new Error("Lovable Vision returned invalid JSON");
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const message = err?.message || "Unknown error";

    // Gracefully handle known region restriction errors without breaking the UI
    if (message === "VISION_REGION_RESTRICTED") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "VISION_REGION_RESTRICTED",
          message: "Image analysis is not available in your region.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
