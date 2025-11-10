import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function generateDesignTokens(colorScheme: any) {
  const primary = colorScheme.primary || "#000000";
  const secondary = colorScheme.secondary || "#333333";
  const background = colorScheme.background || "#FFFFFF";
  const surface = colorScheme.surface || "#F5F5F5";
  const text = colorScheme.text || "#000000";
  const textMuted = colorScheme.textMuted || "#666666";

  const contrast = calculateContrast(primary, "#FFFFFF");
  const needsDarkText = contrast < 4.5;
  const ctaText = needsDarkText ? "#000000" : "#FFFFFF";

  const validatedBackground = getLuminance(background) > 0.5 ? background : "#FFFFFF";
  const validatedText = getLuminance(text) < 0.5 ? text : "#000000";

  return {
    primary,
    secondary,
    background: validatedBackground,
    surface,
    text: validatedText,
    textMuted,
    ctaText,
    contrastRatio: contrast,
  };
}

// Tailwind color to hex conversion (for validation)
function tailwindToHex(tailwindClass: string): string {
  const colorMap: Record<string, string> = {
    "white": "#FFFFFF",
    "black": "#000000",
    "gray-50": "#F9FAFB",
    "gray-100": "#F3F4F6",
    "gray-200": "#E5E7EB",
    "gray-300": "#D1D5DB",
    "gray-400": "#9CA3AF",
    "gray-500": "#6B7280",
    "gray-600": "#4B5563",
    "gray-700": "#374151",
    "gray-800": "#1F2937",
    "gray-900": "#111827",
  };
  return colorMap[tailwindClass] || "#FFFFFF";
}

