/**********************************************************************
 *  GENERATE-LANDING-AI — VERSION ULTRA-STABLE COMPLETE (BLOC 1 / 3)
 **********************************************************************/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/**********************************************************************
 * TYPES
 **********************************************************************/
interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

interface LandingConfig {
  layout: string;
  design_style: string;
  content_length: string;
  colorScheme: ColorScheme;
  custom_highlights: string[];
}

interface UserOverrideConfig {
  layout?: string;
  design_style?: string;
  designStyle?: string;
  content_length?: string;
  contentLength?: string;
  colorScheme?: Partial<ColorScheme>;
  custom_highlights?: string[];
}

/**********************************************************************
 * DEFAULT CONFIG
 **********************************************************************/
const SYSTEM_DEFAULTS: LandingConfig = {
  layout: "hero",
  design_style: "modern",
  content_length: "medium",
  colorScheme: {
    primary: "hsl(200, 90%, 50%)",
    secondary: "hsl(210, 90%, 60%)",
    accent: "hsl(180, 85%, 55%)",
    background: "#ffffff",
    surface: "hsl(200, 30%, 98%)",
    text: "hsl(200, 20%, 10%)",
    textMuted: "hsl(200, 20%, 40%)",
  },
  custom_highlights: [],
};

/**********************************************************************
 * SAFE JSON UTILITIES
 **********************************************************************/
function safeJSONStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return JSON.stringify({
      error: "UNSERIALIZABLE_OBJECT",
      details: String(e),
    });
  }
}

function safeValue(v: any) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**********************************************************************
 * TEXT EXTRACTION UTILITIES
 **********************************************************************/
function detectLanguage(text: string): "fr" | "en" {
  const t = text.toLowerCase();
  return t.includes(" the ") || t.includes(" with ") ? "en" : "fr";
}

function extractFromText(description: string) {
  const t = description.toLowerCase();
  const materials = [];

  if (t.includes("bois")) materials.push("bois");
  if (t.includes("métal") || t.includes("acier")) materials.push("métal");
  if (t.includes("verre")) materials.push("verre");
  if (t.includes("pvc")) materials.push("pvc");

  let style = null;
  if (t.includes("scandinave")) style = "scandinave";
  if (t.includes("moderne")) style = "moderne";
  if (t.includes("minimaliste")) style = "minimaliste";

  let category = null;
  if (t.includes("table basse")) category = "table basse";
  if (t.includes("chaise")) category = "chaise";
  if (t.includes("canapé")) category = "canapé";

  return { materials, style, category };
}

function extractDimensions(text: string | null) {
  if (!text) return null;

  const m = text.match(/(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})(cm|mm)?/i);
  if (!m) return null;

  return {
    width: parseInt(m[1]),
    depth: parseInt(m[3]),
    height: parseInt(m[5]),
    unit: m[6] || "cm",
  };
}

function finalProductAttributes(vision: any, text: any, serp: any, dims: any) {
  return {
    materials: [...new Set([...(vision?.materials || []), ...(text?.materials || [])])],
    style: vision?.style || text?.style || serp?.style || null,
    category: text?.category || serp?.category || vision?.category || null,
    colors: vision?.colors || null,
    usage: serp?.usage || null,
    dimensions: dims,
  };
}

/**********************************************************************
 * USER PREFERENCES
 **********************************************************************/
