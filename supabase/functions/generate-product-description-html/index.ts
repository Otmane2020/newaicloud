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

    const {
      product_id,
      title,
      existingDescription,
      images,
      visionAnalysis,
      dimensions,
      template = "ecommerce",
      variants,
      vendor,
      style,
      mainColor = "#3B82F6",
      layout = "grid",
      contentLength = "medium",
      customHighlights,
      language = "fr",
    } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log("🧠 Generating product landing page for:", title);

    // Récupérer les données complètes du produit
    let enrichedData: any = null;
    let productImages: any[] = [];
    let productVariants: any[] = [];
    let shopDomain = "";
    let productHandle = "";

    if (product_id) {
      console.log("📦 Fetching complete product data from database...");

      // Récupérer les données du produit
      const { data: productData } = await supabaseAdmin
        .from("shopify_products")
        .select(
          `
          *,
          product_images (src, alt_text, position, width, height),
          product_variants (title, image_url, shopify_variant_id, price, sku)
        `,
        )
        .eq("id", product_id)
        .single();

      if (productData) {
        enrichedData = productData;
        productImages = productData.product_images || [];
        productVariants = productData.product_variants || [];
        productHandle = productData.handle || "";
        console.log("✅ Product data loaded:", {
          images: productImages.length,
          variants: productVariants.length,
          handle: productHandle,
        });
      }

      // Récupérer le domaine de la boutique
      if (userId) {
        const { data: storeData } = await supabaseAdmin
          .from("shopify_connections")
          .select("shop_domain")
          .eq("seller_id", userId)
          .single();

        shopDomain = storeData?.shop_domain || "";
      }
    }

    // Utiliser les données fournies en priorité, sinon les données de la BDD
    const finalImages = images?.length ? images : productImages;
    const finalVariants = variants?.length ? variants : productVariants;
    const finalVendor = vendor || enrichedData?.vendor || "";

    console.log("📊 Final data:", {
      images: finalImages.length,
      variants: finalVariants.length,
      vendor: finalVendor,
      style,
      layout,
      contentLength,
      hasCustomHighlights: !!customHighlights,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Construire l'URL du produit Shopify
    const productUrl = shopDomain && productHandle ? `https://${shopDomain}/products/${productHandle}` : "#";

    // Construire les liens d'ancrage pour la navigation
    const anchorLinks = {
      features: `${productUrl}#features`,
      gallery: `${productUrl}#gallery`,
      specifications: `${productUrl}#specifications`,
      variants: `${productUrl}#variants`,
    };

    // Guides de style améliorés
    const styleGuides: Record<string, string> = {
      moderne:
        "Gradients subtils, ombres douces, coins arrondis (rounded-xl), espacements généreux, typographie sans-serif, design épuré avec accents de couleur",
      minimaliste:
        "Espace blanc abondant, typographie épurée, lignes nettes, palette limitée à 1-2 couleurs, design fonctionnel et élégant",
      scandinave:
        "Tons naturels et neutres, textures organiques, simplicité fonctionnelle, ambiance chaleureuse et lumineuse",
      premium:
        "Contrastes élégants, typographie serif pour titres, ombres profondes, espacements luxueux, détails raffinés",
      industriel: "Textures brutes, tons neutres et sombres, typographie bold, éléments métalliques suggérés",
      nature: "Tons verts et terreux, textures organiques, design fluide et apaisant",
    };

    const currentStyleGuide = styleGuides[style] || styleGuides["moderne"];
    const tone =
      contentLength === "short"
        ? "concis et percutant"
        : contentLength === "medium"
          ? "équilibré et informatif"
          : "complet et détaillé";

    // Construire le contexte enrichi
    const buildEnrichedContext = () => {
      if (!enrichedData) return "";

      const sections = [];

      // Attributs visuels
      if (enrichedData.ai_color || enrichedData.ai_material) {
        sections.push("\n🎨 ATTRIBUTS VISUELS (INTÉGRER DANS LE DESIGN):");
        if (enrichedData.ai_color) sections.push(`- Couleur dominante: ${enrichedData.ai_color}`);
        if (enrichedData.ai_material) sections.push(`- Matériau principal: ${enrichedData.ai_material}`);
        if (enrichedData.ai_shape) sections.push(`- Forme: ${enrichedData.ai_shape}`);
        if (enrichedData.ai_texture) sections.push(`- Texture: ${enrichedData.ai_texture}`);
        if (enrichedData.ai_finish) sections.push(`- Finition: ${enrichedData.ai_finish}`);
        if (enrichedData.ai_pattern) sections.push(`- Motif: ${enrichedData.ai_pattern}`);
      }

      // Dimensions complètes
      if (enrichedData.smart_length || enrichedData.smart_width || enrichedData.smart_height) {
        sections.push("\n📐 DIMENSIONS PRÉCISES (CRÉER UN TABLEAU ÉLÉGANT):");
        if (enrichedData.smart_length)
          sections.push(`- Longueur: ${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}`);
        if (enrichedData.smart_width)
          sections.push(`- Largeur: ${enrichedData.smart_width} ${enrichedData.smart_width_unit || "cm"}`);
        if (enrichedData.smart_height)
          sections.push(`- Hauteur: ${enrichedData.smart_height} ${enrichedData.smart_height_unit || "cm"}`);
        if (enrichedData.smart_weight)
          sections.push(`- Poids: ${enrichedData.smart_weight} ${enrichedData.smart_weight_unit || "kg"}`);
        if (enrichedData.smart_diameter)
          sections.push(`- Diamètre: ${enrichedData.smart_diameter} ${enrichedData.smart_diameter_unit || "cm"}`);
      }

      // Contexte produit
      if (enrichedData.category || enrichedData.style) {
        sections.push("\n🏷️ CONTEXTE PRODUIT:");
        if (enrichedData.category) sections.push(`- Catégorie: ${enrichedData.category}`);
        if (enrichedData.sub_category) sections.push(`- Sous-catégorie: ${enrichedData.sub_category}`);
        if (enrichedData.style) sections.push(`- Style: ${enrichedData.style}`);
        if (enrichedData.room) sections.push(`- Pièce recommandée: ${enrichedData.room}`);
        if (enrichedData.functionality) sections.push(`- Fonctionnalité: ${enrichedData.functionality}`);
      }

      return sections.join("\n");
    };

    // 🔹 PROMPT COMPLET POUR LANDING PAGE SHOPIFY PREMIUM
    const prompt =
      language === "en"
        ? `
You are an expert Shopify eCommerce designer and UX copywriter. Create a HIGH-CONVERTING, MOBILE-FIRST product landing page with premium responsive design.

🎯 OBJECTIVE: Generate a persuasive landing page that drives conversions with smooth navigation between sections.

📦 PRODUCT DATA:
- Title: ${title}
${finalVendor ? `- Brand: ${finalVendor}` : ""}
${existingDescription ? `- Description: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 KEY SELLING POINTS:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 IMAGE GALLERY (${finalImages.length} images):
${finalImages.map((img: any, index: number) => `- Image ${index + 1}: ${img.src || img}${img.width && img.height ? ` (${img.width}x${img.height}px)` : ""}${img.alt_text ? ` - ${img.alt_text}` : ""}`).join("\n")}

🔄 PRODUCT VARIANTS (${finalVariants.length} variants):
${finalVariants.map((v: any, idx: number) => `- Variant ${idx + 1}: ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ""}${v.price ? ` - $${v.price}` : ""}${v.sku ? ` - SKU: ${v.sku}` : ""}`).join("\n")}

${visionAnalysis ? `\n🎨 VISION AI ANALYSIS (USE FOR CONTENT):\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

🎨 DESIGN CONFIG:
- Style: ${style} → ${currentStyleGuide}
- Primary Color: ${mainColor} (use for buttons, accents, highlights)
- Layout: ${layout} (for image gallery)
- Tone: ${tone}
- Language: ${language}

🛒 SHOPIFY NAVIGATION (USE THESE LINKS INSTEAD OF "ADD TO CART"):
- "View Features" → <a href="${anchorLinks.features}" target="_blank">
- "See Gallery" → <a href="${anchorLinks.gallery}" target="_blank">
- "Technical Specs" → <a href="${anchorLinks.specifications}" target="_blank">
- "View Options" → <a href="${anchorLinks.variants}" target="_blank">
- "Discover Product" → <a href="${productUrl}" target="_blank">

📱 MANDATORY MOBILE-FIRST SECTIONS:

1. HERO SECTION (with navigation)
   - Eye-catching headline with ${mainColor} accent
   - Compelling subheadline${finalVendor ? ` mentioning "${finalVendor}"` : ""}
   - Responsive image gallery (use ${finalImages.length} images)
   - Navigation buttons to other sections

2. FEATURES & BENEFITS (id="features")
   - 3-4 key benefits with elegant SVG icons (monochrome)
   - Focus on customer pain points and solutions
   - Use enriched attributes: ${enrichedData?.ai_color || "color"}, ${enrichedData?.ai_material || "materials"}

3. IMAGE GALLERY (id="gallery")
   - Display all ${finalImages.length} images in ${layout} layout
   - Show image dimensions when available
   - Responsive grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4

4. TECHNICAL SPECIFICATIONS (id="specifications")
   - Professional specifications table
   - Include all dimensions and technical data
   - Use enriched attributes for detailed specs

5. VARIANTS & OPTIONS (id="variants")
   - Display all ${finalVariants.length} variants clearly
   - Show variant differences, prices, SKUs
   - Clean comparison layout

6. TRUST & GUARANTEE
   - Shipping, returns, warranty badges
   - Social proof elements

🎨 CRITICAL DESIGN RULES:
• MOBILE-FIRST: Start with mobile layout (320px)
• Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
• Responsive grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
• Typography: text-base sm:text-lg lg:text-xl
• Buttons: w-full sm:w-auto for mobile/desktop
• Images: w-full h-auto object-cover with proper aspect ratios
• Use Tailwind CSS only - NO custom CSS
• NO <script> or <style> tags
• Clean HTML ready for Shopify
• Smooth navigation between sections

📸 IMAGE LAYOUT EXAMPLES:
${
  layout === "grid"
    ? `
Grid Layout Example:
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full aspect-square object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow" loading="lazy" />`).join("\n  ")}
</div>
`
    : ""
}

${
  layout === "carousel"
    ? `
Carousel Layout Example:
<div class="flex overflow-x-auto snap-x snap-mandatory space-x-4 py-4 scrollbar-hide">
  ${finalImages.map((img: any) => `<div class="flex-shrink-0 w-80 snap-center"><img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-64 object-cover rounded-lg shadow-md" loading="lazy" /></div>`).join("\n  ")}
</div>
`
    : ""
}

${
  layout === "masonry"
    ? `
Masonry Layout Example:
<div class="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full mb-4 rounded-lg shadow-md break-inside-avoid" loading="lazy" />`).join("\n  ")}
</div>
`
    : ""
}

NAVIGATION BUTTON EXAMPLES:
<div class="flex flex-wrap gap-3 justify-center">
  <a href="${anchorLinks.features}" target="_blank" style="background-color: ${mainColor}" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white hover:opacity-90 transition-all">
    View Features
  </a>
  <a href="${anchorLinks.gallery}" target="_blank" class="inline-flex items-center px-6 py-3 border border-${mainColor.replace("#", "")} text-base font-medium rounded-md text-${mainColor.replace("#", "")} bg-transparent hover:bg-${mainColor.replace("#", "")} hover:text-white transition-all">
    See Gallery
  </a>
  <a href="${anchorLinks.specifications}" target="_blank" class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-all">
    Technical Specs
  </a>
</div>

Return ONLY clean HTML without markdown or code blocks.
`
        : `
Tu es un designer Shopify expert et rédacteur UX. Crée une LANDING PAGE PREMIUM qui convertit, avec un design responsive mobile-first.

🎯 OBJECTIF: Générer une page produit persuasive qui convertit avec une navigation fluide entre les sections.

📦 DONNÉES PRODUIT:
- Titre: ${title}
${finalVendor ? `- Marque: ${finalVendor}` : ""}
${existingDescription ? `- Description: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 ARGUMENTS DE VENTE:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 GALERIE IMAGES (${finalImages.length} images):
${finalImages.map((img: any, index: number) => `- Image ${index + 1}: ${img.src || img}${img.width && img.height ? ` (${img.width}x${img.height}px)` : ""}${img.alt_text ? ` - ${img.alt_text}` : ""}`).join("\n")}

🔄 VARIANTES PRODUIT (${finalVariants.length} variantes):
${finalVariants.map((v: any, idx: number) => `- Variante ${idx + 1}: ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ""}${v.price ? ` - ${v.price}€` : ""}${v.sku ? ` - SKU: ${v.sku}` : ""}`).join("\n")}

${visionAnalysis ? `\n🎨 ANALYSE VISION AI (UTILISER POUR LE CONTENU):\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

🎨 CONFIGURATION DESIGN:
- Style: ${style} → ${currentStyleGuide}
- Couleur: ${mainColor} (boutons, accents, surbrillance)
- Layout: ${layout} (pour la galerie)
- Ton: ${tone}
- Langue: ${language}

🛒 NAVIGATION SHOPIFY (UTILISER CES LIENS AU LIEU DE "AJOUTER AU PANIER"):
- "Voir caractéristiques" → <a href="${anchorLinks.features}" target="_blank">
- "Voir galerie" → <a href="${anchorLinks.gallery}" target="_blank">
- "Spécifications techniques" → <a href="${anchorLinks.specifications}" target="_blank">
- "Voir options" → <a href="${anchorLinks.variants}" target="_blank">
- "Découvrir le produit" → <a href="${productUrl}" target="_blank">

📱 SECTIONS OBLIGATOIRES MOBILE-FIRST:

1. SECTION HERO (avec navigation)
   - Titre accrocheur avec couleur ${mainColor}
   - Sous-titre persuasif${finalVendor ? ` mentionnant "${finalVendor}"` : ""}
   - Galerie d'images responsive (utiliser les ${finalImages.length} images)
   - Boutons de navigation vers autres sections

2. CARACTÉRISTIQUES (id="features")
   - 3-4 avantages clés avec icônes SVG élégantes (monochrome)
   - Focus sur problèmes clients et solutions
   - Utiliser attributs enrichis: ${enrichedData?.ai_color || "couleur"}, ${enrichedData?.ai_material || "matériaux"}

3. GALERIE IMAGES (id="gallery")
   - Afficher les ${finalImages.length} images en layout ${layout}
   - Montrer dimensions images si disponibles
   - Grid responsive: grid-cols-2 md:grid-cols-3 lg:grid-cols-4

4. SPÉCIFICATIONS TECHNIQUES (id="specifications")
   - Tableau professionnel des spécifications
   - Inclure toutes dimensions et données techniques
   - Utiliser attributs enrichis pour specs détaillées

5. VARIANTES & OPTIONS (id="variants")
   - Afficher clairement les ${finalVariants.length} variantes
   - Montrer différences variantes, prix, SKU
   - Layout comparaison épuré

6. CONFIANCE & GARANTIE
   - Badges livraison, retour, garantie
   - Éléments preuve sociale

🎨 RÈGLES DESIGN CRITIQUES:
• MOBILE-FIRST: Commencer layout mobile (320px)
• Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
• Grid responsive: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
• Typographie: text-base sm:text-lg lg:text-xl
• Boutons: w-full sm:w-auto mobile/desktop
• Images: w-full h-auto object-cover avec bons ratios
• Utiliser Tailwind CSS uniquement - PAS de CSS custom
• PAS de balises <script> ou <style>
• HTML propre pour Shopify
• Navigation fluide entre sections

📸 EXEMPLES LAYOUT IMAGES:
${
  layout === "grid"
    ? `
Layout Grid:
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full aspect-square object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow" loading="lazy" />`).join("\n  ")}
</div>
`
    : ""
}

${
  layout === "carousel"
    ? `
Layout Carousel:
<div class="flex overflow-x-auto snap-x snap-mandatory space-x-4 py-4 scrollbar-hide">
  ${finalImages.map((img: any) => `<div class="flex-shrink-0 w-80 snap-center"><img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-64 object-cover rounded-lg shadow-md" loading="lazy" /></div>`).join("\n  ")}
</div>
`
    : ""
}

${
  layout === "masonry"
    ? `
Layout Masonry:
<div class="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full mb-4 rounded-lg shadow-md break-inside-avoid" loading="lazy" />`).join("\n  ")}
</div>
`
    : ""
}

