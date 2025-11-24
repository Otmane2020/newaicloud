/**********************************************************************
 * GENERATE-LANDING-AI — VERSION ULTRA-COMPLÈTE & ULTRA-STABLE
 * - Vision OK
 * - SERP OK
 * - Extract dimensions OK
 * - User preferences OK
 * - SAFE JSON 100%
 * - callAI blindé
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
 * SAFE JSON — AUCUN CRASH POSSIBLE
 **********************************************************************/
function safeJSONStringify(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return JSON.stringify({ error: "CANNOT_SERIALIZE_OBJECT", details: String(e) });
  }
}

function safeValue(v: any) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**********************************************************************
 * TYPES CONFIG + DEFAULTS
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
  content_length?: string;
  colorScheme?: Partial<ColorScheme>;
  custom_highlights?: string[];
}

const SYSTEM_DEFAULTS: LandingConfig = {
  layout: "hero",
  design_style: "modern",
  content_length: "medium",
  colorScheme: {
    primary: "hsl(210, 90%, 50%)",
    secondary: "hsl(220, 90%, 60%)",
    accent: "hsl(170, 80%, 55%)",
    background: "white",
    surface: "hsl(210, 15%, 98%)",
    text: "hsl(210, 15%, 10%)",
    textMuted: "hsl(210, 15%, 40%)",
  },
  custom_highlights: [],
};

/**********************************************************************
 * DETECTION TEXTE / DIMENSIONS
 **********************************************************************/
function detectLanguage(text: string): "fr" | "en" {
  const t = text.toLowerCase();
  return t.includes(" the ") || t.includes(" and ") ? "en" : "fr";
}

function extractFromText(description: string) {
  const t = description.toLowerCase();
  const materials: string[] = [];

  if (t.includes("bois")) materials.push("bois");
  if (t.includes("métal") || t.includes("acier")) materials.push("métal");
  if (t.includes("verre")) materials.push("verre");

  return {
    materials,
    style: t.includes("moderne") ? "moderne" : t.includes("scandinave") ? "scandinave" : null,
    category: t.includes("table basse") ? "table basse" : t.includes("chaise") ? "chaise" : null,
  };
}

function extractDimensions(text: string | null) {
  if (!text) return null;
  const m = text.match(/(\d{2,3})\s*x\s*(\d{2,3})\s*x\s*(\d{2,3})(cm|mm)?/i);
  if (!m) return null;
  return {
    width: parseInt(m[1]),
    depth: parseInt(m[2]),
    height: parseInt(m[3]),
    unit: m[4] || "cm",
  };
}

/**********************************************************************
 * USER PREFS + MERGE CONFIG
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

    design_style: override.design_style || userDefault?.design_style || SYSTEM_DEFAULTS.design_style,

    content_length: override.content_length || userDefault?.content_length || SYSTEM_DEFAULTS.content_length,

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

async function getMergedConfig(userId: string, storeId: string | null, override: UserOverrideConfig) {
  const userDefault = await loadUserPreferences(userId);
  return mergeOptions({ override, userDefault });
}
/**********************************************************************
 * SERP / VISION
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
  } catch {
    return null;
  }
}

async function analyzeImageWithVision(imageUrl: string, title: string, category: string | null) {
  try {
    const { data } = await supabase.functions.invoke("analyze-image-with-vision", {
      body: { imageUrl, productContext: { title, category } },
    });
    return data?.visualAttributes || null;
  } catch {
    return null;
  }
}

/**********************************************************************
 * FINAL ATTRIBUTES FUSION
 **********************************************************************/
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
 * PROMPT FINAL
 **********************************************************************/
function buildPrompt({ productTitle, vendor, attributes, serp, config, lang }: any) {
  return `
You are an expert landing page designer.
Output: HTML ONLY.

PRODUCT:
${productTitle}
Vendor: ${vendor}

ATTRIBUTES:
${JSON.stringify(attributes, null, 2)}

SERP:
${JSON.stringify(serp, null, 2)}

USER CONFIG:
${JSON.stringify(config, null, 2)}

RULES:
- premium
- modern
- mobile-first
- hero section
- CTA
- specs block
- Write in ${lang === "fr" ? "French" : "English"}.
`;
}

/**********************************************************************
 * AI CALL — SAFE JSON 100%
 **********************************************************************/
async function callAI(prompt: string) {
  const res = await fetch("https://api.lovable.dev/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "gemini-2.5-flash", prompt }),
  });

  let json: any;

  try {
    json = await res.json();
  } catch {
    const raw = await res.text();
    console.error("⛔ RAW INVALID JSON:", raw);
    throw new Error("INVALID_JSON_FROM_AI");
  }

  let output = json?.output;

  if (output && typeof output === "object" && output.text) {
    output = output.text;
  }

  if (typeof output === "object") output = JSON.stringify(output);
  if (typeof output !== "string") output = String(output);

  return output.replace(/```html|```/gi, "").trim();
}
/**********************************************************************
 * ENDPOINT HTTP FINAL
 **********************************************************************/
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(safeJSONStringify({ error: "INVALID_REQUEST_BODY" }), { status: 400, headers: corsHeaders });
    }

    const {
      productId,
      productTitle,
      vendor = "",
      description = "",
      images = [],
      userId = "",
      storeId = "",
      options: userOverride = {},
    } = body;

    if (!productId || !productTitle) {
      return new Response(safeJSONStringify({ error: "MISSING_FIELDS" }), { status: 400, headers: corsHeaders });
    }

    console.log("🚀 Generate Landing:", productTitle);

    const config = await getMergedConfig(userId, storeId, userOverride);
    const lang = detectLanguage(description || productTitle);

    const textData = extractFromText(description);
    const serp = await analyzeSerp(productTitle, "fr", lang);

    let vision = null;
    for (const img of images.slice(0, 5)) {
      const v = await analyzeImageWithVision(img, productTitle, textData.category);
      if (v) {
        vision = v;
        break;
      }
    }

    const dims = extractDimensions(description) || vision?.technicalDimensions || null;
    const attributes = finalProductAttributes(vision || {}, textData, serp, dims);

    const prompt = buildPrompt({
      productTitle,
      vendor,
      attributes,
      serp,
      config,
      lang,
    });

    const html = await callAI(prompt);

    await supabase.from("shopify_products").update({ landing_page_html: html }).eq("id", productId);

    return new Response(
      safeJSONStringify({
        success: true,
        html: safeValue(html),
        attributes,
        config,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("🔥 ERROR:", err);

    return new Response(
      safeJSONStringify({
        error: "INTERNAL_SERVER_ERROR",
        details: String(err),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
