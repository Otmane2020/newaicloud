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

    // ✅ RÉCUPÉRATION COMPLÈTE DES PARAMÈTRES
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style, // ✅ Style visuel
      mainColor = "#3B82F6", // ✅ Couleur principale
      layout, // ✅ Layout
      length, // ✅ Longueur contenu
      customHighlights, // ✅ Highlights personnalisés
      mentionBrand = true, // ✅ Mention marque
      vendorSource, // ✅ Source vendor
      language = "fr",
      mobileFirst = true,
      imageAnalysis,
      contentLengthParams,
    } = body ?? {};

    console.log("🎯 CONFIGURATION REÇUE:", {
      productTitle,
      style,
      mainColor,
      layout,
      length,
      customHighlights: customHighlights ? `${customHighlights.substring(0, 50)}...` : "none",
      mentionBrand,
      vendorSource,
      vendor,
      mobileFirst,
    });

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Missing required field: productTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!product_id) {
      return new Response(JSON.stringify({ error: "Missing required field: product_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    console.log(`📱 Starting generation with style: ${style}, color: ${mainColor}, layout: ${layout}`);

    // 🔧 Product Enrichment
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
        console.log("✅ Enrichment completed");
        enrichmentStatus = "success";
      }
    } catch (err) {
      console.log("⚠️ Enrichment timeout:", err.message);
      enrichmentStatus = "failed";
    }

    // Fetch product data
    console.log("📦 Fetching product data...");
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

    console.log(`✅ Product data: ${images.length} images, ${attributesCount} enriched attributes`);

    // Build enriched summary
    const enrichedSummary = buildEnrichedProductSummary(enrichedProduct, language);

    // 🎯 PROMPT AVEC INTÉGRATION COMPLÈTE DE LA CONFIGURATION
    const prompt =
      language === "en"
        ? `
You are an elite Shopify UX/UI designer creating premium HTML product descriptions.

🎯 CLIENT CONFIGURATION - APPLY EXACTLY:
- VISUAL STYLE: ${style || "modern"} - Apply this aesthetic throughout
- MAIN COLOR: ${mainColor} - Use this as the primary brand color
- LAYOUT: ${layout || "2 columns"} - Follow this layout structure
- CONTENT LENGTH: ${length || "medium"} - Adjust content accordingly
- BRAND MENTION: ${mentionBrand ? "YES - Highlight the brand" : "NO - Focus on product only"}
- VENDOR: ${vendor || "Not specified"}
- CUSTOM HIGHLIGHTS: ${customHighlights || "None provided"}

🎨 COLOR SYSTEM - USE THIS EXACT CSS:
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

📱 LAYOUT REQUIREMENTS: ${layout}
${layout === "1 colonne" ? "- Single column layout, centered content, mobile-first approach" : ""}
${layout === "2 colonnes" ? "- Two column responsive layout, image + text side by side on desktop" : ""}
${layout === "hero à gauche" ? "- Hero section with prominent image on left, content on right" : ""}
${layout === "hero à droite" ? "- Hero section with prominent image on right, content on left" : ""}

🎨 VISUAL STYLE: ${style}
${style === "moderne" ? "- Modern aesthetic: clean lines, gradient accents, contemporary typography" : ""}
${style === "minimaliste" ? "- Minimalist: ample white space, simple typography, clean layout" : ""}
${style === "scandinave" ? "- Scandinavian: natural colors, wood textures, simple elegance" : ""}
${style === "premium" ? "- Premium: luxury elements, sophisticated typography, elegant spacing" : ""}
${style === "neutre" ? "- Neutral: balanced color palette, harmonious composition" : ""}
${style === "coloré" ? "- Colorful: vibrant accents, playful elements, energetic design" : ""}

${mentionBrand && vendor ? `\n🏷️ BRAND EMPHASIS:\n- Highlight brand name: ${vendor}\n- Include brand storytelling\n- Emphasize brand quality and reputation` : ""}

${customHighlights ? `\n💡 CUSTOM HIGHLIGHTS TO FEATURE PROMINENTLY:\n${customHighlights}\n` : ""}

📦 PRODUCT DATA:
- Title: ${productTitle}
- Description: ${description}
- Vendor: ${vendor || "Not specified"}
- Style: ${style || "Not specified"}

${enrichedSummary ? `\n📐 ENRICHED ATTRIBUTES:\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${imageAnalysis ? `\n🔍 VISION AI INSIGHTS:\n${imageAnalysis}\n` : ""}

📱 MOBILE-FIRST DESIGN MANDATORY:
- Design for 320px mobile screens first
- Use mobile-first Tailwind classes (grid-cols-1, then sm:grid-cols-2, lg:grid-cols-3)
- Touch-friendly elements (min-height: 44px)
- Fast loading with lazy images
- Readable typography (16px base)

🚫 STRICTLY PROHIBITED:
- No "Add to Cart" buttons or pricing
- No complex JavaScript
- No external stylesheets
- No iframes or embedded content

✅ REQUIRED OUTPUT:
- Pure HTML with Tailwind classes
- EXACT color system using ${mainColor}
- ${style} visual style applied throughout
- ${layout} layout structure
- Mobile-first responsive design
- Professional product presentation

Return ONLY the HTML code.
`
        : `
Tu es un designer UX/UI Shopify expert créant des descriptions de produit HTML premium.

🎯 CONFIGURATION CLIENT - APPLIQUER EXACTEMENT:
- STYLE VISUEL: ${style || "moderne"} - Appliquer cette esthétique partout
- COULEUR PRINCIPALE: ${mainColor} - Utiliser comme couleur de marque principale
- LAYOUT: ${layout || "2 colonnes"} - Suivre cette structure de layout
- LONGUEUR CONTENU: ${length || "moyenne"} - Adapter le contenu en conséquence
- MENTION MARQUE: ${mentionBrand ? "OUI - Mettre en avant la marque" : "NON - Se concentrer sur le produit"}
- VENDEUR: ${vendor || "Non spécifié"}
- HIGHLIGHTS PERSONNALISÉS: ${customHighlights || "Aucun fourni"}

🎨 SYSTÈME DE COULEUR - UTILISER CE CSS EXACT:
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

📱 EXIGENCES LAYOUT: ${layout}
${layout === "1 colonne" ? "- Layout single colonne, contenu centré, approche mobile-first" : ""}
${layout === "2 colonnes" ? "- Layout deux colonnes responsive, image + texte côte à côte sur desktop" : ""}
${layout === "hero à gauche" ? "- Section hero avec image prominente à gauche, contenu à droite" : ""}
${layout === "hero à droite" ? "- Section hero avec image prominente à droite, contenu à gauche" : ""}

🎨 STYLE VISUEL: ${style}
${style === "moderne" ? "- Esthétique moderne: lignes épurées, accents dégradés, typographie contemporaine" : ""}
${style === "minimaliste" ? "- Minimaliste: espace blanc généreux, typographie simple, layout clean" : ""}
${style === "scandinave" ? "- Scandinave: couleurs naturelles, textures bois, élégance simple" : ""}
${style === "premium" ? "- Premium: éléments luxueux, typographie sophistiquée, espacement élégant" : ""}
${style === "neutre" ? "- Neutre: palette de couleurs équilibrée, composition harmonieuse" : ""}
${style === "coloré" ? "- Coloré: accents vibrants, éléments ludiques, design énergique" : ""}

${mentionBrand && vendor ? `\n🏷️ EMPHASE MARQUE:\n- Mettre en avant le nom: ${vendor}\n- Inclure storytelling marque\n- Souligner qualité et réputation marque` : ""}

${customHighlights ? `\n💡 HIGHLIGHTS PERSONNALISÉS À METTRE EN AVANT:\n${customHighlights}\n` : ""}

📦 DONNÉES PRODUIT:
- Titre: ${productTitle}
- Description: ${description}
- Marque: ${vendor || "Non spécifié"}
- Style: ${style || "Non spécifié"}

${enrichedSummary ? `\n📐 ATTRIBUTS ENRICHIS:\n${enrichedSummary}\n` : ""}

🖼️ IMAGES (${images.length} total):
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${imageAnalysis ? `\n🔍 INSIGHTS VISION AI:\n${imageAnalysis}\n` : ""}

📱 DESIGN MOBILE-FIRST OBLIGATOIRE:
- Conception d'abord pour mobiles 320px
- Classes Tailwind mobile-first (grid-cols-1, puis sm:grid-cols-2, lg:grid-cols-3)
- Éléments tactiles (hauteur min: 44px)
- Chargement rapide avec images lazy
- Typographie lisible (16px base)

🚫 STRICTEMENT INTERDIT:
- Pas de boutons "Ajouter au Panier" ou prix
- Pas de JavaScript complexe
- Pas de feuilles de style externes
- Pas d'iframes ou contenu embarqué

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind
- Système de couleur EXACT utilisant ${mainColor}
- Style visuel ${style} appliqué partout
- Structure de layout ${layout}
- Design responsive mobile-first
- Présentation produit professionnelle

Retourne UNIQUEMENT le code HTML.
`;

    // 🔹 AI call
    console.log("🤖 Starting AI generation with full configuration...");
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
                  ? `You are a professional Shopify product description writer. You MUST apply the client's exact configuration including visual style, color scheme, layout, and content requirements. Always use the provided color system and follow the specified layout and style exactly.`
                  : `Tu es un rédacteur professionnel de descriptions produit Shopify. Tu DOIS appliquer exactement la configuration du client incluant le style visuel, le schéma de couleurs, le layout et les exigences de contenu. Utilise toujours le système de couleur fourni et suis exactement le layout et style spécifié.`,
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

    // 🔍 Validation de l'application de la configuration
    console.log("🔍 Validating configuration application...");

    const configChecks = {
      hasThemeColor: html.includes(mainColor) || html.includes("var(--theme-color)"),
      hasThemeClasses: html.includes("theme-text") || html.includes("theme-bg"),
      hasCustomHighlights: customHighlights
        ? html.toLowerCase().includes(customHighlights.substring(0, 20).toLowerCase())
        : true,
      hasVendor: vendor && mentionBrand ? html.includes(vendor) : true,
      hasStyleElements: html.includes("grid-cols-1") && html.includes("sm:"),
    };

    console.log("✅ Configuration checks:", configChecks);

    // Forcer l'application de la couleur si nécessaire
    if (!configChecks.hasThemeColor) {
      console.warn("⚠️ Theme color not properly applied - forcing CSS update");
      const colorCss = `<style>
  :root {
    --theme-color: ${mainColor};
    --theme-color-light: ${mainColor}33;
    --theme-color-dark: ${mainColor};
  }
  .theme-text { color: var(--theme-color) !important; }
  .theme-bg { background-color: var(--theme-color-light) !important; }
  .theme-border { border-color: var(--theme-color) !important; }
</style>`;

      if (html.includes("<style>")) {
        html = html.replace(/<style>[\s\S]*?<\/style>/, colorCss);
      } else {
        html = colorCss + "\n" + html;
      }
    }

    if (!html || html.length < 300) {
      return new Response(
        JSON.stringify({
          error: language === "en" ? "Generated HTML too short or empty." : "HTML généré trop court ou vide.",
          generatedLength: html.length,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`✅ Generated HTML length: ${html.length} characters`);

    // 💾 Sauvegarde dans la base
    if (userId && product_id) {
      console.log("💾 Saving to database...");

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
            style,
            layout,
            mainColor,
            content_length: length,
            customHighlights,
            mentionBrand,
            vendorSource,
            enrichment_status: enrichmentStatus,
            attributes_count: attributesCount,
            mobile_first: mobileFirst,
            config_checks: configChecks,
          },
          version: newVersion,
          is_active: true,
        });

        if (saveError) {
          console.error("❌ Save error:", saveError);
        } else {
          console.log(`✅ Product description v${newVersion} saved`);
        }
      } catch (saveError) {
        console.error("❌ Database save error:", saveError);
      }
    }

    console.log("✅ Product description generation successful!");
    return new Response(
      JSON.stringify({
        html,
        enrichment_status: enrichmentStatus,
        attributes_count: attributesCount,
        html_length: html.length,
        config_checks: configChecks,
        applied_config: {
          style,
          mainColor,
          layout,
          length,
          mentionBrand,
          vendor,
        },
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
