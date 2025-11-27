import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeGeneratedHTML, validateHTML } from "../_shared/html-normalizer.ts";
import { resolveLanguage, getLanguageInstructions, getLanguageName, getGenerationLanguage } from "../_shared/language-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Helper to safely stringify JSON (prevents "[object Object]" errors)
function safeJson(obj: any): string {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

// Helper to fetch configuration options from database
async function getOption(supabaseClient: any, category: string, key: string) {
  try {
    const { data } = await supabaseClient
      .from('landing_page_config_options')
      .select('option_value')
      .eq('category', category)
      .eq('option_key', key)
      .eq('is_active', true)
      .single();
    
    return data?.option_value || null;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch option ${category}:${key}`, error);
    return null;
  }
}

// Helper with timeout for promises
async function withTimeout(promise: Promise<any>, ms: number) {
  let timer: any;
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

// Direct HSL Manipulation Utilities (no HEX conversion)
function parseHSL(hslString: string): { h: number; s: number; l: number } | null {
  if (!hslString) return null;
  
  // Handle both "hsl(H, S%, L%)" and "H S% L%" formats
  const match = hslString.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/i) || 
                hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  
  if (!match) {
    console.error('❌ Failed to parse HSL:', hslString);
    return null;
  }
  
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3])
  };
}

function normalizeHSL(hslString: string | null): string | null {
  if (!hslString) return null;
  
  // If it's a HEX color, convert to HSL first
  if (hslString.startsWith('#')) {
    return hexToHSL(hslString);
  }
  
  // Otherwise, parse as HSL
  const parsed = parseHSL(hslString);
  if (!parsed) return null;
  return `${parsed.h} ${parsed.s}% ${parsed.l}%`;
}

function adjustSaturationHSL(hslString: string, factor: number): string {
  const hsl = parseHSL(hslString);
  if (!hsl) return hslString;
  
  const newS = Math.min(100, Math.max(0, Math.round(hsl.s * factor)));
  return `${hsl.h} ${newS}% ${hsl.l}%`;
}

function adjustLightnessHSL(hslString: string, factor: number): string {
  const hsl = parseHSL(hslString);
  if (!hsl) return hslString;
  
  const newL = Math.min(100, Math.max(0, Math.round(hsl.l * factor)));
  return `${hsl.h} ${hsl.s}% ${newL}%`;
}

// Legacy functions for contrast calculation (still need HEX temporarily)
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

function hexToHSL(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hslString: string): string {
  const hsl = parseHSL(hslString);
  if (!hsl) return "#000000";

  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
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
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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

function adjustLightness(hex: string, factor: number): string {
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

  // Adjust lightness
  l = clamp(l * factor, 0, 1);

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
  // Error handling
  if (!colorScheme) {
    console.error('❌ No color scheme provided to generateDesignTokens');
    return {
      primary: "221 83% 53%",
      primaryLight: "221 83% 64%",
      primaryDark: "221 83% 42%",
      secondary: "212 95% 51%",
      secondaryLight: "212 95% 61%",
      secondaryDark: "212 95% 41%",
      accent: "270 95% 75%",
      accentLight: "270 95% 85%",
      accentDark: "270 95% 65%",
      background: "0 0% 100%",
      surface: "210 40% 98%",
      text: "222 47% 11%",
      textMuted: "0 0% 40%",
      ctaText: "0 0% 100%",
      contrastRatio: 21
    };
  }

  console.log('📥 Received color scheme:', JSON.stringify(colorScheme, null, 2));

  // Normalize all HSL values to "H S% L%" format
  const primary = normalizeHSL(colorScheme.primary) || "221 83% 53%";
  const secondary = normalizeHSL(colorScheme.secondary) || "212 95% 51%";
  const background = normalizeHSL(colorScheme.background) || "0 0% 100%";
  const surface = normalizeHSL(colorScheme.surface) || "210 40% 98%";
  const text = normalizeHSL(colorScheme.text) || "222 47% 11%";
  const accent = normalizeHSL(colorScheme.accent) || adjustSaturationHSL(primary, 1.3);
  
  // Generate textMuted from text color if not provided (reduce saturation and increase lightness)
  const textMuted = normalizeHSL(colorScheme.textMuted) || adjustLightnessHSL(adjustSaturationHSL(text, 0.6), 1.4);
  
  console.log('✅ Normalized HSL colors:', { primary, secondary, accent, text, background, surface, textMuted });
  
  // Calculate contrast for CTA text (using legacy HEX method)
  const primaryHex = hslToHex(primary);
  const contrast = calculateContrast(primaryHex, "#FFFFFF");
  const needsDarkText = contrast < 4.5;
  const ctaText = needsDarkText ? "0 0% 0%" : "0 0% 100%";

  // Generate lighter and darker variants using direct HSL manipulation
  const designTokens = {
    primary,
    primaryLight: adjustLightnessHSL(primary, 1.2),
    primaryDark: adjustLightnessHSL(primary, 0.8),
    secondary,
    secondaryLight: adjustLightnessHSL(secondary, 1.2),
    secondaryDark: adjustLightnessHSL(secondary, 0.8),
    accent,
    accentLight: adjustLightnessHSL(accent, 1.2),
    accentDark: adjustLightnessHSL(accent, 0.8),
    background,
    surface,
    text,
    textMuted,
    ctaText,
    contrastRatio: Math.round(contrast * 10) / 10,
  };

  console.log('🎯 Design Tokens générés:', designTokens);
  
  return designTokens;
}

// Helper to build enriched product summary
// Helper to build Vision AI summary
function buildVisionSummary(attributes: any, language = "fr") {
  if (!attributes) return "";

  const labels =
    language === "en"
      ? {
          visualAnalysis: "VISUAL ANALYSIS:",
          colors: "Colors",
          materials: "Materials",
          style: "Style",
          condition: "Condition",
        }
      : {
          visualAnalysis: "ANALYSE VISUELLE:",
          colors: "Couleurs",
          materials: "Matériaux",
          style: "Style",
          condition: "État",
        };

  const sections = [];

  if (attributes.visualDescription) {
    sections.push(labels.visualAnalysis);
    sections.push(attributes.visualDescription);
  }

  const details = [];
  if (attributes.dominantColors?.length) {
    details.push(`${labels.colors}: ${attributes.dominantColors.join(", ")}`);
  }
  if (attributes.materials?.length) {
    details.push(`${labels.materials}: ${attributes.materials.join(", ")}`);
  }
  if (attributes.style) {
    details.push(`${labels.style}: ${attributes.style}`);
  }
  if (attributes.condition) {
    details.push(`${labels.condition}: ${attributes.condition}`);
  }

  if (details.length > 0) {
    sections.push("\n" + details.map((d: string) => `- ${d}`).join("\n"));
  }

  return sections.join("\n");
}

function buildEnrichedProductSummary(enriched: any, language = "fr") {
  if (!enriched) return "";

  const sections = [];

  // Translation labels
  const labels =
    language === "en"
      ? {
          color: "Color",
          material: "Material",
          shape: "Shape",
          texture: "Texture",
          pattern: "Pattern",
          finish: "Finish",
          designElements: "Design Elements",
          visualAttributes: "VISUAL ATTRIBUTES:",
          dimensions: "DIMENSIONS",
          dimensionsVisible: "DIMENSIONS (visible on image):",
          dimensionsEstimated: "DIMENSIONS (estimated):",
          dimensionsSerpVerified: "DIMENSIONS (SERP verified):",
          technicalSpecs: "TECHNICAL SPECIFICATIONS (from Vision AI):",
          categorization: "CATEGORIZATION:",
          category: "Category",
          subCategory: "Sub-category",
          style: "Style",
          room: "Room",
          functionality: "Functionality",
          qualityAnalysis: "QUALITY ANALYSIS:",
          analysis: "Analysis",
          presentationQuality: "Presentation Quality",
          craftsmanshipLevel: "Craftsmanship Level",
          conversationalDesc: "CONVERSATIONAL DESCRIPTION:",
          height: "H",
          length: "L",
          width: "W",
          depth: "D",
          diameter: "Ø",
          seatHeight: "Seat height",
          weight: "Weight",
        }
      : {
          color: "Couleur",
          material: "Matériau",
          shape: "Forme",
          texture: "Texture",
          pattern: "Motif",
          finish: "Finition",
          designElements: "Éléments Design",
          visualAttributes: "ATTRIBUTS VISUELS:",
          dimensions: "DIMENSIONS",
          dimensionsVisible: "DIMENSIONS (visibles sur image):",
          dimensionsEstimated: "DIMENSIONS (estimées):",
          dimensionsSerpVerified: "DIMENSIONS (vérifiées SERP):",
          technicalSpecs: "SPÉCIFICATIONS TECHNIQUES (Vision IA):",
          categorization: "CATÉGORISATION:",
          category: "Catégorie",
          subCategory: "Sous-catégorie",
          style: "Style",
          room: "Pièce",
          functionality: "Fonctionnalité",
          qualityAnalysis: "ANALYSE QUALITÉ:",
          analysis: "Analyse",
          presentationQuality: "Qualité Présentation",
          craftsmanshipLevel: "Niveau Artisanat",
          conversationalDesc: "DESCRIPTION CONVERSATIONNELLE:",
          height: "H",
          length: "L",
          width: "l",
          depth: "P",
          diameter: "Ø",
          seatHeight: "Hauteur d'assise",
          weight: "Poids",
        };

  // Visual Attributes
  const visualAttrs = [];
  if (enriched.ai_color) visualAttrs.push(`${labels.color}: ${enriched.ai_color}`);
  if (enriched.ai_material) visualAttrs.push(`${labels.material}: ${enriched.ai_material}`);
  if (enriched.ai_shape) visualAttrs.push(`${labels.shape}: ${enriched.ai_shape}`);
  if (enriched.ai_texture) visualAttrs.push(`${labels.texture}: ${enriched.ai_texture}`);
  if (enriched.ai_pattern) visualAttrs.push(`${labels.pattern}: ${enriched.ai_pattern}`);
  if (enriched.ai_finish) visualAttrs.push(`${labels.finish}: ${enriched.ai_finish}`);
  if (enriched.ai_design_elements) visualAttrs.push(`${labels.designElements}: ${enriched.ai_design_elements}`);
  if (visualAttrs.length > 0) {
    sections.push(labels.visualAttributes);
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
    if (techDims.hauteur_totale) dims.push(`${labels.height} ${techDims.hauteur_totale}`);
    if (techDims.height) dims.push(`${labels.height} ${techDims.height}`);
    if (techDims.largeur) dims.push(`${labels.length} ${techDims.largeur}`);
    if (techDims.length) dims.push(`${labels.length} ${techDims.length}`);
    if (techDims.profondeur) dims.push(`${labels.depth} ${techDims.profondeur}`);
    if (techDims.width) dims.push(`${labels.width} ${techDims.width}`);
    if (techDims.hauteur_assise) dims.push(`${labels.seatHeight} ${techDims.hauteur_assise}`);
    if (techDims.diametre) dims.push(`${labels.diameter} ${techDims.diametre}`);

    // Extract weight from vision (HIGHEST PRIORITY)
    if (techDims.weight) {
      dims.push(`${labels.weight} ${techDims.weight}`);
      weightSource = "vision"; // Mark that weight comes from vision
    }

    if (dims.length > 0) {
      sections.push(`\n${labels.dimensionsVisible}`);
      sections.push(`- ${dims.join(" × ")}`);
    }
  } else if (hasSmartDims) {
    // Fallback to estimated smart dimensions (SECOND PRIORITY, before SERP)
    if (enriched.smart_length)
      dims.push(`${labels.length} ~${enriched.smart_length}${enriched.smart_length_unit || ""}`);
    if (enriched.smart_width) dims.push(`${labels.width} ~${enriched.smart_width}${enriched.smart_width_unit || ""}`);
    if (enriched.smart_height)
      dims.push(`${labels.height} ~${enriched.smart_height}${enriched.smart_height_unit || ""}`);

    // Add estimated weight only if not from vision
    if (!weightSource && enriched.smart_weight) {
      dims.push(`${labels.weight} ~${enriched.smart_weight}${enriched.smart_weight_unit || ""}`);
      weightSource = "estimated";
    }

    if (enriched.smart_diameter)
      dims.push(`${labels.diameter} ~${enriched.smart_diameter}${enriched.smart_diameter_unit || ""}`);
    if (enriched.smart_depth) dims.push(`${labels.depth} ~${enriched.smart_depth}${enriched.smart_depth_unit || ""}`);
    if (enriched.smart_seat_height)
      dims.push(`${labels.seatHeight} ~${enriched.smart_seat_height}${enriched.smart_seat_height_unit || ""}`);

    if (dims.length > 0) {
      sections.push(`\n${labels.dimensionsEstimated}`);
      sections.push(`- ${dims.join(" × ")}`);
    }
  } else if (enriched.serp_verified && enriched.serp_data?.averageDimensions) {
    // Use SERP-verified dimensions ONLY AS LAST RESORT
    const serpDims = enriched.serp_data.averageDimensions;
    if (serpDims.length) dims.push(`${labels.length} ${serpDims.length}`);
    if (serpDims.width) dims.push(`${labels.width} ${serpDims.width}`);
    if (serpDims.height) dims.push(`${labels.height} ${serpDims.height}`);

    // Add SERP weight only if not already extracted from vision/estimation
    if (!weightSource && enriched.serp_data.averageWeight) {
      dims.push(`${labels.weight} ${enriched.serp_data.averageWeight}`);
      weightSource = "serp";
    }

    if (dims.length > 0) {
      sections.push(`\n${labels.dimensionsSerpVerified}`);
      sections.push(`- ${dims.join(" × ")}`);
    }
  }

  // Technical Details from Vision AI
  if (enriched.vision_attributes?.technicalDetails && Array.isArray(enriched.vision_attributes.technicalDetails)) {
    const techDetails = enriched.vision_attributes.technicalDetails;
    if (techDetails.length > 0) {
      sections.push(`\n${labels.technicalSpecs}`);
      sections.push(techDetails.map((detail: string) => `- ${detail}`).join("\n"));
    }
  }

  // Categorization
  const cats = [];
  if (enriched.category) cats.push(`${labels.category}: ${enriched.category}`);
  if (enriched.sub_category) cats.push(`${labels.subCategory}: ${enriched.sub_category}`);
  if (enriched.style) cats.push(`${labels.style}: ${enriched.style}`);
  if (enriched.room) cats.push(`${labels.room}: ${enriched.room}`);
  if (enriched.functionality) cats.push(`${labels.functionality}: ${enriched.functionality}`);
  if (cats.length > 0) {
    sections.push(`\n${labels.categorization}`);
    sections.push(cats.map((c: string) => `- ${c}`).join("\n"));
  }

  // Quality & Analysis
  const quality = [];
  if (enriched.ai_vision_analysis) quality.push(`${labels.analysis}: ${enriched.ai_vision_analysis}`);
  if (enriched.ai_presentation_quality)
    quality.push(`${labels.presentationQuality}: ${enriched.ai_presentation_quality}`);
  if (enriched.ai_craftsmanship_level) quality.push(`${labels.craftsmanshipLevel}: ${enriched.ai_craftsmanship_level}`);
  if (quality.length > 0) {
    sections.push(`\n${labels.qualityAnalysis}`);
    sections.push(quality.map((q: string) => `- ${q}`).join("\n"));
  }

  // Conversational Text
  if (enriched.chat_text) {
    sections.push(`\n${labels.conversationalDesc}`);
    sections.push(enriched.chat_text);
  }

  return sections.join("\n");
}

// Language detection now imported from _shared/language-detector.ts

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

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    // ✅ Body already read above (line 705), reuse it
    const {
      productId: product_id_from_body,
      product_id: legacy_product_id,
      productTitle,
      seo_title,
      imageUrl,
      description,
      vendor,
      style,
      mainColor = "#3B82F6",
      colorScheme: legacyColorScheme,
      layout: legacyLayout,
      length: legacyLength,
      customHighlights: legacyCustomHighlights,
      designStyle: legacyDesignStyle,
      language,
      imageAnalysis,
      options = {},
      theme = "light",
      fastMode = false, // ⚡ NEW: Enable fast mode to skip heavy operations
    } = body ?? {};

    // Resolve product_id from multiple possible sources
    const product_id = product_id_from_body || legacy_product_id;
    
    // Use SEO title if available, fallback to original title
    const displayTitle = seo_title || productTitle;

    // Merge options with legacy fields for backwards compatibility
    const userOptions = {
      colorScheme: options.colorScheme || legacyColorScheme,
      layout: options.layout || legacyLayout,
      designStyle: options.designStyle || legacyDesignStyle || "modern",
      contentLength: options.contentLength || legacyLength,
      customHighlights: options.customHighlights || legacyCustomHighlights,
      theme: options.theme || theme || "light",
    };

    console.log("📥 Request parameters:", {
      product_id,
      productTitle: productTitle?.substring(0, 50),
      designStyle: userOptions.designStyle,
      hasColorScheme: !!userOptions.colorScheme,
      colorSchemeType: typeof userOptions.colorScheme,
      theme: userOptions.theme,
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
    const detectedLanguage = resolveLanguage({
      explicitLanguage: language,
      contentText: `${productTitle || ""} ${description || ""}`,
    });
    const langInstructions = getLanguageInstructions(detectedLanguage);
    console.log(`🌍 Landing page language detected: ${detectedLanguage}`);

    // 🎨 Resolve color scheme from database if it's a key string
    let resolvedColorScheme = legacyColorScheme; // Fallback to legacy format

    if (userOptions.colorScheme) {
      if (typeof userOptions.colorScheme === 'string') {
        // It's a key, fetch from database
        console.log(`🎨 Fetching color scheme from DB: ${userOptions.colorScheme}`);
        resolvedColorScheme = await getOption(supabaseAdmin, 'color_scheme', userOptions.colorScheme);
        console.log('✅ Color scheme loaded:', resolvedColorScheme);
      } else if (typeof userOptions.colorScheme === 'object') {
        // It's already an object
        resolvedColorScheme = userOptions.colorScheme;
      }
    }

    // 🎨 Resolve layout from database if it's a key string
    let resolvedLayout = userOptions.layout;
    if (userOptions.layout && typeof userOptions.layout === 'string') {
      console.log(`📐 Fetching layout from DB: ${userOptions.layout}`);
      const layoutData = await getOption(supabaseAdmin, 'layout', userOptions.layout);
      if (layoutData) {
        resolvedLayout = layoutData;
        console.log('✅ Layout loaded:', resolvedLayout);
      } else {
        console.warn('⚠️ Layout not found in DB, using key as fallback');
      }
    }

    // 🎨 Resolve design style from database if it's a key string  
    let resolvedDesignStyle = userOptions.designStyle;
    if (userOptions.designStyle && typeof userOptions.designStyle === 'string') {
      console.log(`🎨 Fetching design style from DB: ${userOptions.designStyle}`);
      const styleData = await getOption(supabaseAdmin, 'design_style', userOptions.designStyle);
      if (styleData) {
        resolvedDesignStyle = styleData;
        console.log('✅ Design style loaded:', resolvedDesignStyle);
      } else {
        console.warn('⚠️ Design style not found in DB, using key as fallback');
      }
    }

    // Validation: Stop if critical configurations are missing
    if (!resolvedColorScheme) {
      console.error('❌ CRITICAL: Color scheme could not be resolved');
      return new Response(
        JSON.stringify({ 
          error: "Configuration incomplète: le schéma de couleurs n'a pas pu être chargé depuis la base de données." 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!resolvedLayout) {
      console.error('❌ CRITICAL: Layout could not be resolved');
      return new Response(
        JSON.stringify({ 
          error: "Configuration incomplète: le layout n'a pas pu être chargé depuis la base de données." 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!resolvedDesignStyle) {
      console.error('❌ CRITICAL: Design style could not be resolved');
      return new Response(
        JSON.stringify({ 
          error: "Configuration incomplète: le style de design n'a pas pu être chargé depuis la base de données." 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Apply theme modifications (dark/light)
    if (resolvedColorScheme && userOptions.theme === 'dark') {
      console.log('🌙 Applying dark theme transformations');
      // Swap background and text colors for dark mode
      const originalBg = resolvedColorScheme.background || '#FFFFFF';
      const originalText = resolvedColorScheme.text || '#000000';
      
      resolvedColorScheme = {
        ...resolvedColorScheme,
        background: originalText,
        text: originalBg,
        surface: adjustLightness(originalText, 1.2),
        textMuted: adjustLightness(originalBg, 0.7),
      };
    }

    // Generate design tokens with resolved color scheme
    const designTokens = generateDesignTokens(resolvedColorScheme || { primary: mainColor });

    // Extract options for use in prompt
    const { designStyle, customHighlights, layout, contentLength } = userOptions;

    // Normaliser et configurer la longueur du contenu
    // Handle both simple modes ("short", "medium", "long") and French labels with descriptions ("courte (750 mots)", etc.)
    let lengthMode: "short" | "medium" | "long" = "medium";
    
    if (contentLength) {
      const normalized = contentLength.toLowerCase();
      if (normalized.includes("short") || normalized.includes("court")) {
        lengthMode = "short";
      } else if (normalized.includes("long") || normalized.includes("longue")) {
        lengthMode = "long";
      } else if (normalized.includes("medium") || normalized.includes("moyenne") || normalized.includes("moyen")) {
        lengthMode = "medium";
      }
    }
    
    let lengthConfig = { 
      maxTokens: 16000,  // ✅ Increased from 11000 to prevent truncation
      labelEn: "medium", 
      labelFr: "moyenne",
      descriptionEn: "Balanced content (300-400 words)",
      descriptionFr: "Contenu équilibré (300-400 mots)" 
    };

    if (lengthMode === "short") {
      lengthConfig = {
        maxTokens: 8000,  // ✅ Increased from 6000 for better margin
        labelEn: "short",
        labelFr: "courte",
        descriptionEn: "Concise and impactful content (150-250 words)",
        descriptionFr: "Contenu concis et impactant (150-250 mots)"
      };
    } else if (lengthMode === "long") {
      lengthConfig = {
        maxTokens: 32000,  // ✅ Increased from 25000 to handle complex pages
        labelEn: "long",
        labelFr: "longue",
        descriptionEn: "Detailed and comprehensive content (500-700 words)",
        descriptionFr: "Contenu détaillé et complet (500-700 mots)"
      };
    }

    console.log('📏 Content Length Config:', lengthConfig);
    console.log('📏 Parsed length mode:', lengthMode, 'from input:', contentLength);

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
        .select("title, image_url, shopify_variant_id, price, sku, option1, option2, option3, inventory_quantity")
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
    console.log(`🔍 SERP Analysis: ${fastMode ? '⚡ SKIPPED (fast mode)' : 'RUNNING...'}`);
    let serpInsights: any = null;

    if (!fastMode) {
      try {
        // ⏱️ SERP timeout: 5 seconds max
        const serpPromise = supabaseAdmin.functions.invoke("analyze-serp-competitors", {
          body: {
            keyword: displayTitle,
            analysisType: "landing",
            location: storeCountry,
            language: storeLanguage,
            maxResults: 10,
          },
        });

        const { data: serpData, error: serpError } = await withTimeout(serpPromise, 5000);

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
        console.warn("⚠️ SERP analysis error (continuing without it):", serpErr);
      }
    }

    // 🖼️ Multi-Image Vision AI Analysis - Analyze ALL product images
    console.log(`🖼️ Vision AI: ${fastMode ? '⚡ LIMITED (fast mode - 2 images max)' : `FULL (${images.length} images)`}`);
    const imageAnalyses: Array<{ imageUrl: string; description: string; index: number }> = [];

    // Analyze main image + all additional images (limit based on fastMode)
    const maxImagesToAnalyze = fastMode ? 2 : 6;
    const imagesToAnalyze = images.slice(0, maxImagesToAnalyze);

    for (let i = 0; i < imagesToAnalyze.length; i++) {
      const img = imagesToAnalyze[i];
      try {
        console.log(`📸 Analyzing image ${i + 1}/${imagesToAnalyze.length}: ${img.src.substring(0, 50)}...`);

        // ⏱️ Vision AI timeout: 10 seconds (reduced from 15s)
        const visionController = new AbortController();
        const visionTimeout = setTimeout(() => visionController.abort(), 10000);

        const { data: visionData, error: visionError } = await supabaseAdmin.functions.invoke(
          "analyze-image-with-vision",
          {
              body: {
                imageUrl: img.src,
                productContext: {
                  title: displayTitle,
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

    // 📐 Analyze images for technical dimensions
    console.log("📐 Analyzing images for technical dimensions...");
    let dimensionImages: any[] = [];
    let productImages: any[] = images;

    if (images.length > 0) {
      try {
        const { data: dimensionData, error: dimensionError } = await supabaseAdmin.functions.invoke(
          "analyze-dimension-images",
          {
            body: { imageUrls: images.map(img => img.src) }
          }
        );

        if (!dimensionError && dimensionData?.success) {
          dimensionImages = dimensionData.technical || [];
          const regularUrls = (dimensionData.regular || []).map((r: any) => r.url);
          productImages = images.filter(img => regularUrls.includes(img.src));
          
          console.log(`✅ Dimensions analysis: ${dimensionImages.length} technical, ${productImages.length} product images`);
        } else {
          console.warn("⚠️ Dimension analysis failed, using all images as product images");
        }
      } catch (error) {
        console.warn("⚠️ Error during dimension analysis:", error);
      }
    }

    // --- Prompt bilingual ---
    const imgs = productImages.length
      ? productImages.map((i, idx) => {
          // Find matching vision analysis for this image
          const visionAnalysis = imageAnalyses.find(a => a.imageUrl === i.src);
          const description = visionAnalysis?.description || (detectedLanguage === "en" ? "Product detail" : "Détail produit");
          return `- Image ${idx + 1}: ${i.src}\n  Description: ${description}`;
        }).join("\n")
      : detectedLanguage === "en"
        ? "No additional image"
        : "Aucune image supplémentaire";
    
    const dimensionImgs = dimensionImages.length
      ? dimensionImages.map((d) => {
          const dims = d.dimensions?.map((dim: any) => `${dim.measurement}${dim.unit} (${dim.label})`).join(", ") || "";
          return `- ${d.url}\n  Type: ${d.type}\n  Views: ${d.views?.join(", ") || "unknown"}\n  Dimensions: ${dims}\n  Description: ${d.description || ""}`;
        }).join("\n")
      : detectedLanguage === "en"
        ? "No dimension schematics available"
        : "Aucun schéma de dimensions disponible";
    const vars = variants.length
      ? variants.map((v) => `- ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ""}`).join("\n")
      : detectedLanguage === "en"
        ? "No variant"
        : "Aucune variante";

    // Build product URLs
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    // Design style templates - DISTINCT VISUAL IDENTITIES
    const styleTemplates = {
      minimalist: {
        name: "MINIMALISTE - Épuré et Zen",
        description: "ULTRA-MINIMAL: Espaces blancs massifs, typographie géante, palette monochrome",
        rules: `
🎨 STYLE MINIMALISTE (STRICTEMENT APPLIQUÉ):
========================================
PALETTE COULEURS - MONOCHROME:
- ❌ PAS de dégradés colorés
- ✅ Noir + Blanc + 1 seul accent de couleur (primary)
- Background: Blanc pur ou gris très clair (bg-white, bg-gray-50)
- Texte: Noir intense (text-gray-900)

TYPOGRAPHIE - GÉANTE ET AÉRÉE:
- Titres H1: text-5xl md:text-7xl lg:text-8xl (ÉNORME)
- Titres sections: text-4xl md:text-5xl
- Line-height: leading-tight, letterspacing: tracking-tight
- Font-weight: 300 (léger) ou 700 (bold), jamais moyen

ESPACES - MASSIFS:
- Sections: py-12 md:py-32 lg:py-40 (adapté mobile)
- Entre éléments: space-y-16 md:space-y-20
- Containers: max-w-4xl (ÉTROIT pour focus)

ÉLÉMENTS VISUELS - MINIMALISTES:
- ❌ AUCUNE ombre (pas de shadow)
- ❌ AUCUN arrondi (angles droits, sharp corners)
- Bordures: border border-gray-200 (fines et discrètes)
- Images: Pleine largeur, aucun effet, aspect-video ou aspect-square

ICÔNES - ULTRA-SIMPLES:
- Taille: w-5 h-5 (PETIT et discret)
- Style: Traits fins (stroke-width="1.5")
- Couleur: Monochrome (noir ou primary)
- ❌ PAS de dégradés, PAS de remplissage

LAYOUT - LINÉAIRE:
- 1 seule colonne principale
- Maximum 2 colonnes sur desktop (grid-cols-1 md:grid-cols-2)
- Alignement: Centré, symétrique
- ❌ PAS d'asymétrie
`,
      },

      modern: {
        name: "MODERNE - Équilibré et Dynamique",
        description: "DESIGN 2024: Dégradés subtils, cartes flottantes, animations douces",
        rules: `
🎨 STYLE MODERNE (STRICTEMENT APPLIQUÉ):
========================================
PALETTE COULEURS - VIBRANTE:
- ✅ Dégradés subtils partout (primary → accent)
- ✅ 2-3 couleurs vives bien équilibrées
- Background: Blanc/gris avec touches colorées
- Sections alternées: bg-white / bg-gray-50

TYPOGRAPHIE - ÉQUILIBRÉE:
- Titres H1: text-4xl md:text-6xl (GRAND mais pas géant)
- Mix de font-weights: 300 (light), 500 (medium), 700 (bold)
- Line-height: leading-snug
- Contraste weight entre titres et texte

ESPACES - HARMONIEUX:
- Sections: py-12 md:py-24 (adapté mobile)
- Entre éléments: space-y-8 md:space-y-12
- Containers: max-w-7xl (standard large)

ÉLÉMENTS VISUELS - CARTES FLOTTANTES:
- ✅ Ombres progressives: shadow-md hover:shadow-xl
- ✅ Bordures arrondies: rounded-xl, rounded-2xl
- Cartes: bg-white p-6 rounded-2xl shadow-lg
- Images: rounded-xl avec shadow-md

ICÔNES - DÉGRADÉS ÉLÉGANTS:
- Taille: w-8 h-8 (taille moyenne, bien visible)
- Style: Dégradés (primary → accent)
- Background: Cercle avec opacity 0.15
- Stroke: stroke-width="2" (épaisseur moyenne)
- ✅ Effets hover: scale-110 transition

LAYOUT - GRILLES MODERNES:
- 3 colonnes sur desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Asymétrie légère (images alternées)
- Grid gap: gap-6 md:gap-8
`,
      },

      premium: {
        name: "PREMIUM - Luxueux et Sophistiqué",
        description: "ULTRA-LUXE: Backgrounds sombres, or/argent, typographie serif, effets riches",
        rules: `
🎨 STYLE PREMIUM (STRICTEMENT APPLIQUÉ):
========================================
PALETTE COULEURS - SOPHISTIQUÉE SOMBRE:
- ✅ Background SOMBRE: bg-gray-900, bg-slate-900
- ✅ Accents métalliques: or (#D4AF37 converti en HSL), argent
- ✅ Dégradés complexes multi-stops
- Texte sur fond sombre: text-gray-100, text-white

TYPOGRAPHIE - LUXUEUSE SERIF:
- ✅ Serif pour les titres: font-serif tracking-wide
- Titres H1: text-5xl md:text-7xl lg:text-9xl (GIGANTESQUE)
- Letterspacing: tracking-wide, tracking-wider
- Font-weight: 300 (ultra-light) ou 800 (extra-bold)

ESPACES - TRÈS GÉNÉREUX:
- Sections: py-12 md:py-36 lg:py-48 (adapté mobile)
- Entre éléments: space-y-16 md:space-y-24
- Containers: max-w-7xl avec beaucoup de breathing room

ÉLÉMENTS VISUELS - PROFONDEUR RICHE:
- ✅ Ombres profondes multiples: shadow-2xl, drop-shadow-2xl
- ✅ Bordures très arrondies: rounded-3xl, rounded-full
- ✅ Overlays subtils: backdrop-blur, gradient overlays
- Images: Cadres élégants, effets de profondeur

ICÔNES - COMPLEXES ET BRILLANTES:
- Taille: w-12 h-12 lg:w-16 lg:h-16 (GRANDES et imposantes)
- Style: Dégradés 3+ couleurs avec effet glow
- Filters: feGaussianBlur pour effet lumineux
- Strokes: stroke-width="3" (épais)
- ✅ Effets brillance: multiple layers, opacity variations

LAYOUT - CRÉATIF ASYMÉTRIQUE:
- Overlaps créatifs (z-index layers)
- Asymétrie contrôlée
- Grid cols variées: grid-cols-2 lg:grid-cols-5
- Effets parallax hints
- Sections alternées sombres/claires
`,
      },
    };

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

    // Select design style - use resolved config from DB or fallback to hardcoded templates
    let selectedStyle;
    let selectedIcon;
    
    if (resolvedDesignStyle && typeof resolvedDesignStyle === 'object') {
      // Use design style from database
      console.log(`[Landing AI] Using design style from DB: ${resolvedDesignStyle.name || resolvedDesignStyle.style || userOptions.designStyle}`);
      selectedStyle = {
        name: resolvedDesignStyle.name || resolvedDesignStyle.style || 'Custom Style',
        description: resolvedDesignStyle.description || '',
        rules: resolvedDesignStyle.rules || resolvedDesignStyle.instructions || '',
      };
      // Use matching icon template if available, otherwise use modern
      const styleKey = ((resolvedDesignStyle.style || userOptions.designStyle) || 'modern') as 'minimalist' | 'modern' | 'premium';
      selectedIcon = iconTemplates[styleKey] || iconTemplates.modern;
    } else {
      // Fallback to hardcoded templates
      const validDesignStyles = ["minimalist", "modern", "premium"];
      const selectedDesignStyle = (validDesignStyles.includes(userOptions.designStyle) ? userOptions.designStyle : "modern") as
        | "minimalist"
        | "modern"
        | "premium";
      selectedStyle = styleTemplates[selectedDesignStyle];
      selectedIcon = iconTemplates[selectedDesignStyle];
      console.log(`[Landing AI] Using hardcoded design style: ${selectedStyle.name}`);
    }

    // Log final configuration for debugging
    console.log(`[Landing AI] 🎨 Final Configuration:`);
    console.log(`  - Design Style: ${selectedStyle.name}`);
    console.log(`  - Color Scheme: primary=${designTokens.primary}, accent=${designTokens.accent}, textMuted=${designTokens.textMuted}`);
    console.log(`  - Layout: ${typeof resolvedLayout === "object" ? resolvedLayout.name || resolvedLayout.type : layout}`);
    console.log(`  - Content Length: ${lengthMode}`);
    console.log(`  - Theme: ${userOptions.theme || "light"}`);
    console.log(`  - Dimension Images: ${dimensionImages.length} technical schematics found`);

    // Build style-specific HTML examples
    const styleExamples = userOptions.designStyle === 'minimalist' 
      ? `EXEMPLE MINIMALISTE (STRICT):
'''html
<!-- Section avec bordures fines, pas de shadow, pas de rounded -->
<section class="py-32 border-t border-gray-200">
  <div class="max-w-4xl mx-auto px-4">
    <h2 class="text-5xl font-light mb-16" style="color: hsl(${designTokens.text})">Section Title</h2>
    <div class="border border-gray-200 p-8">
      <p style="color: hsl(${designTokens.textMuted})">Clean, sharp corners, no shadows</p>
    </div>
  </div>
</section>
'''`
      : userOptions.designStyle === 'premium'
        ? `EXEMPLE PREMIUM (LUXUEUX):
'''html
<!-- Section sombre avec effets riches -->
<section class="py-36 relative" style="background: hsl(${designTokens.background})">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-7xl font-serif font-light tracking-wide mb-20 text-white">Luxury Section</h2>
    <div class="bg-white/5 backdrop-blur-lg rounded-3xl p-8 shadow-2xl" style="box-shadow: 0 0 60px rgba(255,255,255,0.1)">
      <p class="text-gray-100" style="color: hsl(${designTokens.text})">Rich depth and elegance</p>
    </div>
  </div>
</section>
'''`
        : `EXEMPLE MODERNE (ÉQUILIBRÉ):
'''html
<!-- Section avec cartes flottantes -->
<section class="py-24 bg-white">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-5xl font-bold mb-12" style="color: hsl(${designTokens.text})">Modern Section</h2>
    <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6">
      <p style="color: hsl(${designTokens.textMuted})">Balanced design with gradients</p>
    </div>
  </div>
</section>
'''`;

    const prompt =
      detectedLanguage === "en"
        ? `You are a Shopify UX/UI expert specialized in product landing pages.
Generate a complete, professional Tailwind HTML landing page.

PRODUCT:
- Title: ${displayTitle}
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

${dimensionImages.length > 0 ? `
🔧 TECHNICAL DIMENSION SCHEMATICS (USE FOR DIMENSIONS SECTION):
${dimensionImgs}

📐 CRITICAL: Create a separate "Dimensions Techniques" / "Technical Dimensions" section BEFORE the image gallery.
This section must:
- Display the technical schematic images with detailed captions
- List all extracted measurements in a clear table (responsive: mobile cards, desktop table)
- Include views information (front, side, top, etc.)
- Be separate from the regular product gallery
- Use a clean, professional layout

EXAMPLE STRUCTURE FOR DIMENSIONS SECTION:
<!-- Technical Dimensions Section -->
<section class="mb-16 p-6 md:p-10 rounded-2xl shadow-xl" style="background: hsl(${designTokens.surface});">
  <h2 class="text-3xl md:text-4xl font-bold mb-8 text-center" style="color: hsl(${designTokens.text});">Dimensions Techniques</h2>
  
  <!-- Dimension Schematics Images -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    ${dimensionImages.map(d => `
    <div class="relative overflow-hidden rounded-xl shadow-lg group">
      <img src="${d.url}" loading="lazy" alt="Schéma technique - ${d.views?.join(", ") || "vue"}" class="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105">
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p class="text-white text-sm font-medium">${d.description || d.views?.join(", ") || "Vue technique"}</p>
      </div>
    </div>
    `).join("")}
  </div>

  <!-- Measurements Table (use extracted dimensions) -->
  <!-- Mobile: cards -->
  <div class="block md:hidden space-y-4">
    ${dimensionImages.flatMap(d => d.dimensions || []).map(dim => `
    <div class="bg-white rounded-xl p-4 shadow-sm">
      <div class="font-semibold mb-1" style="color: hsl(${designTokens.text});">${dim.label || "Mesure"}</div>
      <div style="color: hsl(${designTokens.primary});">${dim.measurement} ${dim.unit}</div>
    </div>
    `).join("")}
  </div>
  
  <!-- Desktop: table -->
  <table class="hidden md:table min-w-full rounded-xl overflow-hidden shadow-lg" style="background: hsl(${designTokens.background});">
    <thead>
      <tr style="background: hsl(${designTokens.primary}); color: hsl(${designTokens.background});">
        <th class="py-3 px-4 text-left font-semibold">Dimension</th>
        <th class="py-3 px-4 text-left font-semibold">Mesure</th>
      </tr>
    </thead>
    <tbody>
      ${dimensionImages.flatMap(d => d.dimensions || []).map((dim, idx) => `
      <tr class="${idx % 2 === 0 ? '' : 'bg-gray-50'}">
        <td class="py-3 px-4 font-medium" style="color: hsl(${designTokens.text});">${dim.label || "Dimension"}</td>
        <td class="py-3 px-4" style="color: hsl(${designTokens.textMuted});">${dim.measurement} ${dim.unit}</td>
      </tr>
      `).join("")}
    </tbody>
  </table>
</section>

🚨 CRITICAL: Use the EXACT dimensions and measurements extracted from the technical schematics above.
` : ''}

📦 PRODUCT VARIANTS ${variants.length > 1 ? "(CRITICAL - MANDATORY SECTION)" : ""}:
${variants.length > 1 ? `
🚨 THIS PRODUCT HAS ${variants.length} VARIANTS - YOU MUST CREATE A DEDICATED "PRODUCT VARIATIONS" SECTION!

**Variants Data:**
${variants.map((v, i) => `
### Variant ${i + 1}: ${v.title}
- **Price**: ${v.price} EUR
- **SKU**: ${v.sku || 'N/A'}
- **Options**: ${v.option1 ? `${v.option1}` : ''}${v.option2 ? ` / ${v.option2}` : ''}${v.option3 ? ` / ${v.option3}` : ''}
- **Available**: ${v.inventory_quantity > 0 ? 'Yes' : 'Out of stock'}
- **Image**: ${v.image_url || 'Use main product images'}
`).join('\n')}

🚨 CRITICAL INSTRUCTIONS FOR VARIANTS SECTION:
1. **Section Title**: "Nos Variations Disponibles" or "Choisissez Votre Modèle"
2. **Placement**: AFTER Technical Specifications, BEFORE Image Gallery
3. **Card Structure** for each variant:
   - Variant title/name (e.g., "Modèle Bleu Foncé", "Version Labrador")
   - Primary image (variant-specific if available, otherwise main product image)
   - Key differentiator (color, size, material that makes it unique)
   - Price (prominent, styled with primary color)
   - Availability status (badge-style)
   - Small gallery (2-3 variant-specific images if available from main image list)
4. **Responsive Grid**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
5. **Visual Style**: Match overall design, use surface color for cards, add hover effects
6. **Image Selection**: Try to match images to variants based on title/color keywords

**Example HTML Structure:**
\`\`\`html
<section class="py-12 md:py-20" style="background: hsl(${designTokens.background});">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-0">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-10" style="color: hsl(${designTokens.text})">
      Nos Variations Disponibles
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Variant Card Example -->
      <div class="rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105" style="background: hsl(${designTokens.surface});">
        <div class="relative h-64">
          <img src="[variant-primary-image]" loading="lazy" class="w-full h-full object-cover" alt="[Variant Title]">
        </div>
        <div class="p-6">
          <h3 class="text-2xl font-bold mb-2" style="color: hsl(${designTokens.text})">[Variant Title]</h3>
          <p class="text-lg font-semibold mb-4" style="color: hsl(${designTokens.primary})">[Price] EUR</p>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" style="color: hsl(${designTokens.accent})" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span style="color: hsl(${designTokens.textMuted})">[Key differentiator, e.g., "Couleur: Bleu Foncé"]</span>
            </div>
          </div>
          <!-- Mini gallery for this variant (2-3 images) -->
          <div class="grid grid-cols-3 gap-2">
            <img src="[detail-image-1]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Detail 1">
            <img src="[detail-image-2]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Detail 2">
            <img src="[detail-image-3]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Detail 3">
          </div>
        </div>
      </div>
      <!-- Repeat for each variant -->
    </div>
  </div>
</section>
\`\`\`
` : `
Single variant product - No separate variations section needed.
Variant: ${vars}
`}
${customHighlights ? `\nHIGHLIGHTS:\n${customHighlights}` : ""}

CONTENT LENGTH (MANDATORY):
- Mode: ${lengthConfig.labelEn}
- Target: ${lengthConfig.descriptionEn}
- Theme: ${userOptions.theme || "light"}
${lengthMode === "short" ? "- Very concise page with only essential sections and brief copy" :
  lengthMode === "medium" ? "- Balanced number of sections with moderate detail" :
  "- Rich, detailed page with comprehensive sections and longer copy"}

🌓 THEME CONFIGURATION (CRITICAL - MANDATORY):
${userOptions.theme === "dark" 
  ? `🌙 DARK MODE ENABLED - FOLLOW THESE RULES EXACTLY:

🚨 BACKGROUNDS (MANDATORY):
- Body background: MUST use dark color from designTokens.background (e.g., hsl(222 47% 11%))
- ALL section backgrounds: MUST alternate between dark background and dark surface colors
- ❌ FORBIDDEN: White backgrounds hsl(0 0% 100%)
- ❌ FORBIDDEN: Light blue backgrounds hsl(210 100% 80%)
- ❌ FORBIDDEN: Any light colored backgrounds
- ✅ CORRECT: style="background: hsl(${designTokens.background})" or style="background: hsl(${designTokens.surface})"

🚨 TEXT COLORS (MANDATORY):
- ALL text: MUST use light colors from designTokens
- Headings: style="color: hsl(${designTokens.text})" (should be light like hsl(210 40% 98%))
- Body text: style="color: hsl(${designTokens.text})"
- Muted text: style="color: hsl(${designTokens.textMuted})"
- ❌ FORBIDDEN: Dark text colors like hsl(210 100% 20%)
- ❌ FORBIDDEN: Black text hsl(0 0% 0%)

🚨 CARDS & CONTAINERS (MANDATORY):
- Use designTokens.surface with optional opacity: style="background: hsl(${designTokens.surface}) / 0.5"
- Add backdrop-filter: backdrop-filter: blur(10px) for glass effect
- ❌ FORBIDDEN: Light colored cards hsl(210 100% 80%)
- ✅ CORRECT: Dark surfaces with light text

🚨 VERIFICATION CHECKLIST - ALL MUST BE TRUE:
- [ ] Body has DARK background
- [ ] EVERY section has DARK background  
- [ ] ALL text is LIGHT colored
- [ ] NO white backgrounds anywhere (no hsl(0 0% 100%))
- [ ] NO light blue backgrounds (no hsl(210 100% 80%))
- [ ] NO dark text on dark background

🚨 IF YOU USE hsl(0 0% 100%) OR hsl(210 100% 80%) OR hsl(210 100% 20%) TEXT IN DARK MODE, YOU FAILED!`
  : `☀️ LIGHT MODE (DEFAULT) - FOLLOW THESE RULES EXACTLY:

🚨 BACKGROUNDS (MANDATORY):
- Body: NO inline background needed (CSS handles it)
- Sections: Use ONLY white or very light colors
- ❌ FORBIDDEN: hsl(222 47% 11%), hsl(210 100% 80%), ANY dark blue/gray backgrounds
- ✅ ALLOWED: style="background: white" OR style="background: #ffffff" OR style="background: #f9fafb"
- Alternative sections: Use white and very light gray only

🚨 TEXT COLORS (MANDATORY):
- Headings: style="color: #111827" or style="color: #1f2937"
- Body: style="color: #374151" or style="color: #4b5563"
- Muted: style="color: #6b7280"
- ❌ FORBIDDEN: White, light blue, light gray text

🚨 VERIFICATION - ALL MUST BE TRUE:
- [ ] ALL backgrounds are white or very light
- [ ] ALL text is dark gray or black
- [ ] NO blue backgrounds (hsl(210 100% 80%))
- [ ] NO dark backgrounds in light mode`
}

LAYOUT STRUCTURE (CRITICAL - APPLY THIS LAYOUT):
- Layout selected: ${typeof resolvedLayout === "object" ? resolvedLayout.name || resolvedLayout.type || layout : layout}
- 🚨 MANDATORY: You MUST follow this layout structure throughout the page
${typeof resolvedLayout === "object" && (resolvedLayout.rules || resolvedLayout.instructions)
  ? `- Layout Instructions:\n${resolvedLayout.rules || resolvedLayout.instructions}`
  : layout === "2_colonnes"
    ? "- Use primarily 2-column grids (grid-cols-1 md:grid-cols-2) for main sections\n- Benefits, features, and content should be in 2 columns on desktop"
    : layout === "3_colonnes"
      ? "- Use 3-column grids on desktop (grid-cols-1 md:grid-cols-3) for benefits/features\n- Maximum 3 items per row on desktop"
      : layout === "hero_left" || layout === "hero à gauche"
        ? "- Hero section: Image on left, content on right (flex-row on desktop)\n- Use: <div class='flex flex-col md:flex-row'> with image first"
        : layout === "hero_right" || layout === "hero à droite"
          ? "- Hero section: Content on left, image on right (flex-row-reverse on desktop)\n- Use: <div class='flex flex-col md:flex-row-reverse'> or put content before image"
          : "- Flexible layout but maintain consistency"}

🎨 DESIGN MODEL (CRITICAL - APPLY THESE RULES STRICTLY):
Style: ${selectedStyle.name}
${selectedStyle.description}

DESIGN RULES (MANDATORY - FOLLOW EXACTLY):
${selectedStyle.rules}

COLOR PALETTE (HSL FORMAT ONLY):
- Primary: hsl(${designTokens.primary})
- Primary Light: hsl(${designTokens.primaryLight})
- Primary Dark: hsl(${designTokens.primaryDark})
- Secondary: hsl(${designTokens.secondary})
- Secondary Light: hsl(${designTokens.secondaryLight})
- Secondary Dark: hsl(${designTokens.secondaryDark})
- Accent: hsl(${designTokens.accent})
- Accent Light: hsl(${designTokens.accentLight})
- Accent Dark: hsl(${designTokens.accentDark})
- Background: hsl(${designTokens.background})
- Surface: hsl(${designTokens.surface})
- Text: hsl(${designTokens.text})
- Text Muted: hsl(${designTokens.textMuted})

🚨 COLOR USAGE - CRITICAL RULES (MANDATORY):
❌ ABSOLUTELY FORBIDDEN:
- NEVER use CSS variables: var(--color-primary), var(--color-text), etc.
- NEVER create :root CSS blocks with custom properties
- NEVER use --primary-color or any CSS custom properties

✅ MANDATORY - ALWAYS USE INLINE HSL:
- Text colors: style="color: hsl(${designTokens.text})"
- Background colors: style="background: hsl(${designTokens.background})"
- SVG stroke: style="stroke: hsl(${designTokens.primary})"
- SVG stop colors in gradients: style="stop-color: hsl(${designTokens.primary}); stop-opacity: 1"

CORRECT EXAMPLES:
✅ <h1 style="color: hsl(${designTokens.text})">Title</h1>
✅ <div style="background: hsl(${designTokens.surface})">Content</div>
✅ <stop offset="0%" style="stop-color: hsl(${designTokens.primary}); stop-opacity: 1"/>
✅ <path stroke-width="2" style="stroke: hsl(${designTokens.primary})"/>

FORBIDDEN EXAMPLES:
❌ <h1 style="color: var(--color-text)">
❌ :root { --color-primary: hsl(...) }
❌ <div class="text-primary bg-primary">

🚨 CRITICAL RESPONSIVE RULES (MANDATORY):
- NEVER duplicate responsive classes (❌ class="md:text-xl md:text-2xl")
- Use one breakpoint per property (✅ class="text-lg md:text-2xl")

🖼️ IMAGES AND TITLES (CRITICAL - MAXIMUM READABILITY):
🚨 CRITICAL: For ALL titles/text on images, you MUST:
1. Add semi-transparent dark overlay: <div class="absolute inset-0 bg-black/40"></div>
2. Use text-shadow for contrast: style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)"
3. Bright white text: class="text-white"
4. Large font size: class="text-4xl md:text-6xl font-bold"
5. MANDATORY structure example for hero with image:
   <div class="relative h-[70vh] min-h-[400px] md:h-[600px]">
     <img src="..." loading="lazy" class="absolute inset-0 w-full h-full object-cover">
     <div class="absolute inset-0 bg-black/40"></div>
     <div class="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
       <h1 class="text-4xl md:text-6xl font-bold text-white mb-4" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)">
         ${productTitle}
       </h1>
       <p class="text-base md:text-xl text-white/90" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.7)">
         Short description
       </p>
     </div>
   </div>

