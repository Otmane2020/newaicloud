import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      layout,
      length,
      customHighlights,
      language = "fr",
    } = body ?? {};

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

    // Build product URLs
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    const prompt =
      language === "en"
        ? `
You are an elite Shopify UX/UI designer creating premium HTML product descriptions.
Generate a **clean, professional HTML product description** with Tailwind CSS that will be inserted into Shopify product description field.

🎯 IMPORTANT: This is a PRODUCT DESCRIPTION, not a full landing page. No prices, no "Add to Cart" buttons, no checkout functionality.

⚠️ CRITICAL COLOR SYSTEM - YOU MUST USE THE THEME COLOR:
First, add this CSS section at the very beginning of your HTML:
<style>
  :root {
    --theme-color: ${mainColor};
    --theme-color-light: ${mainColor}33;
    --theme-color-dark: ${mainColor};
  }
  .theme-text { color: var(--theme-color) !important; }
  .theme-bg { background-color: var(--theme-color-light) !important; }
  .theme-border { border-color: var(--theme-color) !important; }
</style>

📱 MOBILE-FIRST RESPONSIVE DESIGN:
- **MOBILE-FIRST APPROACH**: Design for mobile devices first, then adapt for desktop
- Use simple, clean Tailwind classes with mobile-first breakpoints
- Focus on readability and content presentation on small screens
- Single column layout for mobile, multi-column only on larger screens
- Avoid complex layouts that might break in Shopify
- Use standard container: max-w-4xl mx-auto px-4
- Ensure touch-friendly element sizes on mobile

🎨 MODERN ICON LIBRARY - USE ONLY THESE APPROVED ICONS:

<!-- ✅ Dimensions/Measurements -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/>
</svg>

<!-- ✅ Materials -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"/>
</svg>

<!-- ✅ Quality/Check -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

<!-- ✅ Features/Lightning -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
</svg>

<!-- ✅ Maintenance/Settings -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
</svg>

<!-- ✅ Star/Premium -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
</svg>

🚫 STRICTLY PROHIBITED ICONS:
- ❌ NO emojis or Unicode characters (😀 🎨 ✨ 🏠)
- ❌ NO multi-color filled icons
- ❌ NO complex illustrations or drawings
- ❌ NO cartoon or kiddy style icons
- ❌ NO icons with stroke-width > 2
- ❌ ONLY use SVG icons from the approved library above

🎨 COLOR USAGE RULES (CRITICAL):
1. ALL section titles (H2, H3) MUST have class="theme-text"
2. ALL icons MUST have class="theme-text"
3. ALL badges/accents MUST use theme-bg or theme-border
4. NO hardcoded colors except neutral grays for body text
5. The theme color ${mainColor} MUST be DOMINANT in the design

📦 MANDATORY CONTENT SECTIONS (in this order):

1. **PRODUCT INTRODUCTION**
   - Clean H1 heading with product name
   - Brief compelling description
   - Focus on main benefits

2. **VISUAL ATTRIBUTES**
   ${enrichedProduct.ai_color || enrichedProduct.ai_material ? `
   - Highlight key visual features with modern icons
   - Use simple badge-style elements
   - Color: ${enrichedProduct.ai_color}
   - Material: ${enrichedProduct.ai_material}
   ` : ""}

3. **IMAGE GALLERY**
   - Display ${images.length} product images
   - Mobile: grid-cols-1, Tablet: grid-cols-2, Desktop: grid-cols-3
   - Clean, professional presentation

4. **TECHNICAL SPECIFICATIONS**
   ${enrichedSummary ? `
   - Create clean specifications table with modern icons
   - Use all enriched dimensions and attributes
   - Mobile: stack vertically, Desktop: two-column layout
   ` : "- Include basic product details"}

5. **MATERIALS & CRAFTSMANSHIP**
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - Detail materials and construction with relevant icons
   - Focus on quality and durability
   ` : ""}

6. **USE CASES & BENEFITS**
   - Practical applications with feature icons
   - Key customer benefits
   - Simple bullet points

7. **CARE & MAINTENANCE**
   - Basic care instructions with maintenance icons
   - Maintenance tips

📊 PRODUCT DATA:
- Title: ${productTitle}
- Brand: ${vendor || ""}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}