EXEMPLES BOUTONS NAVIGATION:
<div class="flex flex-wrap gap-3 justify-center">
  <a href="${anchorLinks.features}" target="_blank" style="background-color: ${mainColor}" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white hover:opacity-90 transition-all">
    Voir caractéristiques
  </a>
  <a href="${anchorLinks.gallery}" target="_blank" class="inline-flex items-center px-6 py-3 border border-${mainColor.replace("#", "")} text-base font-medium rounded-md text-${mainColor.replace("#", "")} bg-transparent hover:bg-${mainColor.replace("#", "")} hover:text-white transition-all">
    Voir galerie
  </a>
  <a href="${anchorLinks.specifications}" target="_blank" class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-all">
    Spécifications
  </a>
</div>

Retourne UNIQUEMENT du HTML propre sans markdown ou blocs de code.
`;

    // 🔹 Appel Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                ? "You are a professional Shopify product description writer. You create beautiful, conversion-optimized HTML landing pages with real working buttons and links. You write persuasive copy and structure content for maximum engagement. Always include functional onclick handlers and href attributes for all buttons and links."
                : "Tu es un rédacteur professionnel de descriptions produit Shopify. Tu crées de belles landing pages HTML optimisées pour la conversion avec de vrais boutons et liens fonctionnels. Tu rédiges un contenu persuasif et structures l'information pour un engagement maximum. Inclus toujours des handlers onclick et attributs href fonctionnels pour tous les boutons et liens.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("No content generated by AI");

    // Nettoyage du contenu
    content = content
      .replace(/```(?:json|html)?/g, "")
      .replace(/^[\s\S]*?<html>/i, "")
      .replace(/<\/html>[\s\S]*$/i, "")
      .trim();

    console.log("✅ Landing page generated successfully");

    // Métriques
    const mediaCount = finalImages.length;
    const variantCount = finalVariants.length;
    const wordCount = content.split(/\s+/).length;

    return new Response(
      JSON.stringify({
        success: true,
        htmlLandingPage: content,
        optimizedTitle: title,
        mediaCount,
        variantCount,
        mobileOptimized: true,
        wordCount,
        hasNavigation: true,
        sections: ["hero", "features", "gallery", "specifications", "variants"],
        config: {
          style,
          layout,
          mainColor,
          contentLength,
          language,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error generating landing page:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