DESIGN & TONE (CRITICAL):
✅ PROFESSIONAL STYLE REQUIRED:
- Follow the selected design style rules (minimalist/modern/premium) strictly
- Modern e-commerce aesthetic adapted to chosen style
- Professional photography style
- Clear typography hierarchy matching style guidelines
- Whitespace according to style (massive for minimalist, balanced for modern, generous for premium)

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
- 🔤 FONTS: Add in <head> after Tailwind:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>html,body{background:#f3f4f6!important;background-color:#f3f4f6!important}body{font-family:'Roboto',sans-serif;line-height:1.6}h1,h2,h3,h4,h5,h6{font-family:'Roboto',sans-serif;font-weight:700;letter-spacing:-0.02em;line-height:1.2}h2{font-size:2.25rem}p,li{line-height:1.75}</style>
- 🚨 ALL images MUST have loading="lazy"
- Mobile-first (sm:, md:, lg:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 md:px-0
- Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

📱 RESPONSIVE TABLES (CRITICAL):
- Desktop (md:): Use standard <table> with class "hidden md:table"
- Mobile: Use cards with class "block md:hidden space-y-4"
- Example structure:

🔍 PHASE 5: SPECIFICATIONS RELIABILITY BADGE (OPTIONAL):
If technical specifications are present, you may include a subtle reliability indicator:

${
  enrichedProduct?.serp_verified
    ? `
✅ Badge for SERP-verified specs:
<div class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50/50 border border-green-100 rounded-lg text-xs font-medium text-green-700 mb-3">
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  <span>Spécifications vérifiées</span>
</div>
`
    : enrichedProduct?.vision_attributes?.technicalDimensions
      ? `
📐 Badge for image-extracted specs:
<div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-lg text-xs font-medium text-blue-700 mb-3">
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
  <span>Mesures du schéma technique</span>
</div>
`
      : ""
}

Note: Only include reliability badge if you have verified or extracted specifications
  <!-- Mobile cards -->
  <div class="block md:hidden space-y-4">
    <div class="bg-white rounded-lg p-4 shadow">
      <div class="font-semibold mb-2">Label</div>
      <div class="text-secondary">Value</div>
    </div>
  </div>
  <!-- Desktop table -->
  <table class="hidden md:table min-w-full">

🎯 KEY BENEFITS SECTION (CRITICAL - PREMIUM STYLE REQUIRED):

🚨 CHIC DESIGN RULES FOR KEY BENEFITS:

1. **ELEGANT CARDS WITH EFFECTS**:
   - Clean white/surface background with graduated shadows
   - Subtle borders or light edges
   - Mandatory hover effects: shadow-xl with transition
   - Generous spacing (p-6 md:p-8)
   - Subtle colored border on top or left (accent color)

2. **STYLED ICONS WITH GRADIENTS**:
   - ALWAYS use gradients (primary → accent) on icons
   - Medium size: w-12 h-12 or w-10 h-10 in a circle
   - Background circle with light gradient or solid color
   - Create unique IDs for each gradient (benefit-grad-1, benefit-grad-2, etc.)
   - Add hover: scale and slight rotation

3. **MANDATORY STRUCTURE** - Ultra Attractive Design:
\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
  <!-- Benefit Card 1 - Blue/Purple Gradient -->
  <div class="group relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 overflow-hidden" 
       style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);">
    
    <!-- Animated gradient glow on hover (top right) -->
    <div class="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="background: radial-gradient(circle, rgba(59,130,246,0.15), transparent);"></div>
    
    <!-- Enhanced shadow on hover -->
    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="box-shadow: 0 20px 60px rgba(59,130,246,0.25);"></div>
    
    <!-- Icon with vibrant gradient -->
    <div class="relative mb-5">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 relative" 
           style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); box-shadow: 0 8px 25px rgba(59,130,246,0.4);">
        <svg class="w-8 h-8 relative z-10" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <!-- Reverse gradient on hover for dynamic effect -->
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
             style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);"></div>
      </div>
    </div>
    
    <!-- Content -->
    <h3 class="relative text-xl font-bold mb-3 transition-colors duration-300" style="color: #111827;">
      Benefit Title
    </h3>
    <p class="relative leading-relaxed" style="color: #6b7280;">
      Detailed benefit description with compelling text that explains the value.
    </p>
    
    <!-- Bottom accent bar that grows on hover -->
    <div class="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" 
         style="background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);"></div>
  </div>

  <!-- Benefit Card 2 - Green/Teal Gradient -->
  <div class="group relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 overflow-hidden" 
       style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);">
    
    <div class="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="background: radial-gradient(circle, rgba(16,185,129,0.15), transparent);"></div>
    
    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="box-shadow: 0 20px 60px rgba(16,185,129,0.25);"></div>
    
    <div class="relative mb-5">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 relative" 
           style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); box-shadow: 0 8px 25px rgba(16,185,129,0.4);">
        <svg class="w-8 h-8 relative z-10" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" stroke-width="2.5" fill="none"/>
        </svg>
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
             style="background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%);"></div>
      </div>
    </div>
    
    <h3 class="relative text-xl font-bold mb-3 transition-colors duration-300" style="color: #111827;">
      Second Benefit
    </h3>
    <p class="relative leading-relaxed" style="color: #6b7280;">
      Another compelling reason to choose this product with clear value proposition.
    </p>
    
    <div class="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" 
         style="background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%);"></div>
  </div>

  <!-- Benefit Card 3 - Orange/Amber Gradient -->
  <div class="group relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 overflow-hidden" 
       style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);">
    
    <div class="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="background: radial-gradient(circle, rgba(249,115,22,0.15), transparent);"></div>
    
    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style="box-shadow: 0 20px 60px rgba(249,115,22,0.25);"></div>
    
    <div class="relative mb-5">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 relative" 
           style="background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); box-shadow: 0 8px 25px rgba(249,115,22,0.4);">
        <svg class="w-8 h-8 relative z-10" viewBox="0 0 24 24" fill="none">
          <path d="M1 6h14v10H1V6zm14 0h3l3 4v6h-6V6zM6.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm11 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="white" stroke-width="2" fill="none"/>
        </svg>
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
             style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);"></div>
      </div>
    </div>
    
    <h3 class="relative text-xl font-bold mb-3 transition-colors duration-300" style="color: #111827;">
      Third Benefit
    </h3>
    <p class="relative leading-relaxed" style="color: #6b7280;">
      Final key advantage that seals the deal and convinces customers.
    </p>
    
    <div class="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" 
         style="background: linear-gradient(90deg, #f97316 0%, #f59e0b 100%);"></div>
  </div>
