import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/* ---------------------------------------------------------
   UTILITIES : Color, Contrast, HSL, Sanitization
--------------------------------------------------------- */

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16),
      }
    : null;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";
  let r = rgb.r / 255,
    g = rgb.g / 255,
    b = rgb.b / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `${h} ${s}% ${l}%`;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/```html/g, "")
    .replace(/```/g, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .trim();
}

/* ---------------------------------------------------------
   LOAD USER PREFERENCES (your table generate config)
--------------------------------------------------------- */

async function loadUserPreferences(userId: string, storeId: string | null) {
  const { data, error } = await supabase
    .from("landing_page_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("⚠️ Preferences load error:", error);
    return null;
  }

  return data;
}
/* ---------------------------------------------------------
   PRODUCT ENRICHMENT (retry logic)
--------------------------------------------------------- */

async function enrichProduct(productId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("enrich-product", {
      body: { productId },
    });
    if (error) {
      console.error("❌ enrich-product error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("❌ enrich-product exception:", e);
    return false;
  }
}

/* ---------------------------------------------------------
   SERP COMPETITOR ANALYSIS
--------------------------------------------------------- */

async function analyzeSerp(keyword: string, country: string, language: string) {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-serp-competitors", {
      body: {
        keyword,
        analysisType: "landing",
        location: country,
        language,
        maxResults: 10,
      },
    });

    if (error) {
      console.warn("⚠️ SERP error:", error);
      return null;
    }

    return data?.insights ?? null;
  } catch (err) {
    console.warn("⚠️ SERP analyze exception:", err);
    return null;
  }
}

/* ---------------------------------------------------------
   VISION AI ANALYSIS (multi-image, up to 6 images)
--------------------------------------------------------- */

async function analyzeImageWithVision(imageUrl: string, productTitle: string, category: string | null) {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
      body: {
        imageUrl,
        productContext: { title: productTitle, category },
      },
    });

    if (error) {
      console.warn("⚠️ Vision AI error:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("⚠️ Vision AI exception:", err);
    return null;
  }
}

/* ---------------------------------------------------------
   LANGUAGE DETECTOR
--------------------------------------------------------- */

function detectLanguage(text: string): "fr" | "en" {
  if (!text) return "fr";

  const t = text.toLowerCase();

  const fr = [" le ", " la ", " les ", " un ", " une ", " des ", " dans ", " avec "];
  const en = [" the ", " and ", " with ", " for ", " from ", " this "];

  const frScore = fr.filter((w) => t.includes(w)).length;
  const enScore = en.filter((w) => t.includes(w)).length;

  return enScore > frScore ? "en" : "fr";
}

/* ---------------------------------------------------------
   MERGE VISION ATTRIBUTES ACROSS MULTIPLE IMAGES
--------------------------------------------------------- */

function mergeVisionAttributes(analyses: any[]) {
  if (analyses.length === 0) return null;

  const base = analyses[0];

  for (let i = 1; i < analyses.length; i++) {
    const next = analyses[i];

    // merge materials arrays
    if (next.visualAttributes?.materials) {
      base.visualAttributes.materials = [
        ...(base.visualAttributes.materials || []),
        ...next.visualAttributes.materials,
      ].filter((v: string, idx: number, arr: string[]) => arr.indexOf(v) === idx);
    }

    // merge first technicalDimensions found
    if (!base.visualAttributes?.technicalDimensions && next.visualAttributes?.technicalDimensions) {
      base.visualAttributes.technicalDimensions = next.visualAttributes.technicalDimensions;
    }
  }

  return base.visualAttributes;
}
/* ---------------------------------------------------------
   GEMINI 2.5 VISION — Fallback when DeepSeek fails
--------------------------------------------------------- */

