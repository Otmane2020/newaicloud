import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { detectContentLanguage, resolveLanguage, getLanguageInstructions, getGenerationLanguage } from "../_shared/language-detector.ts";

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
// 🟦 LOVABLE AI VISION (NO CRASH)
// -----------------------------
async function safeLovableVision(base64: string, prompt: string, apiKey: string) {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log("⚠ Lovable AI Vision non-fatal:", res.status, text);
      
      if (res.status === 429) {
        console.log("⚠ Rate limit exceeded");
      } else if (res.status === 402) {
        console.log("⚠ Payment required");
      }
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log("⚠ Lovable AI Vision exception:", e);
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

// Language-specific vision prompts
function getVisionPrompt(lang: string): string {
  const prompts: Record<string, string> = {
    fr: `Analyse cette image et décris précisément:
- Construction (monobloc / avec pieds)
- Matériau du corps
- Matériau du piètement (si présent)
- Décoration (lignes dorées, motifs…)
- Forme
- Style
Réponds en phrases complètes en français.`,
    en: `Analyze this image and describe precisely:
- Construction (single piece / with legs)
- Body material
- Base material (if present)
- Decoration (gold lines, patterns…)
- Shape
- Style
Answer in complete sentences in English.`,
    de: `Analysiere dieses Bild und beschreibe genau:
- Konstruktion (einteilig / mit Beinen)
- Korpusmaterial
- Gestell-Material (falls vorhanden)
- Dekoration (goldene Linien, Muster…)
- Form
- Stil
Antworte in vollständigen Sätzen auf Deutsch.`,
    es: `Analiza esta imagen y describe con precisión:
- Construcción (monobloque / con patas)
- Material del cuerpo
- Material de la base (si está presente)
- Decoración (líneas doradas, patrones…)
- Forma
- Estilo
Responde en oraciones completas en español.`,
    it: `Analizza questa immagine e descrivi con precisione:
- Costruzione (monoblocco / con gambe)
- Materiale del corpo
- Materiale della base (se presente)
- Decorazione (linee dorate, motivi…)
- Forma
- Stile
Rispondi in frasi complete in italiano.`,
  };
  return prompts[lang] || prompts.fr;
}

// Language-specific title prompts
function getTitlePrompt(lang: string, visionAnalysis: string | null, parsed: any): string {
  const prompts: Record<string, string> = {
    fr: `Génère un TITRE ULTRA SEO basé sur:

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
UN SEUL TITRE.`,
    en: `Generate an ULTRA SEO TITLE based on:

IMAGE:
${visionAnalysis}

TEXT:
${JSON.stringify(parsed)}

RULES:
- 80 characters max
- Capitalize each word
- Pure English
- Format: Category + Shape + Color + Material + [Legs if present] + Style
No commas or quotes.

Return:
A SINGLE TITLE.`,
    de: `Generiere einen ULTRA SEO TITEL basierend auf:

BILD:
${visionAnalysis}

TEXT:
${JSON.stringify(parsed)}

REGELN:
- Maximal 80 Zeichen
- Jeden Wort großschreiben
- Reines Deutsch
- Format: Kategorie + Form + Farbe + Material + [Beine falls vorhanden] + Stil
Keine Kommas oder Anführungszeichen.

Gib zurück:
EINEN EINZIGEN TITEL.`,
    es: `Genera un TÍTULO ULTRA SEO basado en:

IMAGEN:
${visionAnalysis}

TEXTO:
${JSON.stringify(parsed)}

REGLAS:
- Máximo 80 caracteres
- Capitalizar cada palabra
- Español puro
- Formato: Categoría + Forma + Color + Material + [Patas si las hay] + Estilo
Sin comas ni comillas.

Devuelve:
UN SOLO TÍTULO.`,
    it: `Genera un TITOLO ULTRA SEO basato su:

IMMAGINE:
${visionAnalysis}

TESTO:
${JSON.stringify(parsed)}

REGOLE:
- Massimo 80 caratteri
- Prima lettera maiuscola per ogni parola
- Italiano puro
- Formato: Categoria + Forma + Colore + Materiale + [Gambe se presenti] + Stile
Nessuna virgola o virgolette.

Restituisci:
UN SOLO TITOLO.`,
  };
  return prompts[lang] || prompts.fr;
}

// --------------------------------------------------
//                  MAIN FUNCTION
// --------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Safe HealthCheck handler
  const bodyCheck = await req.json().catch(() => ({}));
  if (bodyCheck?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { productId, language: explicitLang } = bodyCheck;

    if (!productId) throw new Error("Product ID required");

    // LOAD PRODUCT with store language
    const { data: product } = await supabase
      .from("shopify_products")
      .select("*, product_images(*), shopify_connections!inner(store_language)")
      .eq("id", productId)
      .single();

    // 🌍 Detect language from product title (priority) or fallback to store language
    const storeLanguage = (product as any)?.shopify_connections?.store_language || "fr-FR";
    const contentText = `${product.title || ''} ${product.body_html || ''}`;
    const language = resolveLanguage({
      explicitLanguage: explicitLang,
      contentText: contentText,
      storeLanguage: storeLanguage
    });
    console.log(`🌍 [smart-title] Using language: ${language} (detected from: ${product.title?.substring(0, 50)}...)`);

    const images = product.product_images || [];
    const primary = images.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[0];

    let visionAnalysis = null;

    // -------------------------------
    // DOWNLOAD IMAGE
    // -------------------------------
    if (primary?.src) {
      const img = await fetch(primary.src);
      const buf = await img.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);

      const visionPrompt = getVisionPrompt(language);

      // ESSAI LOVABLE AI (NE CRASH JAMAIS)
      if (LOVABLE_KEY) {
        visionAnalysis = await safeLovableVision(base64, visionPrompt, LOVABLE_KEY);
      }

      // FALLBACK
      if (!visionAnalysis && DEEPSEEK_KEY) {
        visionAnalysis = await deepseekVision(base64, visionPrompt, DEEPSEEK_KEY);
      }

      console.log("VISION FINAL:", visionAnalysis);
    }

    // PRODUCT ANALYSIS - Language-aware
    const analysisPrompts: Record<string, string> = {
      fr: `Analyse ce produit et retourne un JSON strict:
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
}`,
      en: `Analyze this product and return a strict JSON:
Title: ${product.title}
Type: ${product.product_type}
Description: ${product.body_html}

Return:
{
 "category": "",
 "materials": [],
 "style": "",
 "features": [],
 "selling_points": []
}`,
    };

    const analysisPrompt = analysisPrompts[language] || analysisPrompts.fr;
    const analysis = await deepseekText(analysisPrompt, DEEPSEEK_KEY);
    const parsed = JSON.parse(cleanJSON(analysis));

    // TITLE - Language-specific
    const titlePrompt = getTitlePrompt(language, visionAnalysis, parsed);
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
        language: language,
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