</div>
\`\`\`

🎨 **GRADIENT COLOR VARIATIONS** (rotate through these for multiple benefits):
- **Blue-Purple**: #3b82f6 → #8b5cf6 (innovation, trust)
- **Green-Teal**: #10b981 → #14b8a6 (eco-friendly, quality)
- **Orange-Amber**: #f97316 → #f59e0b (energy, fast delivery)
- **Pink-Rose**: #ec4899 → #f43f5e (premium, elegant)
- **Indigo-Blue**: #6366f1 → #3b82f6 (tech, modern)
- **Emerald-Green**: #059669 → #10b981 (nature, sustainable)

4. **AVAILABLE SVG ICONS WITH GRADIENTS** (ROTATION OBLIGATOIRE):

🚨 CRITICAL: Tu DOIS utiliser des icônes et gradients DIFFÉRENTS pour chaque carte de bénéfice!
- Rotate les icônes dans l'ordre: Package → Delivery → Star → Shield → Sparkle → Check → Heart → Leaf
- Rotate les gradients dans l'ordre: Blue-Purple → Green-Teal → Orange-Amber → Pink-Rose → Indigo-Blue → Emerald-Green
- INTERDICTION de répéter la même icône ou le même gradient d'une carte à l'autre

**GRADIENTS À UTILISER EN ROTATION (TOUJOURS UNIQUE PAR CARTE)**:
1. Blue-Purple: #3b82f6 → #8b5cf6 (première carte)
2. Green-Teal: #10b981 → #14b8a6 (deuxième carte)
3. Orange-Amber: #f97316 → #f59e0b (troisième carte)
4. Pink-Rose: #ec4899 → #f43f5e (quatrième carte si existe)
5. Indigo-Blue: #6366f1 → #3b82f6 (cinquième carte si existe)
6. Emerald-Green: #059669 → #10b981 (sixième carte si existe)

📦 Package/Quality (ID unique: pkg-grad-1, pkg-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="pkg-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="url(#pkg-grad-[NUMERO_UNIQUE])" stroke-width="2"/>
</svg>

🚚 Delivery (ID unique: truck-grad-1, truck-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="truck-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M1 6h14v10H1V6zm14 0h3l3 4v6h-6V6zM6.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm11 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="url(#truck-grad-[NUMERO_UNIQUE])" stroke-width="2"/>
</svg>

⭐ Quality/Premium (ID unique: star-grad-1, star-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="star-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#star-grad-[NUMERO_UNIQUE])"/>
</svg>

🛡️ Warranty/Security (ID unique: shield-grad-1, shield-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="shield-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="url(#shield-grad-[NUMERO_UNIQUE])" stroke-width="2"/>
</svg>

✨ Innovation/New (ID unique: sparkle-grad-1, sparkle-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24">
  <defs><linearGradient id="sparkle-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="url(#sparkle-grad-[NUMERO_UNIQUE])"/>
</svg>

✓ Check/Validated (ID unique: check-grad-1, check-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="check-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M5 13l4 4L19 7" stroke="url(#check-grad-[NUMERO_UNIQUE])" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

❤️ Satisfaction/Love (ID unique: heart-grad-1, heart-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="heart-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="url(#heart-grad-[NUMERO_UNIQUE])" stroke-width="2"/>
</svg>

🌿 Eco/Sustainable (ID unique: leaf-grad-1, leaf-grad-2, etc.):
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="leaf-grad-[NUMERO_UNIQUE]" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: [COULEUR_GRADIENT_1]"/><stop offset="100%" style="stop-color: [COULEUR_GRADIENT_2]"/>
  </linearGradient></defs>
  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.67.67-2.22c.52-1.75 2.06-3.16 3.86-3.53 1.95-.4 3.7.62 4.77 2.03l.87 1.16 3.83-5.88c.79-1.22.62-2.79-.36-3.89-1.08-1.22-3.02-1.44-4.42-.68" stroke="url(#leaf-grad-[NUMERO_UNIQUE])" stroke-width="2"/>
</svg>

🚨 EXEMPLE CORRECT - 3 CARTES AVEC DIVERSITÉ:
Carte 1: Package + Blue-Purple (#3b82f6 → #8b5cf6)
Carte 2: Delivery + Green-Teal (#10b981 → #14b8a6)
Carte 3: Star + Orange-Amber (#f97316 → #f59e0b)

5. **MANDATORY HOVER EFFECTS** (Spectacular & Eye-Catching):
   - **Card elevation**: hover:-translate-y-2 (lifts card up)
   - **Shadow evolution**: From subtle to dramatic (0 4px 20px → 0 20px 60px with color tint)
   - **Icon animation**: scale-110 + rotation (rotate-6 or -rotate-6)
   - **Glow effect**: Radial gradient appears on hover (top-right corner)
   - **Bottom bar**: w-0 → w-full animated accent line
   - **Smooth transitions**: duration-500 for fluid animations
   - **Icon gradient flip**: Reverse gradient on hover for dynamic effect

6. **COLORS IN LIGHT THEME** (Vibrant & Professional):
   ✅ MANDATORY - Ultra Attractive Design:
   - **Card base**: White (#ffffff) with subtle gray gradient (to-gray-50)
   - **Icon backgrounds**: VIVID gradients with proper color pairs:
     * Blue→Purple: #3b82f6 → #8b5cf6
     * Green→Teal: #10b981 → #14b8a6
     * Orange→Amber: #f97316 → #f59e0b
   - **Icon glow**: Box-shadow with matching gradient color (rgba with 0.4 opacity)
   - **Hover glow**: Radial gradient with 0.15 opacity
   - **Text hierarchy**: #111827 (titles), #6b7280 (descriptions)
   - **Accent bar**: Gradient line that grows on hover
   - **Border**: Subtle 1px rgba(0,0,0,0.06) for definition
   
   🚨 STILL FORBIDDEN:
   - ❌ Light pastel backgrounds on cards
   - ❌ Washed-out or dull gradients

7. **SPACING & LAYOUT**:
   - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
   - Gap: gap-6 md:gap-8
   - Card padding: p-6 md:p-8
   - Icon margin: mb-5
   - Rounded: rounded-2xl for cards

🌈 COMPLETE EXAMPLE OF A STYLED KEY BENEFITS SECTION:
\`\`\`html
<section class="py-16 md:py-24" style="background: #ffffff;">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-12" style="color: #111827;">
      Why Choose This Product
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Card 1 -->
      <div class="group bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl" 
           style="border-top: 4px solid hsl(${designTokens.primary}); box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
        <div class="mb-5">
          <div class="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" 
               style="background: linear-gradient(135deg, hsl(${designTokens.primary} / 0.12), hsl(${designTokens.accent} / 0.12));">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="quality-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/>
                <stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
              </linearGradient></defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#quality-grad)"/>
            </svg>
          </div>
        </div>
        <h3 class="text-xl font-bold mb-3" style="color: #1f2937;">Premium Quality</h3>
        <p class="leading-relaxed" style="color: #6b7280;">High-end materials selected for exceptional durability.</p>
      </div>
      
      <!-- Repeat for other benefits with unique gradient IDs -->
    </div>
  </div>
</section>
\`\`\`

🎨 CRITICAL DESIGN & COLOR RULES:

1. **COLOR TOKENS - MANDATORY USE**:
   🚨 NEVER use hardcoded colors: NO hsl(0 0% 100%), NO hsl(0 0% 0%), NO hsl(0 0% 80%), NO white, NO black, NO gray-X
   ✅ ALWAYS use design tokens with style attributes:
   - Main backgrounds: style="background: hsl(${designTokens.background})"
   - Alternate backgrounds: style="background: hsl(${designTokens.surface})"
   - Card backgrounds: style="background: hsl(${designTokens.surface})"
   - ALL text: style="color: hsl(${designTokens.text})"
   - Muted text: style="color: hsl(${designTokens.textMuted})"
   - Alternate sections between background and surface for visual hierarchy

2. **ICONS - SIMPLE & ALIGNED**:
   🚨 Use SIMPLE single-path lucide-react style icons
   ❌ NO complex gradients, NO multiple circles, NO opacity layers
   ✅ Example of CORRECT icon with proper alignment:
   
   <div class="flex items-start gap-3">
     <svg class="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" style="stroke: hsl(${designTokens.text})"/>
     </svg>
     <div>
       <h3 class="text-xl font-semibold mb-2" style="color: hsl(${designTokens.text})">Title</h3>
       <p style="color: hsl(${designTokens.text})">Description text</p>
     </div>
   </div>

   Icon variations to use:
   - Check circle: M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z
   - Star: M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z
   - Shield: M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z
   - Sparkles: M5 3l1.5 3L10 5l-2.5 2 1 3.5-3-1.5L3 12l2-2.5L3 6l3 1.5L5 3zm7 7l1 2 2.5-.5-1.5 2 1 2.5-2-1-2.5 2 .5-2.5-2-1.5 2.5-1 1-2z
   - Package: M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z

3. **TYPOGRAPHY**:
   - Headings must use style="color: hsl(${designTokens.text})"
   - Body text must use style="color: hsl(${designTokens.text})"
   - NO text-white, text-black, text-gray-X classes (except on hero overlays)

🚨 ABSOLUTELY FORBIDDEN (CRITICAL):
- NO "Add to Cart" buttons or any purchase buttons
- NO "Buy Now" or "Order Now" buttons
- NO navigation menus or breadcrumbs
- NO footer section
- NO links to external pages (use href="#" only)
- NO call-to-action buttons of any kind

✅ REQUIRED SECTIONS (in order):
${dimensionImages.length > 0 
  ? `1. Hero with image
