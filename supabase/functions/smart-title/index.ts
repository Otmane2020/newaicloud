import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -----------------------------
// CLEAN JSON
// -----------------------------
const cleanJSON = (t: string) =>
  t
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// -----------------------------
// 🟦 SAFE GEMINI VISION (NO CRASH)
// -----------------------------
async function safeGeminiVision(base64: string, prompt: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    const text = await res.text();

    // IMPORTANT: ne jamais throw -> éviter crash Supabase
    if (!res.ok) {
      console.log("⚠ Gemini Vision non-fatal:", text);
      return null;
    }

    const data = JSON.parse(text);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.log("⚠ Gemini Vision exception:", e);
    return null;
  }
}

// -----------------------------
// 🔥 DEEPSEEK VISION FALLBACK
// -----------------------------
async function deepseekVision(base64: string, prompt: string, apiKey: string) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-vl",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64}`,
            },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error("DeepSeek Vision error");

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "null";
}

// -----------------------------
// 🔥 DEEPSEEK TEXT
// -----------------------------
async function deepseekText(prompt: string, apiKey: string) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
  });

  if (!res.ok) throw new Error("DeepSeek error");

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// --------------------------------------------------
//                  MAIN FUNCTION
// --------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { productId, language = "fr" } = body;

    if (!productId) throw new Error("Product ID required");

    // LOAD PRODUCT
    const { data: product } = await supabase
      .from("shopify_products")
      .select("*, product_images(*)")
      .eq("id", productId)
      .single();

    const images = product.product_images || [];
    const primary = images.sort((a, b) => (a.position || 0) - (b.position || 0))[0];

    let visionAnalysis = null;

    // -------------------------------
    // DOWNLOAD IMAGE
    // -------------------------------
    if (primary?.src) {
      const img = await fetch(primary.src);
      const buf = await img.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);

      const visionPrompt = `
Analyse cette image et décris précisément:

- Construction (monobloc / avec pieds)
- Matériau du corps
- Matériau du piètement (si présent)
- Décoration (lignes dorées, motifs…)
- Forme
- Style
Réponds en phrases complètes.
`;

      // ESSAI GEMINI (NE CRASH JAMAIS)
      if (GEMINI_KEY) {
        visionAnalysis = await safeGeminiVision(base64, visionPrompt, GEMINI_KEY);
      }

      // FALLBACK
      if (!visionAnalysis) {
        visionAnalysis = await deepseekVision(base64, visionPrompt, DEEPSEEK_KEY);
      }

      console.log("VISION FINAL:", visionAnalysis);
    }

    // PRODUCT ANALYSIS
    const analysisPrompt = `
Analyse ce produit et retourne un JSON strict:
Titre: ${product.title}
Type: ${product.product_type}
Description: ${product.body_html}

Retourne:
{
 "category": "",
 "materials": [],
 "style": "",
 "features": [],
 "selling_points": []
}`;

    const analysis = await deepseekText(analysisPrompt, DEEPSEEK_KEY);
    const parsed = JSON.parse(cleanJSON(analysis));

    // TITLE
    const titlePrompt = `
Génère un TITRE ULTRA SEO basé sur:

IMAGE:
${visionAnalysis}

TEXTE:
${JSON.stringify(parsed)}

RÈGLES:
- 80 caractères max
- Majuscule à chaque mot
- Français pur
- Format: Catégorie + Forme + Couleur + Matériau + [Pieds si présents] + Style
Pas de virgules ni guillemets.

Retourne:
UN SEUL TITRE.
`;

    let title = (await deepseekText(titlePrompt, DEEPSEEK_KEY)).trim();
    title = title.replace(/^["']|["']$/g, "");

    if (title.length > 80) {
      title = title.slice(0, title.lastIndexOf(" "));
    }

    return new Response(
      JSON.stringify({
        success: true,
        optimizedTitle: title,
        visionAnalysis,
        deepseekAnalysis: parsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