async function loadUserPreferences(userId: string) {
  const { data } = await supabase
    .from("landing_page_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .maybeSingle();

  return data || null;
}

function mergeOptions({ override, userDefault }: { override: UserOverrideConfig; userDefault: any }): LandingConfig {
  return {
    layout: override.layout || userDefault?.layout || SYSTEM_DEFAULTS.layout,

    design_style:
      override.design_style || override.designStyle || userDefault?.design_style || SYSTEM_DEFAULTS.design_style,

    content_length:
      override.content_length ||
      override.contentLength ||
      userDefault?.content_length ||
      SYSTEM_DEFAULTS.content_length,

    colorScheme: {
      primary: override.colorScheme?.primary || userDefault?.color_primary || SYSTEM_DEFAULTS.colorScheme.primary,
      secondary:
        override.colorScheme?.secondary || userDefault?.color_secondary || SYSTEM_DEFAULTS.colorScheme.secondary,
      accent: override.colorScheme?.accent || userDefault?.color_accent || SYSTEM_DEFAULTS.colorScheme.accent,
      background:
        override.colorScheme?.background || userDefault?.color_background || SYSTEM_DEFAULTS.colorScheme.background,
      surface: override.colorScheme?.surface || userDefault?.color_surface || SYSTEM_DEFAULTS.colorScheme.surface,
      text: override.colorScheme?.text || userDefault?.color_text || SYSTEM_DEFAULTS.colorScheme.text,
      textMuted:
        override.colorScheme?.textMuted || userDefault?.color_text_muted || SYSTEM_DEFAULTS.colorScheme.textMuted,
    },

    custom_highlights:
      (override.custom_highlights?.length ? override.custom_highlights : userDefault?.custom_highlights) || [],
  };
}

async function getMergedConfig(
  userId: string,
  storeId: string | null,
  override: UserOverrideConfig,
): Promise<LandingConfig> {
  const userDefault = await loadUserPreferences(userId);
  return mergeOptions({ override, userDefault });
}
/**********************************************************************
 *  BLOC 2 / 3 — SERP + VISION + PROMPT BUILDER + AI CALL (SAFE)
 **********************************************************************/

/**********************************************************************
 * SERP ANALYSIS
 **********************************************************************/
async function analyzeSerp(keyword: string, country: string, lang: string) {
  try {
    const { data } = await supabase.functions.invoke("analyze-serp-competitors", {
      body: {
        keyword,
        analysisType: "landing",
        location: country,
        language: lang,
        maxResults: 10,
      },
    });

    return data?.insights || null;
  } catch (e) {
    console.error("SERP ERROR:", e);
    return null;
  }
}

/**********************************************************************
 * VISION AI — LOVABLE
 **********************************************************************/
async function analyzeImageWithVision(imageUrl: string, productTitle: string, category: string | null) {
  try {
    const { data } = await supabase.functions.invoke("analyze-image-with-vision", {
      body: { imageUrl, productContext: { title: productTitle, category } },
    });

    return data?.visualAttributes || null;
  } catch (e) {
    console.error("VISION ERROR:", e);
    return null;
  }
}

/**********************************************************************
 * FALLBACK GEMINI VISION — SAFE SILENT
 **********************************************************************/
async function geminiFallbackVision(imageUrl: string, title: string) {
  return null; // On garde silencieux pour éviter tout bug
}

/**********************************************************************
 * PROMPT BUILDER
 **********************************************************************/
function buildPrompt({ productTitle, vendor, attributes, serp, config, lang }: any) {
  return `
You are a senior expert landing page designer.
Your job: generate a BEAUTIFUL premium HTML landing page.
⚠ OUTPUT RULES:
- RETURN PURE HTML ONLY
- NO markdown
- NO <html>, <head>, <body>
- CLEAN modern structure

========================================
PRODUCT
========================================
Title: ${productTitle}
Vendor: ${vendor}

ATTRIBUTES:
${safeJSONStringify(attributes)}

SERP INSIGHTS:
${safeJSONStringify(serp)}

USER CONFIG:
${safeJSONStringify(config)}

========================================
DESIGN RULES
========================================
- Ultra premium layout
- Modern, clean, high-end aesthetic
- Responsive mobile-first
- Smooth spacing
- Strong hero section
- Product specs table (from attributes)
- CTA buttons
- Write in: ${lang === "fr" ? "French" : "English"}

Now generate the FULL HTML landing page.
`.trim();
}

/**********************************************************************
 * CALL AI — LOVABLE AI GATEWAY (CORRECTED)
 **********************************************************************/
async function callAI(prompt: string) {
  console.log("🤖 Calling Lovable AI Gateway...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are an expert web designer and copywriter. Generate a complete, single-page HTML landing page that is responsive, modern, and conversion-optimized. Use only HSL colors, include a light/dark mode toggle, and ensure all images use placeholder URLs."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 16000,
    }),
  });

  console.log("📡 API Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", response.status, errorText);
    throw new Error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
  }

  const rawText = await response.text();
  console.log("📦 Raw API response (first 500 chars):", rawText.substring(0, 500));

  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    console.error("❌ JSON Parse Error:", e);
    console.error("Raw text:", rawText);
    throw new Error("Failed to parse AI response as JSON");
  }

  // Extract content from OpenAI-compatible format
  let html = json.choices?.[0]?.message?.content;

  if (!html || typeof html !== 'string') {
    console.error("❌ Invalid response structure:", JSON.stringify(json).substring(0, 500));
    throw new Error("AI response does not contain valid HTML content");
  }

  // Clean code fences
  html = html
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();

  console.log("✅ HTML generated, length:", html.length);
  return html;
}
/**********************************************************************
 *  BLOC 3 / 3 — HTTP ENDPOINT FINAL (ULTRA SAFE)
 **********************************************************************/

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /**************************************************************
     * SAFE BODY PARSING
     **************************************************************/
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(safeJSONStringify({ error: "INVALID_JSON_BODY" }), { status: 400, headers: corsHeaders });
    }

    const {
      productId,
      productTitle,
      vendor = "",
      description = "",
      images = [],
      userId,
      storeId,
      options: userOverride = {},
    } = body;

    if (!productId || !productTitle) {
      return new Response(
        safeJSONStringify({ error: "MISSING_FIELDS", details: "productId or productTitle missing" }),
        { status: 400, headers: corsHeaders },
      );
    }

    console.log("🚀 GENERATE LANDING PAGE FOR PRODUCT:", productId);

    /**************************************************************
     * MERGE USER CONFIG
     **************************************************************/
    const config = await getMergedConfig(userId, storeId, userOverride);

    /**************************************************************
     * LANGUAGE
     **************************************************************/
    const lang = detectLanguage(description || productTitle);

    /**************************************************************
     * TEXT EXTRACTION
     **************************************************************/
    const txt = extractFromText(description);

    /**************************************************************
     * SERP ANALYSIS
     **************************************************************/
    const serp = await analyzeSerp(productTitle, "fr", lang);

    /**************************************************************
     * VISION AI (PRIMARY + FALLBACK)
     **************************************************************/
    let vision: any = null;

    for (const img of images.slice(0, 6)) {
      const v = await analyzeImageWithVision(img, productTitle, txt.category);
      if (v) {
        vision = v;
        break;
      }
    }

    // fallback
    if (!vision && images[0]) {
      vision = await geminiFallbackVision(images[0], productTitle);
    }

    /**************************************************************
     * DIMENSIONS (from text OR vision)
     **************************************************************/
    const dims = extractDimensions(description) || vision?.technicalDimensions || null;

    /**************************************************************
     * FINAL ATTRIBUTES (MERGED)
     **************************************************************/
    const attributes = finalProductAttributes(vision || {}, txt, serp, dims);

    /**************************************************************
     * PROMPT
     **************************************************************/
    const prompt = buildPrompt({
      productTitle,
      vendor,
      attributes,
      serp,
      config,
      lang,
    });

    /**************************************************************
     * AI GENERATION (SAFE)
     **************************************************************/
    const html = await callAI(prompt);

    /**************************************************************
     * SAVE RESULT INTO SUPABASE
     **************************************************************/
    await supabase.from("shopify_products").update({ landing_page_html: html }).eq("id", productId);

    /**************************************************************
     * RETURN SUCCESS
     **************************************************************/
    return new Response(
      safeJSONStringify({
        success: true,
        html: safeValue(html),
        attributes,
        config,
        lang,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("🔥 INTERNAL ERROR:", err);

    return new Response(
      safeJSONStringify({
        error: "SERVER_ERROR",
        details: String(err),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