2. Product Overview (description)
3. Key Benefits (3-5 items with icons)
4. Technical Specifications (if enriched data available)
5. Technical Dimensions (MANDATORY - use dimension schematics with measurements)${variants.length > 1 ? '\n6. Product Variations (MANDATORY - show all variants with cards)' : ''}
7. Materials & Composition (if available)
8. Product Image Gallery (regular product photos only, NOT dimension schematics)
   - Simple gallery with 2-3 columns
   - Each image with short caption below (NO "Détail" prefix)
   - Use simple descriptions: "Vue de face", "Vue d'ensemble", "Finition", etc.
   - Example structure:
     <div class="space-y-2">
       <div class="rounded-xl overflow-hidden shadow-lg">
         <img src="..." loading="lazy" class="w-full h-full object-cover" alt="...">
       </div>
       <p class="text-sm font-medium text-center" style="color: hsl(${designTokens.text})">[Descriptive title based on image content]</p>
     </div>
9. Care Instructions
10. FAQ`
  : `1. Hero with image gallery
2. Product Overview (description)
3. Key Benefits (3-5 items with icons)
4. Technical Specifications (if enriched data available)${variants.length > 1 ? '\n5. Product Variations (MANDATORY - show all variants with cards)' : ''}
6. Materials & Composition (if available)
7. Image Gallery
   🚨 CRITICAL: Each image MUST have a descriptive title based on what is visible:
   - Analyze what each image shows (front view, detail, in context, feature close-up, etc.)
   - Generate a clear, descriptive title for each image in the gallery section
   - Place the title BELOW each image
   - Example structure:
     <div class="space-y-2">
       <div class="rounded-xl overflow-hidden shadow-lg">
         <img src="..." loading="lazy" class="w-full h-full object-cover" alt="...">
       </div>
       <p class="text-sm font-medium text-center" style="color: hsl(${designTokens.text})">[Descriptive title based on image content]</p>
     </div>
