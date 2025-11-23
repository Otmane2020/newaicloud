import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeGeneratedHTML, validateHTML } from "../_shared/html-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polices luxueuses
const LUXURY_FONTS = {
  hero: ["Playfair Display:wght@400;700;900", "Cormorant Garamond:wght@300;400;600"],
  heading: ["Montserrat:wght@400;500;600;700", "Raleway:wght@300;400;600;700"],
  body: ["Inter:wght@300;400;500;600", "Source Sans Pro:wght@300;400;600"],
  accent: ["Cinzel:wght@400;600;700", "Libre Baskerville:wght@400;700"],
};

// ========== WCAG COLOR CONTRAST UTILITIES (from generate-landing-ai) ==========
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

// Generate WCAG-compliant design tokens with HSL values
function generateDesignTokens(colorScheme: any) {
  const primaryHex = colorScheme?.primary || "#1a1a1a";
  const secondaryHex = colorScheme?.secondary || "#4a4a4a";
  const backgroundHex = colorScheme?.background || "#FFFFFF";
  const surfaceHex = colorScheme?.surface || "#F8F8F8";
  const textHex = colorScheme?.text || "#1a1a1a";
  const textMutedHex = colorScheme?.textMuted || "#6b6b6b";

  // Validate primary color contrast with white
  const contrast = calculateContrast(primaryHex, "#FFFFFF");
  const needsDarkText = contrast < 4.5;
  const ctaTextHex = needsDarkText ? "#000000" : "#FFFFFF";

  // Ensure background is light enough and text is dark enough
  const validatedBackgroundHex = getLuminance(backgroundHex) > 0.5 ? backgroundHex : "#FFFFFF";
  const validatedTextHex = getLuminance(textHex) < 0.5 ? textHex : "#1a1a1a";

  // Create vibrant accent by increasing saturation
  const accentHex = adjustSaturation(primaryHex, 1.4);

  // Convert all colors to HSL format for CSS custom properties
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

// ---------------------------------------------------------
//  🔥 VISION AI - Analyse d'image intégrée
// ---------------------------------------------------------
async function analyzeImageWithVision(imageUrl: string, apiKey: string, productContext?: string): Promise<any> {
  try {
    console.log("🎨 Analyzing image with Lovable AI Vision...");
    
    // Convert image to base64
    let imageData = "";
    if (imageUrl.startsWith("data:image")) {
      imageData = imageUrl.split(",")[1];
    } else {
      imageData = await fetchImageAsBase64(imageUrl);
    }

    const prompt = `
Analyse cette image d'un produit ecommerce et retourne STRICTEMENT un JSON ENRICHI.

${productContext ? `Contexte produit: ${productContext}` : ""}

🔥 PHASE 3: EXTRACTION ENRICHIE - DÉTECTE UN MAXIMUM D'INFORMATIONS

JSON attendu (COMPLET):

{
  "visualAttributes": {
    "primaryColor": "string",
    "secondaryColors": ["string"],
    "materials": ["string"],
    "style": ["string"],
    "finish": "string",
    "texture": "string",
    "roomType": ["string"],
    "features": ["string"],
    "technicalDimensions": {
      "length": number | null,
      "length_unit": "string" | null,
      "width": number | null,
      "width_unit": "string" | null,
      "height": number | null,
      "height_unit": "string" | null,
      "diameter": number | null,
      "diameter_unit": "string" | null,
      "depth": number | null,
      "depth_unit": "string" | null,
      "weight": number | null,
      "weight_unit": "string" | null,
      "seat_height": number | null,
      "seat_height_unit": "string" | null,
      "armrest_height": number | null,
      "armrest_height_unit": "string" | null
    }
  },
  "functionalAttributes": {
    "mounting_required": boolean | null,
    "mounting_difficulty": "easy" | "medium" | "hard" | null,
    "storage_included": boolean | null,
    "lighting_type": "LED" | "Halogen" | "None" | null,
    "seating_capacity": number | null,
    "warranty_years": number | null,
    "adjustable_elements": ["string"] | null,
    "assembly_time_minutes": number | null
  },
  "visualContext": {
    "hasTechnicalSchema": boolean,
    "presentationQuality": number,
    "craftmanshipLevel": "standard" | "premium" | "luxury",
    "lightingType": "string",
    "backgroundStyle": "string"
  },
  "confidence": number
}

⚠️ IMPORTANT: Extrais TOUTES les informations visibles sur l'image, même si elles sont partielles.
Retourne uniquement du JSON valide.
`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash", // ✅ Faster model for vision
            messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageData}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Lovable Vision Error:", res.status, errorText);

      // Check for region restriction
      let isRegionRestricted = false;
      try {
        const parsedError = JSON.parse(errorText);
        const raw = parsedError?.error?.metadata?.raw;
        if (typeof raw === "string" && raw.includes("Image generation is not available in your country")) {
          isRegionRestricted = true;
        }
      } catch {
        // Ignore JSON parsing issues
      }

      if (isRegionRestricted) {
        console.warn("⚠️ Image analysis not available in your region - continuing without visual analysis");
        return null;
      }

      throw new Error(`VISION_FAILED_${res.status}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content || null;
    if (!raw) {
      console.warn("⚠️ No analysis returned from Lovable Vision");
      return null;
    }

    // Clean and parse JSON
    const cleanedJSON = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanedJSON);
      console.log("✅ Vision analysis successful");
      return parsed;
    } catch (err) {
      console.error("❌ Invalid JSON from Lovable Vision:", raw);
      return null;
    }
  } catch (err: any) {
    console.warn("⚠️ Vision analysis failed:", err.message);
    return null;
  }
}

// Helper to build Vision AI summary (separated from buildEnrichedProductSummary)
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

// Helper to build enriched product summary (separated for better organization)
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
  let weightSource: string | null = null;

  // Detect if we have any smart_* dimensions available
  const hasSmartDims =
    enriched.smart_length ||
    enriched.smart_width ||
    enriched.smart_height ||
    enriched.smart_diameter ||
    enriched.smart_depth ||
    enriched.smart_seat_height;

  if (techDims && Object.keys(techDims).length > 0) {
    // Use dimensions extracted from technical schematic (VISION FIRST)
    if (techDims.hauteur_totale) dims.push(`H ${techDims.hauteur_totale}`);
    if (techDims.height) dims.push(`H ${techDims.height}`);
    if (techDims.largeur) dims.push(`L ${techDims.largeur}`);
    if (techDims.length) dims.push(`L ${techDims.length}`);
    if (techDims.profondeur) dims.push(`P ${techDims.profondeur}`);
    if (techDims.width) dims.push(`l ${techDims.width}`);
    if (techDims.hauteur_assise) dims.push(`Hauteur d'assise ${techDims.hauteur_assise}`);
    if (techDims.diametre) dims.push(`Ø ${techDims.diametre}`);

    if (techDims.weight) {
      dims.push(`Poids ${techDims.weight}`);
      weightSource = "vision";
    }

    if (dims.length > 0) {
      sections.push(language === "en" ? "\nDIMENSIONS (visible on image):" : "\nDIMENSIONS (visibles sur image):");
      sections.push(`- ${dims.join(" × ")}`);
    }
  } else if (hasSmartDims) {
    // Fallback to estimated smart dimensions (SECOND PRIORITY)
    if (enriched.smart_length) dims.push(`L ~${enriched.smart_length}${enriched.smart_length_unit || ""}`);
    if (enriched.smart_width) dims.push(`l ~${enriched.smart_width}${enriched.smart_width_unit || ""}`);
    if (enriched.smart_height) dims.push(`H ~${enriched.smart_height}${enriched.smart_height_unit || ""}`);

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
  if (!text || text.length < 10) return "fr";

  const cleanText = text.toLowerCase().trim();

  const frenchWords = ["le", "la", "les", "un", "une", "des", "de", "du", "et", "avec", "pour", "dans", "sur"];
  const frenchCount = frenchWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  const englishWords = ["the", "and", "for", "with", "this", "that", "from", "our", "your"];
  const englishCount = englishWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  const spanishWords = ["el", "la", "los", "las", "un", "una", "con", "para", "que", "en"];
  const spanishCount = spanishWords.filter((w) => cleanText.includes(` ${w} `) || cleanText.startsWith(`${w} `)).length;

  const counts = { fr: frenchCount, en: englishCount, es: spanishCount };
  const maxLang = Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  console.log(`🌍 Language detection: FR=${frenchCount}, EN=${englishCount}, ES=${spanishCount} → ${maxLang}`);

  return maxLang;
}

serve(async (req) => {
  console.log('[DEEPSEEK] ===== FUNCTION INVOKED =====', {
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    console.log('[DEEPSEEK] Request body parsed', {
      productId: body?.productId,
      hasStyle: !!body?.style,
      hasLayout: !!body?.layout,
      language: body?.language,
      generationMode: body?.generationMode
    });

    const {
      productId,
      style = "modern",
      layout = "single-column",
      colorScheme,
      contentLength = "medium",
      customHighlights = "",
      generationMode = "premium", // "fast" | "premium"
      theme = "light", // "light" | "dark"
    } = body;

    console.log(`🚀 Generating landing page for product ${productId}`);

    // DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ✅ SPRINT 1 - PHASE 2: Optimized DB - Single query with JOIN
    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("*, shopify_connections!inner(store_language)")
      .eq("id", productId)
      .single();

    // ✅ Detect language from store
    const storeLanguage = (product as any)?.shopify_connections?.store_language || "en-US";
    const language = storeLanguage.split("-")[0]; // Extract 'fr' from 'fr-FR', 'en' from 'en-US', etc.
    console.log(`🌍 Store language detected: ${storeLanguage} → Using: ${language}`);

    if (productError || !product) {
      console.error('[DEEPSEEK] Product query error:', productError);
      throw new Error("Product not found");
    }

    // Fetch images and variants in parallel
    const [
      { data: imagesData },
      { data: variantsData }
    ] = await Promise.all([
      supabase
        .from("product_images")
        .select("id, src, alt_text, position")
        .eq("product_id", productId)
        .order("position", { ascending: true })
        .limit(3),
      supabase
        .from("product_variants")
        .select("id, title, price, option1, option2, option3")
        .eq("product_id", productId)
    ]);

    const images = imagesData || [];
    const variants = variantsData || [];
    let enrichedProduct = product;

    console.log(`✅ DB query optimized: loaded product + ${images.length} images + ${variants.length} variants in 1 query`);

    // ✅ Extract structured info from description using DeepSeek
    let extractedInfo = null;
    if (product.body_html && DEEPSEEK_API_KEY) {
      try {
        console.log('[DEEPSEEK] Extracting structured info from description...');
        const extractionPrompt = `Extract all technical specifications, materials, dimensions, colors, and features from this product description. Return ONLY a JSON object with keys: materials, colors, dimensions, weight, features, mounting_options, lighting, technical_specs.

Description:
${product.body_html.replace(/<[^>]*>/g, ' ').substring(0, 2000)}`;

        const extractionResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: extractionPrompt }],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json();
          const content = extractionData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedInfo = JSON.parse(jsonMatch[0]);
            console.log('[DEEPSEEK] Extracted info:', extractedInfo);
          }
        }
      } catch (err) {
        console.error('[DEEPSEEK] Extraction error:', err);
      }
    }

    // ✅ SPRINT 1 - PHASE 3: Extended cache to 7 days (was 24h)
    const needsVisionAnalysis = !product.vision_analyzed || 
                                (product.last_optimization_at &&
                                 (Date.now() - new Date(product.last_optimization_at).getTime()) > 7 * 24 * 60 * 60 * 1000);

    // ✅ SPRINT 2 - PHASE 1: Parallelize Vision AI analysis + Use gemini-2.5-flash
    let visionAnalysisResult: any = null;
    if (needsVisionAnalysis && images?.length && LOVABLE_API_KEY) {
      console.log("🎨 Starting PARALLEL vision analysis with gemini-2.5-flash...");
      
      // Analyze up to 2 images in parallel for faster processing
      const imagesToAnalyze = images.slice(0, 2);
      const analysisPromises = imagesToAnalyze.map((img: any) => 
        analyzeImageWithVision(img.src, LOVABLE_API_KEY, `${product.title} ${product.vendor || ""}`)
      );

      const results = await Promise.all(analysisPromises);
      visionAnalysisResult = results[0]; // Use first result as primary
      
      console.log(`✅ Analyzed ${results.length} images in parallel`);

      // ✅ SPRINT 1 - PHASE 6: Background task for DB save
      if (visionAnalysisResult?.visualAttributes) {
        console.log("💾 Scheduling vision save to background...");
        
        const saveVisionTask = async () => {
          try {
            await supabase
              .from("shopify_products")
              .update({
                vision_attributes: visionAnalysisResult.visualAttributes,
                vision_analyzed: true,
                vision_confidence: visionAnalysisResult.confidence || 1,
              })
              .eq("id", productId);
            console.log("✅ Vision analysis saved to database (background)");
          } catch (err) {
            console.warn("⚠️ Background vision save failed:", err);
          }
        };

        // Run in background without blocking (Deno Deploy supports this pattern)
        saveVisionTask().catch(console.error);

        // Update enrichedProduct immediately for this request
        enrichedProduct = {
          ...enrichedProduct,
          vision_attributes: visionAnalysisResult.visualAttributes,
          vision_analyzed: true,
          vision_confidence: visionAnalysisResult.confidence || 1,
        };
      }
    } else {
      console.log("⏭️ Skipping vision analysis - recently done or no images");
    }

    // ✅ SPRINT 2 - PHASE 1: Parallel visual descriptions with gemini-2.5-flash
    let visualAnalysis = "";
    if (images?.length && LOVABLE_API_KEY && !visionAnalysisResult) {
      const imagesToAnalyze = Math.min(2, images.length);
      console.log(`🖼️ Generating quick visual descriptions for ${imagesToAnalyze} images in PARALLEL`);

      const descriptionPromises = images.slice(0, imagesToAnalyze).map(async (img: any) => {
        try {
          const imgBase64 = img.src.includes("base64")
            ? img.src.split(",")[1]
            : await fetchImageAsBase64(img.src);

          const visionRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash", // ✅ Fast model
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: language === "fr"
                        ? "Analyse brève: matériaux, couleurs, style (50 mots max)"
                        : "Brief analysis: materials, colors, style (50 words max)"
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:image/jpeg;base64,${imgBase64}` },
                    },
                  ],
                },
              ],
              temperature: 0.3,
              max_tokens: 150, // ✅ Limit tokens for faster response
            }),
          });

          if (!visionRes.ok) return null;

          const visionJson = await visionRes.json();
          const text = visionJson?.choices?.[0]?.message?.content || "";
          return text ? `Image ${img.position}: ${text}` : null;
        } catch (error) {
          console.warn(`⚠️ Vision failed for image ${img.position}`);
          return null;
        }
      });

      const results = await Promise.all(descriptionPromises);
      visualAnalysis = results.filter(Boolean).join("\n\n");
      console.log(`✅ Visual analysis complete in parallel: ${visualAnalysis.length} chars`);
    }

    // Detect dimension schema image
    const dimensionImage = images?.find((img: any) => 
      img.alt_text?.toLowerCase().includes('dimension') ||
      img.alt_text?.toLowerCase().includes('schéma') ||
      img.alt_text?.toLowerCase().includes('mesure') ||
      img.alt_text?.toLowerCase().includes('plan') ||
      img.src?.toLowerCase().includes('dimension')
    );

    // ✅ Variants already loaded in optimized query above (no need for separate query)

    const variantsInfo =
      variants && variants.length > 1
        ? `\n\n📦 VARIANTES:\n${variants
            .map((v: any, i: number) => `${i + 1}. ${v.title} — ${v.price}€`)
            .join("\n")}`
        : "";

    // DESIGN TOKENS + FONTS - Enhanced with WCAG compliance
    const designTokens = generateDesignTokens(colorScheme || { 
      primary: "#1a1a1a",
      secondary: "#4a4a4a",
      background: "#FFFFFF",
      surface: "#F8F8F8",
      text: "#1a1a1a",
      textMuted: "#6b6b6b"
    });
    
    console.log("🎨 Design tokens generated:", {
      contrastRatio: designTokens.contrastRatio.toFixed(2),
      wcagCompliant: designTokens.contrastRatio >= 4.5
    });
    
    const fonts = selectLuxuryFonts(style);

    // Build enriched summary using separated function
    const enrichedSummary = buildEnrichedProductSummary(enrichedProduct, language);
    if (enrichedSummary) {
      console.log("📊 Using enriched attributes in landing page generation");
    }

    // Product Data - Enriched & Structured
    const productData = {
      title: product.title,
      description: product.body_html || product.seo_description || "",
      excerpt: product.body_html?.substring(0, 200) || "",
      vendor: product.vendor,
      
      // Dimensions structurées avec priorité Vision > Smart
      dimensions: {
        vision: enrichedProduct.vision_attributes?.technicalDimensions || {},
        smart: {
          length: enrichedProduct.smart_length,
          width: enrichedProduct.smart_width,
          height: enrichedProduct.smart_height,
          depth: enrichedProduct.smart_depth,
          weight: enrichedProduct.smart_weight,
          seat_height: enrichedProduct.smart_seat_height,
        },
        summary: {
          length: enrichedProduct.vision_attributes?.technicalDimensions?.length || enrichedProduct.smart_length,
          width: enrichedProduct.vision_attributes?.technicalDimensions?.width || enrichedProduct.smart_width,
          height: enrichedProduct.vision_attributes?.technicalDimensions?.height || enrichedProduct.smart_height,
          depth: enrichedProduct.vision_attributes?.technicalDimensions?.depth || enrichedProduct.smart_depth,
          weight: enrichedProduct.vision_attributes?.technicalDimensions?.weight || enrichedProduct.smart_weight,
        }
      },
      
      // Matériaux et finitions
      materials: enrichedProduct.vision_attributes?.materials || [],
      colors: enrichedProduct.vision_attributes?.colors || [],
      styleDetected: enrichedProduct.vision_attributes?.style || [],
      
      // Caractéristiques et fonctionnalités
      features: enrichedProduct.vision_attributes?.features || [],
      characteristics: enrichedProduct.characteristics || [],
      room_type: enrichedProduct.vision_attributes?.roomType || [],
      
      // Analyses visuelles
      visualAnalysis,
      enrichedSummary,
      
      // Variants & Options
      variants: variantsInfo,
      hasVariants: (variants?.length || 0) > 1,
      
      // Custom highlights
      customHighlights,
      
      // Images avec dimension schema détectée
      images: images || [],
      dimensionImageUrl: dimensionImage?.src || null,
    };

    // ✅ CACHE DÉSACTIVÉ: Toujours générer une nouvelle landing page
    // (Pour activer le cache, décommentez le bloc ci-dessous)
    /*
    if (product.landing_page_html && product.last_landing_generation_at) {
      const lastGen = new Date(product.last_landing_generation_at);
      const daysSince = (Date.now() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSince < 0.5) { // Cache de 12h seulement
        console.log(`✅ Using cached landing page from ${daysSince.toFixed(1)} days ago`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            html: product.landing_page_html,
            cached: true,
            cacheAge: `${daysSince.toFixed(1)} days`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    */
    console.log('🔄 Generating fresh landing page (cache disabled)');

    // BUILD PROMPT WITH ENHANCED INSTRUCTIONS
    const prompt = buildDeepSeekPrompt(productData, {
      style,
      layout,
      designTokens,
      fonts,
      contentLength,
      language,
      images,
      enrichedProduct,
      extractedInfo,
      theme,
    });

    const promptSizeKB = (new Blob([prompt]).size / 1024).toFixed(2);
    console.log(`🤖 DeepSeek generating HTML (exclusive mode)...`);
    console.log(`📏 Prompt: ${prompt.length} chars (${promptSizeKB} KB)`);

    let deepseekResponse;
    try {
      // 🔥 PHASE 1: DEEPSEEK EXCLUSIF - Plus de Gemini
      console.log("🤖 Using DeepSeek EXCLUSIVELY (no Gemini)");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: (() => {
          const maxTokens = contentLength === "short" ? 2000 : 4000; // Safe range within [1, 8192]
          console.log(`[DEEPSEEK] Using max_tokens=${maxTokens} for contentLength=${contentLength}`);
          return JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens,
          });
        })(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!deepseekResponse.ok) {
        const errorBody = await deepseekResponse.text();
        console.error("❌ DeepSeek API error:", deepseekResponse.status, errorBody);
        
        if (deepseekResponse.status === 429) {
          throw new Error("RATE_LIMIT: DeepSeek API rate limit exceeded. Please try again later.");
        } else if (deepseekResponse.status === 402) {
          throw new Error("PAYMENT_REQUIRED: DeepSeek API credits exhausted. Please add credits.");
        } else if (deepseekResponse.status === 413) {
          throw new Error("PAYLOAD_TOO_LARGE: Prompt exceeds DeepSeek limits. Try reducing product data.");
        }
        
        throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorBody}`);
      }
    } catch (error) {
      console.error("❌ DeepSeek API fetch error:", error);
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new Error("TIMEOUT: La génération a pris plus de 3 minutes. Veuillez réessayer avec moins d'images ou un contenu plus court.");
      }
      throw new Error(`DeepSeek API fetch failed: ${err.message}`);
    }

    const deepseekJson = await deepseekResponse.json();
    let rawHtml = deepseekJson.choices[0].message.content;

    console.log("🔍 HTML preview (début):", rawHtml.slice(0, 500));

    // Validate HTML structure before cleaning
    const hasHtmlStructure = rawHtml.includes("<html") || rawHtml.includes("<body") || rawHtml.includes("<div");
    if (!hasHtmlStructure) {
      console.error("❌ DeepSeek did not return valid HTML. Raw content:", rawHtml.slice(0, 1000));
      throw new Error("Le modèle n'a pas renvoyé de HTML valide. Veuillez réessayer.");
    }

    // 🧹 Apply robust HTML normalization and sanitization (from generate-landing-ai)
    const html = sanitizeGeneratedHTML(rawHtml, product.title, language || "en");
    
    // 📊 Validate final HTML
    const validation = validateHTML(html);
    if (!validation.valid) {
      console.warn("[Validation] Issues detected:", validation.issues);
    }
    
    console.log("[Validation] HTML structure:", {
      hasDoctype: html.includes("<!DOCTYPE html>"),
      hasHtml: html.includes("<html"),
      hasClosingBody: html.includes("</body>"),
      hasClosingHtml: html.includes("</html>"),
      length: html.length,
    });
    
    const htmlSizeKB = (html.length / 1024).toFixed(2);
    console.log(`📏 Generated HTML: ${htmlSizeKB} KB`);

    console.log("✅ HTML generated and sanitized successfully");

    // Update product with generated HTML
    // Extract optimized title from generated HTML
    let optimizedTitle = product.title;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      optimizedTitle = titleMatch[1]
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 255); // Shopify title limit
      console.log('[DEEPSEEK] Extracted optimized title:', optimizedTitle);
    }

    console.log('[DEEPSEEK] Updating product in database...', { 
      productId, 
      htmlLength: html.length,
      optimizedTitle 
    });

    const { error: updateError } = await supabase
      .from("shopify_products")
      .update({
        landing_page_html: html,
        last_landing_generation_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error('[DEEPSEEK] ❌ Database update failed:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      console.warn('[DEEPSEEK] ⚠️ Continuing despite DB update error - HTML will still be returned');
    } else {
      console.log('[DEEPSEEK] ✅ Database updated successfully');
    }

    console.log('[DEEPSEEK] ===== GENERATION SUCCESS =====', {
      htmlLength: html.length,
      optimizedTitle,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        optimizedTitle, // ✅ Return optimized title for potential Shopify sync
        productData: {
          title: product.title,
          hasVariants: (variants?.length || 0) > 1,
          imagesAnalyzed: images?.length || 0,
          enrichmentComplete: true,
        }
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('[DEEPSEEK] ===== FATAL ERROR =====', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    let statusCode = 500;
    let errorMessage = error.message || "Failed to generate landing page";
    
    if (errorMessage.includes("RATE_LIMIT")) {
      statusCode = 429;
    } else if (errorMessage.includes("PAYMENT_REQUIRED")) {
      statusCode = 402;
    } else if (errorMessage.includes("PAYLOAD_TOO_LARGE")) {
      statusCode = 413;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.stack || "No additional details",
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/* 🔥 ENHANCED PROMPT BUILDER - PREMIUM SHOPIFY TYPE WITH ICON TEMPLATES */
function buildDeepSeekPrompt(productData: any, config: any): string {
  const { 
    style, 
    layout, 
    designTokens, 
    fonts, 
    contentLength, 
    language, 
    images,
    enrichedProduct,
    extractedInfo,
    theme = 'light'
  } = config;

  const fontLinks = Object.values(fonts)
    .flat()
    .map(
      (f: any) =>
        `<link href="https://fonts.googleapis.com/css2?family=${f}&display=swap" rel="stylesheet">`
    )
    .join("\n");

  // ✅ SPRINT 2 - PHASE 5: Content guidelines based on length
  const contentGuidelines = contentLength === "short" 
    ? `
📝 MODE CONCIS (TOUTES LES SECTIONS OBLIGATOIRES):
⚠️ CRITIQUE: Toutes les sections doivent être présentes, mais avec des descriptions COURTES et PERCUTANTES

- ✅ Hero Section: Titre percutant + sous-titre court (1-2 lignes max)
- ✅ Highlights Section: 4 engagements avec descriptions COURTES (2-3 lignes max par card)
- ✅ Points Forts Section: 6 points avec descriptions CONCISES (3-4 lignes max par point)
- ✅ Galerie Images: ${images?.length || 3} images avec alt texts courts mais descriptifs
- ✅ Specs Techniques: Tableau complet mais sans descriptions longues
- ✅ Description Produit: 2-3 paragraphes courts et impactants
- ✅ CTA Final: Bouton d'action avec texte court

⚠️ DENSITÉ: Descriptions courtes et percutantes, pas de répétitions, style direct
⚠️ LONGUEUR TOTALE: Environ 500-800 mots mais TOUTES LES SECTIONS PRÉSENTES
`
    : `
📝 MODE DÉTAILLÉ (SECTIONS ÉTOFFÉES):
⚠️ CRITIQUE: Toutes les sections doivent être présentes avec des descriptions RICHES et DÉTAILLÉES

- ✅ Hero Section: Titre + sous-titre développé (2-4 lignes) + arguments de vente
- ✅ Highlights Section: 4 engagements avec descriptions DÉTAILLÉES (5-7 lignes par card, exemples concrets)
- ✅ Points Forts Section: 6-9 points avec descriptions ÉTOFFÉES et EXEMPLES (6-10 lignes par point, storytelling)
- ✅ Galerie Images: ${images?.length || 5} images avec alt texts riches et contextuels
- ✅ Specs Techniques: Tableau complet avec descriptions et explications détaillées
- ✅ Description Produit: 4-6 paragraphes riches avec exemples d'utilisation et bénéfices
- ✅ Section Bénéfices Additionnels: Points supplémentaires avec cas d'usage
- ✅ CTA Final: Bouton d'action avec arguments de réassurance détaillés

⚠️ DENSITÉ: Descriptions riches, exemples concrets, storytelling, arguments de vente développés
⚠️ LONGUEUR TOTALE: Environ 1500-2500 mots avec toutes les sections complètes et détaillées
`;

  const wordCount =
    contentLength === "short"
      ? "500-800"
      : "1500-2500";

  const heroFont = fonts.hero[0]?.split(':')[0].replace(/\+/g, ' ') || 'Playfair Display';
  const headingFont = fonts.heading[0]?.split(':')[0].replace(/\+/g, ' ') || 'Montserrat';
  const bodyFont = fonts.body[0]?.split(':')[0].replace(/\+/g, ' ') || 'Inter';
  const accentFont = fonts.accent[0]?.split(':')[0].replace(/\+/g, ' ') || 'Cinzel';

  // Design style templates - DISTINCT VISUAL IDENTITIES (from generate-landing-ai)
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

  // Icon templates by style - CLEARLY DIFFERENTIATED (from generate-landing-ai)
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
        <stop offset="100%" style="stop-color:hsl(${designTokens.secondary});stop-opacity:1" />
      </linearGradient>
      <filter id="premiumGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="28" cy="28" r="24" fill="url(#premiumCheckGrad)" opacity="0.2" filter="url(#premiumGlow)"/>
    <circle cx="28" cy="28" r="20" fill="none" stroke="url(#premiumCheckGrad)" stroke-width="2" opacity="0.3"/>
    <path d="M16 28 L24 36 L40 20" stroke="hsl(${designTokens.primary})" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#premiumGlow)"/>
  </svg>`,
  };

  const selectedStyleTemplate = styleTemplates[style as keyof typeof styleTemplates] || styleTemplates.modern;
  const selectedIcon = iconTemplates[style as keyof typeof iconTemplates] || iconTemplates.modern;

  // ❌ SUPPRIMÉ : Les badges de fiabilité des dimensions ne sont plus affichés
  const reliabilityBadge = "";

  // ✅ SPRINT 2 - PHASE 4: Optimized prompt (reduced by ~40%)
  return language === "fr" ? `
Tu es expert en landing pages Shopify. Crée un HTML5 complet et professionnel.

${contentGuidelines}

PRODUIT: ${productData.title} | ${productData.vendor}
${productData.description?.substring(0, 300) || ""}

${extractedInfo ? `
🔧 SPECS TECHNIQUES EXTRAITES (À INTÉGRER DANS LA SECTION SPECS):
- Matériaux: ${extractedInfo.materials || ''}
- Coloris: ${extractedInfo.colors || ''}
- Dimensions: ${extractedInfo.dimensions || ''}
- Poids: ${extractedInfo.weight || ''}
- Caractéristiques: ${JSON.stringify(extractedInfo.features || []).substring(0, 200)}
- Montage: ${extractedInfo.mounting_options || ''}
- Éclairage: ${extractedInfo.lighting || ''}

⚠️ CRITIQUE: Dans le tableau HTML des specs techniques:
   - ❌ NE JAMAIS afficher de ligne avec une valeur vide ou "Non communiqué"
   - ✅ SUPPRIME COMPLÈTEMENT la ligne <tr> si la valeur est vide
   - ✅ Affiche UNIQUEMENT les specs qui ont une vraie valeur
   
   EXEMPLE CORRECT (masquer lignes vides):
   ${extractedInfo.materials ? '<tr><td>Matériaux</td><td>' + extractedInfo.materials + '</td></tr>' : '<!-- Matériaux vide, ligne supprimée -->'}
   ${extractedInfo.weight ? '<tr><td>Poids</td><td>' + extractedInfo.weight + '</td></tr>' : '<!-- Poids vide, ligne supprimée -->'}
` : ''}

${productData.enrichedSummary ? `ATTRIBUTS:\n${productData.enrichedSummary.substring(0, 500)}\n` : ""}
${productData.visualAnalysis ? `VISUEL:\n${productData.visualAnalysis.substring(0, 400)}\n` : ""}
${productData.customHighlights ? `POINTS FORTS PRIORITAIRES (UTILISE ces textes EXACTEMENT pour la section HIGHLIGHTS et POINTS FORTS):\n${productData.customHighlights}\n` : ""}

IMAGES (${Math.min(images?.length || 0, 2)} principales):
${images?.slice(0, 2).map((img: any, i: number) => `${i + 1}. ${img.src}`).join('\n')}

🎨 DÉFINITION CSS OBLIGATOIRE EN DÉBUT DE <style>:
------------------------------------------------------------------
⚠️ CRITIQUE: Ajoute STRICTEMENT ces CSS vars pour le toggle dark/light mode

:root {
  /* Mode Clair (par défaut) */
  --color-primary: ${designTokens.primary};
  --color-secondary: ${designTokens.secondary};
  --color-accent: ${designTokens.accent};
  --color-background: ${designTokens.background};
  --color-surface: ${designTokens.surface};
  --color-text: ${designTokens.text};
  --color-text-muted: ${designTokens.textMuted};
}

.dark {
  /* Mode Sombre - S'active quand la classe 'dark' est sur <body> */
  --color-primary: ${designTokens.primaryDark};
  --color-secondary: ${designTokens.secondaryDark};
  --color-accent: ${designTokens.accentDark};
  --color-background: ${designTokens.backgroundDark};
  --color-surface: ${designTokens.surfaceDark};
  --color-text: ${designTokens.textDark};
  --color-text-muted: ${designTokens.textMutedDark};
}

body {
  background-color: hsl(var(--color-background));
  color: hsl(var(--color-text));
  transition: background-color 0.3s ease, color 0.3s ease;
}

⚠️ ENSUITE TU UTILISES CES CSS VARS PARTOUT:

1. Primary: hsl(var(--color-primary))
   UTILISE POUR: Titres principaux, icônes importantes, bordures accent
   Exemple: style="color: hsl(var(--color-primary))"
   
2. Secondary: hsl(var(--color-secondary))
   UTILISE POUR: Boutons secondaires, backgrounds de sections alternées
   
3. Accent: hsl(var(--color-accent))
   UTILISE POUR: CTAs, hover states, highlights cards, bordures
   Exemple: style="border-color: hsl(var(--color-accent))"
   
4. Background: hsl(var(--color-background))
   UTILISE POUR: Fond principal des sections
   
5. Surface: hsl(var(--color-surface))
   UTILISE POUR: Cards, panneaux
   
6. Text: hsl(var(--color-text))
   UTILISE POUR: Texte principal, descriptions
   
7. Text-Muted: hsl(var(--color-text-muted))
   UTILISE POUR: Texte secondaire, sous-titres
   Exemple: style="color: hsl(var(--color-text-muted))"

🚫 INTERDICTIONS STRICTES:
- NE JAMAIS utiliser de HEX (#003366, #FFFFFF, etc.) dans le HTML
- NE JAMAIS écrire text-primary en classe Tailwind, utilise style="color: hsl(var(--color-primary))"
- TOUJOURS utiliser hsl(var(--color-XXX)) avec les CSS vars définies en :root

✅ EXEMPLE CORRECT:
<!-- Icône avec couleur primary -->
<svg stroke="hsl(var(--color-primary))" ...>

<!-- Card avec accent background -->
<div class="bg-white border-l-4" style="border-color: hsl(var(--color-accent))">

<!-- Texte avec couleur text-muted -->
<p class="text-lg" style="color: hsl(var(--color-text-muted))">...</p>

🏗️ LAYOUT OBLIGATOIRE À APPLIQUER: ${layout.toUpperCase()}
⚠️⚠️⚠️ CRITIQUE ABSOLU ⚠️⚠️⚠️
Tu DOIS appliquer CE LAYOUT EXACTEMENT dans TOUTES les sections HTML.
VÉRIFIE 3 FOIS que tu as bien utilisé les bonnes classes Tailwind.

${layout === 'single-column' ? `
✅ SINGLE-COLUMN OBLIGATOIRE:
EXEMPLE CONCRET DE HERO SECTION:
<section class="relative h-screen w-full overflow-hidden flex items-center justify-center text-center p-4">
  <div class="max-w-4xl mx-auto space-y-6">
    <h1>Titre</h1>
    <p>Description</p>
  </div>
</section>

EXEMPLE CONCRET DE SECTION POINTS FORTS:
<section class="py-24">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 gap-8">
      <!-- Cards en 1 colonne uniquement -->
    </div>
  </div>
</section>
` : ''}

${layout === 'two-column' ? `
✅ TWO-COLUMN OBLIGATOIRE:
EXEMPLE CONCRET DE HERO SECTION:
<section class="relative py-24">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div><img src="..." /></div>
      <div><h1>...</h1></div>
    </div>
  </div>
</section>

EXEMPLE CONCRET DE SECTION POINTS FORTS:
<section class="py-24">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Cards en 2 colonnes sur desktop -->
    </div>
  </div>
</section>
` : ''}

${layout === 'hero-left' ? `
✅ HERO-LEFT OBLIGATOIRE:
EXEMPLE CONCRET:
<section class="relative py-24">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div class="lg:col-span-1 order-1">
        <img src="..." class="w-full h-full object-cover rounded-xl shadow-2xl" />
      </div>
      <div class="lg:col-span-1 order-2">
        <h1>Titre</h1>
        <p>Description</p>
      </div>
    </div>
  </div>
</section>
` : ''}

${layout === 'hero-right' ? `
✅ HERO-RIGHT OBLIGATOIRE:
EXEMPLE CONCRET:
<section class="relative py-24">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div class="lg:col-span-1 order-2 lg:order-1">
        <h1>Titre</h1>
        <p>Description</p>
      </div>
      <div class="lg:col-span-1 order-1 lg:order-2">
        <img src="..." class="w-full h-full object-cover rounded-xl shadow-2xl" />
      </div>
    </div>
  </div>
</section>
` : ''}
------------------------------------------------------------------
${layout === 'single-column' ? `
✅ SINGLE-COLUMN: Une seule colonne centrée
- Container: max-w-7xl mx-auto
- Toutes les sections: une seule colonne verticale
- Hero: texte centré au milieu
- Sections: grid-cols-1 partout
` : ''}
${layout === 'two-column' ? `
✅ TWO-COLUMN: Grille 2 colonnes (image + texte)
- Hero: lg:grid-cols-2 (image à gauche, texte à droite)
- Sections principales: lg:grid-cols-2 (alterne image gauche/droite)
- Points forts: lg:grid-cols-2 (2 colonnes)
- Gallery: lg:grid-cols-2
` : ''}
${layout === 'hero-left' ? `
✅ HERO-LEFT: Image dominante à gauche
- Hero: lg:grid-cols-2 avec image LARGE (lg:col-span-1) à GAUCHE + texte COMPACT à droite
- Image hero: aspect-square object-cover h-full
- Reste des sections: layout standard (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
` : ''}
${layout === 'hero-right' ? `
✅ HERO-RIGHT: Image dominante à droite
- Hero: lg:grid-cols-2 avec texte COMPACT à GAUCHE + image LARGE (lg:col-span-1) à DROITE
- Image hero: aspect-square object-cover h-full
- Reste des sections: layout standard (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
` : ''}

⚠️ APPLIQUE CE LAYOUT STRICTEMENT DANS TOUTES LES SECTIONS


STYLE: ${selectedStyleTemplate.name}
${selectedStyleTemplate.rules}

RÈGLES CRITIQUES:
✅ HSL uniquement: style="color: hsl(...)" - JAMAIS de HEX
✅ Responsive: text-lg md:text-2xl (UN seul breakpoint/propriété)
✅ Images: 
   ⚠️ INTERDICTION ABSOLUE: JAMAIS de images placeholder (via.placeholder.com est INTERDIT)
   ✅ TOUJOURS afficher les vraies images produit avec <img src="url-complete-shopify">
   ✅ Si tu n'as pas assez d'images réelles, NE METS PAS D'IMAGE DU TOUT plutôt qu'un placeholder
   ✅ UTILISE les ${images?.length || 0} images fournies ci-dessus avec leurs URLs COMPLÈTES
✅ Images: loading="lazy" (sauf 1ère: "eager")
✅ Icônes Lucide: TOUJOURS text-primary ou text-accent (JAMAIS gris)
✅ Mobile-first: max-w-7xl mx-auto px-4 sm:px-6
✅ Cards: Utilise STRICTEMENT les couleurs HSL de la palette fournie (background, surface, accent)
✅ Specs Techniques: NE JAMAIS afficher de ligne <tr> avec valeur vide ou "Non communiqué" - SUPPRIME complètement ces lignes

${reliabilityBadge}

📐 STRUCTURE HTML COMPLÈTE OBLIGATOIRE (NE RIEN OUBLIER):
=================================================================

0️⃣ DARK/LIGHT MODE TOGGLE (OBLIGATOIRE EN PREMIÈRE POSITION DANS <body>):
   ⚠️ CRITIQUE: Ce bouton DOIT être présent dans le HTML final
   - Bouton fixe en haut à droite: fixed top-4 right-4 z-50
   - Icône soleil/lune avec transition
   - Script JavaScript pour toggle la classe 'dark' sur <body>
   - Thème par défaut: ${theme}
   - EXEMPLE OBLIGATOIRE (À COPIER TEL QUEL):
     <body class="relative">
       <button id="theme-toggle" class="fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out" style="background-color: hsl(var(--color-surface)); color: hsl(var(--color-text));">
         <svg class="w-6 h-6 theme-icon-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
         </svg>
         <svg class="w-6 h-6 theme-icon-dark hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
         </svg>
       </button>
       <script>
         const toggleBtn = document.getElementById('theme-toggle');
         const body = document.body;
         const lightIcon = document.querySelector('.theme-icon-light');
         const darkIcon = document.querySelector('.theme-icon-dark');
         
         // Load theme: use configured default theme (${theme}) or saved theme from localStorage
         const savedTheme = localStorage.getItem('theme') || '${theme}';
         if (savedTheme === 'dark') {
           body.classList.add('dark');
           lightIcon.classList.add('hidden');
           darkIcon.classList.remove('hidden');
         } else {
           lightIcon.classList.remove('hidden');
           darkIcon.classList.add('hidden');
         }
         
         toggleBtn?.addEventListener('click', () => {
           body.classList.toggle('dark');
           const isDark = body.classList.contains('dark');
           lightIcon.classList.toggle('hidden', isDark);
           darkIcon.classList.toggle('hidden', !isDark);
           localStorage.setItem('theme', isDark ? 'dark' : 'light');
         });
       </script>

1️⃣ HERO SECTION (fullscreen, h-screen):
   - Image en background-image (URL complète)
   - Gradient overlay: bg-gradient-to-br from-black/60 via-black/40 to-transparent
   - Titre H1 gigantesque + sous-titre + CTA button

2️⃣ HIGHLIGHTS SECTION (4 cards bg-accent/10):
   - 4 cards avec border-l-4 border-accent
   - Icônes SVG Lucide avec stroke="hsl(${designTokens.primary})"
   - UTILISE les customHighlights fournis ci-dessus
   - Shadow-lg + hover:shadow-2xl

3️⃣ POINTS FORTS SECTION (grid 3 colonnes):
   - Minimum 6 points forts détaillés
   - Cards avec gradient borders
   - Icônes accent avec effet hover scale-110
   - Padding généreux p-8

4️⃣ GALERIE IMAGES RESPONSIVE:
   - Grid asymétrique: première image large (lg:col-span-2), autres plus petites
   - ⚠️ CRITIQUE ABSOLU: 
     ❌ INTERDICTION TOTALE d'utiliser via.placeholder.com ou toute autre URL placeholder
     ✅ UTILISE TOUJOURS les vraies images produit avec les URLs Shopify COMPLÈTES fournies
     ✅ Si tu n'as pas assez d'images réelles, NE METS PAS D'IMAGE plutôt qu'un placeholder
   - UTILISE TOUTES les images fournies (${images?.length || 0} images)
   - URLs COMPLÈTES de Shopify CDN (https://cdn.shopify.com/...)
   - Alt texts descriptifs
   - rounded-xl shadow-md hover:shadow-lg

5️⃣ SPECS TECHNIQUES (tableau complet AVEC TOUTES LES INFOS EXTRAITES):
   ⚠️ OBLIGATION ABSOLUE: Utilise TOUTES les caractéristiques extraites ci-dessus
   - Dimensions (length, width, height, depth, weight, seat_height, armrest_height, etc.)
   - Matériaux
   - Couleurs
   - Montage (si extractedInfo.mounting_options existe)
   - Éclairage (si extractedInfo.lighting existe)
   - Garantie (si détectée dans description)
   - Nombre de places (si détecté dans description)
   - Temps d'assemblage (si mentionné)
   - Éléments ajustables (si mentionnés)
   - Rangement (si mentionné)
   
   ✅ Crée un tableau HTML complet avec TOUTES ces lignes
   ❌ NE SUPPRIME une ligne QUE si la valeur est vraiment vide/null
   ⚠️ RÈGLE: NE JAMAIS afficher "Non communiqué" - supprime la ligne entière
   
   Exemple de code HTML à générer:
   <table class="w-full border-collapse">
     ${extractedInfo?.materials ? '<tr><td>Matériaux</td><td>' + extractedInfo.materials + '</td></tr>' : ''}
     ${extractedInfo?.dimensions ? '<tr><td>Dimensions</td><td>' + extractedInfo.dimensions + '</td></tr>' : ''}
     ${extractedInfo?.mounting_options ? '<tr><td>Montage</td><td>' + extractedInfo.mounting_options + '</td></tr>' : ''}
     ${extractedInfo?.lighting ? '<tr><td>Éclairage</td><td>' + extractedInfo.lighting + '</td></tr>' : ''}
     <!-- Continue pour TOUTES les propriétés disponibles -->
   </table>

6️⃣ DESCRIPTION LONGUE (prose styling):
   - Minimum ${wordCount} mots
   - Paragraphes structurés avec <p>
   - Listes <ul> si pertinent
   - Style prose avec leading-relaxed

7️⃣ FOOTER (obligatoire pour HTML complet):
   - Doit fermer </body> et </html>
   - NE PAS TRONQUER le HTML

🎨 CSS AVANCÉ OBLIGATOIRE:
• Cards: bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 md:p-8
• Icônes: stroke="hsl(${designTokens.primary})" ou stroke="hsl(${designTokens.accent})"
• Gradients: style="background-image: linear-gradient(to bottom right, hsla(${designTokens.accent}, 0.05), hsla(${designTokens.primary}, 0.05))"
• Borders: style="border-color: hsl(${designTokens.accent})"
• Hover: transform hover:scale-105 transition-transform duration-300

🚫 NE JAMAIS ÉCRIRE:
- "Informations indicatives"
- "Ces mesures et descriptions sont indicatives et peuvent varier légèrement selon les lots de fabrication"
- Ces phrases sont INTERDITES dans le HTML généré

📝 STRUCTURE DU TEXTE - RÈGLES D'ESPACEMENT CRITIQUE:
- Chaque <p> doit avoir class="leading-relaxed mb-6" (interligne et espacement)
- Sections avec space-y-8 ou space-y-12 entre blocs
- NE PAS coller les paragraphes: TOUJOURS ajouter mb-6 ou mb-8
- Titres avec mb-4 ou mb-6 pour respiration
- Listes <ul> avec space-y-3 et leading-relaxed
- Exemple CORRECT de paragraphes:
  <p class="text-lg leading-relaxed mb-6">Premier paragraphe...</p>
  <p class="text-lg leading-relaxed mb-6">Deuxième paragraphe...</p>
  
🖼️ OVERLAYS SOMBRES SUR IMAGES AVEC TEXTE BLANC - OBLIGATOIRE:
- TOUJOURS ajouter un overlay sombre quand du texte blanc est sur une image
- Hero section: bg-gradient-to-t from-black/70 via-black/50 to-transparent
- Images avec texte overlay: bg-black/60 ou bg-gradient-to-br from-black/70 to-black/40
- Utilise TOUJOURS opacity suffisante (minimum 0.5) pour garantir la lisibilité
- Exemple CORRECT:
  <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent"></div>
  <div class="relative z-10">
    <h1 class="text-white">Titre lisible</h1>
  </div>

⚠️ IMPÉRATIF: Génère un HTML COMPLET jusqu'à </html> - ${wordCount} mots. COMMENCE MAINTENANT.
` : `
Expert landing page creator. Generate professional HTML5.

PRODUCT: ${productData.title} | ${productData.vendor}
${productData.description?.substring(0, 300) || ""}

${extractedInfo ? `
🔧 TECHNICAL SPECS EXTRACTED (INTEGRATE IN SPECS SECTION):
- Materials: ${extractedInfo.materials || 'Not specified'}
- Colors: ${extractedInfo.colors || 'Multiple colors available'}
- Dimensions: ${extractedInfo.dimensions || 'Not specified'}
- Weight: ${extractedInfo.weight || 'Not specified'}
- Features: ${JSON.stringify(extractedInfo.features || []).substring(0, 200)}
- Mounting: ${extractedInfo.mounting_options || 'Not specified'}
- Lighting: ${extractedInfo.lighting || 'Not specified'}

⚠️ USE THESE SPECS in the technical table (not "N/A", write "Not specified" if empty)
` : ''}

${productData.enrichedSummary ? `ATTRS:\n${productData.enrichedSummary.substring(0, 500)}\n` : ""}
${productData.visualAnalysis ? `VISUAL:\n${productData.visualAnalysis.substring(0, 400)}\n` : ""}
${productData.customHighlights ? `PRIORITY HIGHLIGHTS (USE these texts for the HIGHLIGHTS & KEY FEATURES sections):\n${productData.customHighlights}\n` : ""}

IMAGES (${Math.min(images?.length || 0, 2)} main):
${images?.slice(0, 2).map((img: any, i: number) => `${i + 1}. ${img.src}`).join('\n')}

🎨 FULL HSL PALETTE - STRICT MANDATORY USAGE:
------------------------------------------------------------------
⚠️ YOU MUST USE THESE HSL COLORS EVERYWHERE IN CSS:

**CRITICAL: DARK/LIGHT THEME SUPPORT - MANDATORY**

1. HTML Setup with Theme Toggle:
   \`\`\`html
   <!DOCTYPE html>
   <html lang="${language}" class="light">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>${productData.title}</title>
     <script src="https://cdn.tailwindcss.com"></script>
     <script>
       // Theme toggle
       function toggleTheme() {
         const html = document.documentElement;
         const isDark = html.classList.contains('dark');
         html.classList.toggle('dark', !isDark);
         html.classList.toggle('light', isDark);
         localStorage.setItem('theme', isDark ? 'light' : 'dark');
       }
       // Load saved theme
       (function() {
         const theme = localStorage.getItem('theme') || 'light';
         document.documentElement.classList.add(theme);
       })();
     </script>
   </head>
   <body class="transition-colors duration-300">
     <!-- Theme Toggle (fixed top-right) -->
     <button onclick="toggleTheme()" 
             class="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all" 
             aria-label="${language === 'fr' ? 'Changer de thème' : 'Toggle theme'}">
       <svg class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
       </svg>
       <svg class="w-6 h-6 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
       </svg>
     </button>
   \`\`\`

2. CSS with Light/Dark Theme Variables:
   \`\`\`html
   <style>
     /* Light theme (default) */
     :root.light {
       --color-primary: ${designTokens.primary};
       --color-secondary: ${designTokens.secondary};
       --color-accent: ${designTokens.accent};
       --color-background: ${designTokens.background};
       --color-surface: ${designTokens.surface};
       --color-text: ${designTokens.text};
       --color-text-muted: ${designTokens.textMuted};
     }
     
     /* Dark theme */
     :root.dark {
       --color-primary: 200 80% 70%;
       --color-secondary: 200 60% 50%;
       --color-accent: 200 90% 65%;
       --color-background: 220 20% 10%;
       --color-surface: 220 18% 15%;
       --color-text: 0 0% 95%;
       --color-text-muted: 0 0% 70%;
     }
     
     /* Apply theme colors */
     body {
       background-color: hsl(var(--color-background));
       color: hsl(var(--color-text));
     }
     
     .bg-background { background-color: hsl(var(--color-background)); }
     .bg-surface { background-color: hsl(var(--color-surface)); }
     .text-text { color: hsl(var(--color-text)); }
     .text-text-muted { color: hsl(var(--color-text-muted)); }
     .text-primary { color: hsl(var(--color-primary)); }
     .text-accent { color: hsl(var(--color-accent)); }
     .bg-primary { background-color: hsl(var(--color-primary)); }
     .bg-accent { background-color: hsl(var(--color-accent)); }
     .border-primary { border-color: hsl(var(--color-primary)); }
     .border-accent { border-color: hsl(var(--color-accent)); }
   </style>
   \`\`\`

3. Usage Examples:
   - Primary: hsl(var(--color-primary))
     USE FOR: Main titles, important icons, accent borders
     
   - Secondary: hsl(var(--color-secondary))
     USE FOR: Secondary buttons, alternating sections
     
   - Accent: hsl(var(--color-accent))
     USE FOR: CTAs, hover states, highlights, borders
     
   - Background: hsl(var(--color-background))
     USE FOR: Body and section backgrounds
     
   - Surface: hsl(var(--color-surface))
     USE FOR: Cards, panels
     
   - Text: hsl(var(--color-text))
     USE FOR: Main text content
     
   - Text-Muted: hsl(var(--color-text-muted))
     USE FOR: Secondary text, captions

🚫 STRICT PROHIBITIONS:
- NEVER use HEX (#003366, #FFFFFF, etc.) in HTML
- NEVER use text-gray-XXX without replacing with hsl(var(--color-text-muted))
- ALL colors MUST use the CSS custom properties defined above
- ALWAYS use utility classes (.text-primary, .bg-accent) or inline style="color: hsl(var(--color-primary))"

MANDATORY LAYOUT: ${layout}
${layout === 'single-column' ? '- Single centered column, max-w-7xl mx-auto' : ''}
${layout === 'two-column' ? '- 2-column grid (image + text), lg:grid-cols-2' : ''}
${layout === 'hero-left' ? '- Hero with dominant image on left, text on right' : ''}
${layout === 'hero-right' ? '- Hero with text on left, dominant image on right' : ''}


STYLE: ${selectedStyleTemplate.name}
${selectedStyleTemplate.rules}

CRITICAL RULES:
✅ HSL only: style="color: hsl(...)" - NO HEX
✅ Responsive: text-lg md:text-2xl (ONE breakpoint/property)
✅ Images: loading="lazy" (1st: "eager")
✅ Lucide Icons: ALWAYS text-primary or text-accent (NEVER gray)
✅ Mobile-first: max-w-7xl mx-auto px-4 sm:px-6
✅ Cards: bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all
✅ NEVER output "N/A" in the specs HTML (if missing: use a full sentence like "Not specified" or hide the row)

${reliabilityBadge}

📐 COMPLETE HTML STRUCTURE MANDATORY (DON'T FORGET ANYTHING):
=================================================================

1️⃣ HERO SECTION (fullscreen, h-screen):
   - Image as background-image (full URL)
   - Gradient overlay: bg-gradient-to-br from-black/60 via-black/40 to-transparent
   - Giant H1 title + subtitle + CTA button

2️⃣ HIGHLIGHTS SECTION (4 cards bg-accent/10):
   - 4 cards with border-l-4 style="border-color: hsl(${designTokens.accent})"
   - Lucide SVG icons with stroke="hsl(${designTokens.primary})"
   - USE the customHighlights provided above
   - Shadow-lg + hover:shadow-2xl

3️⃣ KEY FEATURES SECTION (grid 3 columns):
   - Minimum 6 detailed key features
   - Cards with gradient borders
   - Accent icons with hover scale-110 effect
   - Generous padding p-8

4️⃣ RESPONSIVE IMAGE GALLERY:
   ⚠️ CRITICAL: 
   - Grid layout: first image large (lg:col-span-2 lg:row-span-2), others smaller
   - USE ALL ${images?.length || 0} provided images
   - ❌ JAMAIS de placeholder images (via.placeholder.com INTERDIT)
   - ✅ TOUJOURS utiliser les URLs Shopify CDN complètes fournies
   - FULL Shopify CDN URLs (https://cdn.shopify.com/...)
   - Descriptive alt texts
   - rounded-xl shadow-md hover:shadow-lg transition
   - Example structure:
     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       <div class="lg:col-span-2 lg:row-span-2">
         <img src="[first_image]" alt="..." class="w-full h-full object-cover rounded-xl shadow-lg" loading="eager">
       </div>
       <div><img src="[second_image]" alt="..." class="w-full aspect-square object-cover rounded-xl shadow-md" loading="lazy"></div>
       <div><img src="[third_image]" alt="..." class="w-full aspect-square object-cover rounded-xl shadow-md" loading="lazy"></div>
       <!-- Répète pour TOUTES les images fournies -->
     </div>
   - SI seulement 2 images: grid simple 2 colonnes égales
   - SI 1 seule image: pleine largeur avec max-w-5xl mx-auto
       <div><img src="[second_image]" alt="..." class="w-full aspect-square object-cover rounded-xl shadow-md" loading="lazy"></div>
       <div><img src="[third_image]" alt="..." class="w-full aspect-square object-cover rounded-xl shadow-md" loading="lazy"></div>
       ...
     </div>

5️⃣ TECHNICAL SPECS (complete table):
   - TAKE the extractedInfo above
   - Table with borders and hover effects
   - Feature cards with icons
   - ⚠️ CRITICAL: NEVER display rows with "Non communiqué" / "Not specified" - HIDE/REMOVE these rows completely from HTML
   - Only display specs that have actual values

6️⃣ LONG DESCRIPTION (prose styling):
   - Minimum ${wordCount} words
   - Structured paragraphs with <p>
   - Lists <ul> if relevant
   - Prose style with leading-relaxed

7️⃣ FOOTER (mandatory for complete HTML):
   - Must close </body> and </html>
   - DO NOT TRUNCATE the HTML

🎨 ADVANCED CSS MANDATORY:
• Cards: bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 md:p-8
• Icons: stroke="hsl(${designTokens.primary})" or stroke="hsl(${designTokens.accent})"
• Gradients: style="background-image: linear-gradient(to bottom right, hsla(${designTokens.accent}, 0.05), hsla(${designTokens.primary}, 0.05))"
• Borders: style="border-color: hsl(${designTokens.accent})"
• Hover: transform hover:scale-105 transition-transform duration-300

🚫 NEVER WRITE:
- "Indicative information"
- "These measurements and descriptions are indicative and may vary slightly depending on manufacturing batches"
- These sentences are FORBIDDEN in generated HTML

📝 TEXT STRUCTURE - CRITICAL SPACING RULES:
- Each <p> must have class="leading-relaxed mb-6" (line height and spacing)
- Sections with space-y-8 or space-y-12 between blocks
- DO NOT stick paragraphs together: ALWAYS add mb-6 or mb-8
- Headings with mb-4 or mb-6 for breathing room
- Lists <ul> with space-y-3 and leading-relaxed
- CORRECT example of paragraphs:
  <p class="text-lg leading-relaxed mb-6">First paragraph...</p>
  <p class="text-lg leading-relaxed mb-6">Second paragraph...</p>
  
🖼️ DARK OVERLAYS ON IMAGES WITH WHITE TEXT - MANDATORY:
- ALWAYS add a dark overlay when white text is on an image
- Hero section: bg-gradient-to-t from-black/70 via-black/50 to-transparent
- Images with text overlay: bg-black/60 or bg-gradient-to-br from-black/70 to-black/40
- ALWAYS use sufficient opacity (minimum 0.5) to ensure readability
- CORRECT example:
  <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent"></div>
  <div class="relative z-10">
    <h1 class="text-white">Readable title</h1>
  </div>

⚠️ IMPERATIVE: Generate COMPLETE HTML until </html> - ${wordCount} words. START NOW.
`;
}

// Select luxury fonts based on style
function selectLuxuryFonts(style: string) {
  if (style === "premium") {
    return {
      hero: LUXURY_FONTS.hero.slice(0, 1),
      heading: LUXURY_FONTS.heading.slice(0, 1),
      body: LUXURY_FONTS.body.slice(0, 1),
      accent: LUXURY_FONTS.accent.slice(0, 1),
    };
  } else if (style === "modern") {
    return {
      hero: [LUXURY_FONTS.hero[1]],
      heading: LUXURY_FONTS.heading,
      body: LUXURY_FONTS.body,
      accent: [LUXURY_FONTS.accent[1]],
    };
  } else {
    return {
      hero: [LUXURY_FONTS.hero[0]],
      heading: [LUXURY_FONTS.heading[1]],
      body: [LUXURY_FONTS.body[1]],
      accent: [LUXURY_FONTS.accent[0]],
    };
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return base64;
  } catch (error) {
    console.error("Error fetching image as base64:", error);
    throw error;
  }
}
