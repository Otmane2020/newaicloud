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

// Translation utilities for French localization
function translateMaterialsToFrench(materials: string): string {
  const materialMap: Record<string, string> = {
    'ceramic': 'céramique',
    'wood': 'bois',
    'travertine': 'travertin',
    'metal': 'métal',
    'glass': 'verre',
    'marble': 'marbre',
    'stone': 'pierre',
    'fabric': 'tissu',
    'leather': 'cuir',
    'plastic': 'plastique',
    'steel': 'acier',
    'aluminum': 'aluminium',
    'brass': 'laiton',
    'copper': 'cuivre',
    'oak': 'chêne',
    'pine': 'pin',
    'walnut': 'noyer',
    'cotton': 'coton',
    'linen': 'lin',
    'velvet': 'velours',
    'concrete': 'béton',
    'rattan': 'rotin',
    'wicker': 'osier',
    'bamboo': 'bambou'
  };

  return materials
    .split(',')
    .map(m => {
      const trimmed = m.trim().toLowerCase();
      return materialMap[trimmed] || m.trim();
    })
    .join(', ');
}

function translateColorsToFrench(colors: string): string {
  const colorMap: Record<string, string> = {
    'beige': 'beige',
    'white': 'blanc',
    'black': 'noir',
    'brown': 'marron',
    'gray': 'gris',
    'grey': 'gris',
    'blue': 'bleu',
    'red': 'rouge',
    'green': 'vert',
    'yellow': 'jaune',
    'orange': 'orange',
    'purple': 'violet',
    'pink': 'rose',
    'gold': 'or',
    'silver': 'argent',
    'cream': 'crème',
    'ivory': 'ivoire',
    'navy': 'bleu marine',
    'turquoise': 'turquoise'
  };

  return colors
    .split(',')
    .map(c => {
      const trimmed = c.trim().toLowerCase();
      return colorMap[trimmed] || c.trim();
    })
    .join(', ');
}