8. Care Instructions
9. FAQ`
}

TABLE STYLING:
- Headers: style="background: hsl(${designTokens.surface}); color: hsl(${designTokens.text})"
- Rows: style="color: hsl(${designTokens.text})"
- Alternating section backgrounds for visual hierarchy`
        : `Tu es un expert UX/UI Shopify spécialisé dans les landing pages produit.
Génère une landing page Tailwind HTML complète et professionnelle.

📱 OPTIMISATION MOBILE & PERFORMANCE (CRITIQUE):
🚨 TOUJOURS inclure ces optimisations:
1. Images: TOUJOURS ajouter loading="lazy" sur TOUTES les balises <img>
2. Viewport: <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
3. Textes: Adapter les tailles avec classes responsive (text-base md:text-lg)
4. Espacements: Utiliser py-12 md:py-24 pour sections (meilleur sur mobile)

PRODUIT :
- Titre : ${productTitle}
- Marque : ${vendor}
- Description : ${description}
- Style : ${style || enrichedProduct.style || ""}
- URL produit : ${productUrl}

${enrichedSummary ? `ATTRIBUTS ENRICHIS :\n${enrichedSummary}\n` : ""}
${visualAnalysis ? `🔍 INSIGHTS IA VISUELLE (FAIS CONFIANCE À CES OBSERVATIONS - C'EST CE QUI EST RÉELLEMENT VISIBLE DANS L'IMAGE) :\n${visualAnalysis}\n\n🚨 CRITIQUE : Tu DOIS décrire uniquement ce que l'IA visuelle a observé. NE mentionne PAS de caractéristiques, couleurs ou matériaux qui contredisent l'analyse visuelle ci-dessus. Si l'IA visuelle dit que le produit a des éléments en bois, NE parle PAS d'éléments métalliques. SOIS PRÉCIS À 100% PAR RAPPORT AUX OBSERVATIONS VISUELLES.\n` : ""}
${
  serpInsights
    ? `
