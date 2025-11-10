import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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
You are an elite Shopify UX/UI designer creating luxury, high-converting landing pages.
Generate a **complete, premium HTML landing page** with Tailwind CSS and professional structure.

🎯 MANDATORY PAGE STRUCTURE (in this exact order):

1. **HERO SECTION** (py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white)
   - Full-width hero with product image on left (50%) and content on right (50%) on desktop
   - Mobile: Stack vertically (image top, content below)
   - H1: text-4xl md:text-5xl lg:text-6xl font-bold
   - Tagline: text-xl md:text-2xl text-gray-600
   - Primary CTA: Large button with shadow-2xl hover:shadow-3xl

2. **IMAGE GALLERY GRID** (py-16 bg-white)
   - Grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
   - Each image: aspect-ratio-square, rounded-xl, shadow-lg hover:scale-105 transition-transform duration-500
   - Use ALL ${images.length} images provided

3. **VISUAL ATTRIBUTES CARDS** (py-20 bg-gradient-to-b from-white to-gray-50)
   ${enrichedProduct.ai_color || enrichedProduct.ai_material || enrichedProduct.ai_shape ? `
   - MANDATORY section: "Visual Identity"
   - Grid of icon cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
   - Each card: bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300
   - Include detected: Color (${enrichedProduct.ai_color}), Material (${enrichedProduct.ai_material}), Shape (${enrichedProduct.ai_shape}), Texture (${enrichedProduct.ai_texture}), Pattern (${enrichedProduct.ai_pattern}), Finish (${enrichedProduct.ai_finish})
   ` : "- Create cards for any visual attributes mentioned in description"}

4. **TECHNICAL SPECIFICATIONS TABLE** (py-16 bg-white)
   ${enrichedSummary ? `
   - MANDATORY: Create comprehensive "Technical Specifications" section
   - Elegant table with: bg-gray-50 rounded-2xl p-8 shadow-inner
   - Grid: grid-cols-1 md:grid-cols-2 gap-6
   - Each row: flex justify-between items-center border-b border-gray-200 py-4
   - Include ALL dimensions from enriched data
   ` : "- Include if dimensions detected by Vision AI"}

5. **MATERIALS & FINISHES** (py-20 bg-gradient-to-br from-gray-100 to-gray-50)
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - MANDATORY: "Materials & Craftsmanship" section
   - 2-column layout with image + detailed text
   - Highlight quality, durability, craftsmanship
   - Use Vision AI data: ${enrichedProduct.ai_material}, ${enrichedProduct.ai_finish}
   ` : ""}

6. **USE CASES / LIFESTYLE** (py-16 bg-white)
   - "Perfect For" section with icon cards
   - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
   - Based on Vision AI mood/style: ${visualAnalysis ? "detected" : "infer from product"}

7. **KEY BENEFITS** (py-20 bg-gradient-to-b from-white to-gray-100)
   - 3-4 benefit cards with icons
   - Cards: bg-white rounded-xl shadow-lg p-6 hover:shadow-xl

8. **FAQ SECTION** (py-16 bg-white)
   - Accordion-style (use details/summary HTML)
   - 5-6 relevant questions with detailed answers

9. **FINAL CTA HERO** (py-24 bg-gradient-to-r from-gray-900 to-gray-800 text-white)
   - Full-width CTA with strong call to action
   - Multiple buttons: "View Product" + "Add to Cart"
   - Trust badges: "Free Shipping", "30-Day Returns", etc.

📦 PRODUCT DATA:
- Title: ${productTitle}
- Brand: ${vendor || "Premium Brand"}
- Description: ${description}
- Style: ${style || enrichedProduct.style || "Contemporary"}
- Primary Color: ${mainColor}
- Product URL: ${productUrl}

${enrichedSummary ? `\n✨ ENRICHED ATTRIBUTES (MUST USE ALL):\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total - use ALL):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

🎨 VARIANTS (${variants.length} total):
${variants.map((v) => `- ${v.title}${v.image_url ? ` → ${v.image_url}` : ""}`).join("\n")}

