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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
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

    // Load images
    const { data: images } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("position")
      .limit(5);

    // Vision analysis
    let visualAnalysis = "";

    if (images?.length) {
      console.log(`🖼️ Analyzing ${images.length} images (Gemini Vision)`);

      for (const img of images.slice(0, 3)) {
        try {
          const imgBase64 = img.src.includes("base64")
            ? img.src.split(",")[1]
            : await fetchImageAsBase64(img.src);

          const visionRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text:
                          language === "fr"
                            ? "Analyse cette image de produit. Donne les matériaux visibles, couleurs dominantes, style, finitions et dimensions apparentes (si visibles)."
                            : "Analyze this product image. Describe visible materials, dominant colors, style, finish, and visible dimensions if any."
                      },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: imgBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
              }),
            }
          );

          if (visionRes.ok) {
            const visionJson = await visionRes.json();
            const text = visionJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            visualAnalysis += `\n\nImage ${img.position}: ${text}`;
          }
        } catch (error) {
          console.warn(`⚠️ Vision analysis failed for image ${img.position}:`, error);
        }
      }
    }

    console.log("✅ Visual analysis complete");

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

    // Product Data
    const productData = {
      title: product.title,
      description: product.body_html || product.seo_description || "",
      vendor: product.vendor,
      dimensions: {
        vision: enrichedProduct.vision_attributes?.technicalDimensions,
        smart: {
          length: enrichedProduct.smart_length,
          width: enrichedProduct.smart_width,
          height: enrichedProduct.smart_height,
          weight: enrichedProduct.smart_weight,
        },
      },
      materials: enrichedProduct.vision_attributes?.materials || [],
      colors: enrichedProduct.vision_attributes?.colors || [],
      styleDetected: enrichedProduct.vision_attributes?.style || [],
      features: enrichedProduct.vision_attributes?.features || [],
      room_type: enrichedProduct.vision_attributes?.roomType || [],
      visualAnalysis,
      variants: variantsInfo,
      customHighlights,
    };

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

    console.log("🤖 DeepSeek generating HTML...");

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
            content:
              language === "fr"
                ? "Tu es un expert en création de landing pages e-commerce premium. Tu produis du HTML Tailwind propre, riche et sans CTA commercial."
                : "You are an expert in premium e-commerce landing page creation. Produce clean, rich Tailwind HTML without commercial CTAs.",
          },
          { role: "user", content: prompt },
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

    const deepseekJson = await deepseekResponse.json();
    let html = deepseekJson.choices[0].message.content;

    html = cleanHTML(html);

    console.log("✅ HTML generated successfully");

    await supabase
      .from("shopify_products")
      .update({
        landing_page_html: html,
        last_landing_generation_at: new Date().toISOString(),
      })
      .eq("id", productId);

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
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* 🔥 PROMPT BUILDER AVEC BLOC CRITIQUE - VERSION FINALE */
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

  /*  BLOC CRITIQUE — LE CŒUR  */
  const mandatoryBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RÈGLES TECHNIQUES OBLIGATOIRES (NE PAS IGNORER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ PRIORITÉ DES DIMENSIONS
------------------------------------
Tu DOIS appliquer cette hiérarchie :
- Si "dimensions.vision" existe → utiliser EXCLUSIVEMENT cela.
- Si "vision" n'a pas toutes les infos → compléter avec "smart".
- Ne JAMAIS inventer ou modifier les valeurs.

2️⃣ MATÉRIAUX / COULEURS / FINITIONS
------------------------------------
Tu DOIS refléter EXACTEMENT les matériaux visibles dans l'analyse visuelle.
Ne JAMAIS mentionner un matériau absent des images.

3️⃣ RÉPÉTITION OBLIGATOIRE DES DONNÉES
------------------------------------
Tu DOIS répéter ces données dans :
- "Caractéristiques clés"
- "Spécifications techniques"
- "Matériaux & Finitions"
- "Analyse visuelle"

4️⃣ SECTIONS TECHNIQUES REQUISES
------------------------------------
Tu DOIS inclure :
- Un tableau « Spécifications techniques »
- Une section « Dimensions détaillées »
- Une section « Matériaux & Finitions »
- Une section « Analyse visuelle »

5️⃣ INTERDICTIONS
------------------------------------
❌ Ne jamais omettre de caractéristiques
❌ Ne jamais inventer
❌ Aucun CTA commercial
❌ Aucune navigation ou footer
`;

  return `
Tu dois générer une landing page HTML complète.

📦 DONNÉES PRODUIT (À UTILISER À 100%)
${JSON.stringify(productData, null, 2)}

${mandatoryBlock}

🎨 DESIGN
Style: ${style}
Couleurs (HSL):
- Primary: hsl(${designTokens.primary})
- Secondary: hsl(${designTokens.secondary})
- Accent: hsl(${designTokens.accent})
- Background: hsl(${designTokens.background})
- Text: hsl(${designTokens.text})

🖼️ Images:
${images?.map((i: any) => "- " + i.src).join("\n")}

✍️ Polices Google Fonts:
${fontLinks}

📋 TÂCHE :
Créer une landing page premium, moderne, riche, sans CTA commercial et STRICTEMENT basée sur les données ci-dessus.

Commence maintenant :
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
