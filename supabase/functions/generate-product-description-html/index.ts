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
      mobileFirst = true, // 🆕 Nouveau paramètre mobile-first
    } = await req.json();

    if (!title) {
      throw new Error("Product title is required");
    }

    console.log(`📱 Starting ${mobileFirst ? "MOBILE-FIRST" : "standard"} generation for:`, title);

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
      mobileFirst,
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

    // 🎯 PROMPT MOBILE-FIRST AMÉLIORÉ
    const prompt =
      language === "en"
        ? `
You are an elite Shopify UX/UI designer creating premium HTML product descriptions with STRICT MOBILE-FIRST approach.

🎯 CRITICAL MOBILE-FIRST REQUIREMENTS:
- Design for 320px mobile screens FIRST, then adapt to desktop
- Use mobile-first Tailwind classes (no prefix for mobile, sm: for tablet, lg: for desktop)
- Single column layout for mobile, responsive grids only on larger screens
- Touch-friendly buttons (min-height: 44px) and interactive elements
- Optimize images for mobile (lazy loading, webp format preferred)
- Fast loading: minimize HTML size, optimize CSS
- Readable typography (16px base font size for mobile)

📱 MOBILE-FIRST BREAKPOINT SYSTEM:
- Mobile: < 768px (default styles - grid-cols-1, w-full)
- Tablet: 768px+ (sm: classes - sm:grid-cols-2)
- Desktop: 1024px+ (lg: classes - lg:grid-cols-3)

🚫 STRICTLY PROHIBITED ON MOBILE:
- NO complex multi-column layouts on mobile
- NO small touch targets (<44px height)
- NO heavy animations that affect performance
- NO horizontal scrolling required
- NO tiny text (<16px base font size)

🎨 MOBILE-FIRST COLOR SYSTEM:
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

📦 MANDATORY MOBILE-FIRST SECTIONS:

1. **MOBILE HERO SECTION** (H1)
   - Full-width layout on mobile
   - Large, readable font sizes (text-3xl on mobile)
   - Single CTA focus
   - Fast-loading hero image

2. **MOBILE IMAGE GALLERY**
   - grid-cols-1 on mobile
   - sm:grid-cols-2 on tablet  
   - lg:grid-cols-3 on desktop
   - Lazy loading enabled
   - Touch-friendly image navigation

3. **MOBILE-FRIENDLY FEATURES**
   - Stack vertically on mobile (flex-col)
   - Use large, clear icons (w-6 h-6)
   - Ample spacing between items (space-y-6)
   - Readable text sizes

4. **MOBILE SPECIFICATIONS**
   - Simple accordion or stacked layout
   - Easy to scroll and read
   - Clear typography hierarchy

5. **MOBILE CALL-TO-ACTION**
   - Clear value proposition
   - Large, touch-friendly buttons
   - Mobile-optimized layout

📊 PRODUCT DATA:
- Title: ${title}
- Brand: ${finalVendor || ""}
- Description: ${existingDescription || ""}
- Style: ${style || enrichedData?.style || ""}

${buildEnrichedContext()}

🖼️ IMAGES (${finalImages.length} total) - MOBILE OPTIMIZED:
${finalImages.map((img: any, index: number) => `${index + 1}. ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 VISION ANALYSIS:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}

${customHighlights ? `\n💡 CUSTOM HIGHLIGHTS:\n${customHighlights}` : ""}

🎯 MOBILE-FIRST DESIGN PATTERNS TO USE:

<!-- Mobile Hero Section -->
<section class="mobile-padding bg-gradient-to-br from-gray-50 to-white py-12">
  <div class="max-w-md mx-auto text-center">
    <h1 class="text-3xl font-bold theme-text mb-4">${title}</h1>
    <p class="text-lg text-gray-600 mb-6 mobile-text">${existingDescription?.substring(0, 120) || "Premium quality product designed for modern living."}...</p>
  </div>
</section>

<!-- Mobile Image Gallery -->
<section class="mobile-padding py-8">
  <h2 class="text-2xl font-bold theme-text text-center mb-6">Gallery</h2>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${finalImages
      .map(
        (img: any) =>
          `<img src="${img.src || img}" alt="${img.alt_text || title}" 
            class="w-full h-auto rounded-xl shadow-md" loading="lazy">`,
      )
      .join("\n    ")}
  </div>
