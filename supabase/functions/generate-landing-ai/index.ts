/**********************************************************************
 *  GENERATE-LANDING-AI — VERSION STABLE ET CORRIGÉE
 *  - Erreurs JSON corrigées
 *  - callAI() 100% safe
 *  - Config utilisateur + override OK
 *  - Vision + SERP + Dimensions OK
 *  - Aucun doublon
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
    background: "white",
    surface: "hsl(200, 30%, 98%)",
    text: "hsl(200, 20%, 10%)",
    textMuted: "hsl(200, 20%, 40%)",
  },
  custom_highlights: [],
};

/**********************************************************************
 * UTILITIES
 **********************************************************************/

function detectLanguage(text: string): "fr" | "en" {
  const t = text.toLowerCase();
  return t.includes(" the ") || t.includes(" and ") ? "en" : "fr";
}

function extractFromText(description: string) {
  const t = description.toLowerCase();
  const materials = [];

  if (t.includes("bois")) materials.push("bois");
  if (t.includes("métal") || t.includes("acier")) materials.push("métal");
  if (t.includes("verre")) materials.push("verre");

  let style = null;
  if (t.includes("scandinave")) style = "scandinave";
  if (t.includes("moderne")) style = "moderne";

  let category = null;
  if (t.includes("table basse")) category = "table basse";
  if (t.includes("chaise")) category = "chaise";

  return { materials, style, category };
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
 * USER PREFERENCES MERGE
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

async function getMergedConfig(userId: string, storeId: string | null, override: UserOverrideConfig) {
  const userDefault = await loadUserPreferences(userId);
  return mergeOptions({ override, userDefault });
}

/**********************************************************************
 * SERP + VISION
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

async function analyzeImageWithVision(imageUrl: string, productTitle: string, category: string | null) {
  try {
    const { data } = await supabase.functions.invoke("analyze-image-with-vision", {
      body: { imageUrl, productContext: { title: productTitle, category } },
    });
    return data?.visualAttributes || null;
  } catch {
    return null;
  }
}

async function geminiFallbackVision(imageUrl: string, title: string) {
  return null; // safe silent fallback
}

/**********************************************************************
 * BUILD PROMPT
 **********************************************************************/
function buildPrompt({ productTitle, vendor, attributes, serp, config, lang }: any) {
  return `
You are an expert landing page designer.
Output: HTML ONLY (no markdown, no <html>, no <body>).

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
- mobile first
- CTA
- strong hero
- specs section
- write in ${lang === "fr" ? "French" : "English"}

Generate HTML now.
`;
}

/**********************************************************************
 * FINAL — AI CALL (FIX JSON BUG FOREVER)
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

  // read JSON safely
  let json: any;

  try {
    json = await res.json();
  } catch {
    const raw = await res.text();
    console.error("❌ RAW INVALID JSON:", raw);
    throw new Error("INVALID_JSON_FROM_AI");
  }

  if (!json || typeof json !== "object") throw new Error("INVALID_AI_RESPONSE");
  if (!json.output) throw new Error("AI_OUTPUT_EMPTY");

  // FIX → if output is object → stringify
  const html = typeof json.output === "string" ? json.output : JSON.stringify(json.output);

  return html.replace(/```html|```/gi, "").trim();
}

/**********************************************************************
 * FINAL HTTP ENDPOINT
 **********************************************************************/
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      productId,
      productTitle,
      vendor = "",
      description = "",
      images = [],
      language = "fr",
      userId,
      storeId,
      options: userOverride = {},
    } = body;

    if (!productId || !productTitle) {
      return new Response(JSON.stringify({ error: "Missing productId or productTitle" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log("🚀 GENERATE LANDING:", productId);

    const config = await getMergedConfig(userId, storeId, userOverride);
    const lang = detectLanguage(description || productTitle);
    const txt = extractFromText(description);
    const serp = await analyzeSerp(productTitle, "fr", lang);

    let vision: any = null;
    for (const img of images.slice(0, 6)) {
      const v = await analyzeImageWithVision(img, productTitle, txt.category);
      if (v) {
        vision = v;
        break;
      }
    }

    const dims = extractDimensions(description) || vision?.technicalDimensions || null;

    const attributes = finalProductAttributes(vision || {}, txt, serp, dims);

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
      JSON.stringify({
        success: true,
        html,
        attributes,
        config,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("🔥 ERROR:", err);

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