🎯 ANALYSE DES CONCURRENTS (UTILISE CECI POUR STRUCTURER TA PAGE) :

📋 Sections Communes Trouvées dans les Meilleurs Résultats :
${serpInsights.commonSections?.map((s: string) => `- ${s}`).join("\n") || "- Section héro\n- Avantages produit\n- FAQ"}

💬 Modèles de CTA Efficaces :
${serpInsights.ctaPatterns?.map((p: string) => `- ${p}`).join("\n") || "- Acheter maintenant\n- En savoir plus"}

🏗️ Éléments Structurels à Inclure :
${serpInsights.structuralElements?.map((e: string) => `- ${e}`).join("\n") || "- Titre clair\n- Imagerie visuelle\n- Signaux de confiance"}

📊 Densité du Contenu : ${serpInsights.contentDensity || "moyenne"}

💡 RECOMMANDATION : Structure ta landing page en utilisant ces modèles éprouvés tout en maintenant l'unicité.
`
    : ""
}

IMAGES :
${imgs}

📦 VARIANTES PRODUIT ${variants.length > 1 ? "(CRITIQUE - SECTION OBLIGATOIRE)" : ""}:
${variants.length > 1 ? `
🚨 CE PRODUIT A ${variants.length} VARIANTES - TU DOIS CRÉER UNE SECTION DÉDIÉE "VARIATIONS DU PRODUIT" !

**Données des Variantes:**
${variants.map((v, i) => `
### Variante ${i + 1}: ${v.title}
- **Prix**: ${v.price} EUR
- **SKU**: ${v.sku || 'N/A'}
- **Options**: ${v.option1 ? `${v.option1}` : ''}${v.option2 ? ` / ${v.option2}` : ''}${v.option3 ? ` / ${v.option3}` : ''}
- **Disponibilité**: ${v.inventory_quantity > 0 ? 'Oui' : 'Rupture de stock'}
- **Image**: ${v.image_url || 'Utiliser les images principales du produit'}
`).join('\n')}

🚨 INSTRUCTIONS CRITIQUES POUR LA SECTION VARIANTES:
1. **Titre de Section**: "Nos Variations Disponibles" ou "Choisissez Votre Modèle"
2. **Placement**: APRÈS les Spécifications Techniques, AVANT la Galerie d'Images
3. **Structure de Carte** pour chaque variante:
   - Titre/nom de la variante (ex: "Modèle Bleu Foncé", "Version Labrador")
   - Image principale (spécifique à la variante si disponible, sinon image produit principale)
   - Différenciateur clé (couleur, taille, matériau qui la rend unique)
   - Prix (proéminent, stylé avec couleur primaire)
   - Statut de disponibilité (style badge)
   - Petite galerie (2-3 images spécifiques à la variante si disponibles dans la liste d'images)
4. **Grille Responsive**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
5. **Style Visuel**: Correspondre au design global, utiliser couleur surface pour les cartes, ajouter effets hover
6. **Sélection d'Images**: Essayer de faire correspondre les images aux variantes selon les mots-clés titre/couleur

**Exemple de Structure HTML:**
\`\`\`html
<section class="py-12 md:py-20" style="background: hsl(${designTokens.background});">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-0">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-10" style="color: hsl(${designTokens.text})">
      Nos Variations Disponibles
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Exemple de Carte Variante -->
      <div class="rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105" style="background: hsl(${designTokens.surface});">
        <div class="relative h-64">
          <img src="[image-principale-variante]" loading="lazy" class="w-full h-full object-cover" alt="[Titre Variante]">
        </div>
        <div class="p-6">
          <h3 class="text-2xl font-bold mb-2" style="color: hsl(${designTokens.text})">[Titre Variante]</h3>
          <p class="text-lg font-semibold mb-4" style="color: hsl(${designTokens.primary})">[Prix] EUR</p>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" style="color: hsl(${designTokens.accent})" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              <span style="color: hsl(${designTokens.textMuted})">[Différenciateur clé, ex: "Couleur: Bleu Foncé"]</span>
            </div>
          </div>
          <!-- Mini galerie pour cette variante (2-3 images) -->
          <div class="grid grid-cols-3 gap-2">
            <img src="[image-detail-1]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Détail 1">
            <img src="[image-detail-2]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Détail 2">
            <img src="[image-detail-3]" loading="lazy" class="rounded-lg w-full h-20 object-cover" alt="Détail 3">
          </div>
        </div>
      </div>
      <!-- Répéter pour chaque variante -->
    </div>
  </div>
</section>
\`\`\`
` : `
Produit à variante unique - Pas besoin de section variations séparée.
Variante: ${vars}
`}
${customHighlights ? `\nPOINTS FORTS :\n${customHighlights}` : ""}