${enrichedSummary ? `\n📐 ENRICHED ATTRIBUTES:\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${visualAnalysis ? `\n🔍 VISION AI INSIGHTS:\n${visualAnalysis}\n` : ""}

${customHighlights ? `\n💡 CUSTOM HIGHLIGHTS:\n${customHighlights}\n` : ""}

🎨 DESIGN GUIDELINES:
- **Mobile-first approach**: Design for 320px+ screens first
- Clean, professional appearance
- Readable typography hierarchy with proper heading structure (H1, H2, H3, H4)
- Use theme color ${mainColor} for icons, accents and highlights
- All icons should use currentColor or theme-based coloring
- Adequate white space and padding for touch devices
- Single column layout for mobile, responsive grids for larger screens
- No complex animations or interactions
- Focus on content clarity and fast loading

🚫 STRICTLY PROHIBITED:
- NO "Add to Cart" buttons
- NO pricing information
- NO checkout functionality
- NO complex JavaScript
- NO external stylesheets
- NO iframes or embedded content
- NO complex grid layouts that break on mobile
- NO childish or cartoonish icons

✅ REQUIRED OUTPUT:
- Pure HTML with Tailwind classes only
- Clean, semantic structure with proper heading hierarchy (H1, H2, H3, H4)
- Mobile-first responsive design
- Modern SVG icons using theme color ${mainColor}
- Professional product presentation
- All images from provided list
- Comprehensive product information

Example modern icon usage:
<svg class="w-6 h-6" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>

Example mobile-first image grid:
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
  <img src="${images[0]?.src || ''}" alt="${images[0]?.alt_text || productTitle}" class="w-full h-auto rounded-lg">
  <!-- more images -->
</div>

Example mobile-friendly specifications with icons:
<div class="bg-gray-50 rounded-lg p-4 sm:p-6 my-8">
  <h3 class="text-lg sm:text-xl font-semibold mb-4 flex items-center">
    <svg class="w-5 h-5 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    </svg>
    Technical Specifications
  </h3>
  <div class="space-y-3 text-sm sm:text-base">
    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
      <span class="font-medium flex items-center">
        <svg class="w-4 h-4 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"></path>
        </svg>
        Material
      </span>
      <span>${enrichedProduct.ai_material || 'High-quality materials'}</span>
    </div>
    <!-- more specs -->
  </div>
</div>
`
        : `
Tu es un designer UX/UI Shopify créant des descriptions de produit HTML premium.
Génère une **description de produit HTML propre et professionnelle** avec Tailwind CSS qui sera insérée dans le champ description de Shopify.

🎯 IMPORTANT: Ceci est une DESCRIPTION DE PRODUIT, pas une landing page complète. Pas de prix, pas de boutons "Ajouter au Panier", pas de fonctionnalité de checkout.

📱 DESIGN RESPONSIVE MOBILE-FIRST:
- **APPROCHE MOBILE-FIRST**: Conçois d'abord pour mobile, puis adapte pour desktop
- Utilise des classes Tailwind simples avec breakpoints mobile-first
- Concentre-toi sur la lisibilité et présentation sur petits écrans
- Layout single colonne pour mobile, multi-colonnes seulement sur grands écrans
- Évite les layouts complexes qui pourraient casser dans Shopify
- Utilise un container standard: max-w-4xl mx-auto px-4
- Taille des éléments adaptée au touch sur mobile

⚠️ SYSTÈME DE COULEUR CRITIQUE - TU DOIS UTILISER LA COULEUR DU THÈME:
D'abord, ajoute cette section CSS au tout début de ton HTML:
<style>
  :root {
    --theme-color: ${mainColor};
    --theme-color-light: ${mainColor}33;
    --theme-color-dark: ${mainColor};
  }
  .theme-text { color: var(--theme-color) !important; }
  .theme-bg { background-color: var(--theme-color-light) !important; }
  .theme-border { border-color: var(--theme-color) !important; }
</style>

🎨 BIBLIOTHÈQUE D'ICÔNES MODERNES - UTILISE UNIQUEMENT CES ICÔNES APPROUVÉES:

<!-- ✅ Dimensions/Mesures -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/>
</svg>

<!-- ✅ Matériaux -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"/>
</svg>

<!-- ✅ Qualité/Check -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

<!-- ✅ Fonctionnalités/Lightning -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
</svg>

<!-- ✅ Maintenance/Réglages -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
</svg>

<!-- ✅ Étoile/Premium -->
<svg class="w-5 h-5 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
</svg>

🚫 ICÔNES STRICTEMENT INTERDITES:
- ❌ PAS d'émojis ou caractères Unicode (😀 🎨 ✨ 🏠)
- ❌ PAS d'icônes remplies multi-couleurs
- ❌ PAS d'illustrations complexes ou dessins
- ❌ PAS d'icônes style cartoon ou enfantin
- ❌ PAS d'icônes avec stroke-width > 2
- ❌ UNIQUEMENT les icônes SVG de la bibliothèque approuvée ci-dessus

🎨 RÈGLES D'UTILISATION DES COULEURS (CRITIQUE):
1. TOUS les titres de section (H2, H3) DOIVENT avoir class="theme-text"
2. TOUTES les icônes DOIVENT avoir class="theme-text"
3. TOUS les badges/accents DOIVENT utiliser theme-bg ou theme-border
4. PAS de couleurs hardcodées sauf gris neutres pour le texte body
5. La couleur du thème ${mainColor} DOIT être DOMINANTE dans le design

📦 SECTIONS DE CONTENU OBLIGATOIRES (dans cet ordre):

1. **INTRODUCTION PRODUIT**
   - Titre H1 propre avec nom du produit
   - Description brève et convaincante
   - Focus sur les bénéfices principaux

2. **ATTRIBUTS VISUELS**
   ${enrichedProduct.ai_color || enrichedProduct.ai_material ? `
   - Met en avant les caractéristiques visuelles clés avec des icônes modernes
   - Utilise des éléments style badges simples
   - Couleur: ${enrichedProduct.ai_color}
   - Matériau: ${enrichedProduct.ai_material}
   ` : ""}

3. **GALERIE IMAGES**
   - Affiche les ${images.length} images produit
   - Mobile: grid-cols-1, Tablet: grid-cols-2, Desktop: grid-cols-3
   - Présentation propre et professionnelle

4. **CARACTÉRISTIQUES TECHNIQUES**
   ${enrichedSummary ? `
   - Crée un tableau de spécifications propre avec des icônes modernes
   - Utilise toutes les dimensions et attributs enrichis
   - Mobile: disposition verticale, Desktop: layout deux colonnes
   ` : "- Inclure détails produit de base"}

5. **MATÉRIAUX & SAVOIR-FAIRE**
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - Détaille les matériaux et la construction avec des icônes pertinentes
   - Focus sur la qualité et la durabilité
   ` : ""}

