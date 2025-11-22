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

// -----------------------------------------------------
// 🔥 Gemini Vision Call
// -----------------------------------------------------
async function callGeminiVision(prompt: string, imageData: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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

    if (!res.ok) {
      console.log("❌ Gemini error:", await res.text());
      throw new Error("GEMINI_FAILED");
    }

    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    throw new Error("GEMINI_FAILED");
  }
}

// -----------------------------------------------------
// 🔥 DeepSeek Fallback (vision multimodal)
// -----------------------------------------------------
async function callDeepSeek(prompt: string, imageData: string, apiKey: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-vl",
      messages: [
        { role: "system", content: "Return STRICT JSON only." },
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
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DEEPSEEK_ERROR_${res.status} - ${txt}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY");

    if (!DEEPSEEK_KEY) {
      throw new Error("DEEPSEEK_API_KEY not configured (fallback required).");
    }

    const body: VisionRequest = await req.json();
    const { imageUrl, productContext } = body;

    if (!imageUrl) throw new Error("imageUrl is required");

    // --------------------------------------------------
    //   BASE64 CONVERSION
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

    const contextInfo = productContext
      ? `Contexte: ${productContext.title || ""} ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    const prompt = `
Tu es un expert en vision IA spécialisé ecommerce.
Retourne **UNIQUEMENT un JSON strict**.

${contextInfo}

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
    //   GEMINI → FALLBACK DEEPSEEK
    // --------------------------------------------------

    let raw: string | null = null;

    if (GEMINI_KEY) {
      try {
        console.log("📡 Trying Gemini…");
        raw = await callGeminiVision(prompt, imageData, GEMINI_KEY);
        console.log("✅ Gemini succeeded");
      } catch {
        console.log("⚠️ Gemini FAILED → using DeepSeek");
      }
    }

    if (!raw) {
      raw = await callDeepSeek(prompt, imageData, DEEPSEEK_KEY);
      console.log("🔥 DeepSeek succeeded");
    }

    if (!raw) throw new Error("No analysis returned from any model");

    let parsed;
    try {
      parsed = JSON.parse(cleanJSON(raw));
    } catch (e) {
      console.error("❌ Parse error:", raw);
      throw new Error("Invalid JSON returned");
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...parsed,
        rawAnalysis: raw,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