${visualAnalysis ? `\n🔍 VISION AI ANALYSIS:\n${visualAnalysis}\n` : ""}

${customHighlights ? `\n💡 CUSTOM HIGHLIGHTS:\n${customHighlights}\n` : ""}

🎨 PREMIUM TAILWIND CLASSES (MUST USE):
- Backgrounds: bg-gradient-to-br from-gray-50 to-gray-100, bg-gradient-to-r from-blue-500 to-purple-600
- Shadows: shadow-2xl, shadow-3xl, hover:shadow-4xl, shadow-[0_20px_50px_rgba(0,0,0,0.15)]
- Blur effects: backdrop-blur-sm bg-white/90
- Rings: ring-2 ring-offset-4 ring-[${mainColor}]
- Transitions: transition-all duration-500 ease-out
- Hover effects: hover:scale-105 hover:-translate-y-2
- Grid gaps: gap-8 md:gap-12 lg:gap-16

📱 MOBILE-FIRST RESPONSIVE (CRITICAL):
- Base mobile: px-4 py-8 text-base
- Tablet (sm:640px): sm:px-6 sm:py-12 sm:text-lg
- Desktop (md:768px): md:px-8 md:py-16 md:text-xl
- Large (lg:1024px): lg:px-12 lg:py-20 lg:text-2xl
- XL (xl:1280px): xl:px-16 xl:py-24

- Typography scale:
  * H1: text-3xl md:text-5xl lg:text-6xl xl:text-7xl
  * H2: text-2xl md:text-4xl lg:text-5xl
  * H3: text-xl md:text-3xl lg:text-4xl
  * Body: text-base md:text-lg lg:text-xl
  * Small: text-sm md:text-base

- Grid responsive:
  * 1 col mobile → 2 col tablet → 3-4 col desktop
  * Example: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

🔗 FUNCTIONAL BUTTONS (MANDATORY):

View Product Button:
<a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[${mainColor}] rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
  View Full Details →
</a>

Add to Cart Button:
<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
  🛒 Add to Cart
</button>

⚠️ CRITICAL RULES:
- NO <script>, <style>, <html>, <head>, <body> tags
- Return ONLY the page content (divs, sections)
- Use inline Tailwind classes ONLY
- All images must use provided URLs
- All buttons must be functional with correct href/onclick
- Write persuasive, professional copy
- Use ${language === "en" ? "English" : "French"} language
- Minimum 8 distinct sections with clear visual separation
`
        : `
Tu es un designer UX/UI Shopify créant des landing pages premium et haute conversion.
Génère une **landing page HTML complète et professionnelle** avec Tailwind CSS et structure élégante.

🎯 STRUCTURE OBLIGATOIRE (dans cet ordre exact):

1. **SECTION HERO** (py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white)
   - Hero pleine largeur avec image produit à gauche (50%) et contenu à droite (50%) sur desktop
   - Mobile: Empiler verticalement (image en haut, contenu en bas)
   - H1: text-4xl md:text-5xl lg:text-6xl font-bold
   - Accroche: text-xl md:text-2xl text-gray-600
   - CTA primaire: Gros bouton avec shadow-2xl hover:shadow-3xl

2. **GALERIE IMAGES GRID** (py-16 bg-white)
   - Grille: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
   - Chaque image: aspect-ratio-square, rounded-xl, shadow-lg hover:scale-105 transition-transform duration-500
   - Utilise TOUTES les ${images.length} images fournies

3. **CARTES ATTRIBUTS VISUELS** (py-20 bg-gradient-to-b from-white to-gray-50)
   ${enrichedProduct.ai_color || enrichedProduct.ai_material || enrichedProduct.ai_shape ? `
   - Section OBLIGATOIRE: "Identité Visuelle"
   - Grille de cartes avec icônes: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
   - Chaque carte: bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300
   - Inclure détectés: Couleur (${enrichedProduct.ai_color}), Matériau (${enrichedProduct.ai_material}), Forme (${enrichedProduct.ai_shape}), Texture (${enrichedProduct.ai_texture}), Motif (${enrichedProduct.ai_pattern}), Finition (${enrichedProduct.ai_finish})
   ` : "- Créer cartes pour attributs visuels mentionnés"}