</section>

<!-- Mobile Features Stack -->
<section class="mobile-padding py-8 bg-gray-50 rounded-2xl mx-4">
  <h2 class="text-2xl font-bold theme-text text-center mb-8">Features</h2>
  <div class="space-y-6 max-w-md mx-auto">
    ${
      enrichedData?.ai_color
        ? `
    <div class="flex items-center gap-4 touch-target mobile-stack sm:flex-row">
      <div class="theme-bg rounded-full p-3">
        <svg class="w-6 h-6 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"/>
        </svg>
      </div>
      <div>
        <h3 class="font-semibold theme-text text-lg">Color</h3>
        <p class="text-gray-600 mobile-text">${enrichedData.ai_color}</p>
      </div>
    </div>`
        : ""
    }
    
    ${
      enrichedData?.ai_material
        ? `
    <div class="flex items-center gap-4 touch-target mobile-stack sm:flex-row">
      <div class="theme-bg rounded-full p-3">
        <svg class="w-6 h-6 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <div>
        <h3 class="font-semibold theme-text text-lg">Material</h3>
        <p class="text-gray-600 mobile-text">${enrichedData.ai_material}</p>
      </div>
    </div>`
        : ""
    }
  </div>
</section>

<!-- Mobile Specifications -->
<section class="mobile-padding py-8">
  <h2 class="text-2xl font-bold theme-text text-center mb-8">Specifications</h2>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
    <div class="space-y-4">
      ${
        enrichedData?.smart_length
          ? `
      <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
        <span class="font-semibold theme-text flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/>
          </svg>
          Length
        </span>
        <span class="text-gray-700">${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span>
      </div>`
          : ""
      }
    </div>
  </div>
</section>

✅ REQUIRED MOBILE OUTPUT:
- Pure HTML with MOBILE-FIRST Tailwind classes
- Single column layout for mobile (grid-cols-1)
- Touch-optimized interactive elements (min-height: 44px)
- Fast loading performance (lazy loading images)
- Responsive images with proper alt texts
- Readable typography (16px base font size)
- Clean, semantic HTML structure
- Proper use of mobile-padding and touch-target classes

Return ONLY the HTML code without any explanations.
`
        : `
Tu es un designer UX/UI Shopify expert créant des descriptions de produit HTML premium avec une approche MOBILE-FIRST stricte.

🎯 EXIGENCES CRITIQUES MOBILE-FIRST:
- Conçois d'abord pour écrans mobiles 320px, puis adapte pour desktop
- Utilise les classes Tailwind mobile-first (sans préfixe pour mobile, sm: pour tablette, lg: pour desktop)
- Layout single colonne pour mobile, grilles responsives seulement sur grands écrans
- Boutons optimisés tactile (hauteur min: 44px) et éléments interactifs
- Images optimisées pour mobile (lazy loading, format webp préféré)
- Chargement rapide : HTML minimal, CSS optimisé
- Typographie lisible (taille de base 16px pour mobile)

📱 SYSTÈME DE BREAKPOINTS MOBILE-FIRST:
- Mobile: < 768px (styles par défaut - grid-cols-1, w-full)
- Tablet: 768px+ (classes sm: - sm:grid-cols-2)
- Desktop: 1024px+ (classes lg: - lg:grid-cols-3)

🚫 STRICTEMENT INTERDIT SUR MOBILE:
- PAS de layouts multi-colonnes complexes sur mobile
- PAS de petites cibles tactiles (<44px de hauteur)
- PAS d'animations lourdes qui affectent les performances
- PAS de défilement horizontal requis
- PAS de texte trop petit (<16px taille de base)

🎨 SYSTÈME DE COULEUR MOBILE-FIRST:
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

📦 SECTIONS MOBILE-FIRST OBLIGATOIRES:

1. **SECTION HERO MOBILE** (H1)
   - Layout pleine largeur sur mobile
   - Tailles de police grandes et lisibles (text-3xl sur mobile)
   - Focus CTA unique
   - Image hero à chargement rapide

2. **GALERIE IMAGES MOBILE**
   - grid-cols-1 sur mobile
   - sm:grid-cols-2 sur tablette
   - lg:grid-cols-3 sur desktop
   - Lazy loading activé
   - Navigation image tactile

