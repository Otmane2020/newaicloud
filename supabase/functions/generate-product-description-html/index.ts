import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) userId = user.id;
    }

    const body = await req.json();

    // ✅ RÉCUPÉRATION COMPLÈTE DE TOUS LES PARAMÈTRES DU WIZARD
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style, // ✅ Style visuel du wizard
      mainColor = "#3B82F6", // ✅ Couleur principale du wizard
      layout, // ✅ Layout choisi
      length, // ✅ Longueur contenu
      customHighlights, // ✅ Highlights personnalisés
      mentionBrand = true, // ✅ Mention marque
      vendorSource, // ✅ Source vendor
      language = "fr",
      mobileFirst = true,
      imageAnalysis,
      contentLengthParams,
    } = body ?? {};

    console.log("🎯 CONFIGURATION COMPLÈTE DU WIZARD:", {
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
      throw new Error("Product title is required");
    }

    if (!product_id) {
      throw new Error("Product ID is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`📱 Starting MOBILE-FIRST generation with style: ${style}, color: ${mainColor}, layout: ${layout}`);

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

    // 🎯 PROMPT AVEC INTÉGRATION COMPLÈTE DU WIZARD
    const prompt =
      language === "en"
        ? `
You are an elite Shopify UX/UI designer creating premium HTML product descriptions.

🎯 CLIENT CONFIGURATION - APPLY EXACTLY:
- VISUAL STYLE: ${style || "modern"} - Apply this aesthetic throughout the design
- MAIN COLOR: ${mainColor} - Use this as the primary brand color in all elements
- LAYOUT: ${layout || "2 columns"} - Follow this layout structure precisely
- CONTENT LENGTH: ${length || "medium"} - Adjust content density accordingly
- BRAND MENTION: ${mentionBrand ? "YES - Highlight the brand prominently" : "NO - Focus on product features only"}
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
  
  /* Mobile optimizations */
  @media (max-width: 767px) {
    .mobile-padding { padding: 1rem !important; }
    .mobile-text { font-size: 16px !important; line-height: 1.5; }
    .touch-target { min-height: 44px; min-width: 44px; }
    .mobile-stack { flex-direction: column !important; }
  }
</style>

📱 LAYOUT REQUIREMENTS: ${layout}
${layout === "1 colonne" ? "- Single column layout, centered content, perfect for mobile-first approach" : ""}
${layout === "2 colonnes" ? "- Two column responsive layout, image + text side by side on desktop, stacked on mobile" : ""}
${layout === "hero à gauche" ? "- Hero section with prominent image on left, content on right, mobile stack" : ""}
${layout === "hero à droite" ? "- Hero section with prominent image on right, content on left, mobile stack" : ""}

🎨 VISUAL STYLE: ${style}
${style === "moderne" ? "- Modern aesthetic: clean geometric lines, gradient accents, contemporary typography, sleek design" : ""}
${style === "minimaliste" ? "- Minimalist: ample white space, simple typography, clean layout, focused content" : ""}
${style === "scandinave" ? "- Scandinavian: natural colors, wood textures, simple elegance, organic shapes" : ""}
${style === "premium" ? "- Premium: luxury elements, sophisticated typography, elegant spacing, high-end feel" : ""}
${style === "neutre" ? "- Neutral: balanced color palette, harmonious composition, subtle contrasts" : ""}
${style === "coloré" ? "- Colorful: vibrant accents, playful elements, energetic design, bold colors" : ""}

${mentionBrand && vendor ? `\n🏷️ BRAND EMPHASIS - MUST INCLUDE:\n- Highlight brand name: ${vendor} in headings and features\n- Include brand storytelling elements\n- Emphasize brand quality and reputation\n- Use brand colors and styling` : ""}

${customHighlights ? `\n💡 CUSTOM HIGHLIGHTS TO FEATURE PROMINENTLY:\n${customHighlights}\n- Integrate these highlights in feature sections\n- Use them in bullet points and callouts\n- Make them visually prominent` : ""}

📦 PRODUCT DATA:
- Title: ${productTitle}
- Description: ${description || "No description provided"}
- Vendor: ${vendor || "Not specified"}
- Style: ${style || "Not specified"}
- Visual Theme: ${style} with ${mainColor} as primary color

${
  enrichedProduct.ai_color || enrichedProduct.ai_material
    ? `
🎨 ENRICHED VISUAL ATTRIBUTES:
${enrichedProduct.ai_color ? `- Color: ${enrichedProduct.ai_color}` : ""}
${enrichedProduct.ai_material ? `- Material: ${enrichedProduct.ai_material}` : ""}
${enrichedProduct.ai_shape ? `- Shape: ${enrichedProduct.ai_shape}` : ""}
${enrichedProduct.ai_texture ? `- Texture: ${enrichedProduct.ai_texture}` : ""}
`
    : ""
}

🖼️ IMAGES (${images.length} total) - USE ALL:
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${imageAnalysis ? `\n🔍 VISION AI INSIGHTS:\n${imageAnalysis}\n` : ""}

📱 MOBILE-FIRST DESIGN MANDATORY:
- Design for 320px mobile screens FIRST
- Use mobile-first Tailwind classes (grid-cols-1, then sm:grid-cols-2, lg:grid-cols-3)
- Touch-friendly elements (min-height: 44px for buttons, links)
- Fast loading with lazy images (loading="lazy")
- Readable typography (16px base font size for mobile)
- Single column layout on mobile, responsive on larger screens

🚫 STRICTLY PROHIBITED:
- No "Add to Cart" buttons or pricing information
- No complex JavaScript or external scripts
- No external stylesheets or CDN dependencies
- No iframes or embedded content
- No horizontal scrolling on mobile

✅ REQUIRED OUTPUT:
- Pure HTML with Tailwind CSS classes
- EXACT color system using ${mainColor} throughout
- ${style} visual style applied consistently
- ${layout} layout structure implemented
- Mobile-first responsive design
- Professional product presentation
- All ${images.length} images integrated with lazy loading
- Semantic HTML structure with proper heading hierarchy

Return ONLY the HTML code without any explanations or markdown.
`
        : `
Tu es un designer UX/UI Shopify expert créant des descriptions de produit HTML premium.

🎯 CONFIGURATION CLIENT - APPLIQUER EXACTEMENT:
- STYLE VISUEL: ${style || "moderne"} - Appliquer cette esthétique dans tout le design
- COULEUR PRINCIPALE: ${mainColor} - Utiliser comme couleur de marque dans tous les éléments
- LAYOUT: ${layout || "2 colonnes"} - Suivre cette structure de layout précisément
- LONGUEUR CONTENU: ${length || "moyenne"} - Adapter la densité du contenu en conséquence
- MENTION MARQUE: ${mentionBrand ? "OUI - Mettre en avant la marque prominentement" : "NON - Se concentrer sur les caractéristiques produit"}
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
  
  /* Optimisations mobile */
  @media (max-width: 767px) {
    .mobile-padding { padding: 1rem !important; }
    .mobile-text { font-size: 16px !important; line-height: 1.5; }
    .touch-target { min-height: 44px; min-width: 44px; }
    .mobile-stack { flex-direction: column !important; }
  }
</style>

📱 EXIGENCES LAYOUT: ${layout}
${layout === "1 colonne" ? "- Layout single colonne, contenu centré, parfait pour approche mobile-first" : ""}
${layout === "2 colonnes" ? "- Layout deux colonnes responsive, image + texte côte à côte sur desktop, empilé sur mobile" : ""}
${layout === "hero à gauche" ? "- Section hero avec image prominente à gauche, contenu à droite, empilement mobile" : ""}
${layout === "hero à droite" ? "- Section hero avec image prominente à droite, contenu à gauche, empilement mobile" : ""}

🎨 STYLE VISUEL: ${style}
${style === "moderne" ? "- Esthétique moderne: lignes géométriques épurées, accents dégradés, typographie contemporaine, design élégant" : ""}
${style === "minimaliste" ? "- Minimaliste: espace blanc généreux, typographie simple, layout clean, contenu focalisé" : ""}
${style === "scandinave" ? "- Scandinave: couleurs naturelles, textures bois, élégance simple, formes organiques" : ""}
${style === "premium" ? "- Premium: éléments luxueux, typographie sophistiquée, espacement élégant, sensation haut de gamme" : ""}
${style === "neutre" ? "- Neutre: palette de couleurs équilibrée, composition harmonieuse, contrastes subtils" : ""}
${style === "coloré" ? "- Coloré: accents vibrants, éléments ludiques, design énergique, couleurs audacieuses" : ""}

${mentionBrand && vendor ? `\n🏷️ EMPHASE MARQUE - DOIT INCLURE:\n- Mettre en avant le nom: ${vendor} dans titres et caractéristiques\n- Inclure éléments de storytelling marque\n- Souligner qualité et réputation marque\n- Utiliser couleurs et style de la marque` : ""}

${customHighlights ? `\n💡 HIGHLIGHTS PERSONNALISÉS À METTRE EN AVANT:\n${customHighlights}\n- Intégrer ces highlights dans sections caractéristiques\n- Les utiliser dans points liste et callouts\n- Les rendre visuellement prominents` : ""}

📦 DONNÉES PRODUIT:
- Titre: ${productTitle}
- Description: ${description || "Aucune description fournie"}
- Marque: ${vendor || "Non spécifié"}
- Style: ${style || "Non spécifié"}
- Thème Visuel: ${style} avec ${mainColor} comme couleur principale

${
  enrichedProduct.ai_color || enrichedProduct.ai_material
    ? `
🎨 ATTRIBUTS VISUELS ENRICHIS:
${enrichedProduct.ai_color ? `- Couleur: ${enrichedProduct.ai_color}` : ""}
${enrichedProduct.ai_material ? `- Matériau: ${enrichedProduct.ai_material}` : ""}
${enrichedProduct.ai_shape ? `- Forme: ${enrichedProduct.ai_shape}` : ""}
${enrichedProduct.ai_texture ? `- Texture: ${enrichedProduct.ai_texture}` : ""}
`
    : ""
}

🖼️ IMAGES (${images.length} total) - UTILISER TOUTES:
${images.map((i, idx) => `${idx + 1}. ${i.src}${i.alt_text ? ` (alt: ${i.alt_text})` : ""}`).join("\n")}

${imageAnalysis ? `\n🔍 INSIGHTS VISION AI:\n${imageAnalysis}\n` : ""}

📱 DESIGN MOBILE-FIRST OBLIGATOIRE:
- Conception d'abord pour écrans mobiles 320px
- Classes Tailwind mobile-first (grid-cols-1, puis sm:grid-cols-2, lg:grid-cols-3)
- Éléments tactiles (hauteur min: 44px pour boutons, liens)
- Chargement rapide avec images lazy (loading="lazy")
- Typographie lisible (taille base 16px pour mobile)
- Layout single colonne sur mobile, responsive sur grands écrans

🚫 STRICTEMENT INTERDIT:
- Pas de boutons "Ajouter au Panier" ou informations prix
- Pas de JavaScript complexe ou scripts externes
- Pas de feuilles de style externes ou dépendances CDN
- Pas d'iframes ou contenu embarqué
- Pas de défilement horizontal sur mobile

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind CSS
- Système de couleur EXACT utilisant ${mainColor} partout
- Style visuel ${style} appliqué constamment
- Structure de layout ${layout} implémentée
- Design responsive mobile-first
- Présentation produit professionnelle
- Toutes les ${images.length} images intégrées avec lazy loading
- Structure HTML sémantique avec hiérarchie titres appropriée

Retourne UNIQUEMENT le code HTML sans explications ou markdown.
`;

    // 🔹 Appel AI avec timeout
    console.log("🤖 Starting AI generation with complete wizard configuration...");
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
                  ? `You are a professional Shopify product description writer. You MUST apply the client's exact configuration including visual style, color scheme, layout, and content requirements. Always use the provided color system and follow the specified layout and style exactly. Generate mobile-first HTML with Tailwind CSS.`
                  : `Tu es un rédacteur professionnel de descriptions produit Shopify. Tu DOIS appliquer exactement la configuration du client incluant le style visuel, le schéma de couleurs, le layout et les exigences de contenu. Utilise toujours le système de couleur fourni et suis exactement le layout et style spécifié. Génère du HTML mobile-first avec Tailwind CSS.`,
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

    // Nettoyage du HTML
    html = html
      .replace(/```(?:json|html)?/g, "")
      .replace(/^[\s\S]*?<html>/i, "")
      .replace(/<\/html>[\s\S]*$/i, "")
      .trim();

    // 🔍 Validation de l'application de la configuration
    console.log("🔍 Validating wizard configuration application...");

    const configChecks = {
      hasThemeColor: html.includes(mainColor) || html.includes("var(--theme-color)"),
      hasThemeClasses: html.includes("theme-text") || html.includes("theme-bg"),
      hasCustomHighlights: customHighlights
        ? html.toLowerCase().includes(customHighlights.substring(0, 20).toLowerCase())
        : true,
      hasVendor: vendor && mentionBrand ? html.includes(vendor) : true,
      hasStyleElements: html.includes("grid-cols-1") && html.includes("sm:"),
      hasMobileClasses: html.includes("mobile-padding") || html.includes("touch-target"),
      hasLayoutApplied: layout === "1 colonne" ? html.includes("max-w-md") || html.includes("mx-auto") : true,
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
  
  @media (max-width: 767px) {
    .mobile-padding { padding: 1rem !important; }
    .mobile-text { font-size: 16px !important; line-height: 1.5; }
    .touch-target { min-height: 44px; min-width: 44px; }
    .mobile-stack { flex-direction: column !important; }
  }
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

    // 💾 Sauvegarde dans la base avec configuration complète
    if (userId && product_id) {
      console.log("💾 Saving to database with complete wizard configuration...");

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

        // Créer la nouvelle version avec configuration complète
        const { error: saveError } = await supabaseAdmin.from("product_landing_pages").insert({
          product_id: product_id,
          seller_id: userId,
          html_content: html,
          config: {
            // Configuration du wizard
            wizard_config: {
              style,
              layout,
              mainColor,
              content_length: length,
              customHighlights,
              mentionBrand,
              vendorSource,
              vendor,
              mobileFirst,
            },
            // Données techniques
            language,
            enrichment_status: enrichmentStatus,
            attributes_count: attributesCount,
            mobile_score: Object.values(configChecks).filter(Boolean).length,
            config_checks: configChecks,
            generated_at: new Date().toISOString(),
          },
          version: newVersion,
          is_active: true,
        });

        if (saveError) {
          console.error("❌ Save error:", saveError);
        } else {
          console.log(`✅ Product description v${newVersion} saved with wizard configuration`);
        }
      } catch (saveError) {
        console.error("❌ Database save error:", saveError);
      }
    }

    console.log("✅ Product description generation successful with wizard configuration!");
    return new Response(
      JSON.stringify({
        html,
        success: true,
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
          customHighlights: customHighlights ? `${customHighlights.substring(0, 50)}...` : null,
          mobileFirst,
        },
        mobile_optimized: true,
        wizard_integration: "complete",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 ERROR in wizard configuration:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        type: "WIZARD_CONFIGURATION_ERROR",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