6. **CAS D'USAGE & AVANTAGES**
   - Applications pratiques avec icônes de fonctionnalités
   - Bénéfices clients clés
   - Points simples sous forme de liste

7. **ENTRETIEN & MAINTENANCE**
   - Instructions d'entretien de base avec icônes de maintenance
   - Conseils de maintenance

📊 DONNÉES PRODUIT:
- Titre: ${productTitle}
- Marque: ${vendor || ""}
- Description: ${description}
- Style: ${style || enrichedProduct.style || ""}

${enrichedSummary ? `\n📐 ATTRIBUTS ENRICHIS:\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${visualAnalysis ? `\n🔍 INSIGHTS VISION AI:\n${visualAnalysis}\n` : ""}

${customHighlights ? `\n💡 POINTS FORTS PERSONNALISÉS:\n${customHighlights}\n` : ""}

🎨 DIRECTIVES DESIGN:
- **Approche mobile-first**: Conçois pour écrans 320px+ d'abord
- Apparence propre et professionnelle
- Hiérarchie typographique lisible avec structure de titres appropriée (H1, H2, H3, H4)
- Utilise la couleur de thème ${mainColor} pour les icônes, accents et surbrillances
- Toutes les icônes doivent utiliser currentColor ou un coloriage basé sur le thème
- Espace blanc et padding adaptés aux devices tactiles
- Layout single colonne pour mobile, grilles responsives pour grands écrans
- Pas d'animations ou interactions complexes
- Focus sur la clarté du contenu et chargement rapide

🚫 STRICTEMENT INTERDIT:
- PAS de boutons "Ajouter au Panier"
- PAS d'informations de prix
- PAS de fonctionnalité de checkout
- PAS de JavaScript complexe
- PAS de feuilles de style externes
- PAS d'iframes ou contenu embarqué
- PAS de grilles complexes qui cassent sur mobile
- PAS d'icônes enfantines ou cartoon

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind uniquement
- Structure sémantique propre avec hiérarchie de titres appropriée (H1, H2, H3, H4)
- Design responsive mobile-first
- Icônes SVG modernes utilisant la couleur de thème ${mainColor}
- Présentation produit professionnelle
- Toutes les images de la liste fournie
- Informations produit complètes

Exemple d'utilisation d'icônes modernes:
<svg class="w-6 h-6" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>

Exemple grille images mobile-first:
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
  <img src="${images[0]?.src || ''}" alt="${images[0]?.alt_text || productTitle}" class="w-full h-auto rounded-lg">
  <!-- plus d'images -->
</div>

Exemple spécifications mobile avec icônes:
<div class="bg-gray-50 rounded-lg p-4 sm:p-6 my-8">
  <h3 class="text-lg sm:text-xl font-semibold mb-4 flex items-center">
    <svg class="w-5 h-5 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    </svg>
    Caractéristiques Techniques
  </h3>
  <div class="space-y-3 text-sm sm:text-base">
    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
      <span class="font-medium flex items-center">
        <svg class="w-4 h-4 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"></path>
        </svg>
        Matériau
      </span>
      <span>${enrichedProduct.ai_material || 'Matériaux de qualité'}</span>
    </div>
    <!-- plus de specs -->
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
                  ? `You are a professional Shopify product description writer. You create clean, responsive HTML product descriptions using Tailwind CSS.

CRITICAL ICON RULES:
1. Use ONLY SVG icons with minimal stroke (stroke-width="1.5")
2. All icons MUST have class="theme-text" to inherit theme color
3. Style: minimalist, geometric, professional
4. NO emojis, NO drawings, NO multi-colors
5. Each section must have its appropriate icon from the provided library

CRITICAL COLOR RULES:
1. All H2/H3 titles MUST have class="theme-text"
2. All badges/accents MUST have theme-bg or theme-border
3. NO hardcoded colors except neutral gray for body text
4. Theme color ${mainColor} MUST be DOMINANT in design
5. ALWAYS include the CSS variables section at the beginning

Focus on presenting product information clearly without any e-commerce functionality. No prices, no add to cart buttons.`
                  : `Tu es un rédacteur professionnel de descriptions de produit Shopify. Tu crées des descriptions de produit HTML propres et responsives avec Tailwind CSS.

RÈGLES CRITIQUES POUR LES ICÔNES:
1. Utilise UNIQUEMENT des icônes SVG avec stroke minimal (stroke-width="1.5")
2. Toutes les icônes DOIVENT avoir class="theme-text" pour hériter la couleur du thème
3. Style: minimaliste, géométrique, professionnel
4. PAS d'émojis, PAS de dessins, PAS de multi-couleurs
5. Chaque section doit avoir son icône appropriée de la bibliothèque fournie

RÈGLES CRITIQUES POUR LES COULEURS:
1. Tous les titres H2/H3 DOIVENT avoir class="theme-text"
2. Tous les badges/accents DOIVENT avoir theme-bg ou theme-border
3. PAS de couleurs hardcodées sauf gris neutre pour le texte body
4. La couleur du thème ${mainColor} DOIT être DOMINANTE dans le design
5. TOUJOURS inclure la section variables CSS au début

Concentre-toi sur la présentation claire des informations produit sans fonctionnalité e-commerce. Pas de prix, pas de boutons ajouter au panier.`,
            },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 5000,
        }),
        signal: aiController.signal,
      });
    } finally {
      clearTimeout(aiTimeout);
    }

    console.log("✅ AI generation completed");

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("Lovable AI API error:", aiResponse.status, text);
      return new Response(
        JSON.stringify({
          error: `Lovable API ${aiResponse.status}`,
          detail: "Please check your API key and model availability",
        }),
        {
          status: aiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await aiResponse.json();
    let html = data?.choices?.[0]?.message?.content?.trim() || "";
    html = sanitizeHtmlUnsafe(html);

    // 🔍 Post-generation validation
    console.log("🔍 Validating generated HTML...");
    
    const hasThemeColor = html.includes(mainColor) || 
                         html.includes('theme-text') || 
                         html.includes('var(--theme-color)');
    
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const hasEmojis = emojiRegex.test(html);

    if (!hasThemeColor) {
      console.warn("⚠️ Generated HTML doesn't use theme color properly - theme color may not be visible");
    } else {
      console.log("✅ Theme color system detected in HTML");
    }

    if (hasEmojis) {
      console.warn("⚠️ Emojis detected in HTML - cleaning...");
      html = html.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      console.log("✅ Emojis removed from HTML");
    }

    if (!html || html.length < 300)
      return new Response(
        JSON.stringify({
          error: language === "en" ? "Generated HTML too short or empty." : "HTML généré trop court ou vide.",
          generatedLength: html.length,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    console.log(`✅ Generated HTML length: ${html.length} characters`);

    // 💾 Sauvegarde dans product_landing_pages (only if user is authenticated)
    if (userId && product_id) {
      console.log("💾 Saving product description to database...");

      try {
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
          console.log(`✅ Product description v${newVersion} saved successfully`);
        }
      } catch (saveError) {
        console.error("❌ Database save error:", saveError);
      }
    } else {
      console.log("⚠️ Skipping save: userId or product_id not available");
    }

    console.log("✅ Product description generation successful!");
    return new Response(
      JSON.stringify({
        html,
        enrichment_status: enrichmentStatus,
        attributes_count: attributesCount,
        html_length: html.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        type: "RUNTIME_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});