3. **FONCTIONNALITÉS MOBILE**
   - Disposition verticale sur mobile (flex-col)
   - Icônes grandes et claires (w-6 h-6)
   - Espacement généreux entre éléments (space-y-6)
   - Tailles de texte lisibles

4. **SPÉCIFICATIONS MOBILE**
   - Layout accordéon simple ou empilé
   - Facile à scroller et lire
   - Hiérarchie typographique claire

5. **APPEL-À-L'ACTION MOBILE**
   - Proposition de valeur claire
   - Boutons grands et tactiles
   - Layout optimisé mobile

📊 DONNÉES PRODUIT:
- Titre: ${title}
- Marque: ${finalVendor || ""}
- Description: ${existingDescription || ""}
- Style: ${style || enrichedData?.style || ""}

${buildEnrichedContext()}

🖼️ IMAGES (${finalImages.length} total) - OPTIMISÉ MOBILE:
${finalImages.map((img: any, index: number) => `${index + 1}. ${img.src || img}${img.alt_text ? ` (${img.alt_text})` : ""}`).join("\n")}

${visionAnalysis ? `\n🔍 ANALYSE VISION AI:\n${JSON.stringify(visionAnalysis, null, 2)}` : ""}

${customHighlights ? `\n💡 POINTS FORTS PERSONNALISÉS:\n${customHighlights}` : ""}

🎯 PATRONS DE DESIGN MOBILE-FIRST À UTILISER:

<!-- Section Hero Mobile -->
<section class="mobile-padding bg-gradient-to-br from-gray-50 to-white py-12">
  <div class="max-w-md mx-auto text-center">
    <h1 class="text-3xl font-bold theme-text mb-4">${title}</h1>
    <p class="text-lg text-gray-600 mb-6 mobile-text">${existingDescription?.substring(0, 120) || "Produit de qualité premium conçu pour la vie moderne."}...</p>
  </div>
</section>

<!-- Galerie Images Mobile -->
<section class="mobile-padding py-8">
  <h2 class="text-2xl font-bold theme-text text-center mb-6">Galerie</h2>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${finalImages
      .map(
        (img: any) =>
          `<img src="${img.src || img}" alt="${img.alt_text || title}" 
            class="w-full h-auto rounded-xl shadow-md" loading="lazy">`,
      )
      .join("\n    ")}
  </div>
</section>

<!-- Stack Fonctionnalités Mobile -->
<section class="mobile-padding py-8 bg-gray-50 rounded-2xl mx-4">
  <h2 class="text-2xl font-bold theme-text text-center mb-8">Caractéristiques</h2>
  <div class="space-y-6 max-w-md mx-auto">
    ${
      enrichedData?.ai_color
        ? `
    <div class="flex items-center gap-4 touch-target mobile-stack sm:flex-row">
      <div class="theme-bg rounded-full p-3">
        <svg class="w-6 h-6 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"/>
        </svg>
      </div>
      <div>
        <h3 class="font-semibold theme-text text-lg">Couleur</h3>
        <p class="text-gray-600 mobile-text">${enrichedData.ai_color}</p>
      </div>
    </div>`
        : ""
    }
    
    ${
      enrichedData?.ai_material
        ? `
    <div class="flex items-center gap-4 touch-target mobile-stack sm:flex-row">
      <div class="theme-bg rounded-full p-3">
        <svg class="w-6 h-6 theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <div>
        <h3 class="font-semibold theme-text text-lg">Matériau</h3>
        <p class="text-gray-600 mobile-text">${enrichedData.ai_material}</p>
      </div>
    </div>`
        : ""
    }
  </div>
</section>

<!-- Spécifications Mobile -->
<section class="mobile-padding py-8">
  <h2 class="text-2xl font-bold theme-text text-center mb-8">Caractéristiques Techniques</h2>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
    <div class="space-y-4">
      ${
        enrichedData?.smart_length
          ? `
      <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
        <span class="font-semibold theme-text flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/>
          </svg>
          Longueur
        </span>
        <span class="text-gray-700">${enrichedData.smart_length} ${enrichedData.smart_length_unit || "cm"}</span>
      </div>`
          : ""
      }
    </div>
  </div>
</section>

