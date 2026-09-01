import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { resolveLanguage } from "../_shared/language-detector.ts";
import { routeAI, routeVision } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanJSON = (text: string) =>
  text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function aiTextWithFallback(prompt: string): Promise<string> {
  const result = await routeAI({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1200,
    temperature: 0.3,
  });
  console.log(`[smart-title] text provider=${result.provider} model=${result.model}`);
  return result.content;
}

function generateSimpleTitle(product: any, language: string): string {
  const type = product.product_type || "";
  const originalTitle = product.title || "";
  const keywords = originalTitle
    .split(/\s+/)
    .filter((word: string) => word.length > 3 && !/^[0-9]+$/.test(word))
    .slice(0, 4)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (language === "fr") {
    return type ? `${type} ${keywords}`.trim() : keywords;
  }
  return type ? `${keywords} ${type}`.trim() : keywords;
}

function getVisionPrompt(lang: string): string {
  const prompts: Record<string, string> = {
    fr: `Analyse cette image et décris précisément :
- Construction (monobloc / avec pieds)
- Matériau du corps
- Matériau du piètement (si présent)
- Décoration (lignes dorées, motifs…)
- Forme
- Style
N'invente aucun attribut invisible. Réponds en phrases complètes en français.`,
    en: `Analyze this image and describe precisely:
- Construction (single piece / with legs)
- Body material
- Base material (if present)
- Decoration (gold lines, patterns…)
- Shape
- Style
Do not invent attributes that are not visible. Answer in complete sentences in English.`,
    de: `Analysiere dieses Bild und beschreibe genau:
- Konstruktion (einteilig / mit Beinen)
- Korpusmaterial
- Gestell-Material (falls vorhanden)
- Dekoration (goldene Linien, Muster…)
- Form
- Stil
Erfinde keine unsichtbaren Attribute. Antworte in vollständigen Sätzen auf Deutsch.`,
    es: `Analiza esta imagen y describe con precisión:
- Construcción (monobloque / con patas)
- Material del cuerpo
- Material de la base (si está presente)
- Decoración (líneas doradas, patrones…)
- Forma
- Estilo
No inventes atributos que no sean visibles. Responde en oraciones completas en español.`,
    it: `Analizza questa immagine e descrivi con precisione:
- Costruzione (monoblocco / con gambe)
- Materiale del corpo
- Materiale della base (se presente)
- Decorazione (linee dorate, motivi…)
- Forma
- Stile
Non inventare attributi non visibili. Rispondi in frasi complete in italiano.`,
  };
  return prompts[lang] || prompts.fr;
}