LONGUEUR DU CONTENU (OBLIGATOIRE) :
- Mode : ${lengthConfig.labelFr}
- Objectif : ${lengthConfig.descriptionFr}
- Thème : ${userOptions.theme || "light"}
${lengthMode === "short" ? "- Page très concise avec uniquement les sections essentielles et du texte bref" :
  lengthMode === "medium" ? "- Nombre équilibré de sections avec détails modérés" :
  "- Page riche et détaillée avec sections complètes et texte plus long"}

🌓 CONFIGURATION DU THÈME (CRITIQUE - OBLIGATOIRE):
${userOptions.theme === "dark" 
  ? `🌙 MODE SOMBRE ACTIVÉ - SUIVRE CES RÈGLES EXACTEMENT:

🚨 ARRIÈRE-PLANS (OBLIGATOIRE):
- Arrière-plan du body: DOIT utiliser une couleur sombre de designTokens.background (ex: hsl(222 47% 11%))
- TOUS les arrière-plans de section: DOIVENT alterner entre couleurs sombres background et surface
- ❌ INTERDIT: Arrière-plans blancs hsl(0 0% 100%)
- ❌ INTERDIT: Arrière-plans bleu clair hsl(210 100% 80%)
- ❌ INTERDIT: Tout arrière-plan de couleur claire
- ✅ CORRECT: style="background: hsl(${designTokens.background})" ou style="background: hsl(${designTokens.surface})"

🚨 COULEURS DE TEXTE (OBLIGATOIRE):
- TOUT le texte: DOIT utiliser des couleurs claires de designTokens
- Titres: style="color: hsl(${designTokens.text})" (devrait être clair comme hsl(210 40% 98%))
- Texte corps: style="color: hsl(${designTokens.text})"
- Texte atténué: style="color: hsl(${designTokens.textMuted})"
- ❌ INTERDIT: Couleurs de texte sombres comme hsl(210 100% 20%)
- ❌ INTERDIT: Texte noir hsl(0 0% 0%)

🚨 CARTES & CONTENEURS (OBLIGATOIRE):
- Utiliser designTokens.surface avec opacité optionnelle: style="background: hsl(${designTokens.surface}) / 0.5"
- Ajouter backdrop-filter: backdrop-filter: blur(10px) pour effet verre
- ❌ INTERDIT: Cartes de couleur claire hsl(210 100% 80%)
- ✅ CORRECT: Surfaces sombres avec texte clair

🚨 CHECKLIST DE VÉRIFICATION - TOUS DOIVENT ÊTRE VRAIS:
- [ ] Le body a un arrière-plan SOMBRE
- [ ] CHAQUE section a un arrière-plan SOMBRE
- [ ] TOUT le texte est de couleur CLAIRE
- [ ] AUCUN arrière-plan blanc nulle part (pas de hsl(0 0% 100%))
- [ ] AUCUN arrière-plan bleu clair (pas de hsl(210 100% 80%))
- [ ] AUCUN texte sombre sur fond sombre

🚨 SI TU UTILISES hsl(0 0% 100%) OU hsl(210 100% 80%) OU hsl(210 100% 20%) COMME TEXTE EN MODE SOMBRE, TU AS ÉCHOUÉ!`
  : `☀️ MODE CLAIR (PAR DÉFAUT) - SUIVRE CES RÈGLES EXACTEMENT:

🚨 ARRIÈRE-PLANS (OBLIGATOIRE):
- Body: PAS de background inline (le CSS s'en occupe)
- Sections: Utiliser SEULEMENT blanc ou couleurs très claires
- ❌ INTERDIT: hsl(222 47% 11%), hsl(210 100% 80%), TOUT fond bleu/gris foncé
- ✅ AUTORISÉ: style="background: white" OU style="background: #ffffff" OU style="background: #f9fafb"
- Alterner: blanc et gris très clair uniquement

🚨 COULEURS DE TEXTE (OBLIGATOIRE):
- Titres: style="color: #111827" ou style="color: #1f2937"
- Corps: style="color: #374151" ou style="color: #4b5563"
- Atténué: style="color: #6b7280"
- ❌ INTERDIT: Texte blanc, bleu clair, gris clair

🚨 VÉRIFICATION - TOUS DOIVENT ÊTRE VRAIS:
- [ ] TOUS les fonds sont blancs ou très clairs
- [ ] TOUT le texte est gris foncé ou noir
- [ ] AUCUN fond bleu (hsl(210 100% 80%))
- [ ] AUCUN fond sombre en mode clair`
}
}

🏗️ STRUCTURE DE LAYOUT :
- Layout sélectionné : ${typeof resolvedLayout === "object" ? resolvedLayout.name || resolvedLayout.type || layout : layout}
${typeof resolvedLayout === "object" && (resolvedLayout.rules || resolvedLayout.instructions)
  ? (resolvedLayout.rules || resolvedLayout.instructions)
  : layout === "2_colonnes"
    ? "- Utiliser principalement des grilles 2 colonnes (grid-cols-1 md:grid-cols-2) pour les sections principales"
    : layout === "3_colonnes"
      ? "- Utiliser des grilles 3 colonnes sur desktop (grid-cols-1 md:grid-cols-3) pour les bénéfices/fonctionnalités"
      : "- Layout flexible mais maintenir la cohérence"}

🎨 MODÈLE DE DESIGN (CRITIQUE - APPLIQUER CES RÈGLES STRICTEMENT) :
Style : ${selectedStyle.name}
${selectedStyle.description}

RÈGLES DE DESIGN (OBLIGATOIRES - SUIVRE EXACTEMENT) :
${selectedStyle.rules}

🚨🚨🚨 CRITICAL OVERRIDE - LES RÈGLES DE STYLE CI-DESSUS SONT PRIORITAIRES SUR TOUTES LES AUTRES INSTRUCTIONS! 🚨🚨🚨

Si le style est MINIMALISTE:
- ❌ AUCUNE ombre (shadow) n'est permise
- ❌ AUCUN arrondi (rounded) n'est permis - angles droits uniquement
- ✅ Palette monochrome stricte (noir + blanc + 1 accent)
- ✅ Espaces massifs entre sections

Si le style est MODERN:
- ✅ Ombres progressives (shadow-md hover:shadow-xl) OBLIGATOIRES
- ✅ Arrondis (rounded-xl, rounded-2xl) OBLIGATOIRES
- ✅ Dégradés colorés OBLIGATOIRES
- ✅ Cartes flottantes avec effets hover

Si le style est PREMIUM:
- ✅ Backgrounds SOMBRES (bg-gray-900, bg-slate-900) OBLIGATOIRES
- ✅ Typographie Serif pour titres OBLIGATOIRE
- ✅ Ombres profondes multiples (shadow-2xl) OBLIGATOIRES
- ✅ Effets glow et brillance OBLIGATOIRES

EXEMPLES HTML PAR STYLE:
${styleExamples}

PALETTE DE COULEURS (FORMAT HSL UNIQUEMENT) :
- Primaire : hsl(${designTokens.primary})
- Primaire Claire : hsl(${designTokens.primaryLight})
- Primaire Foncée : hsl(${designTokens.primaryDark})
- Secondaire : hsl(${designTokens.secondary})
- Secondaire Claire : hsl(${designTokens.secondaryLight})
- Secondaire Foncée : hsl(${designTokens.secondaryDark})
- Accent : hsl(${designTokens.accent})
- Accent Clair : hsl(${designTokens.accentLight})
- Accent Foncé : hsl(${designTokens.accentDark})
- Fond : hsl(${designTokens.background})
- Surface : hsl(${designTokens.surface})
- Texte : hsl(${designTokens.text})
- Texte Atténué : hsl(${designTokens.textMuted})

🚨 UTILISATION DES COULEURS - RÈGLES CRITIQUES (OBLIGATOIRE) :
❌ ABSOLUMENT INTERDIT :
- JAMAIS utiliser de variables CSS : var(--color-primary), var(--color-text), etc.
- JAMAIS créer de blocs CSS :root avec propriétés personnalisées
- JAMAIS utiliser --primary-color ou toute propriété CSS personnalisée

✅ OBLIGATOIRE - TOUJOURS UTILISER HSL INLINE :
- Couleurs texte : style="color: hsl(${designTokens.text})"
- Couleurs fond : style="background: hsl(${designTokens.background})"
- Stroke SVG : style="stroke: hsl(${designTokens.primary})"
- Couleurs stop dans dégradés SVG : style="stop-color: hsl(${designTokens.primary}); stop-opacity: 1"

EXEMPLES CORRECTS :
✅ <h1 style="color: hsl(${designTokens.text})">Titre</h1>
✅ <div style="background: hsl(${designTokens.surface})">Contenu</div>
✅ <stop offset="0%" style="stop-color: hsl(${designTokens.primary}); stop-opacity: 1"/>
✅ <path stroke-width="2" style="stroke: hsl(${designTokens.primary})"/>

EXEMPLES INTERDITS :
❌ <h1 style="color: var(--color-text)">
❌ :root { --color-primary: hsl(...) }
❌ <div class="text-primary bg-primary">

🚨 RÈGLES RESPONSIVES CRITIQUES (OBLIGATOIRE) :
- JAMAIS dupliquer les classes responsive (❌ class="md:text-xl md:text-2xl")
- Utiliser un seul breakpoint par propriété (✅ class="text-lg md:text-2xl")

🖼️ IMAGES ET TITRES (CRITIQUE - LISIBILITÉ MAXIMALE) :
🚨 CRITICAL: Pour TOUS les titres/textes sur images, tu DOIS :
1. Ajouter overlay sombre semi-transparent : <div class="absolute inset-0 bg-black/40"></div>
2. Utiliser text-shadow pour contraste : style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)"
3. Texte en blanc éclatant : class="text-white"
4. Taille de police grande : class="text-4xl md:text-6xl font-bold"
5. Structure exemple OBLIGATOIRE pour hero avec image :
   <div class="relative h-[70vh] min-h-[400px] md:h-[600px]">
     <img src="..." loading="lazy" class="absolute inset-0 w-full h-full object-cover">
     <div class="absolute inset-0 bg-black/40"></div>
     <div class="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
       <h1 class="text-4xl md:text-6xl font-bold text-white mb-4" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)">
         ${productTitle}
       </h1>
       <p class="text-base md:text-xl text-white/90" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.7)">
         Description courte
       </p>
     </div>
   </div>

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

