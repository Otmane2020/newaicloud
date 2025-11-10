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
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
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
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
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
      language = "fr",
    } = body ?? {};

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

    // 🔧 STEP 1: Product Enrichment (with timeout)
    console.log("🔧 Starting product enrichment...");
    let enrichmentStatus = "skipped";
    let attributesCount = 0;
    try {
      const enrichController = new AbortController();
      const enrichTimeout = setTimeout(() => enrichController.abort(), 20000);

      const { data: enrichData, error: enrichError } = await supabaseAdmin.functions.invoke("enrich-product", {
        body: { productId: product_id },
        signal: enrichController.signal,
      });

      clearTimeout(enrichTimeout);

      if (enrichError) {
        console.log("⚠️ Enrichment failed:", enrichError.message);
        enrichmentStatus = "failed";
      } else {
        console.log("✅ Enrichment completed successfully");
        enrichmentStatus = "success";
      }
    } catch (err) {
      console.log("⚠️ Enrichment timeout or error (continuing without it):", err.message);
      enrichmentStatus = "failed";
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
    const enrichedSummary = buildEnrichedProductSummary(enrichedProduct, language);
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
          visualAnalysis = buildVisionSummary(visionData.attributes, language);
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
      : language === "en"
        ? "No additional image"
        : "Aucune image supplémentaire";
    const vars = variants.length
      ? variants.map((v) => `- ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ""}`).join("\n")
      : language === "en"
        ? "No variant"
        : "Aucune variante";

    // Build product URLs
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    const prompt =
      language === "en"
        ? `You are a Shopify UX/UI expert specialized in product landing pages.
Generate a professional, informational Tailwind HTML landing page.

PRODUCT:
- Title: ${productTitle}
- Brand: ${vendor}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}
- Main Color: ${mainColor}
- Product URL: ${productUrl}

${enrichedSummary ? `ENRICHED ATTRIBUTES:\n${enrichedSummary}\n` : ""}

IMAGES: ${imgs}
VARIANTS: ${vars}
${customHighlights ? `HIGHLIGHTS: ${customHighlights}` : ""}

CRITICAL RULES - FOLLOW EXACTLY:

1. HTML STRUCTURE (ABSOLUTELY MANDATORY):
   Your response MUST be a COMPLETE valid HTML5 document:
   
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>${productTitle}</title>
     <script src="https://cdn.tailwindcss.com"></script>
     <style>
       :root {
         --brand-primary-h: ${designTokens.primary.split(' ')[0]};
         --brand-primary-s: ${designTokens.primary.split(' ')[1]};
         --brand-primary-l: ${designTokens.primary.split(' ')[2]};
         --brand-secondary-h: ${designTokens.secondary.split(' ')[0]};
         --brand-secondary-s: ${designTokens.secondary.split(' ')[1]};
         --brand-secondary-l: ${designTokens.secondary.split(' ')[2]};
         --brand-accent-h: ${designTokens.accent.split(' ')[0]};
         --brand-accent-s: ${designTokens.accent.split(' ')[1]};
         --brand-accent-l: ${designTokens.accent.split(' ')[2]};
         --brand-surface-h: ${designTokens.surface.split(' ')[0]};
         --brand-surface-s: ${designTokens.surface.split(' ')[1]};
         --brand-surface-l: ${designTokens.surface.split(' ')[2]};
       }
       .bg-brand-primary { background-color: hsl(${designTokens.primary}) !important; }
       .bg-brand-secondary { background-color: hsl(${designTokens.secondary}) !important; }
       .bg-brand-accent { background-color: hsl(${designTokens.accent}) !important; }
       .bg-brand-surface { background-color: hsl(${designTokens.surface}) !important; }
       .text-brand-primary { color: hsl(${designTokens.primary}) !important; }
       .border-brand-primary { border-color: hsl(${designTokens.primary}) !important; }
       .border-brand-accent { border-color: hsl(${designTokens.accent}) !important; }
       .hover\\:bg-brand-surface:hover { background-color: hsl(${designTokens.surface}) !important; }
       .from-brand-primary { --tw-gradient-from: hsl(${designTokens.primary}) !important; }
       .to-brand-accent { --tw-gradient-to: hsl(${designTokens.accent}) !important; }
     </style>
     <script>
       tailwind.config = {
         theme: {
           extend: {
             colors: {
               'brand-primary': 'hsl(${designTokens.primary})',
               'brand-secondary': 'hsl(${designTokens.secondary})',
               'brand-accent': 'hsl(${designTokens.accent})',
               'brand-surface': 'hsl(${designTokens.surface})',
             }
           }
         }
       }
     </script>
   </head>
   <body>
   
   Your content sections...
   
   </body>
   </html>

2. COLORS - USE THE FULL BRAND PALETTE:
   - Hero/Header: bg-brand-primary or bg-brand-accent with text-white
   - Alternating sections: bg-white and bg-brand-surface
   - Cards: bg-white with border-brand-primary or hover:bg-brand-surface
   - Accents/highlights: bg-brand-primary text-white or border-brand-accent
   - Text: text-gray-900 (primary), text-gray-700 (secondary)
   - FORBIDDEN: :root, --primary-color as global CSS variables
   - MANDATORY: Use inline style="background-color: hsl(...)" on hero, main sections, and accent elements
   - Example: style="background-color: hsl(${designTokens.primary})"
   
3. RESPONSIVE LAYOUT (CRITICAL - FOLLOW EXAMPLES EXACTLY):
   
   HERO SECTION WITH PRODUCT (MANDATORY STRUCTURE):
   <div style="background-color: hsl(${designTokens.primary})" class="bg-brand-primary text-white">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
         <div>
           <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">${productTitle}</h1>
           <p class="text-lg sm:text-xl text-white/90 mb-8">Brief compelling description here...</p>
         </div>
         <div class="flex justify-center lg:justify-end">
           <img src="${imageUrl}" alt="${productTitle}" class="w-full max-w-md lg:max-w-lg h-auto object-cover rounded-lg shadow-2xl" />
         </div>
       </div>
     </div>
   </div>
   
   BENEFIT CARDS GRID:
   <div class="bg-white py-16 sm:py-20">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">Key Benefits</h2>
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
         <div class="bg-white p-6 rounded-lg border-2 border-brand-primary hover:bg-brand-surface transition-colors" style="border-color: hsl(${designTokens.primary})">
           <h3 class="text-xl font-semibold text-gray-900 mb-3">Benefit Title</h3>
           <p class="text-gray-700">Description text here...</p>
         </div>
       </div>
     </div>
   </div>
   
   ACCENT SECTION EXAMPLE:
   <div style="background-color: hsl(${designTokens.accent})" class="bg-brand-accent py-16 sm:py-20">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h2 class="text-3xl font-bold text-white mb-8">Section Title</h2>
       <p class="text-white/90 text-lg">Content here...</p>
     </div>
   </div>
   
   SURFACE SECTION EXAMPLE:
   <div style="background-color: hsl(${designTokens.surface})" class="bg-brand-surface py-16 sm:py-20">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h2 class="text-3xl font-bold text-gray-900 mb-8">Section Title</h2>
       <p class="text-gray-700 text-lg">Content here...</p>
     </div>
   </div>
   
   CRITICAL RESPONSIVE RULES:
   - Always use max-w-7xl mx-auto for main containers
   - Always add px-4 sm:px-6 lg:px-8 for responsive padding
   - Images: w-full h-auto object-cover (NEVER fixed small sizes like w-20)
   - Text: MUST have responsive breakpoints (text-2xl sm:text-3xl md:text-4xl)
   - Grids: MUST start mobile-first (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
   
4. NO FOOTER - End with </body></html>

5. NO CTA BUTTONS - Informational only

SECTIONS:
1. Hero (bg-brand-primary)
2. Key Benefits (3-4 cards with border-brand-primary)
3. Technical Specifications ${enrichedSummary ? "(MANDATORY)" : ""}
4. Materials & Finishes ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "(MANDATORY)" : ""}
5. Image Gallery (bg-brand-surface)
6. Care Instructions
7. FAQ (bg-white/bg-brand-surface alternating)

DESIGN:
- Alternate bg-white and bg-brand-surface for visual rhythm
- Use border-brand-primary for cards and dividers
- Colored section headers with bg-brand-primary
- Modern shadows: shadow-lg shadow-brand-primary/10
- Gradients: from-brand-primary to-brand-accent
- Professional typography with clear hierarchy
- NO CTA buttons

Return ONLY the HTML content.`
        : `Tu es un expert UX/UI Shopify spécialisé dans les landing pages produit.
Génère une landing page HTML Tailwind professionnelle et informationnelle.

PRODUIT:
- Titre: ${productTitle}
- Marque: ${vendor}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}
- Couleur Principale: ${mainColor}
- URL Produit: ${productUrl}

${enrichedSummary ? `ATTRIBUTS ENRICHIS:\n${enrichedSummary}\n` : ""}

IMAGES: ${imgs}
VARIANTES: ${vars}
${customHighlights ? `POINTS FORTS: ${customHighlights}` : ""}

RÈGLES CRITIQUES - SUIVRE EXACTEMENT:

1. STRUCTURE HTML (ABSOLUMENT OBLIGATOIRE):
   Ta réponse DOIT être un document HTML5 COMPLET:
   
   <!DOCTYPE html>
   <html lang="fr">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>${productTitle}</title>
     <script src="https://cdn.tailwindcss.com"></script>
     <style>
       :root {
         --brand-primary-h: ${designTokens.primary.split(' ')[0]};
         --brand-primary-s: ${designTokens.primary.split(' ')[1]};
         --brand-primary-l: ${designTokens.primary.split(' ')[2]};
         --brand-secondary-h: ${designTokens.secondary.split(' ')[0]};
         --brand-secondary-s: ${designTokens.secondary.split(' ')[1]};
         --brand-secondary-l: ${designTokens.secondary.split(' ')[2]};
         --brand-accent-h: ${designTokens.accent.split(' ')[0]};
         --brand-accent-s: ${designTokens.accent.split(' ')[1]};
         --brand-accent-l: ${designTokens.accent.split(' ')[2]};
         --brand-surface-h: ${designTokens.surface.split(' ')[0]};
         --brand-surface-s: ${designTokens.surface.split(' ')[1]};
         --brand-surface-l: ${designTokens.surface.split(' ')[2]};
       }
       .bg-brand-primary { background-color: hsl(${designTokens.primary}) !important; }
       .bg-brand-secondary { background-color: hsl(${designTokens.secondary}) !important; }
       .bg-brand-accent { background-color: hsl(${designTokens.accent}) !important; }
       .bg-brand-surface { background-color: hsl(${designTokens.surface}) !important; }
       .text-brand-primary { color: hsl(${designTokens.primary}) !important; }
       .border-brand-primary { border-color: hsl(${designTokens.primary}) !important; }
       .border-brand-accent { border-color: hsl(${designTokens.accent}) !important; }
       .hover\\:bg-brand-surface:hover { background-color: hsl(${designTokens.surface}) !important; }
       .from-brand-primary { --tw-gradient-from: hsl(${designTokens.primary}) !important; }
       .to-brand-accent { --tw-gradient-to: hsl(${designTokens.accent}) !important; }
     </style>
     <script>
       tailwind.config = {
         theme: {
           extend: {
             colors: {
               'brand-primary': 'hsl(${designTokens.primary})',
               'brand-secondary': 'hsl(${designTokens.secondary})',
               'brand-accent': 'hsl(${designTokens.accent})',
               'brand-surface': 'hsl(${designTokens.surface})',
             }
           }
         }
       }
     </script>
   </head>
   <body>
   
   Tes sections de contenu...
   
   </body>
   </html>

2. COULEURS - UTILISE LA PALETTE COMPLÈTE:
   - Hero/Header: bg-brand-primary ou bg-brand-accent avec text-white
   - Sections alternées: bg-white et bg-brand-surface
   - Cartes: bg-white avec border-brand-primary ou hover:bg-brand-surface
   - Accents: bg-brand-primary text-white ou border-brand-accent
   - Texte: text-gray-900 (principal), text-gray-700 (secondaire)
   - INTERDIT: :root, --primary-color comme variables CSS globales
   
3. LAYOUT RESPONSIVE (CRITIQUE - SUIVRE EXEMPLES EXACTEMENT):
   
   SECTION HERO AVEC PRODUIT (STRUCTURE OBLIGATOIRE):
   <div class="bg-brand-primary text-white">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
         <div>
           <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">${productTitle}</h1>
           <p class="text-lg sm:text-xl text-white/90 mb-8">Brève description convaincante...</p>
         </div>
         <div class="flex justify-center lg:justify-end">
           <img src="${imageUrl}" alt="${productTitle}" class="w-full max-w-md lg:max-w-lg h-auto object-cover rounded-lg shadow-2xl" />
         </div>
       </div>
     </div>
   </div>
   
   GRILLE DE CARTES BÉNÉFICES:
   <div class="bg-white py-16 sm:py-20">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">Points Forts</h2>
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
         <div class="bg-white p-6 rounded-lg border-2 border-brand-primary hover:bg-brand-surface transition-colors">
           <h3 class="text-xl font-semibold text-gray-900 mb-3">Titre Bénéfice</h3>
           <p class="text-gray-700">Texte descriptif...</p>
         </div>
       </div>
     </div>
   </div>
   
   RÈGLES RESPONSIVE CRITIQUES:
   - Toujours utiliser max-w-7xl mx-auto pour conteneurs principaux
   - Toujours ajouter px-4 sm:px-6 lg:px-8 pour padding responsive
   - Images: w-full h-auto object-cover (JAMAIS tailles fixes comme w-20)
   - Texte: DOIT avoir breakpoints responsive (text-2xl sm:text-3xl md:text-4xl)
   - Grilles: DOIT commencer mobile-first (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
   
4. PAS DE FOOTER - Terminer avec </body></html>

5. PAS DE BOUTONS CTA - Informatif uniquement

SECTIONS:
1. Hero (bg-brand-primary)
2. Points Forts (3-4 cartes avec border-brand-primary)
3. Caractéristiques Techniques ${enrichedSummary ? "(OBLIGATOIRE)" : ""}
4. Matériaux & Finitions ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "(OBLIGATOIRE)" : ""}
5. Galerie d'Images (bg-brand-surface)
6. Conseils d'Entretien
7. FAQ (bg-white/bg-brand-surface alternées)

DESIGN:
- Alterne bg-white et bg-brand-surface pour rythme visuel
- Utilise border-brand-primary pour cartes et séparateurs
- En-têtes de section colorés avec bg-brand-primary
- Ombres modernes: shadow-lg shadow-brand-primary/10
- Dégradés: from-brand-primary to-brand-accent
- Typographie professionnelle avec hiérarchie claire
- AUCUN bouton CTA

Retourne UNIQUEMENT le contenu HTML.`;

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
                language === "en"
                  ? "You are a professional Shopify landing page designer. You create beautiful, conversion-optimized HTML pages with real working buttons and links. You write persuasive copy and structure content for maximum engagement. Always include functional onclick handlers and href attributes for all buttons and links. When enriched product attributes are provided, you MUST create comprehensive Technical Specifications and Materials sections."
                  : "Tu es un designer professionnel de landing pages Shopify. Tu crées de belles pages HTML optimisées pour la conversion avec de vrais boutons et liens fonctionnels. Tu rédiges un contenu persuasif et structures l'information pour un engagement maximum. Inclus toujours des handlers onclick et attributs href fonctionnels pour tous les boutons et liens. Quand des attributs produit enrichis sont fournis, tu DOIS créer des sections Caractéristiques Techniques et Matériaux complètes.",
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
        JSON.stringify({ error: language === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    console.log("[AI] Raw HTML received, length:", rawHtml.length);

    // 🧹 Apply HTML normalization and sanitization
    const html = sanitizeGeneratedHTML(rawHtml, productTitle, language || "en");

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

    // 💾 Sauvegarde dans product_landing_pages (only if user is authenticated)
    if (userId && product_id) {
      console.log("💾 Saving landing page to database...");

      // Désactiver les anciennes versions
      await supabaseAdmin
        .from("product_landing_pages")
        .update({ is_active: false })
        .eq("product_id", product_id)
        .eq("seller_id", userId);

      // Récupérer le numéro de version
      const { data: existingPages } = await supabaseAdmin
        .from("product_landing_pages")
        .select("version")
        .eq("product_id", product_id)
        .order("version", { ascending: false })
        .limit(1);

      const newVersion = existingPages && existingPages.length > 0 ? existingPages[0].version + 1 : 1;

      // Créer la nouvelle version
      const { error: saveError } = await supabaseAdmin.from("product_landing_pages").insert({
        product_id: product_id,
        seller_id: userId,
        html_content: html,
        config: {
          language,
          vendor,
          image_url: imageUrl,
          description,
          content_length: length,
          style,
          layout,
          mainColor,
          customHighlights,
          enrichment_status: enrichmentStatus,
          attributes_count: attributesCount,
        },
        version: newVersion,
        is_active: true,
      });

      if (saveError) {
        console.error("❌ Save error:", saveError);
      } else {
        console.log(`✅ Landing page v${newVersion} saved successfully`);
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