function getTitlePrompt(lang: string, visionAnalysis: string | null, parsed: any): string {
  const visionBlock = visionAnalysis || "Aucune analyse visuelle disponible. Base-toi uniquement sur les données produit.";
  const prompts: Record<string, string> = {
    fr: `Génère un TITRE ULTRA SEO basé sur :

IMAGE :
${visionBlock}

TEXTE :
${JSON.stringify(parsed)}

RÈGLES :
- 80 caractères max
- Majuscule à chaque mot
- Français pur
- Format: Catégorie + Forme + Couleur + Matériau + [Pieds si présents] + Style
- N'invente pas une information absente
- Pas de virgules ni guillemets

Retourne UN SEUL TITRE.`,
    en: `Generate an ULTRA SEO TITLE based on:

IMAGE:
${visionBlock}

TEXT:
${JSON.stringify(parsed)}

RULES:
- 80 characters max
- Capitalize each word
- Pure English
- Format: Category + Shape + Color + Material + [Legs if present] + Style
- Do not invent missing information
- No commas or quotes

Return A SINGLE TITLE.`,
    de: `Generiere einen ULTRA SEO TITEL basierend auf:

BILD:
${visionBlock}

TEXT:
${JSON.stringify(parsed)}

REGELN:
- Maximal 80 Zeichen
- Jeden Wort großschreiben
- Reines Deutsch
- Format: Kategorie + Form + Farbe + Material + [Beine falls vorhanden] + Stil
- Keine fehlenden Informationen erfinden
- Keine Kommas oder Anführungszeichen

Gib EINEN EINZIGEN TITEL zurück.`,
    es: `Genera un TÍTULO ULTRA SEO basado en:

IMAGEN:
${visionBlock}

TEXTO:
${JSON.stringify(parsed)}

REGLAS:
- Máximo 80 caracteres
- Capitalizar cada palabra
- Español puro
- Formato: Categoría + Forma + Color + Material + [Patas si las hay] + Estilo
- No inventar información ausente
- Sin comas ni comillas

Devuelve UN SOLO TÍTULO.`,
    it: `Genera un TITOLO ULTRA SEO basato su:

IMMAGINE:
${visionBlock}

TESTO:
${JSON.stringify(parsed)}

REGOLE:
- Massimo 80 caratteri
- Prima lettera maiuscola per ogni parola
- Italiano puro
- Formato: Categoria + Forma + Colore + Materiale + [Gambe se presenti] + Stile
- Non inventare informazioni mancanti
- Nessuna virgola o virgolette

Restituisci UN SOLO TITOLO.`,
  };
  return prompts[lang] || prompts.fr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return jsonResponse({ ok: true });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({
        success: false,
        error: "SUPABASE_NOT_CONFIGURED",
        message: "Smart title is not configured correctly.",
      });
    }

    const { productId, language: explicitLang } = body;
    if (!productId) {
      return jsonResponse({
        success: false,
        error: "PRODUCT_ID_REQUIRED",
        message: "Product ID required.",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("*, product_images(*), shopify_connections!inner(store_language)")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("[smart-title] product load failed:", productError);
      return jsonResponse({
        success: false,
        error: "PRODUCT_NOT_FOUND",
        message: "Product could not be loaded.",
      });
    }

    const storeLanguage = (product as any)?.shopify_connections?.store_language || "fr-FR";
    const contentText = `${product.title || ""} ${product.body_html || ""}`;
    const language = resolveLanguage({
      explicitLanguage: explicitLang,
      contentText,
      storeLanguage,
    });
    console.log(`🌍 [smart-title] language=${language}`);

    const images = [...(product.product_images || [])];
    const primary = images.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[0];
    let visionAnalysis: string | null = null;

    // Vision is optional enrichment. It must never block title generation.
    if (primary?.src) {
      try {
        const imageResponse = await fetch(primary.src);
        if (!imageResponse.ok) {
          throw new Error(`Image download failed: ${imageResponse.status}`);
        }

        const mimeType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        if (!mimeType.startsWith("image/")) {
          throw new Error("Image download returned a non-image content type");
        }

        const base64 = arrayBufferToBase64(await imageResponse.arrayBuffer());
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const routedVision = await routeVision([
          {
            role: "user",
            content: [
              { type: "text", text: getVisionPrompt(language) },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ], 700);

        visionAnalysis = routedVision.content || null;
        console.log(`[smart-title] vision provider=${routedVision.provider} model=${routedVision.model}`);
      } catch (visionError) {
        console.warn("⚠ [smart-title] vision unavailable; continuing without it:", visionError);
        visionAnalysis = null;
      }
    }

    const analysisPrompts: Record<string, string> = {
      fr: `Analyse ce produit et retourne un JSON strict :
Titre: ${product.title}
Type: ${product.product_type}
Description: ${product.body_html}

Retourne :
{
  "category": "",
  "materials": [],
  "style": "",
  "features": [],
  "selling_points": []
}`,
      en: `Analyze this product and return strict JSON:
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
    let parsed: any;

    try {
      const analysis = await aiTextWithFallback(analysisPrompt);
      parsed = JSON.parse(cleanJSON(analysis));
      console.log("✅ [smart-title] AI product analysis successful");
    } catch (analysisError) {
      console.warn("⚠ [smart-title] AI analysis failed; using product data:", analysisError);
      parsed = {
        category: product.product_type || "",
        materials: [],
        style: "",
        features: [],
        selling_points: [],
      };
    }

    let title: string;
    try {
      title = (await aiTextWithFallback(getTitlePrompt(language, visionAnalysis, parsed))).trim();
      title = title.replace(/^["']|["']$/g, "");
      console.log("✅ [smart-title] AI title generation successful");
    } catch (titleError) {
      console.warn("⚠ [smart-title] AI title failed; using local fallback:", titleError);
      title = generateSimpleTitle(product, language);
    }

    if (!title) title = product.title || "Product";
    if (title.length > 80) {
      const shortened = title.slice(0, 80);
      const lastSpace = shortened.lastIndexOf(" ");
      title = lastSpace > 40 ? shortened.slice(0, lastSpace) : shortened;
    }

    return jsonResponse({
      success: true,
      optimizedTitle: title,
      visionAnalysis,
      deepseekAnalysis: parsed,
      language,
    });
  } catch (error: any) {
    console.error("❌ [smart-title] unexpected error:", error);
    return jsonResponse({
      success: false,
      error: "SMART_TITLE_FAILED",
      message: error?.message || "Smart title generation failed.",
    });
  }
});