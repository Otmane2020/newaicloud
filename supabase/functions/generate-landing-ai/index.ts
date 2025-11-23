import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeGeneratedHTML, validateHTML } from "../_shared/html-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// WCAG Color Contrast Utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function hexToHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccessibleText(bgColor: string): string {
  const bgLum = getLuminance(bgColor);
  return bgLum > 0.5 ? "#000000" : "#FFFFFF";
}

function adjustSaturation(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Adjust saturation
  s = Math.min(1, s * factor);

  // Convert back to RGB
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

function generateDesignTokens(colorScheme: any) {
  const primaryHex = colorScheme.primary || "#000000";
  const secondaryHex = colorScheme.secondary || "#333333";
  const backgroundHex = colorScheme.background || "#FFFFFF";
  const surfaceHex = colorScheme.surface || "#F5F5F5";
  const textHex = colorScheme.text || "#000000";
  const textMutedHex = colorScheme.textMuted || "#666666";

  const contrast = calculateContrast(primaryHex, "#FFFFFF");
  const needsDarkText = contrast < 4.5;
  const ctaTextHex = needsDarkText ? "#000000" : "#FFFFFF";

  const validatedBackgroundHex = getLuminance(backgroundHex) > 0.5 ? backgroundHex : "#FFFFFF";
  const validatedTextHex = getLuminance(textHex) < 0.5 ? textHex : "#000000";

  // Create a more vibrant accent color by increasing saturation
  const accentHex = adjustSaturation(primaryHex, 1.3);

  // Convert all colors to HSL format
  return {
    primary: hexToHsl(primaryHex),
    secondary: hexToHsl(secondaryHex),
    accent: hexToHsl(accentHex),
    background: hexToHsl(validatedBackgroundHex),
    surface: hexToHsl(surfaceHex),
    text: hexToHsl(validatedTextHex),
    textMuted: hexToHsl(textMutedHex),
    ctaText: hexToHsl(ctaTextHex),
    contrastRatio: contrast,
  };
}

// Helper to build enriched product summary
// Helper to build Vision AI summary
function buildVisionSummary(attributes: any, language = "fr") {
  if (!attributes) return "";

  const sections = [];

  if (attributes.visualDescription) {
    sections.push(language === "en" ? "VISUAL ANALYSIS:" : "ANALYSE VISUELLE:");
    sections.push(attributes.visualDescription);
  }

  const details = [];
  if (attributes.dominantColors?.length) {
    details.push(`${language === "en" ? "Colors" : "Couleurs"}: ${attributes.dominantColors.join(", ")}`);
  }
  if (attributes.materials?.length) {
    details.push(`${language === "en" ? "Materials" : "Matériaux"}: ${attributes.materials.join(", ")}`);
  }
  if (attributes.style) {
    details.push(`${language === "en" ? "Style" : "Style"}: ${attributes.style}`);
  }
  if (attributes.condition) {
    details.push(`${language === "en" ? "Condition" : "État"}: ${attributes.condition}`);
  }

  if (details.length > 0) {
    sections.push("\n" + details.map((d: string) => `- ${d}`).join("\n"));
  }

  return sections.join("\n");
}

function buildEnrichedProductSummary(enriched: any, language = "fr") {
  if (!enriched) return "";

  const sections = [];

  // Visual Attributes
  const visualAttrs = [];
  if (enriched.ai_color) visualAttrs.push(`Couleur: ${enriched.ai_color}`);
  if (enriched.ai_material) visualAttrs.push(`Matériau: ${enriched.ai_material}`);
  if (enriched.ai_shape) visualAttrs.push(`Forme: ${enriched.ai_shape}`);
  if (enriched.ai_texture) visualAttrs.push(`Texture: ${enriched.ai_texture}`);
  if (enriched.ai_pattern) visualAttrs.push(`Motif: ${enriched.ai_pattern}`);
  if (enriched.ai_finish) visualAttrs.push(`Finition: ${enriched.ai_finish}`);
  if (enriched.ai_design_elements) visualAttrs.push(`Éléments Design: ${enriched.ai_design_elements}`);
  if (visualAttrs.length > 0) {
    sections.push(language === "en" ? "VISUAL ATTRIBUTES:" : "ATTRIBUTS VISUELS:");
    sections.push(visualAttrs.map((a: string) => `- ${a}`).join("\n"));
  }

  // PHASE 1: Prioritize technicalDimensions from image if available (HIGHEST PRIORITY)
  const techDims = enriched.vision_attributes?.technicalDimensions;
  const dims = [];
  let weightSource: string | null = null; // Track where weight comes from

  // Detect if we have any smart_* dimensions available
  const hasSmartDims =
    enriched.smart_length ||
    enriched.smart_width ||
    enriched.smart_height ||
    enriched.smart_diameter ||
    enriched.smart_depth ||
    enriched.smart_seat_height;

  if (techDims && Object.keys(techDims).length > 0) {
    // Use dimensions extracted from technical schematic or visible on packaging (VISION FIRST)
    if (techDims.hauteur_totale) dims.push(`H ${techDims.hauteur_totale}`);
    if (techDims.height) dims.push(`H ${techDims.height}`);
    if (techDims.largeur) dims.push(`L ${techDims.largeur}`);
    if (techDims.length) dims.push(`L ${techDims.length}`);
    if (techDims.profondeur) dims.push(`P ${techDims.profondeur}`);
    if (techDims.width) dims.push(`l ${techDims.width}`);
    if (techDims.hauteur_assise) dims.push(`Hauteur d'assise ${techDims.hauteur_assise}`);
    if (techDims.diametre) dims.push(`Ø ${techDims.diametre}`);

    // Extract weight from vision (HIGHEST PRIORITY)
    if (techDims.weight) {
      dims.push(`Poids ${techDims.weight}`);
      weightSource = "vision"; // Mark that weight comes from vision
    }

    if (dims.length > 0) {
      sections.push(language === "en" ? "\nDIMENSIONS (visible on image):" : "\nDIMENSIONS (visibles sur image):");
      sections.push(`- ${dims.join(" × ")}`);
    }
  } else if (hasSmartDims) {
    // Fallback to estimated smart dimensions (SECOND PRIORITY, before SERP)
    if (enriched.smart_length) dims.push(`L ~${enriched.smart_length}${enriched.smart_length_unit || ""}`);
    if (enriched.smart_width) dims.push(`l ~${enriched.smart_width}${enriched.smart_width_unit || ""}`);
    if (enriched.smart_height) dims.push(`H ~${enriched.smart_height}${enriched.smart_height_unit || ""}`);

    // Add estimated weight only if not from vision
    if (!weightSource && enriched.smart_weight) {
      dims.push(`Poids ~${enriched.smart_weight}${enriched.smart_weight_unit || ""}`);
      weightSource = "estimated";
    }

    if (enriched.smart_diameter) dims.push(`Ø ~${enriched.smart_diameter}${enriched.smart_diameter_unit || ""}`);
    if (enriched.smart_depth) dims.push(`P ~${enriched.smart_depth}${enriched.smart_depth_unit || ""}`);
    if (enriched.smart_seat_height)
      dims.push(`Hauteur d'assise ~${enriched.smart_seat_height}${enriched.smart_seat_height_unit || ""}`);

    if (dims.length > 0) {
      sections.push(language === "en" ? "\nDIMENSIONS (estimated):" : "\nDIMENSIONS (estimées):");
      sections.push(`- ${dims.join(" × ")}`);
    }
  } else if (enriched.serp_verified && enriched.serp_data?.averageDimensions) {
    // Use SERP-verified dimensions ONLY AS LAST RESORT
    const serpDims = enriched.serp_data.averageDimensions;
    if (serpDims.length) dims.push(`L ${serpDims.length}`);
    if (serpDims.width) dims.push(`l ${serpDims.width}`);
    if (serpDims.height) dims.push(`H ${serpDims.height}`);

    // Add SERP weight only if not already extracted from vision/estimation
    if (!weightSource && enriched.serp_data.averageWeight) {
      dims.push(`Poids ${enriched.serp_data.averageWeight}`);
      weightSource = "serp";
    }

    if (dims.length > 0) {
      sections.push(language === "en" ? "\nDIMENSIONS (SERP verified):" : "\nDIMENSIONS (vérifiées SERP):");
      sections.push(`- ${dims.join(" × ")}`);
    }
  }

  // Technical Details from Vision AI
  if (enriched.vision_attributes?.technicalDetails && Array.isArray(enriched.vision_attributes.technicalDetails)) {
    const techDetails = enriched.vision_attributes.technicalDetails;
    if (techDetails.length > 0) {
      sections.push(
        language === "en" ? "\nTECHNICAL SPECIFICATIONS (from Vision AI):" : "\nSPÉCIFICATIONS TECHNIQUES (Vision IA):",
      );
      sections.push(techDetails.map((detail: string) => `- ${detail}`).join("\n"));
    }
  }

  // Categorization
  const cats = [];
  if (enriched.category) cats.push(`Catégorie: ${enriched.category}`);
  if (enriched.sub_category) cats.push(`Sous-catégorie: ${enriched.sub_category}`);
  if (enriched.style) cats.push(`Style: ${enriched.style}`);
  if (enriched.room) cats.push(`Pièce: ${enriched.room}`);
  if (enriched.functionality) cats.push(`Fonctionnalité: ${enriched.functionality}`);
  if (cats.length > 0) {
    sections.push(language === "en" ? "\nCATEGORIZATION:" : "\nCATÉGORISATION:");
    sections.push(cats.map((c: string) => `- ${c}`).join("\n"));
  }

  // Quality & Analysis
  const quality = [];
  if (enriched.ai_vision_analysis) quality.push(`Analyse: ${enriched.ai_vision_analysis}`);
  if (enriched.ai_presentation_quality) quality.push(`Qualité Présentation: ${enriched.ai_presentation_quality}`);
  if (enriched.ai_craftsmanship_level) quality.push(`Niveau Artisanat: ${enriched.ai_craftsmanship_level}`);
  if (quality.length > 0) {
    sections.push(language === "en" ? "\nQUALITY ANALYSIS:" : "\nANALYSE QUALITÉ:");
    sections.push(quality.map((q: string) => `- ${q}`).join("\n"));
  }

  // Conversational Text
  if (enriched.chat_text) {
    sections.push(language === "en" ? "\nCONVERSATIONAL DESCRIPTION:" : "\nDESCRIPTION CONVERSATIONNELLE:");
    sections.push(enriched.chat_text);
  }

  return sections.join("\n");
}

function detectLanguage(text: string): string {
  if (!text || text.length < 10) return "fr"; // Default to French

  const cleanText = text.toLowerCase().trim();

  // French indicators (articles, common words)
  const frenchWords = ["le", "la", "les", "un", "une", "des", "de", "du", "et", "avec", "pour", "dans", "sur"];
  const frenchCount = frenchWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  // English indicators
  const englishWords = ["the", "and", "for", "with", "this", "that", "from", "our", "your"];
  const englishCount = englishWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  // Spanish indicators
  const spanishWords = ["el", "la", "los", "las", "un", "una", "con", "para", "que", "en"];
  const spanishCount = spanishWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  // Determine language by highest count
  const counts = { fr: frenchCount, en: englishCount, es: spanishCount };
  const maxLang = Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  console.log(`🌍 Language detection: FR=${frenchCount}, EN=${englishCount}, ES=${spanishCount} → ${maxLang}`);

  return maxLang;
}

function sanitizeHtmlUnsafe(html: string): string {
  if (!html) return "";
  let out = html
    .replace(/^\s*```(?:html)?/gi, "")
    .replace(/```\s*$/g, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, ' href="#"')
    .replace(/<\/?(html|head|body)[^>]*>/gi, "");
  out = out.replace(/\sstyle\s*=\s*(['"])(.*?)\1/gi, (_m, q, css) => {
    const kept = css
      .split(";")
      .map((r: string) => r.trim())
      .filter((r: string) => /^(color|background-color|border-color)\s*:/i.test(r))
      .join("; ");
    return kept ? ` style=${q}${kept}${q}` : "";
  });
  return out.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ============ LOAD CONFIGURATION FROM DATABASE ============
    console.log("📚 Loading configuration options from database...");

    const [layoutsRes, stylesRes, colorSchemesRes, lengthsRes, highlightsRes] = await Promise.all([
      supabaseAdmin.from('landing_page_config_options')
        .select('*')
        .eq('category', 'layout')
        .eq('is_active', true)
        .order('display_order'),
      
      supabaseAdmin.from('landing_page_config_options')
        .select('*')
        .eq('category', 'design_style')
        .eq('is_active', true)
        .order('display_order'),
      
      supabaseAdmin.from('landing_page_config_options')
        .select('*')
        .eq('category', 'color_scheme')
        .eq('is_active', true)
        .order('display_order'),
      
      supabaseAdmin.from('landing_page_config_options')
        .select('*')
        .eq('category', 'content_length')
        .eq('is_active', true)
        .order('display_order'),
      
      supabaseAdmin.from('landing_page_config_options')
        .select('*')
        .eq('category', 'highlight')
        .eq('is_active', true)
        .order('display_order')
    ]);

    const dbLayouts = layoutsRes.data || [];
    const dbStyles = stylesRes.data || [];
    const dbColorSchemes = colorSchemesRes.data || [];
    const dbContentLengths = lengthsRes.data || [];
    const dbHighlights = highlightsRes.data || [];

    console.log(`✅ Loaded from DB: ${dbLayouts.length} layouts, ${dbStyles.length} styles, ${dbColorSchemes.length} color schemes`);

    // Get authenticated user
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    const body = await req.json();
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style,
      mainColor = "#3B82F6",
      colorScheme,
      layout,
      length,
      customHighlights,
      language,
      designStyle = "modern", // Default to modern if not provided
      imageAnalysis, // 🔥 Vision AI data if available
      userPreferences, // ✅ NEW: User preferences from landing_page_preferences
    } = body ?? {};

    // ============ USE USER PREFERENCES IF PROVIDED ============
    let selectedLayout, selectedStyle, selectedColorScheme, selectedLength, selectedHighlights;

    // Helper to convert HSL to Hex
    const hslToHex = (hsl: string): string => {
      if (!hsl) return '#000000'; // Handle undefined/null
      if (hsl.startsWith('#')) return hsl; // Already hex
      
      const match = hsl.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/);
      if (!match) return '#000000';
      
      const [, h, s, l] = match.map(Number);
      const hue = h / 360;
      const sat = s / 100;
      const lum = l / 100;
      
      const c = (1 - Math.abs(2 * lum - 1)) * sat;
      const x = c * (1 - Math.abs((hue * 6) % 2 - 1));
      const m = lum - c / 2;
      let r = 0, g = 0, b = 0;
      
      if (hue < 1/6) [r, g, b] = [c, x, 0];
      else if (hue < 2/6) [r, g, b] = [x, c, 0];
      else if (hue < 3/6) [r, g, b] = [0, c, x];
      else if (hue < 4/6) [r, g, b] = [0, x, c];
      else if (hue < 5/6) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      
      const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    if (userPreferences) {
      console.log("✅ Using user preferences from landing_page_preferences");
      
      selectedLayout = dbLayouts.find(l => l.option_key === userPreferences.layout) || dbLayouts[0];
      
      // Build styleTemplates from DB
      const styleTemplatesFromDB: any = {};
      dbStyles.forEach(style => {
        styleTemplatesFromDB[style.option_key] = {
          name: style.option_label,
          description: style.description || '',
          rules: style.option_value || ''
        };
      });
      
      selectedStyle = styleTemplatesFromDB[userPreferences.designStyle] || styleTemplatesFromDB['modern'];
      
      // Convert HSL colors from preferences to Hex
      selectedColorScheme = userPreferences.colorScheme ? {
        primary: hslToHex(userPreferences.colorScheme.primary),
        secondary: hslToHex(userPreferences.colorScheme.secondary),
        accent: hslToHex(userPreferences.colorScheme.accent),
        background: hslToHex(userPreferences.colorScheme.background),
        surface: hslToHex(userPreferences.colorScheme.surface),
        text: hslToHex(userPreferences.colorScheme.text),
        textMuted: hslToHex(userPreferences.colorScheme.textMuted)
      } : { primary: mainColor };
      
      selectedLength = dbContentLengths.find(c => c.option_key === userPreferences.contentLength) || dbContentLengths[1];
      
      selectedHighlights = userPreferences.highlights 
        ? dbHighlights.filter(h => userPreferences.highlights.includes(h.option_label))
        : dbHighlights.slice(0, 3);
        
      console.log("✅ User preferences applied:", {
        layout: selectedLayout?.option_key,
        style: userPreferences.designStyle,
        colorScheme: Object.keys(selectedColorScheme).join(', '),
        contentLength: selectedLength?.option_key
      });
    } else {
      console.log("⚠️ No user preferences, using request parameters or defaults");
      
      selectedLayout = dbLayouts.find(l => l.option_key === layout) || dbLayouts[0];
      
      // Build styleTemplates from DB as fallback
      const styleTemplatesFromDB: any = {};
      dbStyles.forEach(style => {
        styleTemplatesFromDB[style.option_key] = {
          name: style.option_label,
          description: style.description || '',
          rules: style.option_value || ''
        };
      });
      
      selectedStyle = styleTemplatesFromDB[designStyle] || styleTemplatesFromDB['modern'];
      selectedColorScheme = colorScheme || { primary: mainColor };
      selectedLength = dbContentLengths.find(c => c.option_key === length) || dbContentLengths[1];
      selectedHighlights = customHighlights 
        ? dbHighlights.filter(h => customHighlights.includes(h.option_label))
        : dbHighlights.slice(0, 3);
    }

    console.log("📥 Request parameters:", {
      product_id,
      productTitle: productTitle?.substring(0, 50),
      designStyle,
      hasColorScheme: !!colorScheme,
      language,
    });

    console.log("🔐 User authentication:", {
      hasAuthHeader: !!authHeader,
      userId: userId,
      productId: product_id,
      willAttemptSave: !!(userId && product_id),
    });

    // Initialize version tracking variables
    let versionSaved = false;
    let savedVersionNumber = null;

    // Auto-detect language from product title and description if not provided
    const detectedLanguage = language || detectLanguage(`${productTitle || ""} ${description || ""}`);

    // Generate design tokens from selected color scheme or fallback
    const effectiveColorScheme = selectedColorScheme || colorScheme || { primary: mainColor };
    const designTokens = generateDesignTokens(effectiveColorScheme);

    if (!productTitle)
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!product_id)
      return new Response(JSON.stringify({ error: "Missing required field: product_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // 🔧 STEP 1: Product Enrichment (with conditional logic and retry)
    console.log("🔧 Starting product enrichment check...");
    let enrichmentStatus = "skipped";
    let attributesCount = 0;

    // First, check if product already has recent enrichment
    const { data: existingProduct } = await supabaseAdmin
      .from("shopify_products")
      .select("enriched_at, ai_color, ai_material, smart_length, smart_width, smart_height")
      .eq("id", product_id)
      .maybeSingle();

    const hasRecentEnrichment =
      existingProduct?.enriched_at && new Date().getTime() - new Date(existingProduct.enriched_at).getTime() < 86400000; // 24 hours

    const hasEnrichedData =
      existingProduct &&
      (existingProduct.ai_color ||
        existingProduct.ai_material ||
        existingProduct.smart_length ||
        existingProduct.smart_width ||
        existingProduct.smart_height);

    if (hasRecentEnrichment && hasEnrichedData) {
      console.log("✅ Using existing enrichment (less than 24h old)");
      enrichmentStatus = "cached";
    } else {
      console.log("🔧 Starting product enrichment (no recent data)...");

      // Helper function to attempt enrichment
      const attemptEnrichment = async (attemptNumber: number): Promise<boolean> => {
        try {
          console.log(`📡 Enrichment attempt ${attemptNumber}...`);

          const { data: enrichData, error: enrichError } = await supabaseAdmin.functions.invoke("enrich-product", {
            body: { productId: product_id },
          });

          if (enrichError) {
            console.error(`❌ Enrichment attempt ${attemptNumber} failed:`, {
              message: enrichError.message,
              status: enrichError.status,
              details: enrichError.details,
            });
            return false;
          }

          console.log(`✅ Enrichment attempt ${attemptNumber} completed successfully`);
          return true;
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(`❌ Enrichment attempt ${attemptNumber} exception:`, {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 200),
          });
          return false;
        }
      };

      // Try enrichment with retry logic
      const firstAttempt = await attemptEnrichment(1);

      if (firstAttempt) {
        enrichmentStatus = "success";
      } else {
        console.log("⏳ Waiting 2s before retry...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const secondAttempt = await attemptEnrichment(2);

        if (secondAttempt) {
          enrichmentStatus = "success";
        } else {
          console.warn("⚠️ Enrichment failed after 2 attempts (continuing without it)");
          enrichmentStatus = "failed";
        }
      }
    }

    // Fetch product data including handle, store domain, AND enriched attributes
    console.log("📦 Fetching product data with enriched attributes...");
    const [productRes, imagesRes, variantsRes, storeRes] = await Promise.all([
      supabaseAdmin.from("shopify_products").select("*").eq("id", product_id).maybeSingle(),
      supabaseAdmin.from("product_images").select("src, alt_text").eq("product_id", product_id).order("position"),
      supabaseAdmin
        .from("product_variants")
        .select("title, image_url, shopify_variant_id")
        .eq("product_id", product_id),
      userId
        ? supabaseAdmin.from("shopify_connections").select("shop_domain").eq("seller_id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const productHandle = productRes.data?.handle || "";
    const shopifyProductId = productRes.data?.shopify_product_id || "";
    const shopDomain = storeRes.data?.shop_domain || "";
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    const enrichedProduct = productRes.data || {};

    // Count enriched attributes
    const enrichedFields = [
      "ai_color",
      "ai_material",
      "ai_shape",
      "ai_texture",
      "ai_pattern",
      "ai_finish",
      "smart_length",
      "smart_width",
      "smart_height",
      "smart_weight",
      "category",
      "sub_category",
      "style",
      "room",
      "functionality",
    ];
    attributesCount = enrichedFields.filter((f) => enrichedProduct[f]).length;

    console.log(
      `✅ Product data fetched: ${images.length} images, ${variants.length} variants, ${attributesCount} enriched attributes`,
    );

    // Build enriched summary
    const enrichedSummary = buildEnrichedProductSummary(enrichedProduct, detectedLanguage);
    if (enrichedSummary) {
      console.log("📊 Using enriched attributes in landing page generation");
    }

    // 🌍 Get store localization for SERP analysis
    let storeCountry = "United States";
    let storeLanguage = "en";

    if (enrichedProduct.store_id) {
      console.log("🔍 Fetching store localization info...");
      try {
        const { data: storeData } = await supabaseAdmin
          .from("shopify_connections")
          .select("primary_locale, country_code")
          .eq("id", enrichedProduct.store_id)
          .maybeSingle();

        if (storeData) {
          storeCountry = storeData.country_code || "United States";
          storeLanguage = storeData.primary_locale?.split("-")[0] || "en";
          console.log(`📍 Store location: ${storeCountry}, language: ${storeLanguage}`);
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch store info, using defaults:", error);
      }
    }

    // 🔍 SERP Analysis for landing page structure
    console.log("🔍 Analyzing SERP competitors for landing page structure...");
    let serpInsights: any = null;

    try {
      const { data: serpData, error: serpError } = await supabaseAdmin.functions.invoke("analyze-serp-competitors", {
        body: {
          keyword: productTitle,
          analysisType: "landing",
          location: storeCountry,
          language: storeLanguage,
          maxResults: 10,
        },
      });

      if (serpError) {
        console.warn("⚠️ SERP analysis failed:", serpError);
      } else if (serpData) {
        serpInsights = serpData.insights;
        console.log("✅ SERP analysis completed:", {
          commonSections: serpInsights?.commonSections?.length || 0,
          ctaPatterns: serpInsights?.ctaPatterns?.length || 0,
        });
      }
    } catch (serpErr) {
      console.warn("⚠️ SERP analysis error:", serpErr);
    }

    // 🖼️ Multi-Image Vision AI Analysis - Analyze ALL product images
    console.log(`🔍 Starting Vision AI analysis for ${images.length} images...`);
    const imageAnalyses: Array<{ imageUrl: string; description: string; index: number }> = [];

    // Analyze main image + all additional images (limit to 6 images max for performance)
    const imagesToAnalyze = images.slice(0, 6);

    for (let i = 0; i < imagesToAnalyze.length; i++) {
      const img = imagesToAnalyze[i];
      try {
        console.log(`📸 Analyzing image ${i + 1}/${imagesToAnalyze.length}: ${img.src.substring(0, 50)}...`);

        const visionController = new AbortController();
        const visionTimeout = setTimeout(() => visionController.abort(), 15000);

        const { data: visionData, error: visionError } = await supabaseAdmin.functions.invoke(
          "analyze-image-with-vision",
          {
            body: {
              imageUrl: img.src,
              productContext: {
                title: productTitle,
                category: enrichedProduct.category,
                type: enrichedProduct.product_type,
              },
            },
            signal: visionController.signal,
          },
        );

        clearTimeout(visionTimeout);

        if (visionError) {
          console.log(`⚠️ Vision AI failed for image ${i + 1}:`, visionError.message);
        } else if (visionData?.visualAttributes) {
          const description = buildVisionSummary(visionData.visualAttributes, detectedLanguage);
          imageAnalyses.push({
            imageUrl: img.src,
            description,
            index: i + 1,
          });
          console.log(`✅ Vision AI analysis completed for image ${i + 1}`);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.log(`⚠️ Vision AI timeout for image ${i + 1} (continuing):`, error.message);
      }
    }

    console.log(`✅ Completed Vision AI analysis: ${imageAnalyses.length}/${imagesToAnalyze.length} images analyzed`);

    // ============ SAVE VISION DATA TO DATABASE ============
    // Aggregate and save vision attributes from all analyzed images
    if (imageAnalyses.length > 0) {
      console.log("💾 Saving Vision AI data to database...");

      // Merge vision attributes from all images
      const mergedVisionAttributes = imageAnalyses.reduce((acc: any, analysis: any, index: number) => {
        // First image is primary
        if (index === 0) {
          return analysis;
        }

        // Merge materials from subsequent images
        if (analysis.visualAttributes?.materials) {
          acc.visualAttributes.materials = [
            ...(acc.visualAttributes?.materials || []),
            ...analysis.visualAttributes.materials,
          ].filter((m: string, i: number, arr: string[]) => arr.indexOf(m) === i);
        }

        // Take first technical dimensions found
        if (!acc.visualAttributes?.technicalDimensions && analysis.visualAttributes?.technicalDimensions) {
          acc.visualAttributes.technicalDimensions = analysis.visualAttributes.technicalDimensions;
        }

        return acc;
      }, imageAnalyses[0]);

      // Update product with vision data
      const { error: visionUpdateError } = await supabaseAdmin
        .from("shopify_products")
        .update({
          vision_attributes: mergedVisionAttributes.visualAttributes || null,
          vision_timestamp: new Date().toISOString(),
          vision_model: "google/gemini-2.5-flash",
        })
        .eq("id", product_id);

      if (visionUpdateError) {
        console.error("❌ Failed to save vision data:", visionUpdateError);
      } else {
        console.log("✅ Vision data saved to database");
      }
    }

    // Build comprehensive visual analysis summary
    let visualAnalysis = "";
    if (imageAnalyses.length > 0) {
      visualAnalysis =
        detectedLanguage === "en"
          ? "\n🖼️ IMAGE ANALYSIS (Gemini Vision AI):\n\n"
          : "\n🖼️ ANALYSE DES IMAGES (Gemini Vision AI):\n\n";

      imageAnalyses.forEach((analysis) => {
        const imageLabel =
          detectedLanguage === "en"
            ? `Image ${analysis.index}${analysis.index === 1 ? " (main)" : ""}`
            : `Photo ${analysis.index}${analysis.index === 1 ? " (principale)" : ""}`;
        visualAnalysis += `${imageLabel}:\n${analysis.description}\n\n`;
      });
    } else {
      console.log("⏭️ No images analyzed by Vision AI");
    }

    // --- Prompt bilingual ---
    const imgs = images.length
      ? images.map((i) => `- ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")
      : detectedLanguage === "en"
        ? "No additional image"
        : "Aucune image supplémentaire";
    
    // 🔥 AMÉLIORATION: Variantes avec images bien mises en évidence
    const vars = variants.length
      ? variants.map((v) => {
          if (v.image_url) {
            return `- **${v.title}** → IMAGE DISPONIBLE: ${v.image_url}`;
          }
          return `- ${v.title} (pas d'image spécifique)`;
        }).join("\n")
      : detectedLanguage === "en"
        ? "No variant"
        : "Aucune variante";

    // Build product URLs
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    // Design style templates loaded from DB (already built above in userPreferences section)
    // No hardcoded templates needed anymore - all dynamic from landing_page_config_options

    // Icon templates by style - CLEARLY DIFFERENTIATED
    const iconTemplates = {
      minimalist: `
  <!-- MINIMALIST: Simple stroke, no fill, monochrome -->
  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" style="color: hsl(${designTokens.text})" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path>
  </svg>`,

      modern: `
  <!-- MODERN: Gradient circle + check, clean & balanced -->
  <svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="modernCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${designTokens.primary});stop-opacity:1" />
        <stop offset="100%" style="stop-color:hsl(${designTokens.accent});stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#modernCheckGrad)" opacity="0.12"/>
    <path d="M10 16 L14 20 L22 12" stroke="hsl(${designTokens.primary})" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

      premium: `
  <!-- PREMIUM: Multi-layer gradient + glow effect, luxurious -->
  <svg class="w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="premiumCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${designTokens.primary});stop-opacity:1" />
        <stop offset="50%" style="stop-color:hsl(${designTokens.accent});stop-opacity:1" />
        <stop offset="100%" style="stop-color:hsl(${designTokens.primary});stop-opacity:0.8" />
      </linearGradient>
      <filter id="premiumCheckGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Outer glow circle -->
    <circle cx="28" cy="28" r="24" fill="url(#premiumCheckGrad)" opacity="0.08" filter="url(#premiumCheckGlow)"/>
    <!-- Mid circle with gradient -->
    <circle cx="28" cy="28" r="22" fill="url(#premiumCheckGrad)" opacity="0.15"/>
    <!-- Inner border circle -->
    <circle cx="28" cy="28" r="20" stroke="url(#premiumCheckGrad)" stroke-width="1.5" fill="none" opacity="0.4"/>
    <!-- Check mark with glow -->
    <path d="M17 28 L24 35 L39 20" stroke="url(#premiumCheckGrad)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#premiumCheckGlow)"/>
  </svg>`,
    };

    // Select design style (default to modern if not provided)
    // selectedStyle is already defined above in the userPreferences or fallback section
    const validDesignStyles = ["minimalist", "modern", "premium"];
    const selectedDesignStyle = userPreferences?.designStyle || designStyle || "modern";
    const selectedIcon = iconTemplates[selectedDesignStyle as "minimalist" | "modern" | "premium"];

    console.log(`[Landing AI] Design style: ${selectedStyle.name || 'Modern'} (received: ${selectedDesignStyle})`);

    const prompt =
      detectedLanguage === "en"
        ? `You are a Shopify UX/UI expert specialized in product landing pages.
Generate a complete, professional Tailwind HTML landing page.

PRODUCT:
- Title: ${productTitle}
- Brand: ${vendor}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}
- Product URL: ${productUrl}

${enrichedSummary ? `ENRICHED ATTRIBUTES:\n${enrichedSummary}\n` : ""}
${visualAnalysis ? `🔍 VISUAL AI INSIGHTS (TRUST THESE OBSERVATIONS - THEY ARE WHAT IS ACTUALLY VISIBLE IN THE IMAGE):\n${visualAnalysis}\n\n🚨 CRITICAL: You MUST describe only what Vision AI observed. DO NOT mention features, colors, or materials that contradict the visual analysis above. If Vision AI says the product has wooden elements, DO NOT write about metal elements. BE 100% ACCURATE TO THE VISUAL OBSERVATIONS.\n` : ""}
${
  serpInsights
    ? `
🎯 COMPETITOR LANDING PAGE ANALYSIS (USE THIS TO STRUCTURE YOUR PAGE):

📋 Common Sections Found in Top Results:
${serpInsights.commonSections?.map((s: string) => `- ${s}`).join("\n") || "- Hero section\n- Product benefits\n- FAQ"}

💬 Effective CTA Patterns:
${serpInsights.ctaPatterns?.map((p: string) => `- ${p}`).join("\n") || "- Buy now\n- Learn more"}

🏗️ Structural Elements to Include:
${serpInsights.structuralElements?.map((e: string) => `- ${e}`).join("\n") || "- Clear headline\n- Visual imagery\n- Trust signals"}

📊 Content Density: ${serpInsights.contentDensity || "medium"}

💡 RECOMMENDATION: Structure your landing page using these proven patterns while maintaining uniqueness.
`
    : ""
}

IMAGES:
${imgs}

🖼️ VARIANTS WITH IMAGES (CRITICAL - MUST DISPLAY ALL):
${vars}
${variants.length > 0 ? `
🚨 CRITICAL VARIANT DISPLAY RULES:
1. Create a dedicated "Variations disponibles" section AFTER the main product description
2. For EACH variant with an image:
   - Display the variant image in a gallery grid (grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
   - Add variant title as image caption below each image
   - Ensure images are properly sized: aspect-square object-cover
   - Use lazy loading: loading="lazy"
3. Structure example:
   <section class="py-12">
     <h2 class="text-3xl font-bold mb-8">Variations disponibles</h2>
     <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
       ${variants.filter(v => v.image_url).map(v => `
       <div class="group">
         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 mb-3">
           <img src="${v.image_url}" alt="${v.title}" loading="lazy" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
         </div>
         <p class="text-sm font-medium text-center">${v.title}</p>
       </div>
       `).join('')}
     </div>
   </section>
` : ""}

${customHighlights ? `HIGHLIGHTS:\n${customHighlights}` : ""}

🎨 COMPLETE COLOR PALETTE (ALL 5 COLORS FROM THEME):
${colorScheme ? `
Palette ID: ${(colorScheme as any).paletteId || 'custom'}
${(colorScheme as any).paletteId === 'modern' ? `
- Color 1 (Darkest): #000000 → hsl(0 0% 0%)
- Color 2: #333333 → hsl(0 0% 20%)
- Color 3: #666666 → hsl(0 0% 40%)
- Color 4: #999999 → hsl(0 0% 60%)
- Color 5 (Lightest): #CCCCCC → hsl(0 0% 80%)
` : (colorScheme as any).paletteId === 'blue' ? `
- Color 1 (Darkest): #003366 → hsl(210 100% 20%)
- Color 2: #0066CC → hsl(210 100% 40%)
- Color 3: #3399FF → hsl(210 100% 60%)
- Color 4: #66B3FF → hsl(210 100% 70%)
- Color 5 (Lightest): #99CCFF → hsl(210 100% 80%)
` : (colorScheme as any).paletteId === 'earth' ? `
- Color 1 (Darkest): #5D4037 → hsl(16 31% 30%)
- Color 2: #795548 → hsl(16 25% 40%)
- Color 3: #A1887F → hsl(20 15% 56%)
- Color 4: #D7CCC8 → hsl(14 20% 81%)
- Color 5 (Lightest): #EFEBE9 → hsl(30 12% 93%)
` : (colorScheme as any).paletteId === 'luxury' ? `
- Color 1 (Darkest): #1A1A1A → hsl(0 0% 10%)
- Color 2: #4A4A4A → hsl(0 0% 29%)
- Color 3 (Gold): #B8860B → hsl(43 90% 38%)
- Color 4: #DAA520 → hsl(43 87% 49%)
- Color 5 (Brightest Gold): #FFD700 → hsl(51 100% 50%)
` : (colorScheme as any).paletteId === 'fresh' ? `
- Color 1 (Darkest): #1B5E20 → hsl(123 56% 24%)
- Color 2: #388E3C → hsl(123 43% 39%)
- Color 3: #66BB6A → hsl(122 39% 57%)
- Color 4: #81C784 → hsl(120 39% 65%)
- Color 5 (Lightest): #A5D6A7 → hsl(122 40% 75%)
` : (colorScheme as any).paletteId === 'vibrant' ? `
- Color 1 (Darkest): #B71C1C → hsl(0 73% 41%)
- Color 2: #D32F2F → hsl(0 63% 50%)
- Color 3: #F44336 → hsl(4 90% 58%)
- Color 4: #EF5350 → hsl(2 85% 63%)
- Color 5 (Lightest): #E57373 → hsl(0 71% 68%)
` : `
Custom palette - use provided design tokens below
`}
` : ''}

DESIGN TOKENS (HSL FORMAT - FOR THE 7 THEME COLORS):
- Primary: hsl(${designTokens.primary})
- Secondary: hsl(${designTokens.secondary})
- Accent: hsl(${designTokens.accent})
- Background: hsl(${designTokens.background})
- Surface: hsl(${designTokens.surface})
- Text main: hsl(${designTokens.text})
- Text muted: hsl(${designTokens.textMuted})
- CTA text: hsl(${designTokens.ctaText})

🚨 CRITICAL COLOR & THEME USAGE RULES:
1. ✅ MANDATORY: Include dark/light theme toggle in the <head> section with :root CSS variables
2. ✅ MANDATORY: Define BOTH light and dark theme variables in :root
3. ✅ Use CSS variables (var(--color-primary), var(--color-background), etc.) for all styling
4. ❌ NEVER USE HEX COLORS directly in elements (#FFFFFF, #000000, etc.)
5. ❌ NEVER use inline HSL values - ALWAYS use CSS variables
6. ✅ Provide a theme toggle button in the top-right corner of the page
7. MANDATORY THEME SYSTEM - Include this EXACT code in <head>:
   <style>
     :root {
       --color-primary: ${designTokens.primary};
       --color-secondary: ${designTokens.secondary};
       --color-accent: ${designTokens.accent};
       --color-background: ${designTokens.background};
       --color-surface: ${designTokens.surface};
       --color-text: ${designTokens.text};
       --color-text-muted: ${designTokens.textMuted};
     }
     
     [data-theme="dark"] {
       --color-primary: ${designTokens.primary};
       --color-secondary: ${designTokens.secondary};
       --color-accent: ${designTokens.accent};
       --color-background: 222 47% 11%;
       --color-surface: 217 33% 17%;
       --color-text: 210 40% 98%;
       --color-text-muted: 215 20% 65%;
     }
     
     body {
       background-color: hsl(var(--color-background));
       color: hsl(var(--color-text));
       transition: background-color 0.3s ease, color 0.3s ease;
     }
   </style>
   
   <script>
     // Theme toggle functionality
     const theme = localStorage.getItem('theme') || 'light';
     document.documentElement.setAttribute('data-theme', theme);
     
     function toggleTheme() {
       const current = document.documentElement.getAttribute('data-theme');
       const next = current === 'light' ? 'dark' : 'light';
       document.documentElement.setAttribute('data-theme', next);
       localStorage.setItem('theme', next);
     }
   </script>

8. MANDATORY THEME TOGGLE BUTTON - Add this in the top-right corner:
   <button onclick="toggleTheme()" 
           class="theme-toggle fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
           style="background-color: hsl(var(--color-surface)); color: hsl(var(--color-text));"
           aria-label="Toggle theme">
     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
             d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
     </svg>
   </button>

9. Examples using CSS variables (COPY THESE PATTERNS):
   - Hero banner: <div style="background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent))); color: white;">
   - Section: <section style="background-color: hsl(var(--color-surface));">
   - Card: <div style="background-color: hsl(var(--color-background));">
   - Title: <h2 style="color: hsl(var(--color-primary));">
   - Text: <p style="color: hsl(var(--color-text-muted));">
   - Button: <button style="background-color: hsl(var(--color-accent)); color: white;">

🎨 DESIGN MODEL: ${selectedStyle.name}
${selectedStyle.description}
${selectedStyle.rules}

🚨 CRITICAL RESPONSIVE RULES (MANDATORY):
- NEVER duplicate responsive classes (❌ class="md:text-xl md:text-2xl")
- Use one breakpoint per property (✅ class="text-lg md:text-2xl")

🎯 ICON TEMPLATE TO USE FOR LIST ITEMS (MANDATORY):
${selectedIcon}
🚨 CRITICAL: Use this EXACT structure for ALL list items. 
🚨 CRITICAL: Adapt gradient IDs to be unique (iconGrad1, iconGrad2, etc.)
🚨 CRITICAL: These icons are REQUIRED, not optional - include them in EVERY list

🖼️ HERO BANNER WITH IMAGE (CRITICAL - MANDATORY FIRST SECTION):
🚨 CRITICAL: The landing page MUST start with a full-width hero banner with the MAIN product image as background and text overlay:

1. ✅ MANDATORY HERO STRUCTURE (FIRST SECTION OF PAGE - ALWAYS USE THIS):
   <div class="relative h-[70vh] min-h-[500px] md:h-[80vh] w-full overflow-hidden">
     <!-- Main product image as background (ALWAYS use images[0].src, NOT imageUrl) -->
     <img src="${images[0]?.src || imageUrl || ''}" alt="${productTitle}" 
          loading="eager" 
          class="absolute inset-0 w-full h-full object-cover">
     
     <!-- Dark overlay for text readability (MANDATORY) -->
     <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
     
     <!-- Hero content centered (MANDATORY) -->
     <div class="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center text-center">
       <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight" 
           style="text-shadow: 2px 2px 8px rgba(0,0,0,0.9);">
         ${productTitle}
       </h1>
       <p class="text-lg sm:text-xl md:text-2xl text-white/95 max-w-3xl mb-8 leading-relaxed" 
          style="text-shadow: 1px 1px 4px rgba(0,0,0,0.8);">
         ${description?.substring(0, 150) || 'Description du produit'}...
       </p>
       
       <!-- CTA button in hero -->
       <div class="flex gap-4">
         <a href="#details" 
            class="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105" 
            style="background-color: hsl(${designTokens.primary}); color: white; text-shadow: none;">
           En savoir plus
         </a>
       </div>
     </div>
   </div>

2. ❌ DO NOT USE SPLIT LAYOUTS for hero section - always use full-width image with overlay
3. ❌ NEVER use side-by-side image+text layouts in the hero
4. ✅ ALWAYS use the structure above exactly as shown

5. FOR ALL TEXT ON IMAGES (MANDATORY):
   - Dark overlay: bg-black/40 to bg-black/60
   - Text shadow: style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"
   - White text: text-white
   - Large sizes: text-4xl md:text-6xl for titles

DESIGN & TONE (CRITICAL):
✅ PROFESSIONAL STYLE REQUIRED:
- Minimal, elegant, clean design
- Modern e-commerce aesthetic
- Professional photography style
- Clear typography hierarchy
- Generous whitespace

❌ ABSOLUTELY FORBIDDEN:
- NO decorative icons (sparkles ✨, stars ⭐, hearts ❤️, rocket 🚀, etc.)
- NO emojis in content (🎉, 💎, 🌟, etc.)
- NO colorful badges or stickers
- NO cartoon-style illustrations
- NO playful/childish visual elements
- NO decorative graphics

✓ ONLY ALLOWED:
- Clean product images
- SVG icons for bullet lists (checkmarks, stars, arrows) using theme colors
- Example: <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
- Minimal dividers (thin lines)
- Professional whitespace
- Clear section headings

STRUCTURE:
- Complete HTML5: <!DOCTYPE html>, <html>, <head>, <body>
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
- <script src="https://cdn.tailwindcss.com"></script> in <head>
- 🚨 ALL images MUST have loading="lazy" attribute
- Mobile-first (sm:, md:, lg:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 md:px-0 (margins on mobile, none on desktop)
- Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

📱 RESPONSIVE TABLES (CRITICAL):
- Desktop (md:): Use standard <table> with class "hidden md:table"
- Mobile: Use cards with class "block md:hidden space-y-4"
- Example structure:

🔍 PHASE 5: SPECIFICATIONS RELIABILITY BADGE (MANDATORY):
ALWAYS include a reliability indicator in the technical specifications section:

${
  enrichedProduct?.serp_verified
    ? `
✅ Badge for SERP-verified specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  <span>Spécifications vérifiées</span>
</div>
<p class="text-xs text-gray-600 mb-6">Dimensions confirmées par ${enrichedProduct?.serp_data?.similarProducts?.length || 0} produits similaires</p>
`
    : enrichedProduct?.vision_attributes?.technicalDimensions
      ? `
📐 Badge for image-extracted specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
  <span>Mesures extraites du schéma technique</span>
</div>
<p class="text-xs text-gray-600 mb-6">Dimensions précises lues directement sur l'image produit</p>
`
      : `
⚠️ Badge for estimated specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
  <span>Dimensions approximatives</span>
</div>
<p class="text-xs text-gray-600 mb-6">Ces mesures sont estimées et peuvent varier légèrement</p>
`
}

🚨 CRITICAL: Place this badge IMMEDIATELY BEFORE the technical specifications table/section
  <!-- Mobile cards -->
  <div class="block md:hidden space-y-4">
    <div class="bg-white rounded-lg p-4 shadow">
      <div class="font-semibold mb-2">Label</div>
      <div class="text-secondary">Value</div>
    </div>
  </div>
  <!-- Desktop table -->
  <table class="hidden md:table min-w-full">

🎨 PROFESSIONAL SVG ICONS (CRITICAL - MANDATORY):
- ✅ REQUIRED: Use inline SVG with gradient fills for ALL list items
- ✅ REQUIRED: Apply theme colors (primary, accent) with HSL values
- ✅ REQUIRED: Add elegant checkmark icons for bullet points
- 
- 📋 MANDATORY SVG ICON TEMPLATE FOR LISTS:
  ${selectedIcon}
  
 - 🎯 EXAMPLE FOR EACH LIST ITEM:
  <div class="flex items-center gap-3 mb-4">
    <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${designTokens.primary});stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${designTokens.accent});stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#checkGrad)" opacity="0.15"/>
      <path d="M7 12l3 3 7-7" stroke="hsl(${designTokens.primary})" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div>
      <h4 class="font-semibold mb-1">Benefit Title</h4>
      <p class="text-muted-foreground">Benefit description...</p>
    </div>
  </div>

- 🎨 FOR FEATURE CARDS, USE LARGER ICONS:
  <svg class="w-16 h-16 mx-auto mb-4" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cardIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${designTokens.primary});stop-opacity:1" />
        <stop offset="100%" style="stop-color:hsl(${designTokens.accent});stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#cardIconGrad)" opacity="0.2"/>
    <path d="M20 32 L28 40 L44 24" stroke="hsl(${designTokens.primary})" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>

- 🚨 CRITICAL: Use UNIQUE gradient IDs for each icon (checkGrad1, checkGrad2, cardIcon1, etc.)
- 🚨 CRITICAL: ALWAYS include the SVG icons - they are NOT optional

🚨 ABSOLUTELY FORBIDDEN (CRITICAL):
- NO "Add to Cart" buttons or any purchase buttons
- NO "Buy Now" or "Order Now" buttons
- NO navigation menus or breadcrumbs
- NO footer section
- NO links to external pages (use href="#" only)
- NO call-to-action buttons of any kind

✅ REQUIRED SECTIONS:
Hero with image gallery, Key Benefits (3-4 cards), Technical Specifications (if enriched data), Materials & Composition (if available), Image Gallery, Care Instructions, FAQ.

ICONS USAGE (MANDATORY):
🚨 CRITICAL: SVG icons are REQUIRED, not optional!
- ✅ Use SVG checkmark/star icons for EVERY bullet list item
- ✅ Use gradient fills with theme colors (primary + accent)
- ✅ Each icon needs unique gradient ID (grad1, grad2, etc.)
- ✅ Example template is provided above - USE IT
- ❌ NO simple text bullets (-, *, •)
- ❌ NO emoji icons (✓, ★, ✔)
- ❌ NO decorative icons elsewhere`
: `Tu es un expert UX/UI Shopify spécialisé dans les landing pages produit.
Génère une landing page Tailwind HTML complète et professionnelle en respectant STRICTEMENT la configuration suivante.

⚙️ CONFIGURATION UTILISATEUR (OBLIGATOIRE) :
- Modèle de design sélectionné : ${selectedStyle.name} (config: ${designStyle})
- Layout choisi : "${layout || "2 colonnes"}"
- Longueur de contenu demandée : ${length === "long" ? "LONGUE - sections détaillées, storytelling, FAQ développée" : "COURTE - sections synthétiques, focus sur l'essentiel"}
- Thème de couleurs : palette ${(colorScheme as any)?.paletteId || "personnalisée"}

📱 OPTIMISATION MOBILE & PERFORMANCE (CRITIQUE) :
🚨 TOUJOURS inclure ces optimisations :
1. Images : TOUJOURS ajouter loading="lazy" sur TOUTES les balises <img>
2. Viewport : <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
3. Textes : Adapter les tailles avec classes responsive (text-base md:text-lg)
4. Espacements : Utiliser py-12 md:py-24 pour sections (meilleur sur mobile)

PRODUIT :
- Titre : ${productTitle}
- Marque : ${vendor}
- Description : ${description}
- Style : ${style || enrichedProduct.style || ""}
- URL produit : ${productUrl}

${enrichedSummary ? `ATTRIBUTS ENRICHIS :\n${enrichedSummary}\n` : ""}
${visualAnalysis ? `🔍 INSIGHTS IA VISUELLE (FAIS CONFIANCE À CES OBSERVATIONS - C'EST CE QUI EST RÉELLEMENT VISIBLE DANS L'IMAGE) :\n${visualAnalysis}\n\n🚨 CRITIQUE : Tu DOIS décrire uniquement ce que l'IA visuelle a observé. NE mentionne PAS de caractéristiques, couleurs ou matériaux qui contredisent l'analyse visuelle ci-dessus. Si l'IA visuelle dit que le produit a des éléments en bois, NE parle PAS d'éléments métalliques. SOIS PRÉCIS À 100% PAR RAPPORT AUX OBSERVATIONS VISUELLES.\n` : ""}

IMAGES :
${imgs}

🖼️ VARIANTES AVEC IMAGES (CRITIQUE - DOIVENT ÊTRE AFFICHÉES) :
${vars}
${variants.length > 1 ? `
🚨 RÈGLES D'AFFICHAGE DES VARIANTES (UNIQUEMENT SI PLUS D'1 VARIANTE) :
1. ✅ Crée une section dédiée "Variations disponibles" APRÈS la description principale
2. ✅ Pour CHAQUE variante avec image :
   - Affiche l'image dans une grille : grid-cols-2 md:grid-cols-3 lg:grid-cols-4
   - Utilise des images carré : class="aspect-square object-cover"
   - Ajoute le titre de la variante en légende sous l'image
   - Utilise loading="lazy" pour toutes les images de variantes
3. Exemple de structure :
   <section class="py-12" style="background-color: hsl(${designTokens.background});">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h2 class="text-3xl font-bold text-center mb-8" style="color: hsl(${designTokens.secondary});">Variations disponibles</h2>
       <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
         ... cartes variantes avec image + titre ...
       </div>
     </div>
   </section>
` : `
🚨 CRITICAL: NE PAS AFFICHER la section "Variations disponibles" car il n'y a qu'une seule variante ou aucune variante.
`}

${customHighlights ? `POINTS FORTS FOURNIS PAR L'UTILISATEUR (OBLIGATOIRE À INTÉGRER) :\n${customHighlights}\n\n🚨 Tu DOIS transformer ces points forts en une section dédiée (ex : \"Pourquoi choisir ce produit ?\") avec une liste à puces.\n` : ""}

🎨 PALETTE DE COULEURS COMPLÈTE (5 COULEURS PAR THÈME) :
${colorScheme ? `
ID de palette : ${(colorScheme as any).paletteId || 'custom'}
${(colorScheme as any).paletteId === 'modern' ? `
- Couleur 1 (la plus foncée) : #000000 → hsl(0 0% 0%)
- Couleur 2 : #333333 → hsl(0 0% 20%)
- Couleur 3 : #666666 → hsl(0 0% 40%)
- Couleur 4 : #999999 → hsl(0 0% 60%)
- Couleur 5 (la plus claire) : #CCCCCC → hsl(0 0% 80%)
` : (colorScheme as any).paletteId === 'blue' ? `
- Couleur 1 (la plus foncée) : #003366 → hsl(210 100% 20%)
- Couleur 2 : #0066CC → hsl(210 100% 40%)
- Couleur 3 : #3399FF → hsl(210 100% 60%)
- Couleur 4 : #66B3FF → hsl(210 100% 70%)
- Couleur 5 (la plus claire) : #99CCFF → hsl(210 100% 80%)
` : (colorScheme as any).paletteId === 'earth' ? `
- Couleur 1 (la plus foncée) : #5D4037 → hsl(16 31% 30%)
- Couleur 2 : #795548 → hsl(16 25% 40%)
- Couleur 3 : #A1887F → hsl(20 15% 56%)
- Couleur 4 : #D7CCC8 → hsl(14 20% 81%)
- Couleur 5 (la plus claire) : #EFEBE9 → hsl(30 12% 93%)
` : (colorScheme as any).paletteId === 'luxury' ? `
- Couleur 1 (la plus foncée) : #1A1A1A → hsl(0 0% 10%)
- Couleur 2 : #4A4A4A → hsl(0 0% 29%)
- Couleur 3 (Or) : #B8860B → hsl(43 90% 38%)
- Couleur 4 : #DAA520 → hsl(43 87% 49%)
- Couleur 5 (Or très lumineux) : #FFD700 → hsl(51 100% 50%)
` : (colorScheme as any).paletteId === 'fresh' ? `
- Couleur 1 (la plus foncée) : #1B5E20 → hsl(123 56% 24%)
- Couleur 2 : #388E3C → hsl(123 43% 39%)
- Couleur 3 : #66BB6A → hsl(122 39% 57%)
- Couleur 4 : #81C784 → hsl(120 39% 65%)
- Couleur 5 (la plus claire) : #A5D6A7 → hsl(122 40% 75%)
` : (colorScheme as any).paletteId === 'vibrant' ? `
- Couleur 1 (la plus foncée) : #B71C1C → hsl(0 73% 41%)
- Couleur 2 : #D32F2F → hsl(0 63% 50%)
- Couleur 3 : #F44336 → hsl(4 90% 58%)
- Couleur 4 : #EF5350 → hsl(2 85% 63%)
- Couleur 5 (la plus claire) : #E57373 → hsl(0 71% 68%)
` : `
Palette personnalisée - utilise les tokens ci-dessous
`}
` : ''}

TOKENS DE DESIGN (FORMAT HSL - 7 COULEURS DU THÈME) :
- Primaire : hsl(${designTokens.primary})
- Secondaire : hsl(${designTokens.secondary})
- Accent : hsl(${designTokens.accent})
- Fond principal : hsl(${designTokens.background})
- Surface (cartes/sections) : hsl(${designTokens.surface})
- Texte principal : hsl(${designTokens.text})
- Texte atténué : hsl(${designTokens.textMuted})
- Texte sur CTA : hsl(${designTokens.ctaText})

🚨 RÈGLES COULEURS ET THÈME CRITIQUES (OBLIGATOIRE) :
1. ✅ OBLIGATOIRE : Inclure le toggle dark/light dans le <head> avec les variables CSS :root
2. ✅ OBLIGATOIRE : Définir les variables de thème clair ET foncé dans :root
3. ✅ Utiliser des CSS variables (var(--color-primary), var(--color-background), etc.) pour TOUS les styles
4. ❌ N'UTILISE JAMAIS de couleurs HEX directement dans les éléments (#FFFFFF, #000000, etc.)
5. ❌ N'utilise JAMAIS de valeurs HSL inline - TOUJOURS utiliser les CSS variables
6. ✅ Fournir un bouton toggle de thème dans le coin supérieur droit

7. SYSTÈME DE THÈME OBLIGATOIRE - Inclure ce code EXACT dans <head> :
   <style>
     :root {
       --color-primary: ${designTokens.primary};
       --color-secondary: ${designTokens.secondary};
       --color-accent: ${designTokens.accent};
       --color-background: ${designTokens.background};
       --color-surface: ${designTokens.surface};
       --color-text: ${designTokens.text};
       --color-text-muted: ${designTokens.textMuted};
     }
     
     [data-theme="dark"] {
       --color-primary: ${designTokens.primary};
       --color-secondary: ${designTokens.secondary};
       --color-accent: ${designTokens.accent};
       --color-background: 222 47% 11%;
       --color-surface: 217 33% 17%;
       --color-text: 210 40% 98%;
       --color-text-muted: 215 20% 65%;
     }
     
     body {
       background-color: hsl(var(--color-background));
       color: hsl(var(--color-text));
       transition: background-color 0.3s ease, color 0.3s ease;
     }
   </style>
   
   <script>
     // Fonctionnalité de toggle de thème
     const theme = localStorage.getItem('theme') || 'light';
     document.documentElement.setAttribute('data-theme', theme);
     
     function toggleTheme() {
       const current = document.documentElement.getAttribute('data-theme');
       const next = current === 'light' ? 'dark' : 'light';
       document.documentElement.setAttribute('data-theme', next);
       localStorage.setItem('theme', next);
     }
   </script>

8. BOUTON TOGGLE OBLIGATOIRE - Ajouter ce bouton en haut à droite :
   <button onclick="toggleTheme()" 
           class="theme-toggle fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
           style="background-color: hsl(var(--color-surface)); color: hsl(var(--color-text));"
           aria-label="Changer de thème">
     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
             d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
     </svg>
   </button>

9. Exemples avec CSS variables (COPIER CES PATTERNS) :
   - Hero : <div style="background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent))); color: white;">
   - Section : <section style="background-color: hsl(var(--color-surface));">
   - Carte : <div style="background-color: hsl(var(--color-background));">
   - Titre : <h2 style="color: hsl(var(--color-primary));">
   - Texte : <p style="color: hsl(var(--color-text-muted));">
   - Bouton : <button style="background-color: hsl(var(--color-accent)); color: white;">

🎨 MODÈLE DE DESIGN : ${selectedStyle.name}
${selectedStyle.description}
${selectedStyle.rules}

🚨 RÈGLES RESPONSIVES CRITIQUES (OBLIGATOIRE) :
- JAMAIS dupliquer les classes responsive (❌ class="md:text-xl md:text-2xl")
- Utiliser un seul breakpoint par propriété (✅ class="text-lg md:text-2xl")

🎯 TEMPLATE D'ICÔNE À UTILISER POUR LES LISTES :
${selectedIcon}
Utilise cette structure pour TOUTES les listes à puces. Adapte les ID des dégradés si icônes multiples (iconGrad1, iconGrad2, etc.)

🖼️ HERO AVEC BANNIÈRE IMAGE (CRITIQUE - PREMIÈRE SECTION OBLIGATOIRE) :
1. La page DOIT commencer par une bannière hero optimisée mobile-first :
   <div class="relative min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[70vh] w-full overflow-hidden">
     <img src="${imageUrl || images[0]?.src || ''}" alt="${productTitle}"
          loading="eager"
          class="absolute inset-0 w-full h-full object-cover">
     <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
     <div class="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center">
       <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight px-2"
           style="text-shadow: 2px 2px 8px rgba(0,0,0,0.9)">
         ${productTitle}
       </h1>
       <p class="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 max-w-3xl mb-6 sm:mb-8 leading-relaxed px-4"
          style="text-shadow: 1px 1px 4px rgba(0,0,0,0.8)">
         ${(description || '').substring(0, 150)}...
       </p>
     </div>
   </div>

🖼️ HERO AVEC BANNIÈRE IMAGE (CRITIQUE - PREMIÈRE SECTION OBLIGATOIRE) :
🚨 CRITIQUE : La page DOIT commencer par une bannière hero avec la PREMIÈRE image produit en arrière-plan et overlay de texte :

1. ✅ STRUCTURE HERO OBLIGATOIRE (PREMIÈRE SECTION - TOUJOURS UTILISER CECI) :
   <div class="relative h-[70vh] min-h-[500px] md:h-[80vh] w-full overflow-hidden">
     <!-- Image produit principale en arrière-plan (TOUJOURS utiliser images[0].src, PAS imageUrl) -->
     <img src="${images[0]?.src || imageUrl || ''}" alt="${productTitle}" 
          loading="eager" 
          class="absolute inset-0 w-full h-full object-cover">
     
     <!-- Overlay sombre pour lisibilité (OBLIGATOIRE) -->
     <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
     
     <!-- Contenu hero centré (OBLIGATOIRE) -->
     <div class="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center text-center">
       <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight" 
           style="text-shadow: 2px 2px 8px rgba(0,0,0,0.9);">
         ${productTitle}
       </h1>
       <p class="text-lg sm:text-xl md:text-2xl text-white/95 max-w-3xl mb-8 leading-relaxed" 
          style="text-shadow: 1px 1px 4px rgba(0,0,0,0.8);">
         ${description?.substring(0, 150) || 'Description du produit'}...
       </p>
       
       <!-- Bouton CTA dans hero -->
       <div class="flex gap-4">
         <a href="#details" 
            class="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105" 
            style="background-color: hsl(${designTokens.primary}); color: white; text-shadow: none;">
           En savoir plus
         </a>
       </div>
     </div>
   </div>

2. ❌ NE PAS UTILISER de layouts split pour la section hero - toujours utiliser image full-width avec overlay
3. ❌ JAMAIS de layouts côte-à-côte image+texte dans le hero
4. ✅ TOUJOURS utiliser la structure ci-dessus exactement comme indiqué

5. POUR TOUS LES TEXTES SUR IMAGE (OBLIGATOIRE) :
   - Overlay sombre obligatoire : bg-black/40 à bg-black/60
   - Text-shadow obligatoire : style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)"
   - Texte en blanc : class="text-white"
   - Contraste minimum WCAG AA : 4.5:1
   - Titres adaptés mobile : text-3xl sm:text-4xl md:text-6xl font-bold

DESIGN & TON (CRITIQUE) :
✅ STYLE PROFESSIONNEL REQUIS :
- Design minimal, élégant, épuré
- Esthétique e-commerce moderne
- Style photo professionnelle
- Hiérarchie typographique claire
- Espaces blancs généreux

❌ ABSOLUMENT INTERDIT :
- AUCUNE icône décorative (sparkles ✨, étoiles ⭐, cœurs ❤️, fusée 🚀, etc.)
- AUCUN emoji dans le contenu (🎉, 💎, 🌟, etc.)
- AUCUN badge coloré ou autocollant
- AUCUNE illustration style cartoon
- AUCUN élément visuel ludique/enfantin
- AUCUN graphique décoratif

✓ UNIQUEMENT AUTORISÉ :
- Images produit propres
- Icônes SVG pour listes à puces (checkmarks, étoiles, flèches) utilisant les couleurs du thème
- Exemple : <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
- Séparateurs minimaux (lignes fines)
- Espaces blancs professionnels
- Titres de section clairs

STRUCTURE MOBILE-FIRST (CRITIQUE) :
- HTML5 complet : <!DOCTYPE html>, <html lang="${language}"">, <head>, <body>
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
- <meta name="description" content="${(description || '').substring(0, 160)}">
- <script src="https://cdn.tailwindcss.com"></script> dans <head>
- 🚨 Hero image : loading="eager", autres images : loading="lazy"

📱 APPROCHE MOBILE-FIRST (CRITIQUE) :
1. TOUJOURS commencer par le style mobile (sans préfixe de breakpoint)
2. Ajouter les breakpoints progressivement : sm: (640px) → md: (768px) → lg: (1024px) → xl: (1280px)
3. UNE SEULE classe par propriété et par breakpoint

🎯 HIÉRARCHIE TYPOGRAPHIQUE MOBILE :
- H1 Hero : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
  (mobile 30px → tablette 36px → desktop 48px → large 60px)
- H2 Section : "text-2xl sm:text-3xl md:text-4xl font-bold"
  (mobile 24px → tablette 30px → desktop 36px)
- H3 Cards : "text-lg sm:text-xl md:text-2xl font-semibold"
  (mobile 18px → tablette 20px → desktop 24px)
- Body : "text-base md:text-lg leading-relaxed"
  (mobile 16px → desktop 18px)

📐 SPACING MOBILE-FIRST :
- Section padding : "py-8 sm:py-12 md:py-16 lg:py-24"
  (mobile 32px → tablette 48px → desktop 64px → large 96px)
- Container : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  (mobile 16px → tablette 24px → desktop 32px)
- Card padding : "p-4 sm:p-6 md:p-8"
  (mobile 16px → tablette 24px → desktop 32px)
- Grid gaps : "gap-4 sm:gap-6 md:gap-8"
  (mobile 16px → tablette 24px → desktop 32px)

🔲 LAYOUTS MOBILE-FIRST :
- Grilles basiques : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
- Galerie photos : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
- Features : "grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
- Hero 50/50 : "flex flex-col md:flex-row" avec "w-full md:w-1/2"

🖼️ IMAGES OPTIMISÉES :
- Fluidité : "w-full h-full object-cover"
- Ratio : "aspect-square" ou "aspect-video"
- Hero : "min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[70vh]"
- Lazy loading : loading="lazy" (sauf hero avec loading="eager")

✋ TOUCH TARGETS :
- Boutons/liens : Minimum "min-h-[44px] min-w-[44px]" (spec Apple/Google)
- Padding boutons : "px-6 py-3 sm:px-8 sm:py-4"
- Espace entre éléments cliquables : minimum 8px

📱 TABLEAUX RESPONSIFS (CRITIQUE - OBLIGATOIRE) :
CETTE STRUCTURE DOIT TOUJOURS ÊTRE UTILISÉE POUR LES CARACTÉRISTIQUES TECHNIQUES !

- Mobile : Cartes empilées avec "block md:hidden space-y-4"
- Bureau : Table HTML avec "hidden md:block"
- Structure COMPLÈTE obligatoire :

<!-- VERSION MOBILE - Cartes (TOUJOURS CRÉER) -->
<div class="block md:hidden space-y-4">
  <div class="rounded-xl p-6 shadow-md" style="background-color: hsl(${designTokens.background});">
    <div class="font-semibold mb-2" style="color: hsl(${designTokens.primary});">Nom du champ</div>
    <div class="text-base" style="color: hsl(${designTokens.text});">Valeur</div>
  </div>
  <!-- Répéter pour chaque caractéristique -->
</div>

<!-- VERSION BUREAU - Table (TOUJOURS CRÉER) -->
<div class="hidden md:block rounded-2xl shadow-lg p-8" style="background-color: hsl(${designTokens.surface});">
  <table class="min-w-full divide-y divide-gray-200">
    <tbody class="divide-y divide-gray-200">
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-base font-semibold" style="color: hsl(${designTokens.primary});">Nom du champ</td>
        <td class="px-6 py-4 whitespace-nowrap text-base" style="color: hsl(${designTokens.text});">Valeur</td>
      </tr>
      <!-- Répéter pour chaque caractéristique -->
    </tbody>
  </table>
</div>

🎨 ICÔNES SVG PROFESSIONNELLES (CRITIQUE) :
- Utiliser des SVG inline avec dégradés pour un look premium
- Appliquer les couleurs du thème (primary, secondary, accent) en HSL
- Ajouter ombres et lueurs subtiles pour la profondeur
- Structure exemple :
  <svg class="w-16 h-16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${designTokens.primary});stop-opacity:1" />
        <stop offset="100%" style="stop-color:hsl(${designTokens.accent});stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#iconGrad)" opacity="0.2"/>
    <path d="M20 32 L28 40 L44 24" stroke="hsl(${designTokens.primary})" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>
- Pour les listes, utiliser des icônes élégantes (checkmark, étoile) avec couleurs du thème
- Ajouter effets hover : transform hover:scale-110 transition-transform duration-300

🚨 ABSOLUMENT INTERDIT (CRITIQUE) :
- AUCUN bouton "Ajouter au panier" ou bouton d'achat
- AUCUN bouton "Acheter maintenant" ou "Commander"
- AUCUN menu de navigation ou fil d'Ariane (breadcrumb)
- AUCUNE section footer
- AUCUN lien vers des pages externes (utiliser href="#" uniquement)
- AUCUN bouton call-to-action de quelque nature que ce soit

✅ SECTIONS REQUISES :
- Hero avec bannière image
- Points Forts (3-4 cartes) incluant les HIGHLIGHTS fournis
- **Caractéristiques Techniques** (OBLIGATOIRE si données enrichies disponibles)
  ⚠️ CRITIQUE : DOIT UTILISER la structure tableau responsive décrite ci-dessus
  ⚠️ DEUX VERSIONS : Cartes mobile (block md:hidden) + Table bureau (hidden md:block)
  ⚠️ Afficher TOUS les metafields disponibles (dimensions, poids, matériaux, couleurs, etc.)
- Matériaux & Composition (si disponible)
- Galerie d'Images (y compris variantes si disponibles)
- Conseils d'Entretien
- FAQ.

UTILISATION DES ICÔNES :
- Utiliser UNIQUEMENT des icônes SVG checkmark simples pour les listes à puces
- UNE SEULE icône par élément de liste
- Exemple : <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
- AUCUNE icône décorative ailleurs`;

    // --- AI call with timeout (60s) ---
    console.log("🤖 Starting AI generation...");
    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 60000);

    let aiResponse;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                detectedLanguage === "en"
                  ? "You are a professional content writer for product landing pages. You create informative, engaging HTML content that describes products in detail. Focus on product features, specifications, and benefits. NEVER include purchase buttons, navigation menus, or call-to-action elements. CRITICAL: When enriched product attributes are provided, you MUST create a comprehensive Technical Specifications section using the mobile-first table structure with TWO versions: 1) Mobile cards with 'block md:hidden space-y-4' class, 2) Desktop table with 'hidden md:block' class. ALWAYS include BOTH versions for proper responsive display. CRITICAL COLOR RULES: NEVER use CSS variables like var(--color-primary) or var(--color-background). ALWAYS use inline HSL values directly in style attributes (e.g., style=\"color: hsl(217 91% 60%);\"). NEVER define :root CSS variables. HERO SECTION: The page MUST start with a full-width hero banner with the main product image as background and a dark overlay with centered white text on top. NEVER use split layouts in the hero section."
                  : "Tu es un rédacteur professionnel de contenu pour des landing pages produit. Tu crées du contenu HTML informatif et engageant qui décrit les produits en détail. Concentre-toi sur les caractéristiques, spécifications et avantages du produit. N'inclus JAMAIS de boutons d'achat, menus de navigation ou éléments call-to-action. CRITIQUE : Quand des attributs produit enrichis sont fournis, tu DOIS créer une section Caractéristiques Techniques complète en utilisant la structure de tableau mobile-first avec DEUX versions : 1) Cartes mobile avec class 'block md:hidden space-y-4', 2) Table bureau avec class 'hidden md:block'. Inclus TOUJOURS les DEUX versions pour un affichage responsive correct. RÈGLES COULEURS CRITIQUES : N'UTILISE JAMAIS de variables CSS comme var(--color-primary) ou var(--color-background). UTILISE TOUJOURS les valeurs HSL inline directement dans les attributs style (ex : style=\"color: hsl(217 91% 60%);\"). NE DÉFINIS JAMAIS de variables CSS :root. SECTION HERO : La page DOIT commencer par une bannière hero plein écran avec l'image produit principale en arrière-plan et un overlay sombre avec du texte blanc centré par-dessus. N'UTILISE JAMAIS de layouts split dans la section hero.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 16000,
          temperature: 0.7,
        }),
        signal: aiController.signal,
      });
    } finally {
      clearTimeout(aiTimeout);
    }

    console.log("✅ AI generation completed");

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: `Lovable API ${aiResponse.status}`, detail: text }), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    let rawHtml = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!rawHtml || rawHtml.length < 400)
      return new Response(
        JSON.stringify({ error: detectedLanguage === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    console.log("[AI] Raw HTML received, length:", rawHtml.length);

    // 🧹 Apply HTML normalization and sanitization
    const html = sanitizeGeneratedHTML(rawHtml, productTitle, detectedLanguage || "en");

    // 📊 Validate final HTML
    const validation = validateHTML(html);
    if (!validation.valid) {
      console.warn("[Validation] Issues detected:", validation.issues);
    }

    // Log structure details
    console.log("[Validation] HTML structure:", {
      hasDoctype: html.includes("<!DOCTYPE html>"),
      hasHtml: html.includes("<html"),
      hasClosingBody: html.includes("</body>"),
      hasClosingHtml: html.includes("</html>"),
      length: html.length,
    });

    console.log("✅ HTML generated and sanitized successfully");

    // Simple assign HTML without SERP button
    const finalHtml = html;

    // 🎯 OPTIMIZE PRODUCT TITLE WITH SERP BEFORE SAVING
    if (userId && product_id) {
      console.log("🎯 Optimizing product title with SERP...");
      try {
        const { data: titleData, error: titleError } = await supabaseAdmin.functions.invoke(
          "optimize-product-title-serp",
          {
            body: {
              productId: product_id,
              currentTitle: productTitle,
              description: description,
              productType: imageAnalysis?.productType,
              vendor: vendor,
              language: language,
            },
          },
        );

        if (titleError) {
          console.error("⚠️ Title optimization failed:", titleError);
        } else if (titleData?.success) {
          console.log(`✅ Title optimized: "${titleData.originalTitle}" → "${titleData.optimizedTitle}"`);
        }
      } catch (titleOptError) {
        console.error("⚠️ Title optimization error:", titleOptError);
        // Continue even if title optimization fails
      }
    }

    // 💾 Simple update to shopify_products.landing_page (only if user is authenticated)
    if (userId && product_id) {
      console.log("💾 Updating landing_page field in shopify_products...");

      const { error: updateError } = await supabaseAdmin
        .from("shopify_products")
        .update({
          landing_page: finalHtml,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product_id)
        .eq("seller_id", userId);

      if (updateError) {
        console.error("❌ Update error:", updateError);
      } else {
        console.log("✅ Landing page updated successfully in shopify_products");
      }
    } else {
      console.log("⚠️ Skipping save: userId or product_id not available");
    }

    console.log("✅ Landing page generation successful!");
    return new Response(
      JSON.stringify({
        html: finalHtml,
        enrichment_status: enrichmentStatus,
        attributes_count: attributesCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