async function geminiFallbackVision(imageUrl: string, productTitle: string) {
  try {
    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    const payload = {
      model: "gemini-2.5-flash",
      prompt: `Analyze the product image and extract:
        - visible materials
        - dominant colors
        - shape
        - approximate size category
        - furniture type (table, chair, sofa, etc.)
        - style (modern, scandi, industrial, minimal)
        - room usage (living room, dining room)
        Respond in JSON only.`,
      image_url: imageUrl,
    };

    const res = await fetch("https://api.gemini.google.com/v1/vision", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    return JSON.parse(raw);
  } catch (e) {
    console.warn("⚠️ Gemini fallback failed:", e);
    return null;
  }
}

/* ---------------------------------------------------------
   DIMENSION DETECTOR (regex + normalization)
--------------------------------------------------------- */

function extractDimensions(text: string | null) {
  if (!text) return null;

  // accepted formats: 120x60x45, 120 x 60 x 45 cm, 120*60*45
  const regex = /(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})\s*(x|\*|×)\s*(\d{2,3})\s*(cm|mm)?/i;

  const match = text.match(regex);
  if (!match) return null;

  return {
    width: parseInt(match[1]),
    depth: parseInt(match[3]),
    height: parseInt(match[5]),
    unit: match[6] || "cm",
  };
}

/* ---------------------------------------------------------
   MERGE DIMENSIONS from text + vision
--------------------------------------------------------- */

function mergeDimensions(visionDims: any, textDims: any) {
  if (visionDims && textDims) return textDims;
  if (textDims) return textDims;
  if (visionDims) return visionDims;
  return null;
}

/* ---------------------------------------------------------
   EXTRACT MATERIALS, STYLE, CATEGORY from text
--------------------------------------------------------- */

function extractFromText(description: string) {
  const lower = (description || "").toLowerCase();

  const materials = [];
  if (lower.includes("bois")) materials.push("bois");
  if (lower.includes("métal") || lower.includes("acier")) materials.push("métal");
  if (lower.includes("verre")) materials.push("verre");
  if (lower.includes("pvc")) materials.push("pvc");
  if (lower.includes("tissu")) materials.push("tissu");
  if (lower.includes("cuir")) materials.push("cuir");

  let style = null;
  if (lower.includes("scandinave")) style = "scandinave";
  if (lower.includes("industriel")) style = "industriel";
  if (lower.includes("moderne")) style = "moderne";
  if (lower.includes("minimaliste")) style = "minimaliste";

  let category = null;
  if (lower.includes("table basse")) category = "table basse";
  if (lower.includes("table à manger")) category = "table à manger";
  if (lower.includes("chaise")) category = "chaise";
  if (lower.includes("canapé")) category = "canapé";
  if (lower.includes("buffet")) category = "buffet";

  return { materials, style, category };
}

/* ---------------------------------------------------------
   MERGE VISION RESULTS + TEXT RESULTS
--------------------------------------------------------- */

function finalProductAttributes(vision: any, text: any, serp: any, dims: any) {
  return {
    materials: [...new Set([...(vision?.materials || []), ...(text?.materials || [])])],
    style: vision?.style || text?.style || serp?.style || null,
    usage: vision?.usage || serp?.usage || null,
    category: text?.category || serp?.category || vision?.category || null,
    dimensions: dims,
    colors: vision?.colors || null,
  };
}
/* ---------------------------------------------------------
   LOAD USER DEFAULT PREFERENCES
--------------------------------------------------------- */

async function loadUserPreferences(userId: string, storeId: string | null) {
  try {
    const { data, error } = await supabase
      .from("landing_page_user_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn("⚠️ No user preferences found");
      return null;
    }

    return data;
  } catch (e) {
    console.warn("⚠️ User pref exception:", e);
    return null;
  }
}

/* ---------------------------------------------------------
   SYSTEM DEFAULTS (fallback)
--------------------------------------------------------- */

const SYSTEM_DEFAULTS = {
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
    text_muted: "hsl(200, 20%, 40%)",
  },
  custom_highlights: [],
};

/* ---------------------------------------------------------
   MERGE 4 LAYERS OF CONFIG
   1. userOverride (RegenerateLanding.tsx)
   2. userDefault (landing_page_user_preferences)
   3. storeDefault (future extension)
   4. systemDefault
--------------------------------------------------------- */