// Sanitize dimensions from Gemini-generated HTML to avoid duplicates
function sanitizeDimensionsInHtml(html: string): string {
  console.log("🧹 Sanitizing dimensions from HTML...");
  
  // Remove table rows containing dimension keywords (case insensitive)
  let cleaned = html.replace(
    /<tr[\s\S]*?(?:Dimensions?|DIMENSIONS?|Hauteur|Height|Largeur|Width|Profondeur|Depth|Longueur|Length)[\s\S]*?<\/tr>/gi,
    ""
  );
  
  // Remove list items containing dimension keywords
  cleaned = cleaned.replace(
    /<li[^>]*>[\s\S]*?(?:Dimensions?|DIMENSIONS?)[\s\S]*?<\/li>/gi,
    ""
  );
  
  // Remove dimension/technical schema images from gallery sections
  cleaned = cleaned.replace(
    /<img[^>]*alt="[^"]*(?:dimension|technical|schema|schéma|measure|mesure)[^"]*"[^>]*>/gi,
    ""
  );
  
  // Remove paragraphs that are just dimension specifications
  cleaned = cleaned.replace(
    /<p[^>]*>[\s\S]*?(?:Dimensions?\s*:|\d+\s*(?:cm|mm|m)\s*[×x]\s*\d+)[\s\S]*?<\/p>/gi,
    ""
  );
  
  console.log("✅ Dimensions sanitized from HTML");
  return cleaned;
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
  
  const labels = language === "en" ? {
    visualAnalysis: "VISUAL ANALYSIS:",
    colors: "Colors",
    materials: "Materials",
    style: "Style",
    condition: "Condition",
    dimensions: "DIMENSIONS (detected):",
    height: "Height",
    width: "Width",
    depth: "Depth",
    length: "Length",
    diameter: "Diameter"
  } : {
    visualAnalysis: "ANALYSE VISUELLE:",
    colors: "Couleurs",
    materials: "Matériaux",
    style: "Style",
    condition: "État",
    dimensions: "DIMENSIONS (détectées):",
    height: "Hauteur",
    width: "Largeur",
    depth: "Profondeur",
    length: "Longueur",
    diameter: "Diamètre"
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
  
  // Add technical dimensions if available
  if (attributes.technicalDimensions) {
    const dims = attributes.technicalDimensions;
    const dimDetails = [];
    
    if (dims.height) {
      dimDetails.push(`${labels.height}: ${dims.height} ${dims.heightUnit || 'cm'}`);
    }
    if (dims.width) {
      dimDetails.push(`${labels.width}: ${dims.width} ${dims.widthUnit || 'cm'}`);
    }
    if (dims.depth) {
      dimDetails.push(`${labels.depth}: ${dims.depth} ${dims.depthUnit || 'cm'}`);
    }
    if (dims.length) {
      dimDetails.push(`${labels.length}: ${dims.length} ${dims.lengthUnit || 'cm'}`);
    }
    if (dims.diameter) {
      dimDetails.push(`${labels.diameter}: ${dims.diameter} ${dims.diameterUnit || 'cm'}`);
    }
    
    if (dimDetails.length > 0) {
      sections.push(`\n${labels.dimensions}`);
      sections.push(dimDetails.map((d: string) => `- ${d}`).join("\n"));
    }
  }
  
  return sections.join("\n");
}

function buildEnrichedProductSummary(enriched: any, language = "fr") {
  if (!enriched) return "";

  const sections = [];
  
  // Translation labels
  const labels = language === "en" ? {
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
    weight: "Weight"
  } : {
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
    weight: "Poids"
  };

  // Visual Attributes with French translation
  const visualAttrs = [];
  if (enriched.ai_color) {
    const translatedColor = language === 'fr' ? translateColorsToFrench(enriched.ai_color) : enriched.ai_color;
    visualAttrs.push(`${labels.color}: ${translatedColor}`);
  }
  if (enriched.ai_material) {
    const translatedMaterial = language === 'fr' ? translateMaterialsToFrench(enriched.ai_material) : enriched.ai_material;
    visualAttrs.push(`${labels.material}: ${translatedMaterial}`);
  }
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
    // Use dimensions extracted from Gemini Vision (standard keys: height, width, depth, length, diameter)
    // Format: "H 87 cm × L 270 cm × P 196 cm × l 96 cm"
    const dimParts = [];
    if (techDims.height) dimParts.push(`${labels.height} ${techDims.height} ${techDims.heightUnit || 'cm'}`);
    if (techDims.length) dimParts.push(`${labels.length} ${techDims.length} ${techDims.lengthUnit || 'cm'}`);
    if (techDims.depth) dimParts.push(`${labels.depth} ${techDims.depth} ${techDims.depthUnit || 'cm'}`);
    if (techDims.width) dimParts.push(`${labels.width} ${techDims.width} ${techDims.widthUnit || 'cm'}`);
    if (techDims.diameter) dimParts.push(`${labels.diameter} ${techDims.diameter} ${techDims.diameterUnit || 'cm'}`);
    
    // Extract weight from vision (HIGHEST PRIORITY)
    if (techDims.weight) {
      dimParts.push(`${labels.weight} ${techDims.weight} ${techDims.weightUnit || 'kg'}`);
      weightSource = "vision";
    }
    
    if (dimParts.length > 0) {
      sections.push(`\n${labels.dimensionsVisible}`);
      sections.push(`- ${dimParts.join(" × ")}`);
    }
  } else if (hasSmartDims) {
    // Fallback to estimated smart dimensions (SECOND PRIORITY, before SERP)
    if (enriched.smart_length) dims.push(`${labels.length} ~${enriched.smart_length}${enriched.smart_length_unit || ""}`);
    if (enriched.smart_width) dims.push(`${labels.width} ~${enriched.smart_width}${enriched.smart_width_unit || ""}`);
    if (enriched.smart_height) dims.push(`${labels.height} ~${enriched.smart_height}${enriched.smart_height_unit || ""}`);
    
    // Add estimated weight only if not from vision
    if (!weightSource && enriched.smart_weight) {
      dims.push(`${labels.weight} ~${enriched.smart_weight}${enriched.smart_weight_unit || ""}`);
      weightSource = "estimated";
    }
    
    if (enriched.smart_diameter) dims.push(`${labels.diameter} ~${enriched.smart_diameter}${enriched.smart_diameter_unit || ""}`);
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
  if (enriched.ai_presentation_quality) quality.push(`${labels.presentationQuality}: ${enriched.ai_presentation_quality}`);
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
    } = body ?? {};

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

    // Generate design tokens
    const designTokens = generateDesignTokens(colorScheme || { primary: mainColor });

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
    let storeCountry = 'United States';
    let storeLanguage = 'en';
    
    if (enrichedProduct.store_id) {
      console.log("🔍 Fetching store localization info...");
      try {
        const { data: storeData } = await supabaseAdmin
          .from('shopify_connections')
          .select('primary_locale, country_code')
          .eq('id', enrichedProduct.store_id)
          .maybeSingle();
        
        if (storeData) {
          storeCountry = storeData.country_code || 'United States';
          storeLanguage = storeData.primary_locale?.split('-')[0] || 'en';
          console.log(`📍 Store location: ${storeCountry}, language: ${storeLanguage}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch store info, using defaults:', error);
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
          maxResults: 10
        }
      });

      if (serpError) {
        console.warn("⚠️ SERP analysis failed:", serpError);
      } else if (serpData) {
        serpInsights = serpData.insights;
        console.log("✅ SERP analysis completed:", {
          commonSections: serpInsights?.commonSections?.length || 0,
          ctaPatterns: serpInsights?.ctaPatterns?.length || 0
        });
      }
    } catch (serpErr) {
      console.warn("⚠️ SERP analysis error:", serpErr);
    }

    // 🖼️ Multi-Image Vision AI Analysis - Analyze ALL product images
    console.log(`🔍 Starting Vision AI analysis for ${images.length} images...`);
    const imageAnalyses: Array<{ 
      imageUrl: string; 
      description: string; 
      index: number;
      visualAttributes?: any;
      visualContext?: any;
    }> = [];
    
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
            visualAttributes: visionData.visualAttributes,
            visualContext: visionData.visualContext,
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
      console.log('💾 Saving Vision AI data to database...');
      
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
            ...analysis.visualAttributes.materials
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
        .from('shopify_products')
        .update({
          vision_attributes: mergedVisionAttributes.visualAttributes || null,
          vision_timestamp: new Date().toISOString(),
          vision_model: 'google/gemini-2.5-flash',
        })
        .eq('id', product_id);

      if (visionUpdateError) {
        console.error('❌ Failed to save vision data:', visionUpdateError);
      } else {
        console.log('✅ Vision data saved to database');
      }
    }
    
    // Build comprehensive visual analysis summary
    let visualAnalysis = "";
    if (imageAnalyses.length > 0) {
      visualAnalysis = detectedLanguage === "en" 
        ? "\n🖼️ IMAGE ANALYSIS (Gemini Vision AI):\n\n"
        : "\n🖼️ ANALYSE DES IMAGES (Gemini Vision AI):\n\n";
      
      imageAnalyses.forEach((analysis) => {
        const imageLabel = detectedLanguage === "en" 
          ? `Image ${analysis.index}${analysis.index === 1 ? " (main)" : ""}`
          : `Photo ${analysis.index}${analysis.index === 1 ? " (principale)" : ""}`;
        visualAnalysis += `${imageLabel}:\n${analysis.description}\n\n`;
      });
    } else {
      console.log("⏭️ No images analyzed by Vision AI");
    }

    // --- Filter dimension images from gallery ---
    console.log("🖼️ Filtering images for gallery...");
    const technicalSchemaImageUrls = imageAnalyses
      .filter(a => a.visualContext?.hasTechnicalSchema)
      .map(a => a.imageUrl);
    
    console.log(`📐 Found ${technicalSchemaImageUrls.length} technical schema images to exclude from gallery`);
    
    const galleryImages = images.filter(img => 
      !technicalSchemaImageUrls.includes(img.src)
    );
    
    const dimensionImages = images.filter(img =>
      technicalSchemaImageUrls.includes(img.src)
    );
    
    console.log(`🎨 Gallery will use ${galleryImages.length} lifestyle images`);
    console.log(`📏 Dimension section will use ${dimensionImages.length} technical images`);
    
    // --- Prompt bilingual ---
    const imgs = galleryImages.length
      ? galleryImages.map((i) => `- ${i.src}`).join("\n")
      : detectedLanguage === "en"
        ? "No additional image"
        : "Aucune image supplémentaire";
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

    // Select design style (default to modern if not provided)
    const validDesignStyles = ['minimalist', 'modern', 'premium'];
    const selectedDesignStyle = (validDesignStyles.includes(designStyle) ? designStyle : 'modern') as 'minimalist' | 'modern' | 'premium';
    const selectedStyle = styleTemplates[selectedDesignStyle];
    const selectedIcon = iconTemplates[selectedDesignStyle];

    console.log(`[Landing AI] Design style: ${selectedStyle.name} (received: ${designStyle})`);

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
${serpInsights ? `
🎯 COMPETITOR LANDING PAGE ANALYSIS (USE THIS TO STRUCTURE YOUR PAGE):

📋 Common Sections Found in Top Results:
${serpInsights.commonSections?.map((s: string) => `- ${s}`).join('\n') || '- Hero section\n- Product benefits\n- FAQ'}

💬 Effective CTA Patterns:
${serpInsights.ctaPatterns?.map((p: string) => `- ${p}`).join('\n') || '- Buy now\n- Learn more'}

🏗️ Structural Elements to Include:
${serpInsights.structuralElements?.map((e: string) => `- ${e}`).join('\n') || '- Clear headline\n- Visual imagery\n- Trust signals'}

📊 Content Density: ${serpInsights.contentDensity || 'medium'}

💡 RECOMMENDATION: Structure your landing page using these proven patterns while maintaining uniqueness.
` : ""}

IMAGES:
${imgs}
VARIANTS:
${vars}
${customHighlights ? `HIGHLIGHTS:\n${customHighlights}` : ""}

COLOR PALETTE (HSL FORMAT ONLY):
- Primary: hsl(${designTokens.primary})
- Secondary: hsl(${designTokens.secondary})
- Accent: hsl(${designTokens.accent})
- Background: hsl(${designTokens.background})
- Text: hsl(${designTokens.text})

🚨 CRITICAL COLOR RULES (MANDATORY):
1. NEVER USE HEX COLORS (#FFFFFF, #000000, etc.) - FORBIDDEN
2. ALWAYS use inline HSL styles for hero, sections, and CTAs
3. Examples:
   - Hero: <div style="background-color: hsl(${designTokens.primary}); color: hsl(${designTokens.ctaText})">
   - Section: <section style="background-color: hsl(${designTokens.surface})">
   - CTA button: <button style="background-color: hsl(${designTokens.accent}); color: hsl(${designTokens.ctaText})">

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

${enrichedProduct?.serp_verified ? `
✅ Badge for SERP-verified specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  <span>Spécifications vérifiées</span>
</div>
<p class="text-xs text-gray-600 mb-6">Dimensions confirmées par ${enrichedProduct?.serp_data?.similarProducts?.length || 0} produits similaires</p>
` : enrichedProduct?.vision_attributes?.technicalDimensions ? `
📐 Badge for image-extracted specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
  <span>Mesures extraites du schéma technique</span>
</div>
<p class="text-xs text-gray-600 mb-6">Dimensions précises lues directement sur l'image produit</p>
` : `
⚠️ Badge for estimated specs:
<div class="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-800 mb-4">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
  <span>Dimensions approximatives</span>
</div>
<p class="text-xs text-gray-600 mb-6">Ces mesures sont estimées et peuvent varier légèrement</p>
`}

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
- NO "Dimensions" section - dimensions will be added automatically after generation
- NO physical dimensions (height, width, depth, length, diameter) in the Technical Specifications section - DO NOT include any numeric measurements or dimension tables/rows
- In Technical Specifications, focus ONLY on materials, finishes, features, care instructions - NEVER include size measurements
- The image gallery section MUST ONLY include lifestyle/product photos - DO NOT include technical diagrams, dimension schema images, or measurement illustrations (they will be added in a separate dimensions section)

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
${serpInsights ? `
🎯 ANALYSE DES CONCURRENTS (UTILISE CECI POUR STRUCTURER TA PAGE) :

📋 Sections Communes Trouvées dans les Meilleurs Résultats :
${serpInsights.commonSections?.map((s: string) => `- ${s}`).join('\n') || '- Section héro\n- Avantages produit\n- FAQ'}

💬 Modèles de CTA Efficaces :
${serpInsights.ctaPatterns?.map((p: string) => `- ${p}`).join('\n') || '- Acheter maintenant\n- En savoir plus'}

🏗️ Éléments Structurels à Inclure :
${serpInsights.structuralElements?.map((e: string) => `- ${e}`).join('\n') || '- Titre clair\n- Imagerie visuelle\n- Signaux de confiance'}

📊 Densité du Contenu : ${serpInsights.contentDensity || 'moyenne'}

💡 RECOMMANDATION : Structure ta landing page en utilisant ces modèles éprouvés tout en maintenant l'unicité.
` : ""}

IMAGES :
${imgs}
VARIANTES :
${vars}
${customHighlights ? `POINTS FORTS :\n${customHighlights}` : ""}

PALETTE DE COULEURS (FORMAT HSL UNIQUEMENT) :
- Primaire : hsl(${designTokens.primary})
- Secondaire : hsl(${designTokens.secondary})
- Accent : hsl(${designTokens.accent})
- Fond : hsl(${designTokens.background})
- Texte : hsl(${designTokens.text})

🚨 RÈGLES COULEURS CRITIQUES (OBLIGATOIRE) :
1. JAMAIS de couleurs HEX (#FFFFFF, #000000, etc.) - INTERDIT
2. TOUJOURS utiliser styles inline HSL pour hero, sections et CTAs
3. Exemples :
   - Hero : <div style="background-color: hsl(${designTokens.primary}); color: hsl(${designTokens.ctaText})">
   - Section : <section style="background-color: hsl(${designTokens.surface})">
   - Bouton CTA : <button style="background-color: hsl(${designTokens.accent}); color: hsl(${designTokens.ctaText})">

🎨 MODÈLE DE DESIGN : ${selectedStyle.name}
${selectedStyle.description}
${selectedStyle.rules}

🚨 RÈGLES RESPONSIVES CRITIQUES (OBLIGATOIRE) :
- JAMAIS dupliquer les classes responsive (❌ class="md:text-xl md:text-2xl")
- Utiliser un seul breakpoint par propriété (✅ class="text-lg md:text-2xl")

🎯 TEMPLATE D'ICÔNE À UTILISER POUR LES LISTES :
${selectedIcon}
Utilise cette structure pour TOUTES les listes à puces. Adapte les ID des dégradés si icônes multiples (iconGrad1, iconGrad2, etc.)

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
- 🚨 TOUTES les images DOIVENT avoir l'attribut loading="lazy"
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
- AUCUNE section "Dimensions" - les dimensions seront ajoutées automatiquement après génération
- AUCUNE dimension physique (hauteur, largeur, profondeur, longueur, diamètre) dans la section Caractéristiques Techniques - NE PAS inclure de mesures chiffrées ou tableaux/lignes de dimensions
- Dans Caractéristiques Techniques, se concentrer UNIQUEMENT sur les matériaux, finitions, fonctionnalités, entretien - JAMAIS les mesures de taille
- La galerie d'images DOIT UNIQUEMENT inclure des photos lifestyle/produit - NE PAS inclure de schémas techniques, images de dimensions, ou illustrations de mesures (elles seront ajoutées dans une section dimensions séparée)

✅ SECTIONS REQUISES :
Hero avec galerie d'images, Points Forts (3-4 cartes), Caractéristiques Techniques (si données enrichies), Matériaux & Composition (si disponible), Galerie d'Images, Conseils d'Entretien, FAQ.

UTILISATION DES ICÔNES :
- Utiliser UNIQUEMENT des icônes SVG checkmark simples pour les listes à puces
- UNE SEULE icône par élément de liste
- Exemple : <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
- AUCUNE icône décorative ailleurs`;

    // --- AI call with Google Gemini Direct API (60s timeout) ---
    console.log("🤖 Starting AI generation with Google Gemini Direct API...");
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 60000);

    let aiResponse;
    try {
      const systemPrompt = detectedLanguage === "en"
        ? "You are a professional content writer for product landing pages. You create informative, engaging HTML content that describes products in detail. Focus on product features, specifications, and benefits. NEVER include purchase buttons, navigation menus, or call-to-action elements. When enriched product attributes are provided, you MUST create comprehensive Technical Specifications and Materials sections with all available data."
        : "Tu es un rédacteur professionnel de contenu pour des landing pages produit. Tu crées du contenu HTML informatif et engageant qui décrit les produits en détail. Concentre-toi sur les caractéristiques, spécifications et avantages du produit. N'inclus JAMAIS de boutons d'achat, menus de navigation ou éléments call-to-action. Quand des attributs produit enrichis sont fournis, tu DOIS créer des sections Caractéristiques Techniques et Matériaux complètes avec toutes les données disponibles.";

      aiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + GOOGLE_GEMINI_API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n" + prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16000,
            },
          }),
          signal: aiController.signal,
        }
      );
    } finally {
      clearTimeout(aiTimeout);
    }

    console.log("✅ AI generation completed");

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("❌ Google Gemini API error:", aiResponse.status, text);
      return new Response(JSON.stringify({ error: `Google Gemini API ${aiResponse.status}`, detail: text }), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    console.log("📦 Google Gemini response structure:", JSON.stringify(data, null, 2));
    
    // Extract content from Gemini response format
    let rawHtml = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    if (!rawHtml) {
      console.error("❌ No content in Gemini response");
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawHtml || rawHtml.length < 400)
      return new Response(
        JSON.stringify({ error: detectedLanguage === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    console.log("[AI] Raw HTML received, length:", rawHtml.length);

    // 🧹 Apply HTML normalization and sanitization
    let html = sanitizeGeneratedHTML(rawHtml, productTitle, detectedLanguage || "en");
    
    // 🧹 Remove any dimension-related content that Gemini might have added
    html = sanitizeDimensionsInHtml(html);

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

    // 📐 DETECT DIMENSION SCHEMA IMAGES WITH GEMINI VISION (MUST BE BEFORE dimensionsSection)
    console.log("📐 Starting Gemini Vision analysis for dimension schemas...");
    const detectedDimensionImages: Array<{ src: string; dimensions: any; confidence: string }> = [];
    const detectedRegularImages: Array<{ src: string; alt_text: string }> = [];
    
    if (images && images.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      for (const imageObj of images) {
        const imageUrl = imageObj.src;
        if (!imageUrl) continue;
        
        try {
          console.log(`🔍 Analyzing image for dimensions: ${imageUrl.substring(0, 60)}...`);
          
          // Fetch image and convert to base64
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.warn(`⚠️ Failed to fetch image: ${imageUrl}`);
            detectedRegularImages.push(imageObj);
            continue;
          }
          
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
          const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

          // Call Gemini Vision to detect dimension schemas
          const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyse cette image et détermine si elle contient un schéma technique avec des dimensions (mesures, cotes, lignes de dimension).

Si OUI, c'est une photo de dimensions, extrais TOUTES les dimensions visibles au format JSON structuré :
{
  "isDimensionSchema": true,
  "confidence": "high|medium|low",
  "dimensions": {
    "length": {"value": 120, "unit": "cm", "label": "Longueur"},
    "width": {"value": 80, "unit": "cm", "label": "Largeur"},
    "height": {"value": 45, "unit": "cm", "label": "Hauteur"},
    "diameter": {"value": 60, "unit": "cm", "label": "Diamètre"},
    "depth": {"value": 40, "unit": "cm", "label": "Profondeur"},
    "seatHeight": {"value": 46, "unit": "cm", "label": "Hauteur d'assise"},
    "armHeight": {"value": 65, "unit": "cm", "label": "Hauteur accoudoirs"}
  },
  "notes": "Description des mesures visibles sur le schéma"
}

Si NON, c'est une photo normale de produit :
{
  "isDimensionSchema": false,
  "confidence": "high",
  "reason": "Image lifestyle/produit sans mesures techniques"
}

IMPORTANT: Ne retourne QUE les dimensions réellement visibles sur le schéma. N'estime rien.`
                    },
                    {
                      type: "image_url",
                      image_url: { url: imageDataUrl }
                    }
                  ]
                }
              ],
              max_tokens: 1000
            })
          });

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const analysis = visionData.choices?.[0]?.message?.content;
            
            if (analysis) {
              console.log(`📊 Vision analysis result: ${analysis.substring(0, 200)}...`);
              
              // Parse JSON response
              const jsonMatch = analysis.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsedAnalysis = JSON.parse(jsonMatch[0]);
                
                if (parsedAnalysis.isDimensionSchema) {
                  console.log(`✅ Dimension schema detected with confidence: ${parsedAnalysis.confidence}`);
                  detectedDimensionImages.push({
                    src: imageUrl,
                    dimensions: parsedAnalysis.dimensions || {},
                    confidence: parsedAnalysis.confidence
                  });
                } else {
                  console.log(`📷 Regular product image (no dimensions)`);
                  detectedRegularImages.push(imageObj);
                }
              } else {
                console.warn(`⚠️ Could not parse vision response for: ${imageUrl}`);
                detectedRegularImages.push(imageObj);
              }
            }
          } else {
            console.warn(`⚠️ Vision API error for ${imageUrl}: ${visionResponse.status}`);
            detectedRegularImages.push(imageObj);
          }
        } catch (imageError) {
          console.error(`❌ Error analyzing image ${imageUrl}:`, imageError);
          detectedRegularImages.push(imageObj);
        }
      }
    }
    
    console.log(`📐 Dimension analysis complete: ${detectedDimensionImages.length} schema images, ${detectedRegularImages.length} regular images`);

    // 📐 Generate dedicated dimensions section if technical dimensions are available
    let dimensionsSection = "";
    
    // 1. Use NEW Gemini-detected dimension schema images (priority)
    // 2. Fallback to existing filtered technical images
    const finalDimensionImages = detectedDimensionImages.length > 0 
      ? detectedDimensionImages 
      : dimensionImages;
    
    const imagesWithDimensions = finalDimensionImages.length > 0 ? finalDimensionImages.slice(0, 2) : [];
    
    // Collect all detected dimensions from schemas
    let detectedDims: any = {};
    if (detectedDimensionImages.length > 0) {
      console.log("📐 Using dimensions from Gemini Vision schema detection");
      // Merge dimensions from all detected schema images
      detectedDimensionImages.forEach(img => {
        if (img.dimensions) {
          Object.assign(detectedDims, img.dimensions);
        }
      });
    }
    
    // Build dimension data from detected schemas OR existing analysis
    const dims = Object.keys(detectedDims).length > 0 
      ? detectedDims 
      : (imageAnalysis?.technicalDimensions || enrichedProduct?.vision_attributes?.technicalDimensions);
    
    if (dims) {
      const visualContext = enrichedProduct?.vision_attributes?.visualContext;
      const isFromSchema = detectedDimensionImages.length > 0;
      
      console.log("📐 Final Dimensions Data:", JSON.stringify(dims, null, 2));
      
      const dimensionLabels = detectedLanguage === "en" ? {
        title: "DIMENSIONS",
        subtitle: isFromSchema ? "From technical diagram" : (visualContext?.dimensionSource === "visible" ? "From technical diagram" : "Detected from analysis"),
        height: "H",
        width: "W", 
        depth: "D",
        length: "L",
        diameter: "Ø",
        seatHeight: "Seat H",
        armHeight: "Arm H"
      } : {
        title: "DIMENSIONS",
        subtitle: isFromSchema ? "Schéma technique" : (visualContext?.dimensionSource === "visible" ? "Schéma technique" : "Détectées par analyse"),
        height: "H",
        width: "l",
        depth: "P", 
        length: "L",
        diameter: "Ø",
        seatHeight: "H assise",
        armHeight: "H accoudoirs"
      };
      
      // Build compact dimension string using detected values
      const dimParts = [];
      
      // Handle both nested dimension objects and flat values
      const extractValue = (dim: any) => {
        if (typeof dim === 'object' && dim.value) {
          return `${dim.value} ${dim.unit || 'cm'}`;
        }
        return dim;
      };
      
      if (dims.height) dimParts.push(`${dimensionLabels.height} ${extractValue(dims.height)}`);
      if (dims.length) dimParts.push(`${dimensionLabels.length} ${extractValue(dims.length)}`);
      if (dims.depth) dimParts.push(`${dimensionLabels.depth} ${extractValue(dims.depth)}`);
      if (dims.width) dimParts.push(`${dimensionLabels.width} ${extractValue(dims.width)}`);
      if (dims.diameter) dimParts.push(`${dimensionLabels.diameter} ${extractValue(dims.diameter)}`);
      if (dims.seatHeight) dimParts.push(`${dimensionLabels.seatHeight} ${extractValue(dims.seatHeight)}`);
      if (dims.armHeight) dimParts.push(`${dimensionLabels.armHeight} ${extractValue(dims.armHeight)}`);
      
      if (dimParts.length > 0) {
        const dimensionText = dimParts.join(' × ');
        console.log("📏 Final dimension text:", dimensionText);
        
        // Build dimension characteristics for prompt injection
        const dimensionCharacteristics = dimParts.map(part => `- ${part}`).join('\n');
        
        dimensionsSection = `
    <!-- Dimensions Section - Discrete placement after Caractéristiques -->
    <section class="py-6" style="background-color: hsl(${designTokens.background})">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white/50 rounded-lg p-4 border border-gray-200">
          
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            
            ${imagesWithDimensions.length > 0 ? `
            <!-- Technical Schema Image(s) - Compact Gallery -->
            <div class="shrink-0 flex flex-col gap-2">
              ${imagesWithDimensions.map((img: any) => `
              <img src="${img.src || img.url}" 
                   alt="Schéma technique avec dimensions" 
                   class="w-24 sm:w-28 h-auto rounded-md border border-gray-300 shadow-sm"
                   loading="lazy" />
              `).join('')}
            </div>
            ` : ''}
            
            <!-- Dimension Text - Discrete -->
            <div class="flex-1">
              <h3 class="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">${dimensionLabels.title}</h3>
              <p class="text-base md:text-lg font-semibold mb-1" style="color: hsl(${designTokens.text})">${dimensionText}</p>
              <p class="text-xs text-gray-500">${dimensionLabels.subtitle}</p>
              ${isFromSchema && detectedDimensionImages.length > 0 && detectedDimensionImages[0].confidence ? `
              <p class="text-xs text-gray-400 mt-1">Confiance: ${detectedDimensionImages[0].confidence}</p>
              ` : ''}
            </div>
            
          </div>
        </div>
      </div>
    </section>`;
      }
    }
    
    // Insert dimensions section AFTER "Caractéristiques" / "Technical Specifications" section
    let finalHtml = html;
    if (dimensionsSection) {
      console.log("📐 Searching for Caractéristiques/Specifications section...");
      
      // Stronger regex to find the section containing characteristics keywords
      const caracteristiquesRegex = /<section[^>]*>[\s\S]*?(?:caract[ée]ristiques|technical\s+specifications|specifications?\s+techniques?)[\s\S]*?<\/section>/i;
      const match = html.match(caracteristiquesRegex);
      
      let insertAt = -1;
      if (match && match.index !== undefined) {
        // Insert right after the matched </section> tag
        insertAt = match.index + match[0].length;
        console.log(`📐 ✅ Found Caractéristiques section at position ${match.index}, inserting dimensions after it`);
      } else {
        console.log("📐 ⚠️ Caractéristiques section not found, using fallback placement");
      }
      
      // Fallback: insert before </body> as last resort (not after 2nd section)
      if (insertAt < 0) {
        const bodyEnd = html.lastIndexOf('</body>');
        if (bodyEnd > 0) {
          insertAt = bodyEnd;
          console.log("📐 Using fallback: inserting before </body>");
        }
      }
      
      if (insertAt > 0) {
        finalHtml = html.slice(0, insertAt) + dimensionsSection + html.slice(insertAt);
        console.log("✅ Dimensions section successfully inserted");
      }
    }

    // 🎯 OPTIMIZE PRODUCT TITLE WITH SMART-TITLE (GEMINI VISION + DEEPSEEK) BEFORE SAVING
    if (userId && product_id) {
      console.log("🎯 Optimizing product title with Smart Title (Vision AI + DeepSeek)...");
      try {
        const { data: titleData, error: titleError } = await supabaseAdmin.functions.invoke(
          "smart-title",
          {
            body: {
              productId: product_id,
              language: language || "fr"
            }
          }
        );

        if (titleError) {
          console.error("⚠️ Smart Title optimization failed:", titleError);
        } else if (titleData?.success) {
          console.log(`✅ Title optimized with Vision AI: "${titleData.originalTitle}" → "${titleData.optimizedTitle}"`);
          console.log(`📊 Vision Analysis: ${titleData.visionAnalysis || 'N/A'}`);
          console.log(`📝 DeepSeek Analysis:`, titleData.deepseekAnalysis);
        }
      } catch (titleOptError) {
        console.error("⚠️ Smart Title optimization error:", titleOptError);
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
