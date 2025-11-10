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

📱 RESPONSIVE DESIGN REQUIREMENTS:
- Use simple, clean Tailwind classes
- Focus on readability and content presentation
- Avoid complex layouts that might break in Shopify
- Use standard container: max-w-4xl mx-auto px-4

📦 MANDATORY CONTENT SECTIONS (in this order):

1. **PRODUCT INTRODUCTION**
   - Clean heading with product name
   - Brief compelling description
   - Focus on main benefits

2. **VISUAL ATTRIBUTES**
   ${enrichedProduct.ai_color || enrichedProduct.ai_material ? `
   - Highlight key visual features
   - Use simple badge-style elements
   - Color: ${enrichedProduct.ai_color}
   - Material: ${enrichedProduct.ai_material}
   ` : ""}

3. **IMAGE GALLERY**
   - Display ${images.length} product images
   - Simple grid: grid-cols-2 md:grid-cols-3 gap-4
   - Clean, professional presentation

4. **TECHNICAL SPECIFICATIONS**
   ${enrichedSummary ? `
   - Create clean specifications table
   - Use all enriched dimensions and attributes
   - Simple two-column layout
   ` : "- Include basic product details"}

5. **MATERIALS & CRAFTSMANSHIP**
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - Detail materials and construction
   - Focus on quality and durability
   ` : ""}

6. **USE CASES & BENEFITS**
   - Practical applications
   - Key customer benefits
   - Simple bullet points

7. **CARE & MAINTENANCE**
   - Basic care instructions
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
- Clean, professional appearance
- Readable typography hierarchy
- Subtle color accents using ${mainColor}
- Adequate white space
- Mobile-friendly simple layouts
- No complex animations or interactions
- Focus on content clarity

🚫 STRICTLY PROHIBITED:
- NO "Add to Cart" buttons
- NO pricing information
- NO checkout functionality
- NO complex JavaScript
- NO external stylesheets
- NO iframes or embedded content
- NO complex grid layouts that break in Shopify

✅ REQUIRED OUTPUT:
- Pure HTML with Tailwind classes only
- Clean, semantic structure
- Mobile-responsive simple design
- Professional product presentation
- All images from provided list
- Comprehensive product information

Example simple image grid:
<div class="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
  <img src="${images[0]?.src || ''}" alt="${images[0]?.alt_text || productTitle}" class="w-full h-auto rounded-lg">
  <!-- more images -->
</div>

Example specifications table:
<div class="bg-gray-50 rounded-lg p-6 my-8">
  <h3 class="text-xl font-semibold mb-4">Technical Specifications</h3>
  <div class="space-y-2">
    <div class="flex justify-between"><span>Material</span><span>${enrichedProduct.ai_material || 'High-quality materials'}</span></div>
    <!-- more specs -->
  </div>
</div>
`
        : `
Tu es un designer UX/UI Shopify créant des descriptions de produit HTML premium.
Génère une **description de produit HTML propre et professionnelle** avec Tailwind CSS qui sera insérée dans le champ description de Shopify.

🎯 IMPORTANT: Ceci est une DESCRIPTION DE PRODUIT, pas une landing page complète. Pas de prix, pas de boutons "Ajouter au Panier", pas de fonctionnalité de checkout.

📱 EXIGENCES DESIGN RESPONSIVE:
- Utilise des classes Tailwind simples et propres
- Concentre-toi sur la lisibilité et la présentation du contenu
- Évite les layouts complexes qui pourraient casser dans Shopify
- Utilise un container standard: max-w-4xl mx-auto px-4

📦 SECTIONS DE CONTENU OBLIGATOIRES (dans cet ordre):

1. **INTRODUCTION PRODUIT**
   - Titre propre avec nom du produit
   - Description brève et convaincante
   - Focus sur les bénéfices principaux

2. **ATTRIBUTS VISUELS**
   ${enrichedProduct.ai_color || enrichedProduct.ai_material ? `
   - Met en avant les caractéristiques visuelles clés
   - Utilise des éléments style badges simples
   - Couleur: ${enrichedProduct.ai_color}
   - Matériau: ${enrichedProduct.ai_material}
   ` : ""}

3. **GALERIE IMAGES**
   - Affiche les ${images.length} images produit
   - Grille simple: grid-cols-2 md:grid-cols-3 gap-4
   - Présentation propre et professionnelle

4. **CARACTÉRISTIQUES TECHNIQUES**
   ${enrichedSummary ? `
   - Crée un tableau de spécifications propre
   - Utilise toutes les dimensions et attributs enrichis
   - Layout deux colonnes simple
   ` : "- Inclure détails produit de base"}

5. **MATÉRIAUX & SAVOIR-FAIRE**
   ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? `
   - Détaille les matériaux et la construction
   - Focus sur la qualité et la durabilité
   ` : ""}

6. **CAS D'USAGE & AVANTAGES**
   - Applications pratiques
   - Bénéfices clients clés
   - Points simples sous forme de liste

7. **ENTRETIEN & MAINTENANCE**
   - Instructions d'entretien de base
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
- Apparence propre et professionnelle
- Hiérarchie typographique lisible
- Accents de couleur subtils avec ${mainColor}
- Espace blanc adéquat
- Layouts simples mobile-friendly
- Pas d'animations ou interactions complexes
- Focus sur la clarté du contenu

🚫 STRICTEMENT INTERDIT:
- PAS de boutons "Ajouter au Panier"
- PAS d'informations de prix
- PAS de fonctionnalité de checkout
- PAS de JavaScript complexe
- PAS de feuilles de style externes
- PAS d'iframes ou contenu embarqué
- PAS de grilles complexes qui cassent dans Shopify

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind uniquement
- Structure sémantique propre
- Design simple et responsive mobile
- Présentation produit professionnelle
- Toutes les images de la liste fournie
- Informations produit complètes

Exemple grille images simple:
<div class="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
  <img src="${images[0]?.src || ''}" alt="${images[0]?.alt_text || productTitle}" class="w-full h-auto rounded-lg">
  <!-- plus d'images -->
</div>

Exemple tableau spécifications:
<div class="bg-gray-50 rounded-lg p-6 my-8">
  <h3 class="text-xl font-semibold mb-4">Caractéristiques Techniques</h3>
  <div class="space-y-2">
    <div class="flex justify-between"><span>Matériau</span><span>${enrichedProduct.ai_material || 'Matériaux de qualité'}</span></div>
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
          model: "gpt-4", // ✅ Using GPT-4 instead of Gemini
          messages: [
            {
              role: "system",
              content:
                language === "en"
                  ? "You are a professional Shopify product description writer. You create clean, responsive HTML product descriptions using Tailwind CSS. You focus on presenting product information clearly without any e-commerce functionality. No prices, no add to cart buttons, just beautiful product presentation that works well in Shopify's description field."
                  : "Tu es un rédacteur professionnel de descriptions de produit Shopify. Tu crées des descriptions de produit HTML propres et responsives avec Tailwind CSS. Tu te concentres sur la présentation claire des informations produit sans aucune fonctionnalité e-commerce. Pas de prix, pas de boutons ajouter au panier, juste une belle présentation produit qui fonctionne bien dans le champ description de Shopify.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
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