function mergeOptions({ userOverride, userDefault, storeDefault = null }) {
  return {
    layout: userOverride.layout || userDefault?.layout || storeDefault?.layout || SYSTEM_DEFAULTS.layout,

    design_style:
      userOverride.design_style ||
      userDefault?.design_style ||
      storeDefault?.design_style ||
      SYSTEM_DEFAULTS.design_style,

    content_length:
      userOverride.content_length ||
      userDefault?.content_length ||
      storeDefault?.content_length ||
      SYSTEM_DEFAULTS.content_length,

    colorScheme: {
      primary:
        userOverride.colorScheme?.primary ||
        userDefault?.color_primary ||
        storeDefault?.color_primary ||
        SYSTEM_DEFAULTS.colorScheme.primary,

      secondary:
        userOverride.colorScheme?.secondary ||
        userDefault?.color_secondary ||
        storeDefault?.color_secondary ||
        SYSTEM_DEFAULTS.colorScheme.secondary,

      accent:
        userOverride.colorScheme?.accent ||
        userDefault?.color_accent ||
        storeDefault?.color_accent ||
        SYSTEM_DEFAULTS.colorScheme.accent,

      background:
        userOverride.colorScheme?.background ||
        userDefault?.color_background ||
        storeDefault?.color_background ||
        SYSTEM_DEFAULTS.colorScheme.background,

      surface:
        userOverride.colorScheme?.surface ||
        userDefault?.color_surface ||
        storeDefault?.color_surface ||
        SYSTEM_DEFAULTS.colorScheme.surface,

      text:
        userOverride.colorScheme?.text ||
        userDefault?.color_text ||
        storeDefault?.color_text ||
        SYSTEM_DEFAULTS.colorScheme.text,

      textMuted:
        userOverride.colorScheme?.textMuted ||
        userDefault?.color_text_muted ||
        storeDefault?.color_text_muted ||
        SYSTEM_DEFAULTS.colorScheme.text_muted,
    },

    custom_highlights: userOverride.custom_highlights?.length
      ? userOverride.custom_highlights
      : userDefault?.custom_highlights || SYSTEM_DEFAULTS.custom_highlights,
  };
}

/* ---------------------------------------------------------
   GET FINAL MERGED CONFIG
--------------------------------------------------------- */

async function getMergedConfig(userId: string, storeId: string | null, override: any) {
  const userDefault = await loadUserPreferences(userId, storeId);

  return mergeOptions({
    userOverride: override || {},
    userDefault,
    storeDefault: null,
  });
}
/* ---------------------------------------------------------
   BUILD AI PROMPT — Full Landing Page Generator
--------------------------------------------------------- */

function buildPrompt({ productTitle, vendor, attributes, serp, config, lang }) {
  return `
You are an expert senior front-end designer specialized in modern, ultra-clean,
conversion-optimized mobile-first landing pages.

Generate HTML ONLY (no markdown, no <html>, no <body>).

========================================================
PRODUCT INFORMATION
========================================================
Title: ${productTitle}
Vendor: ${vendor || "N/A"}

Detected Attributes (Merged Vision + Text + SERP):
- Category: ${attributes.category || "unknown"}
- Style: ${attributes.style || "unknown"}
- Materials: ${attributes.materials?.join(", ") || "unknown"}
- Colors: ${attributes.colors?.join(", ") || "unknown"}
- Room Usage: ${attributes.usage || "unknown"}
- Dimensions: ${
    attributes.dimensions
      ? `${attributes.dimensions.width}×${attributes.dimensions.depth}×${attributes.dimensions.height} ${attributes.dimensions.unit}`
      : "unknown"
  }

SERP Insights:
${serp ? JSON.stringify(serp, null, 2) : "No SERP data"}

========================================================
USER DESIGN PREFERENCES
========================================================
Layout: ${config.layout}
Design Style: ${config.design_style}
Content Length: ${config.content_length}

Color Palette:
- Primary: ${config.colorScheme.primary}
- Secondary: ${config.colorScheme.secondary}
- Accent: ${config.colorScheme.accent}
- Background: ${config.colorScheme.background}
- Surface: ${config.colorScheme.surface}
- Text: ${config.colorScheme.text}
- Muted Text: ${config.colorScheme.textMuted}

Custom Highlights:
${JSON.stringify(config.custom_highlights || [])}

========================================================
REQUIREMENTS
========================================================
- Beautiful, premium landing page
- Ultra-modern aesthetic
- High-end typography
- Clean spacing system
- Hero section with strong CTA
- Feature sections based on materials + style
- Specifications block using extracted attributes
- Mobile-first
- Semantic HTML
- Do NOT output markdown
- Do NOT include <html>, <body>, <head>
- The output must be *clean HTML only*
- Write in ${lang === "fr" ? "French" : "English"}

========================================================
FINAL INSTRUCTION
========================================================
Generate the full landing page HTML now.
`;
}

