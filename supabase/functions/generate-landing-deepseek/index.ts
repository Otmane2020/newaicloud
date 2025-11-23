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
Analyse cette image d'un produit ecommerce et retourne STRICTEMENT un JSON.

${productContext ? `Contexte produit: ${productContext}` : ""}

JSON attendu :

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
      "weight_unit": "string" | null
    }
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
      language = "fr",
      generationMode = "premium", // "fast" | "premium"
    } = body;

    console.log(`🚀 Generating landing page for product ${productId}`);

    // DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ✅ SPRINT 1 - PHASE 2: Optimized DB - Single query with JOIN
    const { data: fullProductData } = await supabase
      .from("shopify_products")
      .select(`
        *,
        product_images!inner(id, src, alt_text, position),
        product_variants(id, title, price, option1, option2, option3)
      `)
      .eq("id", productId)
      .order("product_images(position)")
      .limit(3, { foreignTable: "product_images" })
      .single();

    if (!fullProductData) throw new Error("Product not found");

    const product = fullProductData;
    const images = fullProductData.product_images || [];
    const variants = fullProductData.product_variants || [];
    let enrichedProduct = product;

    console.log(`✅ DB query optimized: loaded product + ${images.length} images + ${variants.length} variants in 1 query`);

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

    // ✅ SPRINT 1 - PHASE 3: Extended cache to 7 days (was 24h)
    if (product.landing_page_html && product.last_landing_generation_at) {
      const lastGen = new Date(product.last_landing_generation_at);
      const daysSince = (Date.now() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSince < 7) {
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
    });

    const promptSizeKB = (new Blob([prompt]).size / 1024).toFixed(2);
    console.log(`🤖 ${generationMode === 'fast' ? 'Gemini-2.5-Flash' : 'DeepSeek'} generating HTML...`);
    console.log(`📏 Prompt: ${prompt.length} chars (${promptSizeKB} KB)`);

    let deepseekResponse;
    try {
      // ✅ PHASE 7: Fast mode with Gemini-2.5-Flash (15-20s vs 30-60s)
      if (generationMode === 'fast' && LOVABLE_API_KEY) {
        console.log("⚡ Using FAST mode with Gemini-2.5-Flash");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

        deepseekResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 8000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } else {
        // Premium mode with DeepSeek
        console.log("💎 Using PREMIUM mode with DeepSeek");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 8000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      }

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
    console.log('[DEEPSEEK] Updating product in database...', { 
      productId, 
      htmlLength: html.length 
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
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
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
    enrichedProduct 
  } = config;

  const fontLinks = Object.values(fonts)
    .flat()
    .map(
      (f: any) =>
        `<link href="https://fonts.googleapis.com/css2?family=${f}&display=swap" rel="stylesheet">`
    )
    .join("\n");

  const wordCount =
    contentLength === "short"
      ? "800-1200"
      : contentLength === "long"
      ? "2000-3000"
      : "1200-1800";

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

  // Build reliability badge based on data source
  const reliabilityBadge = enrichedProduct?.serp_verified
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
`;

  // ✅ SPRINT 2 - PHASE 4: Optimized prompt (reduced by ~40%)
  return language === "fr" ? `
Tu es expert en landing pages Shopify. Crée un HTML5 complet et professionnel.

PRODUIT: ${productData.title} | ${productData.vendor}
${productData.description?.substring(0, 300) || ""}

${productData.enrichedSummary ? `ATTRIBUTS:\n${productData.enrichedSummary.substring(0, 500)}\n` : ""}
${productData.visualAnalysis ? `VISUEL:\n${productData.visualAnalysis.substring(0, 400)}\n` : ""}

IMAGES (${Math.min(images?.length || 0, 2)} principales):
${images?.slice(0, 2).map((img: any, i: number) => `${i + 1}. ${img.src}`).join('\n')}

PALETTE HSL:
Primary: hsl(${designTokens.primary}) | Accent: hsl(${designTokens.accent}) | BG: hsl(${designTokens.background}) | Text: hsl(${designTokens.text})

STYLE: ${selectedStyleTemplate.name}
${selectedStyleTemplate.rules}

RÈGLES CRITIQUES:
✅ HSL uniquement: style="background-color: hsl(...)" - JAMAIS de HEX
✅ Responsive: text-lg md:text-2xl (UN seul breakpoint/propriété)
✅ Images: loading="lazy" (sauf 1ère: "eager")
✅ Icônes SVG avec gradients HSL (IDs uniques: icon1, icon2...)
✅ Mobile-first: max-w-7xl mx-auto px-4 sm:px-6

${reliabilityBadge}

STRUCTURE: <!DOCTYPE html>, Tailwind CDN, viewport meta, ${wordCount} mots
SECTIONS: Hero, Avantages (3-4), Specs Techniques, FAQ
INTERDIT: Boutons achat, navigation, liens externes

GÉNÈRE le HTML complet maintenant.
` : `
Expert landing page creator. Generate professional HTML5.

PRODUCT: ${productData.title} | ${productData.vendor}
${productData.description?.substring(0, 300) || ""}

${productData.enrichedSummary ? `ATTRS:\n${productData.enrichedSummary.substring(0, 500)}\n` : ""}
${productData.visualAnalysis ? `VISUAL:\n${productData.visualAnalysis.substring(0, 400)}\n` : ""}

IMAGES (${Math.min(images?.length || 0, 2)} main):
${images?.slice(0, 2).map((img: any, i: number) => `${i + 1}. ${img.src}`).join('\n')}

PALETTE HSL:
Primary: hsl(${designTokens.primary}) | Accent: hsl(${designTokens.accent}) | BG: hsl(${designTokens.background}) | Text: hsl(${designTokens.text})

STYLE: ${selectedStyleTemplate.name}
${selectedStyleTemplate.rules}

CRITICAL RULES:
✅ HSL only: style="background-color: hsl(...)" - NO HEX
✅ Responsive: text-lg md:text-2xl (ONE breakpoint/property)
✅ Images: loading="lazy" (1st: "eager")
✅ SVG icons with HSL gradients (unique IDs: icon1, icon2...)
✅ Mobile-first: max-w-7xl mx-auto px-4 sm:px-6

${reliabilityBadge}

STRUCTURE: <!DOCTYPE html>, Tailwind CDN, viewport meta, ${wordCount} words
SECTIONS: Hero, Benefits (3-4), Tech Specs, FAQ
FORBIDDEN: Buy buttons, nav, external links

GENERATE complete HTML now.
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
