// =====================================================
// BLOC 1 / 3 — IMPORTS + UTILITIES + EXTRACTION LOGIC
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ---------------- HEX TO RGB + LUMINANCE ----------------

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
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

// ---------------- SANITIZE HTML ----------------

function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .trim();
}

// ---------------- SIMPLE LANGUAGE DETECTOR ----------------

function detectLanguage(text: string): "fr" | "en" {
  if (!text) return "fr";
  const t = text.toLowerCase();
  const fr = [" le ", " la ", " les ", " une ", " des ", " avec "];
  const en = [" the ", " and ", " with ", " for "];
  return en.filter((w) => t.includes(w)).length > fr.filter((w) => t.includes(w)).length ? "en" : "fr";
}

// ---------------- TEXT MATERIAL / STYLE EXTRACTION ----------------

function extractFromText(description: string) {
  const lower = description.toLowerCase();

  const materials = [];
  if (lower.includes("bois")) materials.push("bois");
  if (lower.includes("métal") || lower.includes("acier")) materials.push("métal");
  if (lower.includes("verre")) materials.push("verre");
  if (lower.includes("pvc")) materials.push("pvc");
  if (lower.includes("tissu")) materials.push("tissu");

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

// ---------------- DIMENSION EXTRACTOR ----------------

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

// ---------------- MERGE MATERIAL + STYLE ----------------

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

// ---------------- USER PREF DEFAULTS ----------------

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
    textMuted: "hsl(200, 20%, 40%)",
  },
  custom_highlights: [],
};

// ---------------- LOAD USER PREF (CORRECT VERSION) ----------------

async function loadUserPreferences(userId: string) {
  try {
    const { data } = await supabase
      .from("landing_page_user_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .maybeSingle();

    return data || null;
  } catch {
    return null;
  }
}

// ---------------- MERGE CONFIG ----------------

function mergeOptions({ override, userDefault }) {
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
// =====================================================
// BLOC 2 / 3 — SERP + VISION + PROMPT BUILDER + AI CALL
// =====================================================

// ---------------- ANALYZE SERP ----------------

async function analyzeSerp(keyword: string, country: string, language: string) {
  try {
    const { data } = await supabase.functions.invoke("analyze-serp-competitors", {
      body: {
        keyword,
        analysisType: "landing",
        location: country,
        language,
        maxResults: 10,
      },
    });
    return data?.insights || null;
  } catch {
    return null;
  }
}

// ---------------- VISION AI (PRIMARY) ----------------

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

// ---------------- FALLBACK GEMINI VISION ----------------

async function geminiFallbackVision(imageUrl: string, productTitle: string) {
  try {
    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    const response = await fetch("https://api.googleai.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `Analyze ${productTitle}. Return JSON only.` },
              { inlineData: { mimeType: "image/jpeg", data: imageUrl } },
            ],
          },
        ],
      }),
    });

    const res = await response.json();
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// ---------------- PROMPT BUILDER ----------------

function buildPrompt({ productTitle, vendor, attributes, serp, config, lang }) {
  return `
You are a senior landing page designer.

Write HTML only, no markdown, no <html>, no <body>.

Product:
- Title: ${productTitle}
- Vendor: ${vendor}

Attributes:
${JSON.stringify(attributes, null, 2)}

SERP:
${JSON.stringify(serp, null, 2)}

User Preferences:
${JSON.stringify(config, null, 2)}

Requirements:
- High-end design
- Mobile-first
- Semantic HTML
- Light animations
- Strong hero
- Features section
- Specifications block
- CTA section
- Write in ${lang === "fr" ? "French" : "English"}

Generate now.`;
}

// ---------------- LOVABLE AI CALL ----------------

async function callAI(prompt: string) {
  const response = await fetch("https://api.lovable.dev/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      input: prompt, // FIXED: correct param
    }),
  });

  const raw = await response.text();
  const json = JSON.parse(raw);

  if (!json.output) throw new Error("AI_OUTPUT_EMPTY");

  return sanitizeHtml(json.output);
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
      vendor,
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

    console.log("🚀 GENERATING:", productId);

    // ---------------- LOAD PREFERENCES ----------------
    const userDefault = await loadUserPreferences(userId);
    const finalConfig = mergeOptions({ override: userOverride, userDefault });

    // ---------------- LANGUAGE ----------------
    const lang = detectLanguage(description || productTitle);

    // ---------------- TEXT EXTRACTION ----------------
    const txt = extractFromText(description);

    // ---------------- SERP ----------------
    const serp = await analyzeSerp(productTitle, "fr", lang);

    // ---------------- VISION ----------------
    let visionResults: any[] = [];

    for (const img of images.slice(0, 5)) {
      const v = await analyzeImageWithVision(img, productTitle, txt.category);
      if (v) visionResults.push(v);
    }

    // Fallback if vision empty
    if (visionResults.length === 0 && images[0]) {
      const fallback = await geminiFallbackVision(images[0], productTitle);
      if (fallback) visionResults.push(fallback);
    }

    const mergedVision = visionResults[0] || {};

    // ---------------- DIMENSIONS ----------------
    const dimsFromText = extractDimensions(description);
    const dims = dimsFromText || mergedVision?.technicalDimensions || null;

    // ---------------- FINAL ATTRIBUTES ----------------
    const attributes = finalProductAttributes(mergedVision, txt, serp, dims);

    console.log("📦 ATTRIBUTES:", attributes);

    // ---------------- PROMPT ----------------
    const prompt = buildPrompt({
      productTitle,
      vendor,
      attributes,
      serp,
      config: finalConfig,
      lang,
    });

    // ---------------- AI GENERATION ----------------
    const html = await callAI(prompt);

    // ---------------- SAVE ----------------
    await supabase.from("shopify_products").update({ landing_page_html: html }).eq("id", productId);

    // ---------------- RETURN ----------------
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
