import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polices luxueuses selon le type de contenu
const LUXURY_FONTS = {
  hero: ["Playfair Display:wght@400;700;900", "Cormorant Garamond:wght@300;400;600"],
  heading: ["Montserrat:wght@400;500;600;700", "Raleway:wght@300;400;600;700"],
  body: ["Inter:wght@300;400;500;600", "Source Sans Pro:wght@300;400;600"],
  accent: ["Cinzel:wght@400;600;700", "Libre Baskerville:wght@400;700"],
};

interface GenerateLandingRequest {
  productId: string;
  style?: string;
  layout?: string;
  colorScheme?: any;
  contentLength?: string;
  customHighlights?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    const body: GenerateLandingRequest = await req.json();
    const {
      productId,
      style = "modern",
      layout = "single-column",
      colorScheme,
      contentLength = "medium",
      customHighlights = "",
      language = "fr",
    } = body;

    console.log(`🚀 Starting landing generation for product ${productId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ÉTAPE 1: Charger le produit
    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    console.log(`✅ Product loaded: ${product.title}`);

    // ÉTAPE 2: Enrichir le produit si nécessaire
    let enrichedProduct = product;
    if (!product.smart_length || !product.vision_analyzed) {
      console.log("🔄 Enriching product...");
      
      const { data: enrichData, error: enrichError } = await supabase.functions.invoke(
        "enrich-product",
        {
          body: { productId: product.id },
        }
      );

      if (!enrichError && enrichData) {
        // Recharger le produit enrichi
        const { data: updatedProduct } = await supabase
          .from("shopify_products")
          .select("*")
          .eq("id", productId)
          .single();
        
        if (updatedProduct) {
          enrichedProduct = updatedProduct;
        }
      }
    }

    console.log("✅ Product enrichment complete");

    // ÉTAPE 3: Charger les images et les analyser avec Gemini Vision
    const { data: images } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("position", { ascending: true })
      .limit(5);

    let visualAnalysis = "";
    
    if (images && images.length > 0) {
      console.log(`🖼️ Analyzing ${images.length} images with Gemini Vision...`);
      
      for (const image of images.slice(0, 3)) {
        try {
          const visionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      text: language === "fr" 
                        ? "Analyse cette image de produit et décris: les matériaux visibles, les couleurs dominantes, le style design, l'ambiance, et tout détail technique visible (dimensions apparentes, finitions, textures)."
                        : "Analyze this product image and describe: visible materials, dominant colors, design style, ambiance, and any visible technical details (apparent dimensions, finishes, textures)."
                    },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: image.src.includes("base64") 
                          ? image.src.split(",")[1]
                          : await fetchImageAsBase64(image.src)
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 500,
                }
              })
            }
          );

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const analysis = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            visualAnalysis += `\n\nImage ${image.position || images.indexOf(image) + 1}: ${analysis}`;
          }
        } catch (error) {
          console.warn(`⚠️ Vision analysis failed for image ${image.position}:`, error);
        }
      }
    }

    console.log("✅ Visual analysis complete");

    // ÉTAPE 4: Charger les variantes
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);

    const variantsInfo = variants && variants.length > 1
      ? `\n\n📦 VARIANTES DISPONIBLES:\n${variants.map((v, i) => 
          `${i + 1}. ${v.title}: ${v.price}€ (${v.inventory_quantity || 0} en stock)`
        ).join("\n")}`
      : "";

    // ÉTAPE 5: Préparer les données pour DeepSeek
    const designTokens = generateDesignTokens(colorScheme);
    const fonts = selectLuxuryFonts(style);
    
    const productData = {
      title: product.title,
      description: product.body_html || product.seo_description || "",
      vendor: product.vendor,
      dimensions: {
        smart: {
          length: enrichedProduct.smart_length,
          width: enrichedProduct.smart_width,
          height: enrichedProduct.smart_height,
          weight: enrichedProduct.smart_weight,
        },
        vision: enrichedProduct.vision_attributes?.technicalDimensions || null,
      },
      materials: enrichedProduct.vision_attributes?.materials || [],
      colors: enrichedProduct.vision_attributes?.colors || [],
      style: enrichedProduct.vision_attributes?.style || [],
      features: enrichedProduct.vision_attributes?.features || [],
      room_type: enrichedProduct.vision_attributes?.roomType || [],
      visualAnalysis: visualAnalysis,
      customHighlights: customHighlights,
      variants: variantsInfo,
    };

    console.log("🤖 Calling DeepSeek for HTML generation...");

    // ÉTAPE 6: Générer le HTML avec DeepSeek
    const prompt = buildDeepSeekPrompt(productData, {
      style,
      layout,
      designTokens,
      fonts,
      contentLength,
      language,
      images: images || [],
    });

    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: language === "fr"
              ? "Tu es un expert en création de landing pages e-commerce luxueuses. Tu génères uniquement du HTML pur avec Tailwind CSS inline. Pas de boutons d'achat, pas de navigation, juste du contenu informatif et premium."
              : "You are an expert in creating luxury e-commerce landing pages. You generate only pure HTML with inline Tailwind CSS. No purchase buttons, no navigation, just informative premium content."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorBody = await deepseekResponse.text();
      console.error("❌ DeepSeek API error details:", errorBody);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorBody}`);
    }

    const deepseekData = await deepseekResponse.json();
    let generatedHtml = deepseekData.choices[0].message.content;

    // Nettoyer le HTML
    generatedHtml = cleanHTML(generatedHtml);

    console.log("✅ HTML generated successfully");

    // ÉTAPE 7: Sauvegarder dans la base
    const { error: updateError } = await supabase
      .from("shopify_products")
      .update({
        landing_page_html: generatedHtml,
        last_landing_generation_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Error saving landing page:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        html: generatedHtml,
        productData: {
          title: product.title,
          hasVariants: (variants?.length || 0) > 1,
          imagesAnalyzed: images?.length || 0,
          enrichmentComplete: true,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// === FONCTIONS UTILITAIRES ===

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

function buildDeepSeekPrompt(productData: any, config: any) {
  const { style, layout, designTokens, fonts, contentLength, language, images } = config;

  const fontLinks = Object.values(fonts)
    .flat()
    .map((font) => `<link href="https://fonts.googleapis.com/css2?family=${font}&display=swap" rel="stylesheet">`)
    .join("\n");

  const wordCount = contentLength === "short" ? "800-1200" : contentLength === "long" ? "2000-3000" : "1200-2000";
  
  // Simplifier les données produit pour éviter un prompt trop long
  const simplifiedData = {
    title: productData.title,
    description: productData.description?.substring(0, 500) || "",
    vendor: productData.vendor,
    dimensions: productData.dimensions,
    materials: productData.materials.slice(0, 5),
    colors: productData.colors.slice(0, 5),
    style: productData.style.slice(0, 5),
    features: productData.features.slice(0, 8),
    visualAnalysis: productData.visualAnalysis?.substring(0, 800) || "",
    hasVariants: productData.variants.length > 0,
  };

  const prompt = language === "fr" ? `
Tu dois générer une landing page HTML5 complète et professionnelle pour ce produit:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DONNÉES PRODUIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Titre: ${simplifiedData.title}
Marque: ${simplifiedData.vendor || "N/A"}
Description: ${simplifiedData.description}

Dimensions: ${JSON.stringify(simplifiedData.dimensions)}
Matériaux: ${simplifiedData.materials.join(", ") || "Non spécifié"}
Couleurs: ${simplifiedData.colors.join(", ") || "Non spécifié"}
Style: ${simplifiedData.style.join(", ") || "Moderne"}

Caractéristiques: ${simplifiedData.features.join(" • ") || "N/A"}

Analyse visuelle: ${simplifiedData.visualAnalysis}

${simplifiedData.hasVariants ? "⚠️ Ce produit a plusieurs variantes - créer un tableau comparatif" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CONFIGURATION DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style: ${style}
Layout: ${layout}
Longueur contenu: ${wordCount} mots

🎨 Couleurs HSL (UTILISER UNIQUEMENT CES VALEURS):
- Primary: hsl(${designTokens.primary})
- Secondary: hsl(${designTokens.secondary})
- Accent: hsl(${designTokens.accent})
- Background: hsl(${designTokens.background})
- Text: hsl(${designTokens.text})

✍️ Polices Google Fonts (INCLURE DANS <head>):
${fontLinks}

Utilisation des polices:
- Titres Hero: font-family: '${fonts.hero[0].split(':')[0]}', serif;
- Sous-titres: font-family: '${fonts.heading[0].split(':')[0]}', sans-serif;
- Corps de texte: font-family: '${fonts.body[0].split(':')[0]}', sans-serif;
- Accents: font-family: '${fonts.accent[0].split(':')[0]}', serif;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RÈGLES STRICTES DE GÉNÉRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ STRUCTURE OBLIGATOIRE:
1. <!DOCTYPE html> et HTML5 complet
2. Hero section avec image principale ${images[0]?.src || ""} (overlay sombre + text-shadow)
3. Section "À propos" narrative
4. Section "Caractéristiques clés" (6 cartes avec icônes SVG)
5. Section "Spécifications techniques" (tableau complet)
6. Section "Dimensions" avec schéma visuel
7. Section "Matériaux et finitions"
8. Galerie d'images (${images.length} images disponibles)
9. Section "Utilisations suggérées"
10. FAQ (6 questions)

✅ RÈGLES COULEURS:
- UNIQUEMENT style="background-color: hsl(...)" et style="color: hsl(...)"
- JAMAIS de couleurs en HEX ou RGB
- Utiliser les design tokens fournis

✅ RÈGLES CONTENU:
- Utiliser 100% des données produit fournies
- Ne JAMAIS inventer de caractéristiques techniques
- Inclure toutes les dimensions (vision > smart)
- Inclure tous les matériaux détectés
- Inclure l'analyse visuelle des images
- Si variantes présentes: créer un tableau comparatif

✅ RÈGLES IMAGES:
- Toutes les images doivent avoir loading="lazy"
- Hero: overlay noir 40% + text-shadow pour lisibilité
- Images: ${images.map((img: any, i: number) => `\n  ${i + 1}. ${img.src}`).join("")}

✅ INTERDICTIONS:
❌ Pas de boutons d'achat / CTA commercial
❌ Pas de navigation / menu
❌ Pas de footer avec liens
❌ Pas d'éléments interactifs JS

✅ TAILWIND CSS:
- Utiliser Tailwind via CDN
- Classes responsive (sm:, md:, lg:)
- Mobile-first
- Espacement généreux

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OBJECTIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Génère maintenant le HTML complet, luxueux, professionnel, optimisé SEO.
Le contenu doit être riche, détaillé, et mettre en valeur TOUTES les caractéristiques produit.

COMMENCE MAINTENANT LA GÉNÉRATION:
` : `
You must generate a complete professional HTML5 landing page for this product:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PRODUCT DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Title: ${simplifiedData.title}
Brand: ${simplifiedData.vendor || "N/A"}
Description: ${simplifiedData.description}

Dimensions: ${JSON.stringify(simplifiedData.dimensions)}
Materials: ${simplifiedData.materials.join(", ") || "Not specified"}
Colors: ${simplifiedData.colors.join(", ") || "Not specified"}
Style: ${simplifiedData.style.join(", ") || "Modern"}

Features: ${simplifiedData.features.join(" • ") || "N/A"}

Visual analysis: ${simplifiedData.visualAnalysis}

${simplifiedData.hasVariants ? "⚠️ This product has multiple variants - create comparison table" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style: ${style}
Layout: ${layout}
Content length: ${wordCount} words

🎨 HSL Colors (USE ONLY THESE VALUES):
- Primary: hsl(${designTokens.primary})
- Secondary: hsl(${designTokens.secondary})
- Accent: hsl(${designTokens.accent})
- Background: hsl(${designTokens.background})
- Text: hsl(${designTokens.text})

✍️ Google Fonts (INCLUDE IN <head>):
${fontLinks}

Font usage:
- Hero titles: font-family: '${fonts.hero[0].split(':')[0]}', serif;
- Headings: font-family: '${fonts.heading[0].split(':')[0]}', sans-serif;
- Body text: font-family: '${fonts.body[0].split(':')[0]}', sans-serif;
- Accents: font-family: '${fonts.accent[0].split(':')[0]}', serif;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STRICT GENERATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ REQUIRED STRUCTURE:
1. <!DOCTYPE html> and complete HTML5
2. Hero section with main image ${images[0]?.src || ""} (dark overlay + text-shadow)
3. "About" narrative section
4. "Key Features" section (6 cards with SVG icons)
5. "Technical Specifications" section (complete table)
6. "Dimensions" section with visual diagram
7. "Materials and Finishes" section
8. Image gallery (${images.length} images available)
9. "Suggested Uses" section
10. FAQ (6 questions)

✅ COLOR RULES:
- ONLY style="background-color: hsl(...)" and style="color: hsl(...)"
- NEVER HEX or RGB colors
- Use provided design tokens

✅ CONTENT RULES:
- Use 100% of provided product data
- NEVER invent technical specifications
- Include all dimensions (vision > smart)
- Include all detected materials
- Include visual analysis from images
- If variants present: create comparison table

✅ IMAGE RULES:
- All images must have loading="lazy"
- Hero: 40% black overlay + text-shadow for readability
- Images: ${images.map((img: any, i: number) => `\n  ${i + 1}. ${img.src}`).join("")}

✅ PROHIBITIONS:
❌ No purchase buttons / commercial CTA
❌ No navigation / menu
❌ No footer with links
❌ No interactive JS elements

✅ TAILWIND CSS:
- Use Tailwind via CDN
- Responsive classes (sm:, md:, lg:)
- Mobile-first
- Generous spacing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate now the complete, luxurious, professional, SEO-optimized HTML.
Content must be rich, detailed, and highlight ALL product features.

START GENERATION NOW:
`;

  return prompt;
}

function cleanHTML(html: string): string {
  // Supprimer les balises markdown
  html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
  
  // Supprimer les commentaires excessifs
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  
  // Nettoyer les espaces multiples
  html = html.replace(/\n{3,}/g, "\n\n");
  
  // S'assurer que le DOCTYPE est présent
  if (!html.includes("<!DOCTYPE html>")) {
    html = "<!DOCTYPE html>\n" + html;
  }
  
  return html.trim();
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  } catch (error) {
    console.error("Error fetching image:", error);
    return "";
  }
}