STRUCTURE :
- HTML5 complet : <!DOCTYPE html>, <html>, <head>, <body>
- <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
- <script src="https://cdn.tailwindcss.com"></script> dans <head>
- 🔤 POLICES : Ajouter dans <head> après Tailwind :
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>html,body{background:#f3f4f6!important;background-color:#f3f4f6!important}body{font-family:'Roboto',sans-serif;line-height:1.6}h1,h2,h3,h4,h5,h6{font-family:'Roboto',sans-serif;font-weight:700;letter-spacing:-0.02em;line-height:1.2}h2{font-size:2.25rem}p,li{line-line:1.75}</style>
- 🚨 TOUTES les images DOIVENT avoir loading="lazy"
- Mobile-first (sm:, md:, lg:)
- Container : max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grilles : grid-cols-1 md:grid-cols-2 lg:grid-cols-3

📱 TABLEAUX RESPONSIFS (CRITIQUE) :
- Bureau (md:) : Utiliser <table> standard avec class "hidden md:table"
- Mobile : Utiliser des cartes avec class "block md:hidden space-y-4"
- Structure exemple :
  <!-- Cartes mobile -->
  <div class="block md:hidden space-y-4">
    <div class="bg-white rounded-lg p-4 shadow">
      <div class="font-semibold mb-2">Label</div>
      <div class="text-secondary">Valeur</div>
    </div>
  </div>
  <!-- Table bureau -->
  <table class="hidden md:table min-w-full">

🎯 SECTION POINTS FORTS / KEY BENEFITS (CRITIQUE - STYLE PREMIUM OBLIGATOIRE) :

🚨 RÈGLES DE DESIGN CHIC POUR LES POINTS FORTS:

1. **CARTES ÉLÉGANTES AVEC EFFETS**:
   - Fond blanc/surface propre avec ombres graduées
   - Bordures subtiles ou légères
   - Effets hover obligatoires: shadow-xl avec transition
   - Espacement généreux (p-6 md:p-8)
   - Bordure colorée subtile en haut ou à gauche (accent color)

2. **ICÔNES STYLÉES AVEC GRADIENTS**:
   - TOUJOURS utiliser des dégradés (primary → accent) sur les icônes
   - Taille moyenne: w-12 h-12 ou w-10 h-10 dans un cercle
   - Cercle de fond avec gradient léger ou couleur unie
   - Créer IDs uniques pour chaque gradient (benefit-grad-1, benefit-grad-2, etc.)
   - Ajouter hover: scale et rotation légère

3. **STRUCTURE OBLIGATOIRE**:
\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
  <!-- Carte Bénéfice 1 -->
  <div class="group bg-white rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl" 
       style="border-top: 4px solid hsl(${designTokens.primary}); box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    
    <!-- Icône avec gradient dans cercle -->
    <div class="mb-5">
      <div class="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" 
           style="background: linear-gradient(135deg, hsl(${designTokens.primary} / 0.1), hsl(${designTokens.accent} / 0.1));">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="benefit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: hsl(${designTokens.primary}); stop-opacity: 1"/>
              <stop offset="100%" style="stop-color: hsl(${designTokens.accent}); stop-opacity: 1"/>
            </linearGradient>
          </defs>
          <path d="M5 13l4 4L19 7" stroke="url(#benefit-grad-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Contenu -->
    <h3 class="text-xl md:text-2xl font-bold mb-3" style="color: #1f2937;">
      Titre du Bénéfice
    </h3>
    <p class="leading-relaxed" style="color: #6b7280;">
      Description détaillée du bénéfice avec un texte convaincant.
    </p>
  </div>
</div>
\`\`\`

4. **ICÔNES SVG DISPONIBLES AVEC GRADIENTS**:

📦 Package/Qualité:
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="pkg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="url(#pkg-grad)" stroke-width="2"/>
</svg>

🚚 Livraison:
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="truck-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M1 6h14v10H1V6zm14 0h3l3 4v6h-6V6zM6.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm11 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="url(#truck-grad)" stroke-width="2"/>
</svg>

⭐ Qualité/Premium:
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#star-grad)"/>
</svg>

🛡️ Garantie/Sécurité:
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="url(#shield-grad)" stroke-width="2"/>
</svg>

✨ Nouveauté/Innovation:
<svg class="w-7 h-7" viewBox="0 0 24 24">
  <defs><linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="url(#sparkle-grad)"/>
</svg>

✓ Check/Validé:
<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="check-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/><stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
  </linearGradient></defs>
  <path d="M5 13l4 4L19 7" stroke="url(#check-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

5. **EFFETS HOVER OBLIGATOIRES**:
   - Shadow graduation: shadow-lg → shadow-2xl
   - Scale légère: group-hover:scale-105 sur la carte
   - Icon scale: group-hover:scale-110 sur l'icône
   - Transition smooth: transition-all duration-300

6. **COULEURS EN LIGHT THEME**:
   🚨 ABSOLUMENT INTERDIT:
   - ❌ Fonds bleus clairs (hsl(210 100% 80%) ou similaires)
   - ❌ Texte bleu sur fond bleu
   - ❌ Backgrounds colorés pour les cartes
   
   ✅ OBLIGATOIRE:
   - Fond des cartes: blanc (#ffffff) ou très léger (#f9fafb)
   - Texte titres: #1f2937 ou #111827 (gris très foncé)
   - Texte descriptions: #6b7280 ou #4b5563 (gris moyen)
   - Bordure colorée: UNIQUEMENT en accent subtil (top ou left border)
   - Gradients: UNIQUEMENT dans les icônes et cercles de fond des icônes

7. **SPACING & LAYOUT**:
   - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
   - Gap: gap-6 md:gap-8
   - Padding cartes: p-6 md:p-8
   - Margin icône: mb-5
   - Rounded: rounded-2xl pour cartes

🌈 EXEMPLE COMPLET D'UNE SECTION POINTS FORTS STYLÉE:
\`\`\`html
<section class="py-16 md:py-24" style="background: #ffffff;">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-12" style="color: #111827;">
      Pourquoi Choisir Ce Produit
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Carte 1 -->
      <div class="group bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl" 
           style="border-top: 4px solid hsl(${designTokens.primary}); box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
        <div class="mb-5">
          <div class="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" 
               style="background: linear-gradient(135deg, hsl(${designTokens.primary} / 0.12), hsl(${designTokens.accent} / 0.12));">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="quality-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: hsl(${designTokens.primary})"/>
                <stop offset="100%" style="stop-color: hsl(${designTokens.accent})"/>
              </linearGradient></defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#quality-grad)"/>
            </svg>
          </div>
        </div>
        <h3 class="text-xl font-bold mb-3" style="color: #1f2937;">Qualité Premium</h3>
        <p class="leading-relaxed" style="color: #6b7280;">Matériaux haut de gamme sélectionnés pour leur durabilité exceptionnelle.</p>
      </div>
      
      <!-- Répéter pour autres bénéfices avec IDs gradients uniques -->
    </div>
  </div>
</section>
\`\`\`

🚨 ABSOLUMENT INTERDIT (CRITIQUE) :
- AUCUN bouton "Ajouter au panier" ou bouton d'achat
- AUCUN bouton "Acheter maintenant" ou "Commander"
- AUCUN menu de navigation ou fil d'Ariane (breadcrumb)
- AUCUNE section footer
- AUCUN lien vers des pages externes (utiliser href="#" uniquement)
- AUCUN bouton call-to-action de quelque nature que ce soit

✅ SECTIONS REQUISES :
Hero avec galerie d'images, Points Forts (3-4 cartes), Caractéristiques Techniques (si données enrichies), Matériaux & Composition (si disponible), Galerie d'Images, Conseils d'Entretien, FAQ.

UTILISATION DES ICÔNES :
Pour les LISTES À PUCES : Utiliser l'icône fournie ci-dessous selon le style sélectionné
Pour la section MATÉRIAUX & COMPOSITION : Utiliser des icônes variées selon le type de matériau :
- Panneau/Corps/Caisson : <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
- Protection/Résistance : <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
- Mécanisme/Charnières/Fermeture : <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
- Finition/Surface/Stratifié : <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
- Éclairage/LED : <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>

ICÔNE POUR LISTES À PUCES SELON LE STYLE :
${selectedIcon}
- AUCUNE icône décorative ailleurs`;

    // --- AI call with timeout (60s) ---
    console.log("🤖 Starting AI generation...");
    
    // Check prompt size BEFORE sending
    const promptSizeKB = Math.round(prompt.length / 1024);
    const promptSizeMB = (promptSizeKB / 1024).toFixed(2);
    console.log(`📝 Prompt size: ${promptSizeKB}KB (${promptSizeMB}MB), ${prompt.length} characters`);
    
    // Warn if prompt is suspiciously large (>500KB is unusual)
    if (promptSizeKB > 500) {
      console.warn(`⚠️ LARGE PROMPT DETECTED: ${promptSizeMB}MB - This may cause API issues`);
      console.warn(`  - Images count: ${images.length}`);
      console.warn(`  - Enriched summary length: ${enrichedSummary.length} chars`);
      console.warn(`  - Visual analysis length: ${visualAnalysis.length} chars`);
    }
    
    console.log("🔑 API Key configured:", !!LOVABLE_API_KEY);
    
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
                  ? "You are a professional content writer for product landing pages. You create informative, engaging HTML content that describes products in detail. Focus on product features, specifications, and benefits. NEVER include purchase buttons, navigation menus, or call-to-action elements. When enriched product attributes are provided, you MUST create comprehensive Technical Specifications and Materials sections with all available data."
                  : "Tu es un rédacteur professionnel de contenu pour des landing pages produit. Tu crées du contenu HTML informatif et engageant qui décrit les produits en détail. Concentre-toi sur les caractéristiques, spécifications et avantages du produit. N'inclus JAMAIS de boutons d'achat, menus de navigation ou éléments call-to-action. Quand des attributs produit enrichis sont fournis, tu DOIS créer des sections Caractéristiques Techniques et Matériaux complètes avec toutes les données disponibles.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: lengthConfig.maxTokens,
          temperature: 0.7,
        }),
        signal: aiController.signal,
      });
      
      console.log("🔄 Request sent to Lovable AI Gateway");
    } catch (fetchError) {
      clearTimeout(aiTimeout);
      console.error("❌ Fetch error:", fetchError);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            error: "La génération a pris trop de temps (timeout 60s). Réessayez.",
          }), 
          {
            status: 504,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw fetchError;
    }
    
    clearTimeout(aiTimeout);

    console.log("📡 API Response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("❌ Lovable API Error:", {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        response: text.substring(0, 500),
      });
      
      // Retourner un message d'erreur clair selon le statut
      let errorMessage = `Erreur API Lovable (${aiResponse.status})`;
      if (aiResponse.status === 429) {
        errorMessage = "Limite de taux dépassée. Réessayez dans quelques instants.";
      } else if (aiResponse.status === 402) {
        errorMessage = "Crédits Lovable AI épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.";
      } else if (aiResponse.status === 401 || aiResponse.status === 403) {
        errorMessage = "Erreur d'authentification API. Contactez le support.";
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: text,
          status: aiResponse.status
        }), 
        {
          status: aiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("✅ AI generation completed successfully");

    const data = await aiResponse.json();
    
    // 🔍 Debug: Log the complete API response structure
    console.log("🔍 API Response structure:", {
      hasChoices: !!data?.choices,
      choicesLength: data?.choices?.length || 0,
      hasMessage: !!data?.choices?.[0]?.message,
      messageKeys: data?.choices?.[0]?.message ? Object.keys(data.choices[0].message) : [],
      hasContent: !!data?.choices?.[0]?.message?.content,
      contentLength: data?.choices?.[0]?.message?.content?.length || 0,
      hasUsage: !!data?.usage,
      fullResponse: JSON.stringify(data).substring(0, 1000) // First 1000 chars
    });
    
    let rawHtml = data?.choices?.[0]?.message?.content?.trim() || "";
    
    // If content is empty, check for errors in response
    if (!rawHtml) {
      console.error("❌ EMPTY CONTENT from API:", {
        hasError: !!data?.error,
        errorMessage: data?.error?.message || "No error in response",
        fullData: JSON.stringify(data)
      });
      
      return new Response(
        JSON.stringify({ 
          error: "L'API n'a généré aucun contenu. Vérifiez les logs pour plus de détails.",
          debugInfo: {
            apiStatus: aiResponse.status,
            hasChoices: !!data?.choices,
            responseSize: JSON.stringify(data).length
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔍 Phase 4: Detailed diagnostics
    const tokensUsed = data?.usage?.completion_tokens || 0;
    const hasClosingBody = rawHtml.includes("</body>");
    const hasClosingHtml = rawHtml.includes("</html>");
    const isTruncated = !hasClosingHtml || !hasClosingBody;
    
    console.log("📊 AI Response Stats:", {
      tokensUsed,
      tokensMax: lengthConfig.maxTokens,
      htmlLength: rawHtml.length,
      hasClosingBody,
      hasClosingHtml,
      isTruncated,
      last200Chars: isTruncated ? rawHtml.slice(-200) : "OK"
    });

    // ⚠️ Detect truncation - Warning only, no auto-retry
    if (isTruncated) {
      console.warn("⚠️ HTML truncation detected - content may be incomplete");
      console.warn(`  - Tokens used: ${tokensUsed}/${lengthConfig.maxTokens}`);
      console.warn(`  - HTML length: ${rawHtml.length}`);
      console.warn(`  - Mode: ${lengthMode}`);
      
      // Add a simple closing if missing
      if (!hasClosingBody) {
        rawHtml += "\n</body>";
      }
      if (!hasClosingHtml) {
        rawHtml += "\n</html>";
      }
      
      console.log("✅ Added missing closing tags");
    }

    if (!rawHtml || rawHtml.length < 400) {
      return new Response(
        JSON.stringify({ error: detectedLanguage === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[AI] Raw HTML received, length:", rawHtml.length);

    // 🧹 Apply HTML normalization and sanitization with designTokens and product images
    // This will replace placeholder images (via.placeholder.com) with real product images
    const html = sanitizeGeneratedHTML(rawHtml, productTitle, detectedLanguage || "en", {
      allowRootCss: false,
      designTokens: designTokens,
      productImages: productImages?.length > 0 ? productImages : images
    });

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
        
        // 📊 Track usage - 1 landing page generation = 1 optimization
        try {
          console.log("📊 Tracking usage for landing page generation...");
          await supabaseAdmin.rpc('increment_usage', {
            p_seller_id: userId,
            p_field: 'optimizations_count',
            p_increment: 10
          });
          console.log("✅ Usage tracked successfully");
        } catch (usageError) {
          console.error("⚠️ Failed to track usage (non-blocking):", usageError);
          // Non-blocking - don't fail the request
        }
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
        // 🔥 DEBUG INFO
        debug: {
          configReceived: {
            colorScheme: userOptions.colorScheme,
            layout: userOptions.layout,
            designStyle: userOptions.designStyle,
            contentLength: userOptions.contentLength,
            theme: userOptions.theme,
          },
          colorSchemeResolved: resolvedColorScheme,
          layoutResolved: resolvedLayout,
          designStyleResolved: resolvedDesignStyle,
          contentLengthConfig: lengthConfig,
          designTokens: designTokens,
          promptLength: prompt?.length || 0,
        },
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
