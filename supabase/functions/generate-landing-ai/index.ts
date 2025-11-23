// =====================================================
// BLOC 1 / 3 — IMPORTS + TYPES + UTILITIES + MERGE CONFIG
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ------------------------------------------------------
// TYPES
// ------------------------------------------------------
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

// ------------------------------------------------------
// SYSTEM DEFAULTS
// ------------------------------------------------------
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

// ------------------------------------------------------
// UTILITIES — TEXT EXTRACTION
// ------------------------------------------------------
function detectLanguage(text: string): "fr" | "en" {
  const t = (text || "").toLowerCase();
  const fr = [" le ", " la ", " les ", " une ", " des ", " avec "];
  const en = [" the ", " and ", " with ", " for ", " from "];
  return en.some((w) => t.includes(w)) ? "en" : "fr";
}

function extractFromText(description: string) {
  const lower = description.toLowerCase();

  const materials = [];
  if (lower.includes("bois")) materials.push("bois");
  if (lower.includes("métal") || lower.includes("acier")) materials.push("métal");
  if (lower.includes("verre")) materials.push("verre");
  if (lower.includes("pvc")) materials.push("pvc");

  let style = null;
  if (lower.includes("scandinave")) style = "scandinave";
  if (lower.includes("moderne")) style = "moderne";
  if (lower.includes("minimaliste")) style = "minimaliste";

  let category = null;
  if (lower.includes("table basse")) category = "table basse";
  if (lower.includes("chaise")) category = "chaise";
  if (lower.includes("canapé")) category = "canapé";

  return { materials, style, category };
}

function extractDimensions(text: string | null) {
  if (!text) return null;

  const regex = /(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})\s*(cm|mm)?/i;

  const m = text.match(regex);
  if (!m) return null;

  return {
    width: parseInt(m[1]),
    depth: parseInt(m[3]),
    height: parseInt(m[5]),
    unit: m[6] || "cm",
  };
}

// ------------------------------------------------------
// MERGE FINAL ATTRIBUTES
// ------------------------------------------------------
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

// ------------------------------------------------------
// LOAD USER PREFERENCES
// ------------------------------------------------------
async function loadUserPreferences(userId: string) {
  const { data } = await supabase
    .from("landing_page_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .maybeSingle();

  return data || null;
}

// ------------------------------------------------------
// MERGE OPTIONS
// ------------------------------------------------------
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

    custom_highlights: override.custom_highlights?.length
      ? override.custom_highlights
      : userDefault?.custom_highlights || SYSTEM_DEFAULTS.custom_highlights,
  };
}

// ------------------------------------------------------
// MERGE CONFIG WRAPPER
// ------------------------------------------------------
async function getMergedConfig(
  userId: string,
  storeId: string | null,
  override: UserOverrideConfig,
): Promise<LandingConfig> {
  const userDefault = await loadUserPreferences(userId);
  return mergeOptions({ override: override || {}, userDefault });
}
// =====================================================
// BLOC 2 / 3 — SERP + VISION + PROMPT BUILDER + AI CALL
// =====================================================

// ---------------- SERP ANALYSIS ----------------
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

// ---------------- VISION AI ----------------
async function analyzeImageWithVision(imageUrl: string, productTitle: string, category: string | null) {
  try {
    const { data } = await supabase.functions.invoke("analyze-image-with-vision", {
      body: {
        imageUrl,
        productContext: { title: productTitle, category },
      },
    });
    return data?.visualAttributes || null;
  } catch {
    return null;
  }
}

// ------------- FALLBACK GEMINI VISION -------------
async function geminiFallbackVision(imageUrl: string, productTitle: string) {
  try {
    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    const res = await fetch("https://api.googleai.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `Analyze the product.` }],
          },
        ],
      }),
    });

    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

// ---------------- PROMPT BUILDER ----------------
function buildPrompt({
  productTitle,
  vendor,
  attributes,
  serp,
  config,
  lang,
}: {
  productTitle: string;
  vendor: string;
  attributes: any;
  serp: any;
  config: LandingConfig;
  lang: "fr" | "en";
}): string {
  return `
You are an expert landing page designer.

⚠ OUTPUT: HTML ONLY  
❌ No markdown  
❌ No <html>  
❌ No <body>  

====================================
PRODUCT
====================================
Title: ${productTitle}
Vendor: ${vendor}

Attributes:
${JSON.stringify(attributes, null, 2)}

SERP Insights:
${JSON.stringify(serp, null, 2)}

====================================
USER DESIGN PREFERENCES
====================================
${JSON.stringify(config, null, 2)}

====================================
REQUIREMENTS
====================================
- Premium modern design
- High-end layout
- Mobile-first
- Strong hero section
- Specs section
- Features based on materials + style
- Smooth micro-animations
- CTA sections
- Language: ${lang === "fr" ? "French" : "English"}

Generate the complete HTML now.
`;
}

// ---------------- STABLE LOVABLE AI CALL ----------------
async function callAI(prompt: string) {
  const res = await fetch("https://api.lovable.dev/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      prompt,
    }),
  });

  // Try JSON first
  let data: any = null;

  try {
    data = await res.json();
  } catch (e) {
    const raw = await res.text();
    console.error("❌ RAW RESPONSE FROM AI:", raw);
    throw new Error("INVALID_JSON_FROM_LOVABLE");
  }

  if (!data || typeof data !== "object") {
    throw new Error("INVALID_LOVABLE_RESPONSE");
  }

  if (!data.output) {
    throw new Error("AI_OUTPUT_EMPTY");
  }

  const html = typeof data.output === "string" ? data.output : JSON.stringify(data.output);

  return html
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();
}
// =====================================================
// BLOC 3 / 3 — FINAL HTTP ENDPOINT
// =====================================================

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

    console.log("🚀 START GENERATION:", productId);

    // 1) Load preferences
    const finalConfig = await getMergedConfig(userId, storeId, userOverride);

    // 2) Detect language
    const lang = detectLanguage(description || productTitle);

    // 3) Extract text info
    const txt = extractFromText(description);

    // 4) SERP analysis
    const serp = await analyzeSerp(productTitle, "fr", lang);

    // 5) Vision
    let visionResult: any = null;

    for (const img of images.slice(0, 5)) {
      const v = await analyzeImageWithVision(img, productTitle, txt.category);
      if (v) {
        visionResult = v;
        break;
      }
    }

    // fallback
    if (!visionResult && images[0]) {
      visionResult = await geminiFallbackVision(images[0], productTitle);
    }

    // 6) Dimensions
    const dimsFromText = extractDimensions(description);
    const dims = dimsFromText || visionResult?.technicalDimensions || null;

    // 7) Final attributes
    const attributes = finalProductAttributes(visionResult || {}, txt, serp, dims);

    // 8) Build prompt
    const prompt = buildPrompt({
      productTitle,
      vendor,
      attributes,
      serp,
      config: finalConfig,
      lang,
    });

    // 9) Generate HTML
    const html = await callAI(prompt);

    // 10) Save
    await supabase.from("shopify_products").update({ landing_page_html: html }).eq("id", productId);

    // 11) Return
    return new Response(
      JSON.stringify({
        success: true,
        html,
        optimizedTitle: productTitle,
        attributes,
        config: finalConfig,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("❌ ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
