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
Generate a **complete, professional Tailwind HTML landing page** with real functionality.

CRITICAL REQUIREMENTS:
1. **Technical Specifications Section**: ${enrichedSummary ? "MANDATORY - Create a comprehensive 'Technical Specifications' section with an elegant table/grid. Use ALL dimensions and attributes from ENRICHED DATA below." : "If Vision AI detected dimensions/measurements, create a detailed 'Technical Specifications' section"}
2. **Materials & Finishes Section**: ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "MANDATORY - Create a 'Materials & Finishes' section highlighting quality and craftsmanship" : "Include if materials are detected"}
3. **Functional Buttons**: 
   - "View Product" button must link to: ${productUrl}
   - "Add to Cart" buttons must have: onclick="window.open('${productUrl}', '_blank')" 
   - All buttons must be clickable and functional
4. **Quality Content**: Write persuasive, professional copy using the conversational description if available
5. **Complete Sections**: Hero, Image Gallery, ${enrichedSummary ? "Enriched Attributes," : ""} Vision AI Insights, Key Benefits, Technical Specs, Materials & Finishes, Care Instructions, Sustainability, Social Proof, FAQ, Strong CTA

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

${visualAnalysis ? `${visualAnalysis}\n` : ""}

Custom Highlights:
${customHighlights}

DESIGN CONSTRAINTS:
- Mobile-first responsive (sm:, md:, lg:, xl:)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Responsive grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Primary color ${mainColor} for CTAs, headings, accents
- Modern shadows: shadow-lg, shadow-xl
- Smooth transitions: transition-all duration-300
- Professional typography with proper hierarchy
- No <script> or <style> tags
- Return ONLY the HTML content (no markdown wrappers)

TECHNICAL SPECS TABLE EXAMPLE (if dimensions available):
<div class="bg-white rounded-xl shadow-lg p-8">
  <h2 class="text-3xl font-bold mb-6">Technical Specifications</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="flex justify-between border-b py-3"><span class="font-semibold">Dimensions</span><span>L x W x H cm</span></div>
    <div class="flex justify-between border-b py-3"><span class="font-semibold">Weight</span><span>X kg</span></div>
    <!-- Add all enriched dimensions here -->
  </div>
</div>

BUTTON STRUCTURE:
<a href="${productUrl}" target="_blank" rel="noopener" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  View Full Details
</a>

<button onclick="window.open('${productUrl}', '_blank')" class="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[${mainColor}] hover:bg-opacity-90 rounded-lg shadow-lg transition-all duration-300">
  Add to Cart
</button>
`
        : `
Tu es un expert UX/UI Shopify et copywriter e-commerce spécialisé dans les landing pages à haute conversion.
Génère une **landing page HTML Tailwind complète et professionnelle** avec de vraies fonctionnalités.

EXIGENCES CRITIQUES:
1. **Section Caractéristiques Techniques**: ${enrichedSummary ? "OBLIGATOIRE - Crée une section complète 'Caractéristiques Techniques' avec un tableau/grille élégant. Utilise TOUTES les dimensions et attributs des DONNÉES ENRICHIES ci-dessous." : "Si la Vision AI a détecté des dimensions/mesures, crée une section 'Caractéristiques Techniques'"}
2. **Section Matériaux & Finitions**: ${enrichedProduct.ai_material || enrichedProduct.ai_finish ? "OBLIGATOIRE - Crée une section 'Matériaux & Finitions' mettant en valeur la qualité et le savoir-faire" : "Inclure si des matériaux sont détectés"}
3. **Boutons Fonctionnels**: 
   - Le bouton "Voir le Produit" doit pointer vers: ${productUrl}
   - Les boutons "Ajouter au Panier" doivent avoir: onclick="window.open('${productUrl}', '_blank')"
   - Tous les boutons doivent être cliquables et fonctionnels
4. **Contenu de Qualité**: Rédige un contenu persuasif en utilisant la description conversationnelle si disponible
5. **Sections Complètes**: Hero, Galerie, ${enrichedSummary ? "Attributs Enrichis," : ""} Insights Vision AI, Points Forts, Specs Techniques, Matériaux & Finitions, Entretien, Durabilité, Preuves Sociales, FAQ, CTA Fort

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

${visualAnalysis ? `${visualAnalysis}\n` : ""}

Points Forts Personnalisés:
${customHighlights}

CONTRAINTES DESIGN:
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
