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
  if (enriched.smart_seat_height) dims.push(`Hauteur d'assise ${enriched.smart_seat_height}${enriched.smart_seat_height_unit || ""}`);
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

function ensureResponsiveWrapper(html: string): string {
  // S'assurer que le viewport meta est présent
  if (!html.includes('viewport')) {
    html = `<meta name="viewport" content="width=device-width, initial-scale=1.0">${html}`;
  }
  
  // S'assurer qu'il y a un container principal responsive
  if (!html.includes('max-w-') && !html.includes('mx-auto')) {
    html = `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">${html}</div>`;
  }
  
  return html;
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

    // Get authenticated user and check limits
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        
        // ✅ Use check-usage-limits function instead of duplicating logic
        const { data: limitsCheck, error: limitsError } = await supabaseAdmin.functions.invoke(
          'check-usage-limits',
          { headers: { Authorization: authHeader } }
        );
        
        if (limitsError || !limitsCheck?.canUseOptimizations) {
          console.error(`[generate-landing-ai] ❌ LIMIT REACHED`);
          return new Response(
            JSON.stringify({ 
              error: 'LIMIT_REACHED',
              message: 'Limite d\'optimisations atteinte. Passez à un plan supérieur.',
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // ✅ Increment usage
        const LANDING_PAGE_COST = 5;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: LANDING_PAGE_COST
        });
        
        console.log(`[generate-landing-ai] ✅ Usage incremented: +${LANDING_PAGE_COST}`);
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
      imageAnalysis,
      contentLengthParams,
      mobileOptimized = true,
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
    let enrichmentStatus = 'skipped';
    let attributesCount = 0;
    try {
      const enrichController = new AbortController();
      const enrichTimeout = setTimeout(() => enrichController.abort(), 20000);
      
      const { data: enrichData, error: enrichError } = await supabaseAdmin.functions.invoke(
        "enrich-product",
        {
          body: { productId: product_id },
          signal: enrichController.signal,
        }
      );
      
      clearTimeout(enrichTimeout);
      
      if (enrichError) {
        console.log("⚠️ Enrichment failed:", enrichError.message);
        enrichmentStatus = 'failed';
      } else {
        console.log("✅ Enrichment completed successfully");
        enrichmentStatus = 'success';
      }
    } catch (err) {
      console.log("⚠️ Enrichment timeout or error (continuing without it):", err.message);
      enrichmentStatus = 'failed';
    }

    // Fetch product data including handle, store domain, AND enriched attributes
    console.log("📦 Fetching product data with enriched attributes...");
    const [productRes, imagesRes, variantsRes, storeRes] = await Promise.all([
      supabaseAdmin.from("shopify_products").select("*").eq("id", product_id).maybeSingle(),
      supabaseAdmin.from("product_images").select("src, alt_text, width, height").eq("product_id", product_id).order("position"),
      supabaseAdmin.from("product_variants").select("title, image_url, shopify_variant_id, price, sku").eq("product_id", product_id),
      userId ? supabaseAdmin.from("shopify_connections").select("shop_domain").eq("seller_id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    
    const productHandle = productRes.data?.handle || "";
    const shopifyProductId = productRes.data?.shopify_product_id || "";
    const shopDomain = storeRes.data?.shop_domain || "";
    const images = imagesRes.data ?? [];
    const variants = variantsRes.data ?? [];
    const enrichedProduct = productRes.data || {};
    
    // Count enriched attributes
    const enrichedFields = [
      'ai_color', 'ai_material', 'ai_shape', 'ai_texture', 'ai_pattern', 'ai_finish',
      'smart_length', 'smart_width', 'smart_height', 'smart_weight',
      'category', 'sub_category', 'style', 'room', 'functionality'
    ];
    attributesCount = enrichedFields.filter(f => enrichedProduct[f]).length;
    
    console.log(`✅ Product data fetched: ${images.length} images, ${variants.length} variants, ${attributesCount} enriched attributes`);

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
          }
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

    // Build product URLs with anchor links for navigation
    const productUrl = shopDomain && productHandle 
      ? `https://${shopDomain}/products/${productHandle}` 
      : "#";
    
    // Build anchor links for different sections
    const anchorLinks = {
      features: `${productUrl}#features`,
      gallery: `${productUrl}#gallery`,
      specifications: `${productUrl}#specifications`,
      variants: `${productUrl}#variants`,
    };

    // 🎨 STYLE GUIDES PREMIUM
    const styleGuides: Record<string, string> = {
      'moderne': 'Gradients subtils, ombres douces, coins arrondis (rounded-xl), espacements généreux, typographie sans-serif, design épuré avec accents de couleur',
      'minimaliste': 'Espace blanc abondant, typographie épurée, lignes nettes, palette limitée à 1-2 couleurs, design fonctionnel et élégant',
      'scandinave': 'Tons naturels et neutres, textures organiques, simplicité fonctionnelle, ambiance chaleureuse et lumineuse',
      'premium': 'Contrastes élégants, typographie serif pour titres, ombres profondes, espacements luxueux, détails raffinés',
      'industriel': 'Textures brutes, tons neutres et sombres, typographie bold, éléments métalliques suggérés',
      'nature': 'Tons verts et terreux, textures organiques, design fluide et apaisant'
    };

    const currentStyleGuide = styleGuides[style] || styleGuides['moderne'];
    const tone = length === "courte (400 mots)" ? "concis et percutant" : length === "moyenne (800 mots)" ? "équilibré et informatif" : "complet et détaillé";
    
    // 🎯 PROMPT AMÉLIORÉ POUR SHOPIFY AVEC TOUTES LES FONCTIONNALITÉS
    const prompt =
      language === "en"
        ? `
You are a professional Shopify eCommerce designer. Create a HIGH-CONVERTING product landing page with premium design.

🎯 OBJECTIVE: Generate a persuasive, mobile-first landing page that drives conversions.

📦 PRODUCT DATA:
- Title: ${productTitle}
${vendor ? `- Brand: ${vendor}` : ""}
${imageUrl ? `- Main Image: ${imageUrl}` : ""}
${description ? `- Description: ${description}` : ""}
${customHighlights ? `\n🌟 KEY SELLING POINTS:\n${customHighlights.split('\n').map((h: string) => `- ${h.trim()}`).filter((h: string) => h.length > 2).join('\n')}` : ""}

📸 IMAGES GALLERY (${images.length} images):
${images.map((img: any, index: number) => `- Image ${index + 1}: ${img.src}${img.width && img.height ? ` (${img.width}x${img.height}px)` : ''}${img.alt_text ? ` - ${img.alt_text}` : ''}`).join('\n')}

🔄 PRODUCT VARIANTS (${variants.length} variants):
${variants.map((v: any) => `- ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ''}${v.price ? ` - $${v.price}` : ''}`).join('\n')}

${enrichedSummary ? `\n💎 PRODUCT ATTRIBUTES:\n${enrichedSummary}\n` : ""}
${visualAnalysis ? `${visualAnalysis}\n` : ""}

🎨 PREMIUM DESIGN:
- Style: ${style} → ${currentStyleGuide}
- Primary Color: ${mainColor} (use for buttons, accents, highlights)
- Layout: ${layout}
- Tone: ${tone}
- Mobile Optimized: ${mobileOptimized}

📱 MANDATORY SECTIONS STRUCTURE:
1. HERO SECTION with navigation
2. FEATURES & BENEFITS (id="features")
3. IMAGE GALLERY (id="gallery") - ${images.length} images
4. TECHNICAL SPECIFICATIONS (id="specifications")
5. VARIANTS & OPTIONS (id="variants") - ${variants.length} options
6. TRUST & GUARANTEE

🎨 DESIGN RULES:
• MOBILE-FIRST responsive
• Tailwind CSS only
• Clean HTML for Shopify
• Smooth scroll navigation

Return ONLY clean HTML without markdown.
`
        : `
Tu es un designer Shopify expert. Crée une LANDING PAGE PREMIUM qui convertit.

🎯 OBJECTIF: Générer une page produit mobile-first et persuasive.

📦 DONNÉES PRODUIT:
- Titre: ${productTitle}
${vendor ? `- Marque: ${vendor}` : ""}
${imageUrl ? `- Image: ${imageUrl}` : ""}
${description ? `- Description: ${description}` : ""}
${customHighlights ? `\n🌟 ARGUMENTS CLÉS:\n${customHighlights.split('\n').map((h: string) => `- ${h.trim()}`).filter((h: string) => h.length > 2).join('\n')}` : ""}

📸 GALERIE IMAGES (${images.length} images):
${images.map((img: any, index: number) => `- Image ${index + 1}: ${img.src}${img.width && img.height ? ` (${img.width}x${img.height}px)` : ''}${img.alt_text ? ` - ${img.alt_text}` : ''}`).join('\n')}

🔄 VARIANTES PRODUIT (${variants.length} variantes):
${variants.map((v: any) => `- ${v.title}${v.image_url ? ` (image: ${v.image_url})` : ''}${v.price ? ` - ${v.price}€` : ''}`).join('\n')}

${enrichedSummary ? `\n💎 ATTRIBUTS PRODUIT:\n${enrichedSummary}\n` : ""}
${visualAnalysis ? `${visualAnalysis}\n` : ""}

🎨 DESIGN PREMIUM:
- Style: ${style} → ${currentStyleGuide}
- Couleur: ${mainColor} (boutons, accents, surbrillance)
- Layout: ${layout}
- Ton: ${tone}
- Optimisé Mobile: ${mobileOptimized}

📱 STRUCTURE OBLIGATOIRE:
1. HERO avec navigation fluide
2. CARACTÉRISTIQUES (id="features")
3. GALERIE (id="gallery") - ${images.length} images
4. SPÉCIFICATIONS (id="specifications")
5. VARIANTES (id="variants") - ${variants.length} options
6. CONFIANCE & GARANTIE

🎨 RÈGLES DESIGN:
• MOBILE-FIRST responsive
• Tailwind CSS uniquement
• HTML propre pour Shopify
• Navigation fluide entre sections

Retourne UNIQUEMENT du HTML propre sans markdown.
`;

    // 🔄 RETRY LOGIC FOR AI GENERATION
    console.log("🤖 Starting AI generation with retry logic...");
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let lastError: Error | null = null;
    let html = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[generate-landing-ai] Attempt ${attempt}/${MAX_RETRIES}`);

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
                    ? "You are a professional Shopify landing page designer. Create beautiful, mobile-first HTML pages with conversion-optimized design and smooth navigation between sections."
                    : "Tu es un designer expert de landing pages Shopify. Crée des pages HTML mobile-first avec un design optimisé pour la conversion et une navigation fluide entre les sections.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 4500,
          }),
        });

        // Handle permanent errors - don't retry
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            error: "Rate limits exceeded. Please try again later." 
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (response.status === 402) {
          return new Response(JSON.stringify({ 
            error: "Payment required. Please add funds to your Lovable AI workspace." 
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Temporary errors (503, 502, 504) - retry
        if ([502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
          console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate-landing-ai] ❌ API error (attempt ${attempt}):`, response.status, errText);
          
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }

          return new Response(JSON.stringify({ error: `Lovable AI API error: ${response.status}` }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Success - parse and clean HTML
        const data = await response.json().catch(() => null);
        html = data?.choices?.[0]?.message?.content?.trim() || "";
        
        if (html) {
          html = sanitizeHtmlUnsafe(html);
          html = ensureResponsiveWrapper(html);
          console.log("[generate-landing-ai] 🧹 HTML cleaned and wrapped, final length:", html.length);
        }

        // Validate HTML
        if (!html) {
          console.warn("[generate-landing-ai] ⚠️ Empty HTML response from AI");
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to empty response...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }
          return new Response(
            JSON.stringify({ error: language === "en" ? "No content generated by AI." : "Aucun contenu généré par l'IA." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (html.length < 1000) {
          console.warn("[generate-landing-ai] ⚠️ Generated HTML too short:", html.length);
          if (attempt < MAX_RETRIES) {
            console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to short content...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }
          return new Response(
            JSON.stringify({ error: language === "en" ? "Generated content too short." : "Le contenu généré est trop court." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Success!
        console.log("[generate-landing-ai] ✅ HTML generated successfully, length:", html.length);
        break;

      } catch (networkError) {
        lastError = networkError instanceof Error ? networkError : new Error(String(networkError));
        console.error(`[generate-landing-ai] 💥 Network error (attempt ${attempt}):`, lastError);
        
        if (attempt < MAX_RETRIES) {
          console.log(`[generate-landing-ai] ⏳ Retrying after ${RETRY_DELAY_MS}ms due to network error...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    // If we get here and html is empty, all retries failed
    if (!html) {
      console.error("[generate-landing-ai] ❌ All retry attempts failed");
      return new Response(
        JSON.stringify({
          error: lastError?.message || (language === "en" ? "Service temporarily unavailable." : "Service temporairement indisponible."),
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 💾 CRÉATION/MISE À JOUR DANS SHOPIFY_PRODUCTS
    if (userId && product_id) {
      console.log("💾 Saving to shopify_products...");
      
      const { data: existingProduct, error: checkError } = await supabaseAdmin
        .from("shopify_products")
        .select("id, shopify_id, title")
        .eq("id", product_id)
        .maybeSingle();

      if (checkError) {
        console.error("❌ Error checking existing product:", checkError);
      }

      if (existingProduct) {
        console.log("📝 Updating existing shopify_products...");
        
        const { error: updateError } = await supabaseAdmin
          .from("shopify_products")
          .update({ 
            description: html,
            title: productTitle,
            updated_at: new Date().toISOString()
          })
          .eq("id", product_id);

        if (updateError) {
          console.error("❌ Shopify products update error:", updateError);
        } else {
          console.log("✅ Shopify products updated successfully");
        }
      } else {
        console.log("📝 Creating new shopify_products row...");
        
        const { data: storeData } = await supabaseAdmin
          .from("shopify_connections")
          .select("id")
          .eq("seller_id", userId)
          .single();

        const { error: insertError } = await supabaseAdmin
          .from("shopify_products")
          .insert({
            id: product_id,
            seller_id: userId,
            store_id: storeData?.id || userId,
            shopify_id: 0,
            title: productTitle,
            description: html,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error("❌ Shopify products creation error:", insertError);
        } else {
          console.log("✅ New shopify_products row created successfully");
        }
      }

      // 💾 Sauvegarde dans product_landing_pages (historique)
      console.log("💾 Saving to product_landing_pages...");
      
      await supabaseAdmin
        .from("product_landing_pages")
        .update({ is_active: false })
        .eq("product_id", product_id)
        .eq("seller_id", userId);
      
      const { data: existingPages } = await supabaseAdmin
        .from("product_landing_pages")
        .select("version")
        .eq("product_id", product_id)
        .order("version", { ascending: false })
        .limit(1);
      
      const newVersion = existingPages && existingPages.length > 0 ? existingPages[0].version + 1 : 1;
      
      const { error: saveError } = await supabaseAdmin
        .from("product_landing_pages")
        .insert({
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
            images_count: images.length,
            variants_count: variants.length,
            mobile_optimized: mobileOptimized,
          },
          version: newVersion,
          is_active: true,
        });
      
      if (saveError) {
        console.error("❌ Landing pages save error:", saveError);
      } else {
        console.log(`✅ Landing page v${newVersion} saved successfully`);
      }
    } else {
      console.log("⚠️ Skipping save: userId or product_id not available");
    }

    console.log("✅ Landing page generation successful!");
    return new Response(JSON.stringify({ 
      html,
      enrichment_status: enrichmentStatus,
      attributes_count: attributesCount,
      images_count: images.length,
      variants_count: variants.length,
      saved_to_shopify: !!(userId && product_id)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});