4. **TABLEAU CARACTÉRISTIQUES TECHNIQUES** (py-16 bg-white)
   ${enrichedSummary ? `
   - OBLIGATOIRE: Section "Caractéristiques Techniques" complète
   - Tableau élégant: bg-gray-50 rounded-2xl p-8 shadow-inner
   - Grille: grid-cols-1 md:grid-cols-2 gap-6
   - Chaque ligne: flex justify-between items-center border-b border-gray-200 py-4
   - Inclure TOUTES les dimensions des données enrichies
   ` : "- Inclure si dimensions détectées par Vision AI"}

5. **MATÉRIAUX & FINITIONS** (py-20 bg-gradient-to-br from-gray-100 to-gray-50)
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - OBLIGATOIRE: Section "Matériaux & Savoir-Faire"
   - Layout 2 colonnes avec image + texte détaillé
   - Mettre en avant qualité, durabilité, artisanat
   - Utiliser données Vision AI: ${enrichedProduct.ai_material}, ${enrichedProduct.ai_finish}
   ` : ""}

6. **CAS D'USAGE / LIFESTYLE** (py-16 bg-white)
   - Section "Parfait Pour" avec cartes icônes
   - Grille: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
   - Basé sur ambiance/style Vision AI: ${visualAnalysis ? "détecté" : "inférer du produit"}

7. **POINTS FORTS CLÉS** (py-20 bg-gradient-to-b from-white to-gray-100)
   - 3-4 cartes bénéfices avec icônes
   - Cartes: bg-white rounded-xl shadow-lg p-6 hover:shadow-xl

8. **SECTION FAQ** (py-16 bg-white)
   - Style accordéon (utiliser details/summary HTML)
   - 5-6 questions pertinentes avec réponses détaillées

9. **CTA HERO FINAL** (py-24 bg-gradient-to-r from-gray-900 to-gray-800 text-white)
   - CTA pleine largeur avec appel fort à l'action
   - Plusieurs boutons: "Voir Produit" + "Ajouter Panier"
   - Badges confiance: "Livraison Gratuite", "Retours 30j", etc.

📦 DONNÉES PRODUIT:
- Titre: ${productTitle}
- Marque: ${vendor || "Marque Premium"}
- Description: ${description}
- Style: ${style || enrichedProduct.style || "Contemporain"}
- Couleur Principale: ${mainColor}
- URL Produit: ${productUrl}

${enrichedSummary ? `\n✨ ATTRIBUTS ENRICHIS (UTILISER TOUS):\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total - utiliser TOUTES):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

🎨 VARIANTES (${variants.length} total):
${variants.map((v) => `- ${v.title}${v.image_url ? ` → ${v.image_url}` : ""}`).join("\n")}

${visualAnalysis ? `\n🔍 ANALYSE VISION AI:\n${visualAnalysis}\n` : ""}

${customHighlights ? `\n💡 POINTS FORTS PERSONNALISÉS:\n${customHighlights}\n` : ""}

🎨 CLASSES TAILWIND PREMIUM (UTILISER):
- Arrière-plans: bg-gradient-to-br from-gray-50 to-gray-100, bg-gradient-to-r from-blue-500 to-purple-600
- Ombres: shadow-2xl, shadow-3xl, hover:shadow-4xl, shadow-[0_20px_50px_rgba(0,0,0,0.15)]
- Effets blur: backdrop-blur-sm bg-white/90
- Anneaux: ring-2 ring-offset-4 ring-[${mainColor}]
- Transitions: transition-all duration-500 ease-out
- Effets hover: hover:scale-105 hover:-translate-y-2
- Espaces grille: gap-8 md:gap-12 lg:gap-16