✅ SORTIE MOBILE REQUISE:
- HTML pur avec classes Tailwind MOBILE-FIRST
- Layout single colonne pour mobile (grid-cols-1)
- Éléments interactifs optimisés tactile (min-height: 44px)
- Performances de chargement rapides (lazy loading images)
- Images responsives avec textes alt appropriés
- Typographie lisible (taille de base 16px)
- Structure HTML sémantique et propre
- Utilisation correcte des classes mobile-padding et touch-target

Retourne UNIQUEMENT le code HTML sans explications.
`;

    // 🔹 Appel Lovable AI avec timeout
    console.log("🤖 Starting AI generation with mobile-first approach...");
    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 60000);

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
                ? `You are a professional Shopify product description writer specializing in MOBILE-FIRST design. You create clean, responsive HTML product descriptions using mobile-first Tailwind CSS.

CRITICAL MOBILE REQUIREMENTS:
1. Design for 320px mobile screens FIRST
2. Use mobile-first breakpoint system (no prefix mobile, sm: tablet, lg: desktop)
3. Single column layout for mobile, responsive grids only on larger screens
4. Touch-friendly interactive elements (min-height: 44px)
5. Fast loading: optimize images, minimize code
6. Readable typography (16px base font size)

Focus on presenting product information clearly without any e-commerce functionality. No prices, no add to cart buttons, just beautiful mobile-optimized product presentation.`
                : `Tu es un rédacteur professionnel de descriptions produit Shopify spécialisé en design MOBILE-FIRST. Tu crées des descriptions de produit HTML propres et responsives avec Tailwind CSS mobile-first.

EXIGENCES MOBILE CRITIQUES:
1. Conçois d'abord pour écrans mobiles 320px
2. Utilise le système de breakpoints mobile-first (sans préfixe mobile, sm: tablette, lg: desktop)
3. Layout single colonne pour mobile, grilles responsives seulement sur grands écrans
4. Éléments interactifs tactiles (hauteur min: 44px)
5. Chargement rapide : optimise images, minimise code
6. Typographie lisible (taille de base 16px)

Concentre-toi sur la présentation claire des informations produit sans fonctionnalité e-commerce. Pas de prix, pas de boutons ajouter au panier, juste une belle présentation produit optimisée mobile.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4500,
        temperature: 0.7,
      }),
      signal: aiController.signal,
    });

    clearTimeout(aiTimeout);

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

    // 🔍 Validation mobile
    console.log("🔍 Validating mobile-first HTML...");
    const mobileChecks = {
      hasMobileGrid: content.includes("grid-cols-1"),
      hasResponsive: content.includes("sm:") || content.includes("lg:"),
      hasLazyLoading: content.includes('loading="lazy"'),
      hasMobilePadding: content.includes("mobile-padding"),
      hasTouchTargets: content.includes("touch-target") || content.includes("min-height: 44px"),
    };

    const mobileScore = Object.values(mobileChecks).filter(Boolean).length;
    console.log(`📊 Mobile optimization score: ${mobileScore}/5`);

    console.log("✅ Mobile-first product description generated successfully");

    // Métriques
    const mediaCount = finalImages.length;
    const variantCount = finalVariants.length;
    const wordCount = content.split(/\s+/).length;

    // 💾 Sauvegarde dans la base de données
    if (userId && product_id) {
      try {
        console.log("💾 Saving mobile-first product description to database...");

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
          html_content: content,
          config: {
            language,
            vendor: finalVendor,
            content_length: contentLength,
            style,
            layout,
            mainColor,
            customHighlights,
            mobile_first: mobileFirst,
            mobile_score: mobileScore,
            mobile_checks: mobileChecks,
          },
          version: newVersion,
          is_active: true,
        });

        if (saveError) {
          console.error("❌ Save error:", saveError);
        } else {
          console.log(`✅ Mobile-first product description v${newVersion} saved successfully`);
        }
      } catch (saveError) {
        console.error("❌ Database save error:", saveError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        htmlLandingPage: content,
        optimizedTitle: title,
        mediaCount,
        variantCount,
        mobileOptimized: true,
        mobileScore,
        mobileChecks,
        wordCount,
        config: {
          style,
          layout,
          mainColor,
          contentLength,
          language,
          mobileFirst,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error generating mobile-first product description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