/* ---------------------------------------------------------
   SAFE LOVABLE AI CALL (Gemini 2.5 Flash)
--------------------------------------------------------- */

async function callAI(prompt: string) {
  try {
    const response = await fetch("https://api.lovable.dev/generate", {
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

    const raw = await response.text();
    if (!raw) throw new Error("EMPTY_RESPONSE_FROM_AI");

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error("❌ AI JSON PARSE FAILED:", raw);
      throw new Error("AI_INVALID_JSON");
    }

    if (!json.output) {
      console.error("❌ AI returned no output:", json);
      throw new Error("AI_OUTPUT_MISSING");
    }

    return json.output;
  } catch (err) {
    console.error("❌ AI CALL FAILED:", err);
    throw err;
  }
}

/* ---------------------------------------------------------
   CLEAN HTML OUTPUT
--------------------------------------------------------- */

function cleanHTML(html: string) {
  if (!html) return "";

  return html
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();
}
/* ---------------------------------------------------------
   FINAL — GENERATE LANDING PAGE ENDPOINT
--------------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // -----------------------------------------------------
    // 1. PARSE REQUEST BODY
    // -----------------------------------------------------
    const body = await req.json().catch(() => null);

    if (!body || !body.productId || !body.productTitle) {
      return new Response(JSON.stringify({ error: "Missing fields: productId or productTitle" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const {
      productId,
      productTitle,
      vendor,
      description,
      images = [],
      language = "fr",
      userId,
      storeId,
      options: userOverride = {},
    } = body;

    console.log("🚀 GENERATION STARTED:", productId);

    // -----------------------------------------------------
    // 2. LOAD USER DEFAULT PREF + MERGE OPTIONS
    // -----------------------------------------------------
    const finalConfig = await getMergedConfig(userId, storeId, userOverride);

    console.log("🎨 FINAL CONFIG:", finalConfig);

    // -----------------------------------------------------
    // 3. ENRICH PRODUCT (async, retry)
    // -----------------------------------------------------
    await enrichProduct(productId);

    // -----------------------------------------------------
    // 4. ANALYSE SERP + TEXT + VISION
    // -----------------------------------------------------
    const lang = detectLanguage(description || productTitle);

    const serpResult = await analyzeSerp(productTitle, "fr", lang);

    const textExtract = extractFromText(description || "");

    const visionResults = [];
    for (const img of images.slice(0, 6)) {
      const v1 = await analyzeImageWithVision(img, productTitle, textExtract.category);
      if (v1?.visualAttributes) visionResults.push(v1.visualAttributes);
    }

    // Fallback Vision if empty
    if (visionResults.length === 0 && images.length > 0) {
      const fallback = await geminiFallbackVision(images[0], productTitle);
      if (fallback) visionResults.push(fallback);
    }

    const mergedVision = mergeVisionAttributes(visionResults.map((v) => ({ visualAttributes: v })));

    const textDims = extractDimensions(description || "");
    const mergedDims = mergeDimensions(mergedVision?.technicalDimensions, textDims);

    const finalAttributes = finalProductAttributes(mergedVision || {}, textExtract, serpResult, mergedDims);

    console.log("📦 FINAL ATTRIBUTES:", finalAttributes);

    // -----------------------------------------------------
    // 5. BUILD FULL AI PROMPT
    // -----------------------------------------------------
    const prompt = buildPrompt({
      productTitle,
      vendor,
      attributes: finalAttributes,
      serp: serpResult,
      config: finalConfig,
      lang,
    });

    // -----------------------------------------------------
    // 6. GENERATE LANDING PAGE HTML VIA AI
    // -----------------------------------------------------
    const htmlRaw = await callAI(prompt);
    const htmlClean = cleanHTML(htmlRaw);

    if (!htmlClean) {
      throw new Error("EMPTY_HTML_OUTPUT");
    }

    // -----------------------------------------------------
    // 7. SAVE result in DB
    // -----------------------------------------------------
    await supabase.from("shopify_products").update({ landing_page_html: htmlClean }).eq("id", productId);

    // -----------------------------------------------------
    // 8. RETURN SUCCESS
    // -----------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        html: htmlClean,
        optimizedTitle: productTitle,
        attributes: finalAttributes,
        config: finalConfig,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❌ FINAL ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