// Advanced color contrast validation (detects custom colors)
function validateColorContrast(html: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Regex to extract BOTH Tailwind classes AND custom hex colors
  const elementRegex = /<(\w+)[^>]*class="([^"]*)"/g;
  
  let match;
  while ((match = elementRegex.exec(html)) !== null) {
    const [, tag, classString] = match;
    
    // Extract background color (Tailwind or custom)
    const bgTailwindMatch = classString.match(/bg-(white|black|gray-(?:50|100|200|300|400|500|600|700|800|900))/);
    const bgCustomMatch = classString.match(/bg-\[#([A-Fa-f0-9]{6})\]/);
    
    // Extract text color (Tailwind or custom)
    const textTailwindMatch = classString.match(/text-(white|black|gray-(?:50|100|200|300|400|500|600|700|800|900))/);
    const textCustomMatch = classString.match(/text-\[#([A-Fa-f0-9]{6})\]/);
    
    // Only validate if we have both bg and text colors
    let bgColor: string | null = null;
    let textColor: string | null = null;
    
    if (bgCustomMatch && bgCustomMatch[1]) {
      bgColor = "#" + bgCustomMatch[1];
    } else if (bgTailwindMatch && bgTailwindMatch[1]) {
      bgColor = tailwindToHex(bgTailwindMatch[1]);
    }
    
    if (textCustomMatch && textCustomMatch[1]) {
      textColor = "#" + textCustomMatch[1];
    } else if (textTailwindMatch && textTailwindMatch[1]) {
      textColor = tailwindToHex(textTailwindMatch[1]);
    }
    
    if (bgColor && textColor) {
      const contrast = calculateContrast(bgColor, textColor);
      
      // WCAG AA requires 4.5:1 for normal text
      if (contrast < 4.5) {
        const violation = `<${tag}>: text #${textColor} on bg #${bgColor} (contrast: ${contrast.toFixed(2)}:1)`;
        violations.push(violation);
        console.error(`❌ COLOR VIOLATION: ${violation}`);
      }
    }
  }
  
  return { valid: violations.length === 0, violations };
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

function buildVisionSummary(v: any, language = "fr") {
  if (!v) return "";
  const materials = Array.isArray(v.materials)
    ? v.materials.join(", ")
    : v.materials || (language === "en" ? "not detected" : "non détectés");
  const palette = Array.isArray(v.palette)
    ? v.palette.join(", ")
    : v.palette || v.dominantColor || (language === "en" ? "not detected" : "non détectée");
  const styles = Array.isArray(v.visualStyles)
    ? v.visualStyles.join(", ")
    : v.visualStyle || (language === "en" ? "not detected" : "non détecté");
  const moods = Array.isArray(v.moods)
    ? v.moods.join(", ")
    : v.mood || (language === "en" ? "not detected" : "non détectée");
  const quality = v.quality || (language === "en" ? "not detected" : "non détectée");
  const finishes = Array.isArray(v.finishes) ? v.finishes.join(", ") : v.finish || "—";
  const usecases = Array.isArray(v.useCases) ? v.useCases.join(", ") : v.useCases || "—";
  const dimensions = v.dimensions || v.measurements || v.sizes || "";
  const specs = v.specifications || "";

  return language === "en"
    ? `VISION ANALYSIS (AI)
- Dominant palette: ${palette}
- Style: ${styles}
- Mood: ${moods}
- Materials: ${materials}
- Finishes: ${finishes}
- Quality: ${quality}
- Use cases: ${usecases}
${dimensions ? `- Dimensions: ${dimensions}` : ""}
${specs ? `- Specifications: ${specs}` : ""}`
    : `ANALYSE VISUELLE (Vision AI)
- Palette dominante : ${palette}
- Style : ${styles}
- Ambiance : ${moods}
- Matériaux : ${materials}
- Finitions : ${finishes}
- Qualité : ${quality}
- Cas d'usage : ${usecases}
${dimensions ? `- Dimensions : ${dimensions}` : ""}
${specs ? `- Spécifications : ${specs}` : ""}`;
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
        ? `
You are a Shopify UX/UI expert and eCommerce copywriter specialized in high-converting landing pages.
Generate a **complete, professional Tailwind HTML landing page** for PURE INFORMATIONAL purposes.

CRITICAL REQUIREMENTS:
1. **Technical Specifications Section**: ${enrichedSummary ? "MANDATORY - Create a comprehensive 'Technical Specifications' section with an elegant table/grid. Use ALL dimensions and attributes from ENRICHED DATA below." : "If internal analysis detected dimensions/measurements, create a detailed 'Technical Specifications' section"}
2. **Materials & Finishes Section**: ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "MANDATORY - Create a 'Materials & Finishes' section highlighting quality and craftsmanship" : "Include if materials are detected"}
3. **NO CTA BUTTONS**: 
   ⚠️ CRITICAL: This is a PURE INFORMATIONAL landing page.
   DO NOT include ANY buttons ("Buy Now", "Add to Cart", "Shop Now", "View Product", etc.)
   Focus on product presentation, features, and specifications ONLY.
4. **Quality Content**: Write persuasive, professional copy using the conversational description if available
5. **Complete Sections**: Hero, Image Gallery, ${enrichedSummary ? "Enriched Attributes," : ""} Key Benefits, Technical Specs, Materials & Finishes, Care Instructions, Sustainability, FAQ

Product Information:
- Title: ${productTitle}
- Brand: ${vendor}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}
- Main Color: ${mainColor}
- Layout Preference: ${layout}
- Content Length: ${length}
- Product URL: ${productUrl}

${enrichedSummary ? `\n✨ ENRICHED PRODUCT ATTRIBUTES (AI-DETECTED - USE THIS DATA!):\n${enrichedSummary}\n` : ""}

Images Available:
${imgs}

Variants Available:
${vars}

Custom Highlights:
${customHighlights}

MANDATORY COLOR RULES (ZERO TOLERANCE - WCAG AA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN TOKENS (USE THESE EXACT VALUES):
  • Primary: ${designTokens.primary}
  • Background (main): ${designTokens.background} ← ALWAYS WHITE/LIGHT
  • Background (sections): ${designTokens.surface} ← LIGHT GRAY
  • Text (main): ${designTokens.text} ← DARK (contrast: 7:1)
  • Text (muted): ${designTokens.textMuted} ← MEDIUM GRAY (contrast: 4.5:1)

🚫 STRICT PROHIBITIONS:
  1. NEVER use bg-[#...] for sections (except primary color)
  2. NEVER use text-[#...] for main text
  3. ALWAYS use predefined Tailwind classes

❌ ABSOLUTELY FORBIDDEN COLOR COMBINATIONS:
  1. text-white + bg-white → NEVER
  2. text-white + bg-gray-50 → NEVER
  3. text-white + bg-gray-100 → NEVER
  4. text-gray-300 + bg-white → NEVER (contrast too low)
  5. text-gray-400 + bg-gray-100 → NEVER (contrast too low)

✅ ONLY USE THESE CLASSES:
  • Backgrounds: bg-white, bg-gray-50, bg-gray-100, bg-[${designTokens.primary}]
  • Text: text-gray-900, text-gray-800, text-gray-700, text-black

❌ FORBIDDEN EXAMPLES:
<section class="bg-[#FFD700]"> <!-- NEVER -->
<h1 class="text-[#1A1A1A]">     <!-- NEVER -->

✅ CORRECT EXAMPLES:
<section class="bg-white">
<h1 class="text-gray-900">

🔍 VALIDATION CHECKLIST (YOU MUST FOLLOW):
  □ Every <h1>, <h2>, <h3> on light bg uses text-gray-900 or text-black
  □ Every <p> on light bg uses text-gray-700 or text-gray-800
  □ No text-white exists on any light background
  □ No text-gray-300 or text-gray-400 on white/light backgrounds
  □ No bg-[#...] except for primary color
  □ No text-[#...] for main text

📋 CORRECT COLOR EXAMPLE:
<section class="bg-white py-12">
  <h2 class="text-3xl font-bold text-gray-900">Perfect Contrast</h2>
  <p class="text-gray-700">This has excellent readability.</p>
</section>

DESIGN CONSTRAINTS:
- Mobile-first responsive (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Responsive grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Modern shadows: shadow-lg, shadow-xl
- Smooth transitions: transition-all duration-300
- Professional typography with proper hierarchy
- No <script> or <style> tags
- Return ONLY the HTML content (no markdown wrappers)

TECHNICAL SPECS TABLE EXAMPLE (if dimensions available):
<div class="bg-white rounded-xl shadow-lg p-8">
  <h2 class="text-3xl font-bold text-gray-900 mb-6">Technical Specifications</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="flex justify-between border-b py-3"><span class="font-semibold text-gray-900">Dimensions</span><span class="text-gray-700">L x W x H cm</span></div>
    <div class="flex justify-between border-b py-3"><span class="font-semibold text-gray-900">Weight</span><span class="text-gray-700">X kg</span></div>
    <!-- Add all enriched dimensions here -->
  </div>
</div>
`
        : `
Tu es un expert UX/UI Shopify et copywriter e-commerce spécialisé dans les landing pages à haute conversion.
Génère une **landing page HTML Tailwind complète et professionnelle** avec de vraies fonctionnalités.

EXIGENCES CRITIQUES:
1. **Section Caractéristiques Techniques**: ${enrichedSummary ? "OBLIGATOIRE - Crée une section complète 'Caractéristiques Techniques' avec un tableau/grille élégant. Utilise TOUTES les dimensions et attributs des DONNÉES ENRICHIES ci-dessous." : "Si l'analyse interne a détecté des dimensions/mesures, crée une section 'Caractéristiques Techniques'"}
2. **Section Matériaux & Finitions**: ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "OBLIGATOIRE - Crée une section 'Matériaux & Finitions' mettant en valeur la qualité et le savoir-faire" : "Inclure si des matériaux sont détectés"}
3. **AUCUN BOUTON CTA**: 
   ⚠️ CRITIQUE: Ceci est une landing page PUREMENT INFORMATIONNELLE.
   N'inclus AUCUN bouton ("Acheter", "Ajouter au Panier", "Voir le Produit", etc.)
   Concentre-toi UNIQUEMENT sur la présentation, les caractéristiques et spécifications du produit.
4. **Contenu de Qualité**: Rédige un contenu persuasif en utilisant la description conversationnelle si disponible
5. **Sections Complètes**: Hero, Galerie, ${enrichedSummary ? "Attributs Enrichis," : ""} Points Forts, Specs Techniques, Matériaux & Finitions, Entretien, Durabilité, FAQ

Informations Produit:
- Titre: ${productTitle}
- Marque: ${vendor}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}
- Couleur Principale: ${mainColor}
- Disposition: ${layout}
- Longueur Contenu: ${length}
- URL Produit: ${productUrl}

${enrichedSummary ? `\n✨ ATTRIBUTS PRODUIT ENRICHIS (DÉTECTÉS PAR IA - UTILISE CES DONNÉES!):\n${enrichedSummary}\n` : ""}

Images Disponibles:
${imgs}

Variantes Disponibles:
${vars}

Points Forts Personnalisés:
${customHighlights}

RÈGLES DE COULEURS OBLIGATOIRES (TOLÉRANCE ZÉRO - WCAG AA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 TOKENS DE DESIGN (UTILISE CES VALEURS EXACTES):
  • Primaire: ${designTokens.primary}
  • Fond (principal): ${designTokens.background} ← TOUJOURS BLANC/CLAIR
  • Fond (sections): ${designTokens.surface} ← GRIS CLAIR
  • Texte (principal): ${designTokens.text} ← FONCÉ (contraste: 7:1)
  • Texte (atténué): ${designTokens.textMuted} ← GRIS MOYEN (contraste: 4.5:1)

🚫 INTERDICTIONS STRICTES:
  1. N'utilise JAMAIS bg-[#...] pour les sections (sauf couleur primaire)
  2. N'utilise JAMAIS text-[#...] pour le texte principal
  3. TOUJOURS utiliser les classes Tailwind prédéfinies

❌ COMBINAISONS ABSOLUMENT INTERDITES:
  1. text-white + bg-white → JAMAIS
  2. text-white + bg-gray-50 → JAMAIS
  3. text-white + bg-gray-100 → JAMAIS
  4. text-gray-300 + bg-white → JAMAIS (contraste trop faible)
  5. text-gray-400 + bg-gray-100 → JAMAIS (contraste trop faible)

✅ UTILISE UNIQUEMENT CES CLASSES:
  • Fonds: bg-white, bg-gray-50, bg-gray-100, bg-[${designTokens.primary}]
  • Texte: text-gray-900, text-gray-800, text-gray-700, text-black

❌ EXEMPLES INTERDITS:
<section class="bg-[#FFD700]"> <!-- JAMAIS -->
<h1 class="text-[#1A1A1A]">     <!-- JAMAIS -->

✅ EXEMPLES CORRECTS:
<section class="bg-white">
<h1 class="text-gray-900">

🔍 CHECKLIST DE VALIDATION (TU DOIS SUIVRE):
  □ Tous les <h1>, <h2>, <h3> sur fond clair utilisent text-gray-900 ou text-black
  □ Tous les <p> sur fond clair utilisent text-gray-700 ou text-gray-800
  □ Aucun text-white n'existe sur un fond clair
  □ Aucun text-gray-300 ou text-gray-400 sur fonds blancs/clairs
  □ Aucun bg-[#...] sauf pour la couleur primaire
  □ Aucun text-[#...] pour le texte principal

📋 EXEMPLE DE COULEURS CORRECTES:
<section class="bg-white py-12">
  <h2 class="text-3xl font-bold text-gray-900">Contraste Parfait</h2>
  <p class="text-gray-700">Ceci a une excellente lisibilité.</p>
</section>

CONTRAINTES DESIGN:
- Responsive mobile-first (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grilles responsives: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Ombres modernes: shadow-lg, shadow-xl
- Transitions fluides: transition-all duration-300
- Typographie professionnelle avec hiérarchie claire
- Aucun tag <script> ou <style>
- Retourne UNIQUEMENT le contenu HTML (sans wrapper markdown)

EXEMPLE TABLEAU SPECS (si dimensions disponibles):
<div class="bg-white rounded-xl shadow-lg p-8">
  <h2 class="text-3xl font-bold text-gray-900 mb-6">Caractéristiques Techniques</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="flex justify-between border-b py-3"><span class="font-semibold text-gray-900">Dimensions</span><span class="text-gray-700">L x l x H cm</span></div>
    <div class="flex justify-between border-b py-3"><span class="font-semibold text-gray-900">Poids</span><span class="text-gray-700">X kg</span></div>
    <!-- Ajoute toutes les dimensions enrichies ici -->
  </div>
</div>
`;

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
          max_tokens: 5000,
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
    let html = data?.choices?.[0]?.message?.content?.trim() || "";
    html = sanitizeHtmlUnsafe(html);

    if (!html || html.length < 400)
      return new Response(
        JSON.stringify({ error: language === "en" ? "Generated HTML too short." : "HTML généré trop court." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    // 🔹 VALIDATION STRICTE des couleurs (post-génération)
    console.log("[VALIDATION] Checking color accessibility with advanced detection...");
    const colorValidation = validateColorContrast(html);

    if (!colorValidation.valid) {
      console.error("❌ CRITICAL: Color accessibility violations detected:");
      colorValidation.violations.forEach(v => console.error(`  - ${v}`));
      console.warn("⚠️ Landing page has WCAG AA violations. Consider regenerating.");
    } else {
      console.log("✅ Color accessibility validation passed");
    }

    // 📱 Conversion mobile-responsive
    console.log("[Mobile] Converting to mobile-responsive...");
    console.log("[Mobile] HTML before conversion (first 500 chars):", html.substring(0, 500));
    
    try {
      const mobileResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/convert-landing-to-mobile`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ htmlContent: html }),
      });

      if (mobileResponse.ok) {
        const mobileData = await mobileResponse.json();
        if (mobileData?.success && mobileData?.mobileHtml) {
          html = mobileData.mobileHtml;
          console.log("✅ Mobile conversion successful:", mobileData.optimizations);
          console.log("[Mobile] HTML after conversion (first 500 chars):", html.substring(0, 500));
          
          // Verify responsive classes are present
          const hasResponsiveClasses = /sm:|md:|lg:/.test(html);
          console.log(`[Mobile] Responsive classes detected: ${hasResponsiveClasses ? "✅ YES" : "❌ NO"}`);
        } else {
          console.warn("⚠️ Mobile conversion returned no data, using original HTML");
        }
      } else {
        const errorText = await mobileResponse.text();
        console.warn("⚠️ Mobile conversion failed:", errorText);
        console.warn("Using original HTML");
      }
    } catch (mobileError) {
      console.error("❌ Mobile conversion error (using original HTML):", mobileError);
    }

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