📱 RESPONSIVE MOBILE-FIRST (CRITIQUE):
- Base mobile: px-4 py-8 text-base
- Tablette (sm:640px): sm:px-6 sm:py-12 sm:text-lg
- Desktop (md:768px): md:px-8 md:py-16 md:text-xl
- Large (lg:1024px): lg:px-12 lg:py-20 lg:text-2xl
- XL (xl:1280px): xl:px-16 xl:py-24

- Échelle typo:
  * H1: text-3xl md:text-5xl lg:text-6xl xl:text-7xl
  * H2: text-2xl md:text-4xl lg:text-5xl
  * H3: text-xl md:text-3xl lg:text-4xl
  * Corps: text-base md:text-lg lg:text-xl
  * Petit: text-sm md:text-base

- Grille responsive:
  * 1 col mobile → 2 col tablette → 3-4 col desktop
  * Exemple: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

🔗 BOUTONS FONCTIONNELS (OBLIGATOIRE):

Bouton Voir Produit:
<a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[${mainColor}] rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
  Voir Tous les Détails →
</a>

Bouton Ajouter Panier:
<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
  🛒 Ajouter au Panier
</button>

⚠️ RÈGLES CRITIQUES:
- PAS de balises <script>, <style>, <html>, <head>, <body>
- Retourne UNIQUEMENT le contenu page (divs, sections)
- Utilise classes Tailwind inline SEULEMENT
- Toutes images doivent utiliser URLs fournies
- Tous boutons doivent être fonctionnels avec href/onclick corrects
- Rédige contenu persuasif et professionnel
- Utilise la langue ${language === "en" ? "anglaise" : "française"}
- Minimum 8 sections distinctes avec séparation visuelle claire
- Responsive mobile-first (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grilles responsives: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Couleur primaire ${mainColor} pour CTAs, titres, accents
- Ombres modernes: shadow-lg, shadow-xl
- Transitions fluides: transition-all duration-300
- Typographie professionnelle avec hiérarchie claire
- Aucun tag <script> ou <style>
- Retourne UNIQUEMENT le contenu HTML (sans wrapper markdown)

EXEMPLE TABLEAU SPECS (si dimensions disponibles):
<div class="bg-white rounded-xl shadow-lg p-8">
  <h2 class="text-3xl font-bold mb-6">Caractéristiques Techniques</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="flex justify-between border-b py-3"><span class="font-semibold">Dimensions</span><span>L x l x H cm</span></div>
    <div class="flex justify-between border-b py-3"><span class="font-semibold">Poids</span><span>X kg</span></div>
    <!-- Ajoute toutes les dimensions enrichies ici -->
  </div>
</div>

STRUCTURE BOUTONS:
<a href="${productUrl}" target="_blank" rel="noopener" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Voir Tous les Détails
</a>

<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Ajouter au Panier
</button>
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
                  ? "You are an elite Shopify landing page designer creating luxury, high-converting pages. You craft beautiful HTML with premium Tailwind design, persuasive copy, and functional buttons. You MUST create comprehensive sections with proper structure, responsive design, and professional visual hierarchy. When enriched product attributes are provided, you create detailed Technical Specifications and Materials sections with elegant tables and cards."
                  : "Tu es un designer Shopify élite créant des landing pages luxueuses et hautement converties. Tu crées du HTML magnifique avec design Tailwind premium, copywriting persuasif et boutons fonctionnels. Tu DOIS créer des sections complètes avec structure appropriée, design responsive et hiérarchie visuelle professionnelle. Quand des attributs produit enrichis sont fournis, tu crées des sections Caractéristiques Techniques et Matériaux détaillées avec tableaux et cartes élégants.",
            },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 8000,
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

    if (!html || html.length < 400)
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
      console.log("💾 Saving landing page to database...");

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
          console.log(`✅ Landing page v${newVersion} saved successfully`);
        }
      } catch (saveError) {
        console.error("❌ Database save error:", saveError);
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
