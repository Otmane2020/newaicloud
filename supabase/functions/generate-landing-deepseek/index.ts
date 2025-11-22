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

// ========== WCAG COLOR CONTRAST UTILITIES (from generate-landing-ai) ==========
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function hexToHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccessibleText(bgColor: string): string {
  const bgLum = getLuminance(bgColor);
  return bgLum > 0.5 ? "#000000" : "#FFFFFF";
}

function adjustSaturation(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Adjust saturation
  s = Math.min(1, s * factor);

  // Convert back to RGB
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

// Generate WCAG-compliant design tokens with HSL values
function generateDesignTokens(colorScheme: any) {
  const primaryHex = colorScheme?.primary || "#1a1a1a";
  const secondaryHex = colorScheme?.secondary || "#4a4a4a";
  const backgroundHex = colorScheme?.background || "#FFFFFF";
  const surfaceHex = colorScheme?.surface || "#F8F8F8";
  const textHex = colorScheme?.text || "#1a1a1a";
  const textMutedHex = colorScheme?.textMuted || "#6b6b6b";

  // Validate primary color contrast with white
  const contrast = calculateContrast(primaryHex, "#FFFFFF");
  const needsDarkText = contrast < 4.5;
  const ctaTextHex = needsDarkText ? "#000000" : "#FFFFFF";

  // Ensure background is light enough and text is dark enough
  const validatedBackgroundHex = getLuminance(backgroundHex) > 0.5 ? backgroundHex : "#FFFFFF";
  const validatedTextHex = getLuminance(textHex) < 0.5 ? textHex : "#1a1a1a";

  // Create vibrant accent by increasing saturation
  const accentHex = adjustSaturation(primaryHex, 1.4);

  // Convert all colors to HSL format for CSS custom properties
  return {
    primary: hexToHsl(primaryHex),
    secondary: hexToHsl(secondaryHex),
    accent: hexToHsl(accentHex),
    background: hexToHsl(validatedBackgroundHex),
    surface: hexToHsl(surfaceHex),
    text: hexToHsl(validatedTextHex),
    textMuted: hexToHsl(textMutedHex),
    ctaText: hexToHsl(ctaTextHex),
    contrastRatio: contrast,
  };
}

serve(async (req) => {
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

    // Enrich if needed - Check if enrichment is recent (within 7 days)
    const needsEnrichment = !product.smart_length || 
                           !product.vision_analyzed || 
                           (product.last_optimization_at && 
                            (Date.now() - new Date(product.last_optimization_at).getTime()) > 7 * 24 * 60 * 60 * 1000);
    
    if (needsEnrichment) {
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
    } else {
      console.log("⏭️ Skipping enrichment - recently done");
    }

    console.log("✅ Product enrichment complete");

    // Load images (limit to 3 for better performance)
    const { data: images } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("position")
      .limit(3);

    // Detect dimension schema image
    const dimensionImage = images?.find((img: any) => 
      img.alt_text?.toLowerCase().includes('dimension') ||
      img.alt_text?.toLowerCase().includes('schéma') ||
      img.alt_text?.toLowerCase().includes('mesure') ||
      img.alt_text?.toLowerCase().includes('plan') ||
      img.src?.toLowerCase().includes('dimension')
    );

    // Vision analysis - Analyze only 2 images max for faster generation
    let visualAnalysis = "";

    if (images?.length && LOVABLE_API_KEY) {
      const imagesToAnalyze = Math.min(2, images.length); // Reduced from 3 to 2
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

    // DESIGN TOKENS + FONTS - Enhanced with WCAG compliance
    const designTokens = generateDesignTokens(colorScheme || { 
      primary: "#1a1a1a",
      secondary: "#4a4a4a",
      background: "#FFFFFF",
      surface: "#F8F8F8",
      text: "#1a1a1a",
      textMuted: "#6b6b6b"
    });
    
    console.log("🎨 Design tokens generated:", {
      contrastRatio: designTokens.contrastRatio.toFixed(2),
      wcagCompliant: designTokens.contrastRatio >= 4.5
    });
    
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
      // Increased timeout to 3 minutes for complex products
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

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
        throw new Error("TIMEOUT: La génération a pris plus de 3 minutes. Veuillez réessayer avec moins d'images ou un contenu plus court.");
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

  /*  STYLE APPLICATION - Enhanced Luxury Instructions  */
  const styleBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 STYLE : ${style} (WCAG Contrast Ratio: ${designTokens.contrastRatio.toFixed(2)})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${style === "minimalist" ? `
• MINIMALIST LUXURY :
  - Espace blanc généreux et intentionnel : py-20 lg:py-32 gap-16 lg:gap-24
  - Palette épurée : text-gray-700 bg-gray-50/50
  - Typographie raffinée : font-light tracking-tight leading-relaxed
  - Icônes minimalistes et discrètes
  - Lignes subtiles : border-gray-200/60
  - Transitions douces : transition-all duration-500 ease-out
  - Focus sur le contenu, design invisible
` : style === "premium" ? `
• PREMIUM LUXURY :
  - Overlay gradients sophistiqués : bg-gradient-to-br from-black/70 via-black/50 to-transparent
  - Typographie élégante et imposante : font-['${heroFont}'] tracking-tight
  - Contraste dramatique : text-white on dark with glow effects
  - Animations premium : hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500
  - Ombres profondes multicouches : shadow-2xl shadow-black/20
  - Bordures accent subtiles : border-2 border-accent/20
  - Backdrop blur effects : backdrop-blur-md backdrop-saturate-150
  - Sections avec fond texturé : bg-gradient-to-b from-surface/50 to-background
  - Gold/Metallic accents : text-amber-400 bg-gradient-to-r from-amber-500/10 to-amber-600/10
  - Letter spacing : tracking-wide pour les titres, tracking-tight pour les headings
  - Micro-interactions : hover:shadow-accent/20 hover:border-accent/40
` : `
• MODERN LUXURY :
  - Sections architecturales : border-t-2 divide-y divide-gray-200/50
  - Couleurs vibrantes avec équilibre : bg-primary/5 hover:bg-primary/10
  - Ombres nettes et précises : shadow-lg hover:shadow-2xl
  - Layouts géométriques : grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  - Transitions fluides : transition-all duration-300 ease-in-out
  - Contrastes calculés WCAG-compliant
  - Typographie hiérarchique claire
  - Espaces négatifs intentionnels
  - Borders accent dynamiques : hover:border-accent/60
`}

🎨 DESIGN TOKENS (HSL - WCAG Compliant) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Primary : hsl(${designTokens.primary}) → Titres principaux, CTAs, liens
- Secondary : hsl(${designTokens.secondary}) → Sous-sections, séparateurs
- Accent : hsl(${designTokens.accent}) → Badges premium, highlights, hover states
- Background : hsl(${designTokens.background}) → Fond principal de page
- Surface : hsl(${designTokens.surface}) → Cartes, panels, sections
- Text : hsl(${designTokens.text}) → Corps de texte principal
- Text Muted : hsl(${designTokens.textMuted}) → Texte secondaire, descriptions
- CTA Text : hsl(${designTokens.ctaText}) → Texte sur boutons primaires

💎 LUXURY DESIGN PRINCIPLES :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Whitespace is luxury - Ne pas surcharger, laisser respirer
2. Typographie précise - Hiérarchie visuelle claire (scale: 1.25 → 1.5 → 2 → 3 → 4)
3. Contraste calculé - Respecter WCAG AA minimum (4.5:1 pour texte)
4. Animations subtiles - Smooth, naturelles, jamais agressives
5. Détails raffinés - Micro-interactions, hover states, transitions
6. Qualité photographique - Images haute résolution, aspect ratio respecté
7. Cohérence visuelle - Même spacing, même radius, même shadows
8. Accessibilité premium - Focus states visibles, aria-labels, semantic HTML

🎯 MICRO-INTERACTIONS OBLIGATOIRES :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Boutons : hover:shadow-lg hover:shadow-accent/20 active:scale-98
- Images : hover:scale-105 transition-transform duration-700 ease-out
- Cards : hover:-translate-y-2 hover:shadow-2xl transition-all duration-400
- Links : hover:text-accent transition-colors duration-200
- Icons : hover:rotate-12 hover:text-accent transition-all duration-300
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

  /*  RÈGLES TECHNIQUES ET QUALITÉ  */
  const technicalRules = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RÈGLES TECHNIQUES ET QUALITÉ OBLIGATOIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ PRIORITÉ DES DIMENSIONS (Hiérarchie stricte)
   - Vision AI dimensions (technicalDimensions) → PRIORITÉ ABSOLUE
   - Smart dimensions (estimées) → Complément si Vision incomplet
   - SERP dimensions → Dernier recours uniquement
   - Ne JAMAIS inventer de valeurs arbitraires
   - Afficher unités correctes (cm, kg, etc.)

2️⃣ MATÉRIAUX, COULEURS & FINITIONS
   - Utiliser EXACTEMENT les données de productData.materials
   - Respecter productData.colors pour la palette détectée
   - Ne JAMAIS inventer de matériaux non documentés
   - Valoriser les finitions et textures détectées

3️⃣ SECTIONS REQUISES (Dans l'ordre)
   ✅ Hero Section avec overlay et badge premium
   ✅ Points Forts (4 icônes Lucide + descriptions)
   ✅ Galerie d'images (layout asymétrique moderne)
   ✅ Caractéristiques clés (liste avec check-circle icons)
   ✅ Dimensions détaillées (schéma image + tableau propre)
   ✅ Spécifications techniques (tableau structuré)
   ✅ Matériaux & Finitions (cards ou badges visuels)
   ✅ Description longue/Analyse visuelle (prose markup)

4️⃣ FORMAT DE SORTIE HTML
   🔴 CRITIQUE : Output UNIQUEMENT du HTML complet valide :
   - Débuter par <!DOCTYPE html>
   - Structure complète : <html lang="${language}">, <head>, <body>
   - Meta tags : charset, viewport, description
   - Tailwind CSS CDN dans <head>
   - Lucide Icons script + init dans <head>
   - Google Fonts links dans <head>
   - ZÉRO texte explicatif ou méta-commentaire
   - ZÉRO phrase type "Cette landing page respecte..."
   - HTML uniquement, rien d'autre

5️⃣ INTERDICTIONS ABSOLUES
   ❌ Aucun CTA commercial / bouton "Acheter maintenant"
   ❌ Aucune navigation header ou footer
   ❌ Aucun formulaire de contact
   ❌ Aucun prix affiché
   ❌ Aucun lien externe
   ❌ Aucun script de tracking ou analytics

6️⃣ QUALITÉ & ACCESSIBILITÉ
   ✅ Tous les images avec alt descriptifs en ${language}
   ✅ Semantic HTML (section, article, header appropriés)
   ✅ ARIA labels si nécessaire
   ✅ Contraste WCAG AA minimum (ratio ${designTokens.contrastRatio.toFixed(2)}:1)
   ✅ Focus states visibles pour keyboard navigation
   ✅ Responsive images avec object-cover
   ✅ Loading lazy pour images après le fold

7️⃣ PERFORMANCE & OPTIMISATION
   ✅ Classes Tailwind optimisées (éviter redondances)
   ✅ Animations GPU-accelerated (transform, opacity)
   ✅ Éviter JS custom (utiliser Tailwind + Lucide seulement)
   ✅ Images: srcset si multiple résolutions disponibles
   ✅ Preconnect pour fonts et CDN

8️⃣ CONTENU TEXTUEL
   - Longueur cible : ${wordCount} mots
   - Tout en ${language} (titres, descriptions, labels, alt text)
   - Ton professionnel et premium
   - Vocabulaire technique précis
   - Pas de sur-vente ni superlatifs excessifs
   - Décrire factuellement les caractéristiques
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
