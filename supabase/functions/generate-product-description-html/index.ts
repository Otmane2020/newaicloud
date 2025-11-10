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

    console.log("🧠 Generating product description for:", title);

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

    // Construire le contexte enrichi
    const buildEnrichedContext = () => {
      if (!enrichedData) return "";

      const sections = [];

      // Attributs visuels
      if (enrichedData.ai_color || enrichedData.ai_material) {
        sections.push("\n🎨 ATTRIBUTS VISUELS:");
        if (enrichedData.ai_color) sections.push(`- Couleur dominante: ${enrichedData.ai_color}`);
        if (enrichedData.ai_material) sections.push(`- Matériau principal: ${enrichedData.ai_material}`);
        if (enrichedData.ai_shape) sections.push(`- Forme: ${enrichedData.ai_shape}`);
        if (enrichedData.ai_texture) sections.push(`- Texture: ${enrichedData.ai_texture}`);
        if (enrichedData.ai_finish) sections.push(`- Finition: ${enrichedData.ai_finish}`);
        if (enrichedData.ai_pattern) sections.push(`- Motif: ${enrichedData.ai_pattern}`);
      }

      // Dimensions complètes
      if (enrichedData.smart_length || enrichedData.smart_width || enrichedData.smart_height) {
        sections.push("\n📐 DIMENSIONS PRÉCISES:");
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

    // 🔹 PROMPT CORRIGÉ AVEC TOUTES LES EXIGENCES
    const prompt =
      language === "en"
        ? `
You are an expert Shopify product description writer. Create a CLEAN, PROFESSIONAL HTML product description that will be inserted into Shopify's description field.

🚫 IMPORTANT: This is a PRODUCT DESCRIPTION only. NO prices, NO "Add to Cart" buttons, NO e-commerce functionality.

📱 MOBILE-FIRST DESIGN:
- Design for mobile devices first, then adapt for desktop
- Use mobile-first Tailwind classes (sm:, md:, lg:)
- Single column layout for mobile, responsive grids for larger screens
- Ensure touch-friendly element sizes

🎨 MODERN ICONS SYSTEM:
- Use modern, professional SVG icons - no childish or cartoonish icons
- All icons should be relative to the selected theme color (${mainColor})
- Use stroke-current and fill-current classes for color consistency
- Icons should be simple, elegant and minimalist
- Use appropriate icons for each section

📦 PRODUCT DATA:
- Title: ${title}
${finalVendor ? `- Brand: ${finalVendor}` : ""}
${existingDescription ? `- Existing Description: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 KEY FEATURES:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 IMAGES (${finalImages.length} available):
${finalImages.map((img: any, index: number) => `- ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 VISION ANALYSIS:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

📱 MANDATORY CONTENT SECTIONS (in this order):

1. **PRODUCT INTRODUCTION** (H1)
   - Clean heading with product name
   - Brief compelling description
   - Focus on main benefits

2. **VISUAL FEATURES** (H2)
   ${
     enrichedData.ai_color || enrichedData.ai_material
       ? `
   - Highlight key visual attributes with modern icons
   - Simple badge-style presentation
   - Use color ${mainColor} for icons and accents
   `
       : ""
   }

3. **IMAGE GALLERY** (H2)
   - Display all ${finalImages.length} images
   - Mobile: grid-cols-1, Tablet: grid-cols-2, Desktop: grid-cols-3
   - Clean image presentation with lazy loading

4. **TECHNICAL SPECIFICATIONS** (H3)
   ${
     enrichedData.smart_length || enrichedData.smart_width
       ? `
   - Clean specifications table with modern icons
   - Mobile: stack vertically, Desktop: two-column layout
   - Include all available dimensions with appropriate icons
   `
       : ""
   }

5. **MATERIALS & CRAFTSMANSHIP** (H3)
   ${
     enrichedData.ai_material || enrichedData.ai_finish
       ? `
   - Detail materials and quality with relevant icons
   - Focus on durability and construction
   `
       : ""
   }

6. **USAGE & BENEFITS** (H4)
   - Practical applications with feature icons
   - Customer benefits
   - Simple bullet points

7. **CARE & MAINTENANCE** (H4)
   - Basic care instructions with maintenance icons
   - Maintenance tips

🎨 DESIGN REQUIREMENTS:
- **Mobile-first approach**: Design for 320px+ screens first
- Clean, professional appearance
- Use color ${mainColor} for headings, icons and accents
- Focus on readability and content presentation
- Proper heading hierarchy (H1, H2, H3, H4) for SEO
- All icons should use currentColor or theme-based coloring

🚫 STRICTLY PROHIBITED:
- NO "Add to Cart" buttons
- NO pricing information
- NO checkout functionality
- NO complex JavaScript
- NO external stylesheets
- NO iframes or embedded content
- NO childish or cartoonish icons

✅ REQUIRED OUTPUT:
- Pure HTML with simple Tailwind classes
- Clean, semantic structure with proper heading hierarchy
- Mobile-first responsive design
- Modern SVG icons using theme color ${mainColor}
- Professional product presentation
- All images from provided list
- Comprehensive product information

Example modern icon usage:
<svg class="w-5 h-5" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>

Example mobile-first image grid:
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-auto rounded-lg shadow-sm" loading="lazy">`).join("\n  ")}
</div>

Example specifications with icons:
<div class="bg-gray-50 rounded-lg p-4 sm:p-6 my-8">
  <h3 class="text-lg sm:text-xl font-semibold mb-4 flex items-center">
    <svg class="w-5 h-5 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    </svg>
    Technical Specifications
  </h3>
  <div class="space-y-3 text-sm sm:text-base">
    ${enrichedData.smart_length ? `
    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
      <span class="font-medium flex items-center">
        <svg class="w-4 h-4 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
        </svg>
        Length
      </span>
      <span>${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span>
    </div>` : ""}
  </div>
</div>

Return ONLY clean HTML without markdown or code blocks.
`
        : `
Tu es un expert en rédaction de descriptions produit Shopify. Crée une DESCRIPTION DE PRODUIT HTML PROPRE et PROFESSIONNELLE qui sera insérée dans le champ description de Shopify.

🚫 IMPORTANT: Ceci est une DESCRIPTION DE PRODUIT uniquement. PAS de prix, PAS de boutons "Ajouter au Panier", PAS de fonctionnalité e-commerce.

📱 DESIGN MOBILE-FIRST:
- Conçois d'abord pour mobile, puis adapte pour desktop
- Utilise des classes Tailwind mobile-first (sm:, md:, lg:)
- Layout single colonne pour mobile, grilles responsives pour grands écrans
- Taille des éléments adaptée au touch

🎨 SYSTÈME D'ICÔNES MODERNES:
- Utilise des icônes SVG modernes et professionnelles - pas d'icônes enfantines ou cartoon
- Toutes les icônes doivent être relatives à la couleur du thème sélectionné (${mainColor})
- Utilise les classes stroke-current et fill-current pour la cohérence des couleurs
- Les icônes doivent être simples, élégantes et minimalistes
- Utilise des icônes appropriées pour chaque section

📦 DONNÉES PRODUIT:
- Titre: ${title}
${finalVendor ? `- Marque: ${finalVendor}` : ""}
${existingDescription ? `- Description existante: ${existingDescription}` : ""}
${
  customHighlights
    ? `\n🌟 CARACTÉRISTIQUES PRINCIPALES:\n${customHighlights
        .split("\n")
        .map((h: string) => `- ${h.trim()}`)
        .filter((h: string) => h.length > 2)
        .join("\n")}`
    : ""
}

📸 IMAGES (${finalImages.length} disponibles):
${finalImages.map((img: any, index: number) => `- ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 ANALYSE VISION AI:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}
${buildEnrichedContext()}

📱 SECTIONS DE CONTENU OBLIGATOIRES (dans cet ordre):

1. **INTRODUCTION PRODUIT** (H1)
   - Titre propre avec nom du produit
   - Description brève et convaincante
   - Focus sur bénéfices principaux

2. **CARACTÉRISTIQUES VISUELLES** (H2)
   ${
     enrichedData.ai_color || enrichedData.ai_material
       ? `
   - Met en avant attributs visuels clés avec icônes modernes
   - Présentation style badges simple
   - Utilise la couleur ${mainColor} pour icônes et accents
   `
       : ""
   }

3. **GALERIE IMAGES** (H2)
   - Afficher les ${finalImages.length} images
   - Mobile: grid-cols-1, Tablet: grid-cols-2, Desktop: grid-cols-3
   - Présentation image propre avec lazy loading

4. **CARACTÉRISTIQUES TECHNIQUES** (H3)
   ${
     enrichedData.smart_length || enrichedData.smart_width
       ? `
   - Tableau spécifications propre avec icônes modernes
   - Mobile: disposition verticale, Desktop: layout deux colonnes
   - Inclure toutes dimensions disponibles avec icônes appropriées
   `
       : ""
   }

5. **MATÉRIAUX & QUALITÉ** (H3)
   ${
     enrichedData.ai_material || enrichedData.ai_finish
       ? `
   - Détail matériaux et qualité avec icônes pertinentes
   - Focus sur durabilité et construction
   `
       : ""
   }

6. **UTILISATION & AVANTAGES** (H4)
   - Applications pratiques avec icônes de fonctionnalités
   - Bénéfices clients
   - Points simples sous forme liste

7. **ENTRETIEN & MAINTENANCE** (H4)
   - Instructions d'entretien de base avec icônes de maintenance
   - Conseils de maintenance

🎨 EXIGENCES DESIGN:
- **Approche mobile-first**: Conçois pour écrans 320px+ d'abord
- Apparence propre et professionnelle
- Utilise la couleur ${mainColor} pour titres, icônes et accents
- Focus sur la lisibilité et présentation du contenu
- Hiérarchie de titres appropriée (H1, H2, H3, H4) pour SEO
- Toutes les icônes doivent utiliser currentColor ou coloriage basé sur le thème

🚫 STRICTEMENT INTERDIT:
- PAS de boutons "Ajouter au Panier"
- PAS d'informations de prix
- PAS de fonctionnalité checkout
- PAS de JavaScript complexe
- PAS de feuilles de style externes
- PAS d'iframes ou contenu embarqué
- PAS d'icônes enfantines ou cartoon

✅ SORTIE REQUISE:
- HTML pur avec classes Tailwind simples
- Structure sémantique propre avec hiérarchie de titres appropriée
- Design responsive mobile-first
- Icônes SVG modernes utilisant la couleur de thème ${mainColor}
- Présentation produit professionnelle
- Toutes images de la liste fournie
- Informations produit complètes

Exemple d'utilisation d'icônes modernes:
<svg class="w-5 h-5" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>

Exemple grille images mobile-first:
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
  ${finalImages.map((img: any) => `<img src="${img.src || img}" alt="${img.alt_text || title}" class="w-full h-auto rounded-lg shadow-sm" loading="lazy">`).join("\n  ")}
</div>

Exemple spécifications avec icônes:
<div class="bg-gray-50 rounded-lg p-4 sm:p-6 my-8">
  <h3 class="text-lg sm:text-xl font-semibold mb-4 flex items-center">
    <svg class="w-5 h-5 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    </svg>
    Caractéristiques Techniques
  </h3>
  <div class="space-y-3 text-sm sm:text-base">
    ${enrichedData.smart_length ? `
    <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
      <span class="font-medium flex items-center">
        <svg class="w-4 h-4 mr-2" style="color: ${mainColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
        </svg>
        Longueur
      </span>
      <span>${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span>
    </div>` : ""}
  </div>
</div>

Retourne UNIQUEMENT du HTML propre sans markdown ou blocs de code.
`;

    // 🔹 Appel Lovable AI avec modèle GPT-4
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              language === "en"
                ? "You are a professional Shopify product description writer. You create clean, professional HTML product descriptions using simple Tailwind CSS. You focus on presenting product information clearly without any e-commerce functionality. No prices, no add to cart buttons, just beautiful product presentation that works well in Shopify's description field. Use modern SVG icons and mobile-first design."
                : "Tu es un rédacteur professionnel de descriptions produit Shopify. Tu crées des descriptions de produit HTML propres et professionnelles avec Tailwind CSS simple. Tu te concentres sur la présentation claire des informations produit sans aucune fonctionnalité e-commerce. Pas de prix, pas de boutons ajouter au panier, juste une belle présentation produit qui fonctionne bien dans le champ description de Shopify. Utilise des icônes SVG modernes et un design mobile-first.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
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

    console.log("✅ Product description generated successfully");

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
    console.error("❌ Error generating product description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});