import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polices luxueuses
const LUXURY_FONTS = {
  hero: ["Playfair Display:wght@400;700;900", "Cormorant Garamond:wght@300;400;600"],
  heading: ["Montserrat:wght@400;500;600;700", "Raleway:wght@300;400;600;700"],
  body: ["Inter:wght@300;400;500;600", "Source Sans Pro:wght@300;400;600"],
  accent: ["Cinzel:wght@400;600;700", "Libre Baskerville:wght@400;700"],
};

serve(async (req) => {
  // Entry logging - very first thing
  console.log('[DEEPSEEK] ===== FUNCTION INVOKED =====', {
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    console.log('[DEEPSEEK] Request body parsed', {
      productId: body?.productId,
      hasStyle: !!body?.style,
      hasLayout: !!body?.layout,
      language: body?.language
    });

    const {
      productId,
      style = "modern",
      layout = "single-column",
      colorScheme,
      contentLength = "medium",
      customHighlights = "",
      language = "fr",
    } = body;

    console.log(`🚀 Generating landing page for product ${productId}`);

    // DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Load product
    const { data: product } = await supabase
      .from("shopify_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!product) throw new Error("Product not found");

    let enrichedProduct = product;

    // Enrich if needed
    if (!product.smart_length || !product.vision_analyzed) {
      console.log("🔄 Enriching product...");
      await supabase.functions.invoke("enrich-product", {
        body: { productId },
      });

      const { data: updated } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("id", productId)
        .single();

      if (updated) enrichedProduct = updated;
    }

    console.log("✅ Product enrichment complete");

    // Load images (limit to 4 for better performance)
    const { data: images } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("position")
      .limit(4);

    // Detect dimension schema image
    const dimensionImage = images?.find((img: any) => 
      img.alt_text?.toLowerCase().includes('dimension') ||
      img.alt_text?.toLowerCase().includes('schéma') ||
      img.alt_text?.toLowerCase().includes('mesure') ||
      img.alt_text?.toLowerCase().includes('plan') ||
      img.src?.toLowerCase().includes('dimension')
    );

    // Vision analysis
    let visualAnalysis = "";

    if (images?.length && LOVABLE_API_KEY) {
      const imagesToAnalyze = Math.min(3, images.length);
      console.log(`🖼️ Analyzing ${imagesToAnalyze} images with Lovable AI Vision`);

      for (const img of images.slice(0, imagesToAnalyze)) {
        try {
          const imgBase64 = img.src.includes("base64")
            ? img.src.split(",")[1]
            : await fetchImageAsBase64(img.src);

          const visionRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: language === "fr"
                        ? "Analyse cette image de produit. Donne les matériaux visibles, couleurs dominantes, style, finitions et dimensions apparentes (si visibles)."
                        : "Analyze this product image. Describe visible materials, dominant colors, style, finish, and visible dimensions if any."
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:image/jpeg;base64,${imgBase64}` },
                    },
                  ],
                },
              ],
              temperature: 0.4,
            }),
          });

          if (!visionRes.ok) {
            const errorText = await visionRes.text();
            console.warn(`⚠️ Lovable AI Vision error ${visionRes.status} for image ${img.position}:`, errorText);
            
            if (visionRes.status === 429) {
              console.log("⚠️ Rate limit exceeded - skipping remaining images");
              break;
            } else if (visionRes.status === 402) {
              console.log("⚠️ Payment required - skipping remaining images");
              break;
            }
            continue;
          }

          const visionJson = await visionRes.json();
          const text = visionJson?.choices?.[0]?.message?.content || "";
          if (text) {
            visualAnalysis += `\n\nImage ${img.position}: ${text}`;
          }
        } catch (error) {
          console.warn(`⚠️ Vision analysis failed for image ${img.position}:`, error);
        }
      }
    }

    console.log(`✅ Visual analysis complete: ${visualAnalysis.length} chars generated`);

    // Load variants
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);

    const variantsInfo =
      variants && variants.length > 1
        ? `\n\n📦 VARIANTES:\n${variants
            .map((v: any, i: number) => `${i + 1}. ${v.title} — ${v.price}€`)
            .join("\n")}`
        : "";

    // DESIGN TOKENS + FONTS
    const designTokens = generateDesignTokens(colorScheme);
    const fonts = selectLuxuryFonts(style);

    // Product Data - Enriched & Structured
    const productData = {
      title: product.title,
      description: product.body_html || product.seo_description || "",
      excerpt: product.body_html?.substring(0, 200) || "",
      vendor: product.vendor,
      
      // Dimensions structurées avec priorité Vision > Smart
      dimensions: {
        vision: enrichedProduct.vision_attributes?.technicalDimensions || {},
        smart: {
          length: enrichedProduct.smart_length,
          width: enrichedProduct.smart_width,
          height: enrichedProduct.smart_height,
          depth: enrichedProduct.smart_depth,
          weight: enrichedProduct.smart_weight,
          seat_height: enrichedProduct.smart_seat_height,
        },
        summary: {
          length: enrichedProduct.vision_attributes?.technicalDimensions?.length || enrichedProduct.smart_length,
          width: enrichedProduct.vision_attributes?.technicalDimensions?.width || enrichedProduct.smart_width,
          height: enrichedProduct.vision_attributes?.technicalDimensions?.height || enrichedProduct.smart_height,
          depth: enrichedProduct.vision_attributes?.technicalDimensions?.depth || enrichedProduct.smart_depth,
          weight: enrichedProduct.vision_attributes?.technicalDimensions?.weight || enrichedProduct.smart_weight,
        }
      },
      
      // Matériaux et finitions
      materials: enrichedProduct.vision_attributes?.materials || [],
      colors: enrichedProduct.vision_attributes?.colors || [],
      styleDetected: enrichedProduct.vision_attributes?.style || [],
      
      // Caractéristiques et fonctionnalités
      features: enrichedProduct.vision_attributes?.features || [],
      characteristics: enrichedProduct.characteristics || [],
      room_type: enrichedProduct.vision_attributes?.roomType || [],
      
      // Analyses visuelles
      visualAnalysis,
      
      // Variants & Options
      variants: variantsInfo,
      hasVariants: (variants?.length || 0) > 1,
      
      // Custom highlights
      customHighlights,
      
      // Images avec dimension schema détectée
      images: images || [],
      dimensionImageUrl: dimensionImage?.src || null,
    };

    // Check if recently generated (cache for 24h)
    const { data: cached } = await supabase
      .from("shopify_products")
      .select("landing_page_html, last_landing_generation_at")
      .eq("id", productId)
      .single();

    if (cached?.landing_page_html && cached?.last_landing_generation_at) {
      const lastGen = new Date(cached.last_landing_generation_at);
      const hoursSince = (Date.now() - lastGen.getTime()) / (1000 * 60 * 60);
      
      if (hoursSince < 24) {
        console.log(`✅ Using cached landing page from ${hoursSince.toFixed(1)}h ago`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            html: cached.landing_page_html,
            cached: true,
            cacheAge: hoursSince.toFixed(1)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // BUILD PROMPT WITH MANDATORY BLOCK
    const prompt = buildDeepSeekPrompt(productData, {
      style,
      layout,
      designTokens,
      fonts,
      contentLength,
      language,
      images,
    });

    const promptSizeKB = (new Blob([prompt]).size / 1024).toFixed(2);
    console.log("🤖 DeepSeek generating HTML...");
    console.log(`📏 Prompt: ${prompt.length} chars (${promptSizeKB} KB)`);

    let deepseekResponse;
    try {
      // Add timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!deepseekResponse.ok) {
        const errorBody = await deepseekResponse.text();
        console.error("❌ DeepSeek API error:", deepseekResponse.status, errorBody);
        
        if (deepseekResponse.status === 429) {
          throw new Error("RATE_LIMIT: DeepSeek API rate limit exceeded. Please try again later.");
        } else if (deepseekResponse.status === 402) {
          throw new Error("PAYMENT_REQUIRED: DeepSeek API credits exhausted. Please add credits.");
        } else if (deepseekResponse.status === 413) {
          throw new Error("PAYLOAD_TOO_LARGE: Prompt exceeds DeepSeek limits. Try reducing product data.");
        }
        
        throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorBody}`);
      }
    } catch (error) {
      console.error("❌ DeepSeek API fetch error:", error);
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new Error("DeepSeek API request timeout after 2 minutes");
      }
      throw new Error(`DeepSeek API fetch failed: ${err.message}`);
    }

    const deepseekJson = await deepseekResponse.json();
    let html = deepseekJson.choices[0].message.content;

    // Debug: Preview first 500 chars of raw output
    console.log("🔍 HTML preview (début):", html.slice(0, 500));

    // Validate HTML structure before cleaning
    const hasHtmlStructure = html.includes("<html") || html.includes("<body") || html.includes("<div");
    if (!hasHtmlStructure) {
      console.error("❌ DeepSeek did not return valid HTML. Raw content:", html.slice(0, 1000));
      throw new Error("Le modèle n'a pas renvoyé de HTML valide. Veuillez réessayer.");
    }

    html = cleanHTML(html);
    
    const htmlSizeKB = (html.length / 1024).toFixed(2);
    console.log(`📏 Generated HTML: ${htmlSizeKB} KB`);
    
    // Validate HTML
    const validation = validateCompleteHTML(html);
    console.log("📊 Validation:", validation.valid ? "✅ PASS" : "⚠️ ISSUES", validation.issues);
    
    if (!validation.valid) {
      console.warn("⚠️ Generated HTML has validation issues but proceeding:", validation.issues);
    }

    console.log("✅ HTML generated successfully");

    // Update product with generated HTML
    console.log('[DEEPSEEK] Updating product in database...', { 
      productId, 
      htmlLength: html.length 
    });

    const { error: updateError } = await supabase
      .from("shopify_products")
      .update({
        landing_page_html: html,
        last_landing_generation_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error('[DEEPSEEK] ❌ Database update failed:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      // Still return HTML but log the error - don't fail the entire operation
      console.warn('[DEEPSEEK] ⚠️ Continuing despite DB update error - HTML will still be returned');
    } else {
      console.log('[DEEPSEEK] ✅ Database updated successfully');
    }

    console.log('[DEEPSEEK] ===== GENERATION SUCCESS =====', {
      htmlLength: html.length,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        productData: {
          title: product.title,
          hasVariants: (variants?.length || 0) > 1,
          imagesAnalyzed: images?.length || 0,
          enrichmentComplete: true,
        }
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('[DEEPSEEK] ===== FATAL ERROR =====', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    let statusCode = 500;
    let errorMessage = error.message || "Failed to generate landing page";
    
    if (errorMessage.includes("RATE_LIMIT")) {
      statusCode = 429;
    } else if (errorMessage.includes("PAYMENT_REQUIRED")) {
      statusCode = 402;
    } else if (errorMessage.includes("PAYLOAD_TOO_LARGE")) {
      statusCode = 413;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.stack || "No additional details",
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/* 🔥 PROMPT BUILDER PREMIUM TYPE SHOPIFY - VERSION COMPLÈTE */
function buildDeepSeekPrompt(productData: any, config: any): string {
  const { style, layout, designTokens, fonts, contentLength, language, images } = config;

  const fontLinks = Object.values(fonts)
    .flat()
    .map(
      (f: any) =>
        `<link href="https://fonts.googleapis.com/css2?family=${f}&display=swap" rel="stylesheet">`
    )
    .join("\n");

  const wordCount =
    contentLength === "short"
      ? "800-1200"
      : contentLength === "long"
      ? "2000-3000"
      : "1200-1800";

  // Extract font family names for CSS
  const heroFont = fonts.hero[0]?.split(':')[0].replace(/\+/g, ' ') || 'Playfair Display';
  const headingFont = fonts.heading[0]?.split(':')[0].replace(/\+/g, ' ') || 'Montserrat';
  const bodyFont = fonts.body[0]?.split(':')[0].replace(/\+/g, ' ') || 'Inter';
  const accentFont = fonts.accent[0]?.split(':')[0].replace(/\+/g, ' ') || 'Cinzel';

  /*  STRUCTURE HTML OBLIGATOIRE  */
  const structureBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 STRUCTURE HTML OBLIGATOIRE (TYPE SHOPIFY PREMIUM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

La landing page DOIT contenir ces sections DANS CET ORDRE :

1️⃣ HERO SECTION (Bannière principale premium)
   - Grande image de fond ou image produit
   - Overlay gradient : bg-gradient-to-br from-black/60 via-black/40 to-transparent
   - Titre TRÈS GROS en font-['${heroFont}']
   - Badge optionnel : bg-accent/20 backdrop-blur-sm avec icône Lucide
   - Sous-titre/description courte
   - Height: min-h-[60vh] sm:min-h-[70vh] lg:min-h-[75vh]
   
2️⃣ POINTS FORTS (Highlights avec icônes Lucide - SECTION CRITIQUE)
   - Grid de 4 points forts : grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8
   - Chaque point : Icône Lucide + Titre + Description courte
   - Icônes dans cercles colorés : w-16 h-16 rounded-full bg-primary/10
   - Utiliser <i data-lucide="icon-name"></i>
   - Exemples d'icônes : truck, shield-check, zap, ruler, lightbulb, award, star
   
3️⃣ GALERIE D'IMAGES
   - Grid responsive : grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
   - Première image PLUS GRANDE : sm:col-span-2 sm:row-span-2
   - Images arrondies : rounded-lg shadow-lg hover:shadow-xl transition-shadow
   - Toutes les images en object-cover
   - IMPORTANT: Utiliser TOUTES les images disponibles (${images?.length || 0} images fournies)
   - Format pour chaque image: <img src="${images?.[0]?.src}" alt="Description produit" class="..." loading="lazy" />
   - Vérifier que chaque src pointe vers une URL valide
   
4️⃣ CARACTÉRISTIQUES CLÉS
   - Liste à puces avec icônes checkmark : <i data-lucide="check-circle"></i>
   - 2 colonnes sur desktop : grid-cols-1 lg:grid-cols-2
   - Police : font-['${bodyFont}']
   
5️⃣ DIMENSIONS DÉTAILLÉES
   - Si dimensionImageUrl existe : afficher l'image EN PREMIER
   - Image centrée : mx-auto max-w-md mb-8
   - Puis tableau HTML propre : table-auto w-full border divide-y
   - Lignes alternées : even:bg-muted/50
   
6️⃣ SPÉCIFICATIONS TECHNIQUES
   - Tableau structuré avec bordures
   - Headers : bg-muted font-semibold
   - Données issues de productData (dimensions, matériaux, poids, etc.)
   
7️⃣ MATÉRIAUX & FINITIONS
   - Section visuelle avec badges ou cards
   - Grid : grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
   
8️⃣ ANALYSE VISUELLE / DESCRIPTION LONGUE
   - Paragraphes aérés : space-y-4
   - Prose Tailwind : prose lg:prose-xl max-w-none
   - Police : font-['${bodyFont}']
`;

  /*  LAYOUT INSTRUCTIONS  */
  const layoutBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 APPLICATION DU LAYOUT : ${layout}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${layout === "one-column" ? `
• LAYOUT "1 colonne" :
  - Container : max-w-4xl mx-auto px-4
  - Tout empilé verticalement
  - Hero : Image pleine largeur, texte centré dessous
  - Sections : text-center sauf galerie et tableaux
` : layout === "two-column" ? `
• LAYOUT "2 colonnes" :
  - Hero : grid lg:grid-cols-2 gap-8 items-center
  - Image à gauche (lg:order-1), texte à droite (lg:order-2)
  - Sur mobile : stack vertical (image puis texte)
  - Sections suivantes : 1 colonne centrée
` : layout === "hero-left" ? `
• LAYOUT "hero à gauche" :
  - Hero : flex flex-col lg:flex-row items-center
  - Grande image à gauche (lg:w-1/2)
  - Texte à droite (lg:w-1/2 lg:pl-12)
  - Sur mobile : image en haut, texte en bas
` : `
• LAYOUT "hero à droite" :
  - Hero : flex flex-col lg:flex-row-reverse items-center
  - Image à droite (lg:w-1/2)
  - Texte à gauche (lg:w-1/2 lg:pr-12)
  - Sur mobile : image en haut, texte en bas
`}

🔴 MOBILE-FIRST CRITIQUE :
- Toujours classes mobile par défaut (sans préfixe)
- Breakpoints : sm: (640px+), lg: (1024px+), xl: (1280px+)
- Exemples OBLIGATOIRES :
  * Texte : text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
  * Grid : grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  * Padding : px-4 sm:px-6 lg:px-8
  * Gap : gap-4 sm:gap-6 lg:gap-8
  * Hero height : min-h-[60vh] lg:min-h-[70vh]
  * Stack : flex-col lg:flex-row
- Boutons touch-friendly : min-h-[44px] px-6 py-3
`;

  /*  FONTS & ICONS  */
  const fontsIconsBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ POLICES GOOGLE FONTS & ICÔNES LUCIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔤 POLICES À UTILISER :
${fontLinks}

APPLICATION OBLIGATOIRE :
- Hero title : font-['${heroFont}'] text-5xl sm:text-6xl lg:text-7xl font-bold
- Section headings : font-['${headingFont}'] text-3xl sm:text-4xl font-semibold
- Body text : font-['${bodyFont}'] text-base sm:text-lg
- Badges/Labels : font-['${accentFont}'] text-sm uppercase tracking-wide

🎨 LUCIDE ICONS (OBLIGATOIRE) :
Dans le <head>, ajouter :
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
  });
</script>

UTILISATION :
<i data-lucide="truck" class="w-8 h-8 text-primary"></i>

ICÔNES RECOMMANDÉES :
- Livraison : truck, package
- Qualité : shield-check, award, star
- Dimensions : ruler, move
- Montage : wrench, settings
- LED/Éclairage : lightbulb, zap
- Check : check-circle
- Premium : sparkles, crown
`;

  /*  STYLE APPLICATION  */
  const styleBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 STYLE : ${style}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${style === "minimalist" ? `
• MINIMALIST :
  - Beaucoup d'espace blanc : py-16 py-20 gap-12
  - Couleurs neutres : text-gray-600 bg-gray-50
  - Typographie simple : font-light font-normal
  - Pas trop d'icônes, design épuré
  - Bordures fines : border-gray-200
` : style === "premium" ? `
• PREMIUM :
  - Overlay gradients : bg-gradient-to-br
  - Typographie élégante : font-['${heroFont}']
  - Contraste fort : text-white on dark backgrounds
  - Animations hover : hover:scale-105 transition-transform
  - Ombres profondes : shadow-2xl
  - Bordures accent : border-accent
  - Sections avec fond : bg-muted/50
` : `
• MODERN :
  - Sections bien segmentées : border-t divide-y
  - Couleurs vives pour accents : bg-primary text-secondary
  - Ombres marquées : shadow-lg shadow-xl
  - Grid layouts : grid-cols-2 grid-cols-3
  - Transitions : transition-all duration-300
  - Contrastes nets
`}

🎨 COULEURS (HSL à utiliser) :
- Primary : hsl(${designTokens.primary}) → Titres, accents principaux
- Secondary : hsl(${designTokens.secondary}) → Sous-titres, séparateurs
- Accent : hsl(${designTokens.accent}) → Badges, highlights
- Background : hsl(${designTokens.background}) → Fond général
- Text : hsl(${designTokens.text}) → Texte principal
`;

  /*  LANGUE  */
  const languageBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 LANGUE : ${language.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 RÈGLE ABSOLUE : Toute la landing page (titres, textes, tableaux, labels, alt text) DOIT être en ${language}.
Si le titre ou la description du produit mélange plusieurs langues, tu DOIS traduire et harmoniser tout en ${language}.
NE JAMAIS laisser des morceaux dans d'autres langues.
`;

  /*  IMAGES DISPONIBLES  */
  const imagesBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ IMAGES DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📷 Nombre total d'images : ${images?.length || 0}

${images?.length > 0 ? images.map((img: any, idx: number) => `
Image ${idx + 1}:
- URL: ${img.src}
- Position: ${img.position || idx}
- Alt: ${img.alt_text || productData.title}
`).join('\n') : '⚠️ Aucune image disponible - utiliser des backgrounds colorés'}

🔴 RÈGLES IMAGES :
1. TOUJOURS utiliser loading="eager" pour la première image (hero)
2. TOUJOURS utiliser loading="lazy" pour les autres images (galerie)
3. Si aucune image hero, utiliser un background gradient
4. Inclure TOUTES les images dans la galerie
5. Format: <img src="URL_COMPLETE" alt="Description" class="..." />
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  /*  TEMPLATES DE SECTIONS  */
  const templatesBlock = `

🎯 HERO SECTION :
<section class="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
  ${images?.[0]?.src ? `
  <div class="absolute inset-0 z-0">
    <img src="${images[0].src}" alt="${productData.title}" class="w-full h-full object-cover" loading="eager" />
    <div class="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent"></div>
  </div>
  ` : `
  <div class="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5"></div>
  `}
  <div class="relative z-10 container mx-auto px-4 text-center ${images?.[0]?.src ? 'text-white' : 'text-foreground'}">
    <div class="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
      <i data-lucide="sparkles" class="w-4 h-4"></i>
      <span class="font-['${accentFont}'] text-sm uppercase tracking-wide">Premium Collection</span>
    </div>
    <h1 class="font-['${heroFont}'] text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-lg">
      ${productData.title}
    </h1>
    <p class="font-['${bodyFont}'] text-lg sm:text-xl lg:text-2xl max-w-2xl mx-auto mb-8 drop-shadow">
      ${productData.excerpt || productData.description?.substring(0, 150) || ''}
    </p>
  </div>
</section>

🎯 POINTS FORTS (CRITIQUE POUR CONVERSION) :
<section class="py-16 bg-background">
  <div class="container mx-auto px-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      ${productData.materials?.length > 0 ? `
      <div class="flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <i data-lucide="shield-check" class="w-8 h-8 text-primary"></i>
        </div>
        <h3 class="font-['${headingFont}'] text-lg font-semibold mb-2">Qualité Premium</h3>
        <p class="text-sm text-muted-foreground">${productData.materials[0]}</p>
      </div>
      ` : ''}
      ${productData.dimensions?.summary?.length ? `
      <div class="flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
          <i data-lucide="ruler" class="w-8 h-8 text-secondary"></i>
        </div>
        <h3 class="font-['${headingFont}'] text-lg font-semibold mb-2">Dimensions Idéales</h3>
        <p class="text-sm text-muted-foreground">${productData.dimensions.summary.length}cm × ${productData.dimensions.summary.width || '?'}cm</p>
      </div>
      ` : ''}
      <div class="flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <i data-lucide="zap" class="w-8 h-8 text-accent"></i>
        </div>
        <h3 class="font-['${headingFont}'] text-lg font-semibold mb-2">Fonctionnalité</h3>
        <p class="text-sm text-muted-foreground">${productData.features?.[0] || 'Design moderne'}</p>
      </div>
      <div class="flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <i data-lucide="truck" class="w-8 h-8 text-primary"></i>
        </div>
        <h3 class="font-['${headingFont}'] text-lg font-semibold mb-2">Livraison Soignée</h3>
        <p class="text-sm text-muted-foreground">Expédition rapide et sécurisée</p>
      </div>
    </div>
  </div>
</section>

🎯 GALERIE D'IMAGES :
<section class="py-12 bg-muted/30">
  <div class="container mx-auto px-4">
    <h2 class="font-['${headingFont}'] text-3xl sm:text-4xl font-semibold mb-8 text-center">Galerie</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="sm:col-span-2 sm:row-span-2">
        <img src="${images?.[0]?.src || ''}" alt="${images?.[0]?.alt_text || productData.title}" 
             class="w-full h-full object-cover rounded-lg shadow-lg hover:shadow-xl transition-shadow" />
      </div>
      ${images?.slice(1, 5).map((img: any) => `
      <div>
        <img src="${img.src}" alt="${img.alt_text || productData.title}" 
             class="w-full aspect-square object-cover rounded-lg shadow hover:shadow-lg transition-shadow" />
      </div>
      `).join('') || ''}
    </div>
  </div>
</section>

${productData.dimensionImageUrl ? `
🎯 IMAGE SCHÉMA DIMENSIONS :
Si dimensionImageUrl existe, dans la section "Dimensions détaillées" :
<div class="mb-8 flex justify-center">
  <img src="${productData.dimensionImageUrl}" alt="Schéma des dimensions" 
       class="mx-auto max-w-md rounded-lg shadow-lg" />
</div>
` : ''}
`;

  /*  RÈGLES TECHNIQUES  */
  const technicalRules = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RÈGLES TECHNIQUES OBLIGATOIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ PRIORITÉ DES DIMENSIONS
   - Si dimensions.vision existe → utiliser EN PRIORITÉ
   - Compléter avec dimensions.smart si vision incomplet
   - Ne JAMAIS inventer de valeurs

2️⃣ MATÉRIAUX / COULEURS
   - Utiliser EXACTEMENT ce qui est dans productData
   - Ne jamais inventer de matériaux

3️⃣ SECTIONS REQUISES
   - Points Forts (avec icônes Lucide)
   - Galerie d'images
   - Caractéristiques clés (liste à puces)
   - Dimensions détaillées (tableau + image schéma si dispo)
   - Spécifications techniques (tableau)

4️⃣ FORMAT DE SORTIE
   🔴 CRITIQUE : Retourne UNIQUEMENT du HTML complet :
   - Commence par <!DOCTYPE html>
   - Inclut <html lang="${language}">, <head>, <body>
   - Tailwind CSS via CDN dans <head>
   - Script Lucide dans <head>
   - AUCUN texte explicatif
   - AUCUNE phrase comme "Cette landing page..."

5️⃣ INTERDICTIONS
   ❌ Aucun CTA commercial / bouton acheter
   ❌ Aucune navigation ou footer
   ❌ Aucun prix affiché
   ❌ Ne jamais inventer de données
`;

  return `
Tu es un expert en création de landing pages e-commerce premium type Shopify (thèmes Prestige, Impulse, Broadcast).

📦 DONNÉES PRODUIT (À UTILISER À 100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(productData, null, 2)}

${structureBlock}
${layoutBlock}
${fontsIconsBlock}
${styleBlock}
${languageBlock}
${imagesBlock}
${templatesBlock}
${technicalRules}

📊 VOLUME DE CONTENU : ${wordCount} mots

🎯 OBJECTIF FINAL :
Créer une landing page PREMIUM, VISUELLEMENT IMPACTANTE, MOBILE-FIRST qui DONNE ENVIE D'ACHETER.
Design type thème Shopify haut de gamme, avec icônes, galerie stylée, polices élégantes, sections structurées.

Commence la génération HTML maintenant :
`;
}

function generateDesignTokens(colorScheme: any) {
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "210 100% 50%";
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return {
    primary: hexToHsl(colorScheme?.primary || "#1e40af"),
    secondary: hexToHsl(colorScheme?.secondary || "#7c3aed"),
    accent: hexToHsl(colorScheme?.accent || "#059669"),
    background: hexToHsl(colorScheme?.background || "#ffffff"),
    text: hexToHsl(colorScheme?.text || "#1f2937"),
  };
}

function selectLuxuryFonts(style: string) {
  const styleMap: { [key: string]: typeof LUXURY_FONTS } = {
    premium: {
      hero: LUXURY_FONTS.accent,
      heading: LUXURY_FONTS.hero,
      body: LUXURY_FONTS.body,
      accent: LUXURY_FONTS.accent,
    },
    modern: {
      hero: LUXURY_FONTS.heading,
      heading: LUXURY_FONTS.heading,
      body: LUXURY_FONTS.body,
      accent: LUXURY_FONTS.hero,
    },
    minimalist: {
      hero: LUXURY_FONTS.body,
      heading: LUXURY_FONTS.heading,
      body: LUXURY_FONTS.body,
      accent: LUXURY_FONTS.heading,
    },
  };

  return styleMap[style] || styleMap.modern;
}

function cleanHTML(html: string): string {
  // Remove markdown code blocks
  html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
  
  // Remove typical AI meta-phrases
  const metaPhrases = [
    /Cette landing page premium respecte strictement.*$/gims,
    /Cette landing page respecte.*$/gims,
    /This landing page.*$/gims,
    /✅\s*\*\*.*?\*\*.*$/gims,
    /Note :.*$/gims,
    /Note:.*$/gims,
  ];
  
  for (const pattern of metaPhrases) {
    html = html.replace(pattern, "");
  }
  
  // Remove excessive comments (but keep essential ones)
  html = html.replace(/<!--\s*(Note|Remarque|Important|TODO)[^>]*-->/gi, "");
  
  // Clean multiple newlines
  html = html.replace(/\n{3,}/g, "\n\n");
  
  // Ensure DOCTYPE is present at start
  if (!html.includes("<!DOCTYPE html>") && !html.includes("<!doctype html>")) {
    html = "<!DOCTYPE html>\n" + html;
  }
  
  return html.trim();
}

function validateCompleteHTML(html: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for essential HTML structure
  if (!html.includes("<!DOCTYPE html>") && !html.includes("<!doctype html>")) {
    issues.push("Missing DOCTYPE declaration");
  }
  if (!html.includes("<html")) {
    issues.push("Missing <html> tag");
  }
  if (!html.includes("</html>")) {
    issues.push("Missing closing </html> tag");
  }
  if (!html.includes("<head")) {
    issues.push("Missing <head> section");
  }
  if (!html.includes("<body")) {
    issues.push("Missing <body> section");
  }
  
  // Check for Lucide icons initialization
  if (!html.includes("lucide.createIcons")) {
    issues.push("Missing Lucide icons initialization script");
  }
  
  // Check HTML size
  if (html.length < 1000) {
    issues.push("HTML suspiciously short (< 1KB)");
  }
  
  // Check for Tailwind CDN
  if (!html.includes("tailwindcss") && !html.includes("cdn.tailwindcss.com")) {
    issues.push("Missing Tailwind CSS CDN");
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error("Error fetching image:", error);
    return "";
  }
}
