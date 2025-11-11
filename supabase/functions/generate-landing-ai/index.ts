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

  // Dimensions
  const dims = [];
  if (enriched.smart_length) dims.push(`L ${enriched.smart_length}${enriched.smart_length_unit || ""}`);
  if (enriched.smart_width) dims.push(`l ${enriched.smart_width}${enriched.smart_width_unit || ""}`);
  if (enriched.smart_height) dims.push(`H ${enriched.smart_height}${enriched.smart_height_unit || ""}`);
  if (enriched.smart_weight) dims.push(`Poids ${enriched.smart_weight}${enriched.smart_weight_unit || ""}`);
  if (enriched.smart_diameter) dims.push(`Ø ${enriched.smart_diameter}${enriched.smart_diameter_unit || ""}`);
  if (enriched.smart_depth) dims.push(`P ${enriched.smart_depth}${enriched.smart_depth_unit || ""}`);
  if (enriched.smart_seat_height)
    dims.push(`Hauteur d'assise ${enriched.smart_seat_height}${enriched.smart_seat_height_unit || ""}`);
  if (dims.length > 0) {
    sections.push(language === "en" ? "\nDIMENSIONS:" : "\nDIMENSIONS:");
    sections.push(`- ${dims.join(" × ")}`);
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
    } = body ?? {};

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
        } catch (err) {
          console.error(`❌ Enrichment attempt ${attemptNumber} exception:`, {
            message: err.message,
            name: err.name,
            stack: err.stack?.substring(0, 200),
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

    // Vision AI with timeout (15s) - Optional, won't block if it fails
    let visualAnalysis = "";
    if (imageUrl) {
      try {
        console.log("🔍 Starting Vision AI analysis...");
        const visionController = new AbortController();
        const visionTimeout = setTimeout(() => visionController.abort(), 15000);

        const { data: visionData, error: visionError } = await supabaseAdmin.functions.invoke(
          "analyze-image-with-vision",
          {
            body: {
              imageUrl,
              productContext: `${productTitle} ${vendor || ""}`,
              detectMeasurements: true,
            },
            signal: visionController.signal,
          },
        );

        clearTimeout(visionTimeout);

        if (visionError) {
          console.log("⚠️ Vision AI failed:", visionError.message);
        } else if (visionData?.attributes) {
          visualAnalysis = buildVisionSummary(visionData.attributes, detectedLanguage);
          console.log("✅ Vision AI analysis completed");
        }
      } catch (err) {
        console.log("⚠️ Vision AI timeout or error (continuing without it):", err.message);
      }
    } else {
      console.log("⏭️ No image URL provided, skipping Vision AI");
    }

    // --- Prompt bilingual ---
    const imgs = images.length
      ? images.map((i) => `- ${i.src}`).join("\n")
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
- <script src="https://cdn.tailwindcss.com"></script> in <head>
- Mobile-first (sm:, md:, lg:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

🚨 ABSOLUTELY FORBIDDEN (CRITICAL):
- NO "Add to Cart" buttons or any purchase buttons
- NO "Buy Now" or "Order Now" buttons
- NO navigation menus or breadcrumbs
- NO footer section
- NO links to external pages (use href="#" only)
- NO call-to-action buttons of any kind

✅ REQUIRED SECTIONS:
Hero with image gallery, Key Benefits (3-4 cards), Technical Specifications (if enriched data), Materials & Composition (if available), Image Gallery, Care Instructions, FAQ.

ICONS USAGE:
- Use simple SVG checkmark icons ONLY for bullet lists
- ONE checkmark icon per list item
- Example: <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" style="color: hsl(${designTokens.primary})" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
- NO decorative icons elsewhere`
        : `Tu es un expert UX/UI Shopify spécialisé dans les landing pages produit.
Génère une landing page Tailwind HTML complète et professionnelle.

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
- <script src="https://cdn.tailwindcss.com"></script> dans <head>
- Mobile-first (sm:, md:, lg:)
- Container : max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grilles : grid-cols-1 md:grid-cols-2 lg:grid-cols-3

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
                  ? "You are a professional content writer for product landing pages. You create informative, engaging HTML content that describes products in detail. Focus on product features, specifications, and benefits. NEVER include purchase buttons, navigation menus, or call-to-action elements. When enriched product attributes are provided, you MUST create comprehensive Technical Specifications and Materials sections with all available data."
                  : "Tu es un rédacteur professionnel de contenu pour des landing pages produit. Tu crées du contenu HTML informatif et engageant qui décrit les produits en détail. Concentre-toi sur les caractéristiques, spécifications et avantages du produit. N'inclus JAMAIS de boutons d'achat, menus de navigation ou éléments call-to-action. Quand des attributs produit enrichis sont fournis, tu DOIS créer des sections Caractéristiques Techniques et Matériaux complètes avec toutes les données disponibles.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 12000,
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

    // 💾 Simple update to shopify_products.landing_page (only if user is authenticated)
    if (userId && product_id) {
      console.log("💾 Updating landing_page field in shopify_products...");

      const { error: updateError } = await supabaseAdmin
        .from("shopify_products")
        .update({
          landing_page: html,
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
        html,
        enrichment_status: enrichmentStatus,
        attributes_count: attributesCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
