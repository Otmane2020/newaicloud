import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      productTitle,
      optimizedTitle,
      vendor,
      imageUrl,
      description,
      highlights,
      language = "fr",
      theme = "light",
      designStyle = "modern",
    } = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error("❌ LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalTitle = optimizedTitle || productTitle;
    const brandName = vendor || (language === "fr" ? "Marque Premium" : "Premium Brand");

    // Theme colors - premium palette
    const colors = theme === "dark" ? {
      bg: "#0F0F0F",
      surface: "#1A1A1A",
      surfaceAlt: "#252525",
      text: "#FFFFFF",
      textMuted: "#A0A0A0",
      primary: "#D4AF37",
      primaryHover: "#C9A227",
      accent: "#E8D5B7",
      border: "#333333",
    } : {
      bg: "#FAFAFA",
      surface: "#FFFFFF",
      surfaceAlt: "#F5F5F5",
      text: "#1A1A1A",
      textMuted: "#666666",
      primary: "#1A1A1A",
      primaryHover: "#333333",
      accent: "#D4AF37",
      border: "#E5E5E5",
    };

    // Use original title for display, optimized title for SEO
    const displayTitle = productTitle;
    
    const prompt = language === "fr" 
      ? `Crée une landing page HTML PREMIUM pour ce produit de luxe:

PRODUIT: ${displayTitle}
MARQUE: ${brandName}
${description ? `DESCRIPTION: ${description.slice(0, 300)}` : ""}
${highlights ? `POINTS FORTS: ${highlights}` : ""}

⚠️ IMAGE PRODUIT - RÈGLES CRITIQUES:
URL EXACTE: ${imageUrl}
- Affiche cette image EN ENTIER, JAMAIS TRONQUÉE
- Style image: width:100%; max-width:500px; height:auto; object-fit:contain; display:block; margin:0 auto;
- L'image DOIT être visible ENTIÈREMENT (pas de overflow:hidden, pas de hauteur fixe qui coupe)
- Utilise UNIQUEMENT cette URL exacte

⚠️ MARQUE MISE EN AVANT - OBLIGATOIRE:
- La marque "${brandName}" doit apparaître dans:
  1. Un badge/label visible dans le hero
  2. La section description du produit: "Signé ${brandName}, ce produit..."
  3. Le footer ou section confiance

DESIGN PREMIUM OBLIGATOIRE:
- Style luxe/haut de gamme, élégant et sophistiqué
- Thème: ${theme} (fond: ${colors.bg}, texte: ${colors.text}, accent: ${colors.accent})
- Typographie raffinée: titres en serif élégant, corps sans-serif
- Espacement généreux, respiration visuelle

STRUCTURE (sections obligatoires):
1. HERO: 
   - Image produit ENTIÈRE (pas de crop/troncature)
   - Titre du produit élégant
   - Badge marque "${brandName}"
   - CTA principal "Acheter maintenant"
2. PROPOSITION DE VALEUR: 3 icônes SVG inline (livraison, qualité, garantie)
3. DESCRIPTION PRODUIT: Texte mentionnant la marque "${brandName}" explicitement
4. CTA FINAL: Bouton achat

RÈGLES TECHNIQUES STRICTES:
- HTML5 + CSS inline uniquement
- Mobile-first responsive
- Pas de JavaScript
- IMAGE NON TRONQUÉE: <img src="${imageUrl}" style="width:100%;max-width:500px;height:auto;object-fit:contain;display:block;margin:0 auto;" alt="${displayTitle}">
- NE PAS utiliser overflow:hidden ou height fixe sur le conteneur d'image
- Icônes: SVG inline uniquement (simple)

Génère le HTML complet.`

      : `Create a PREMIUM HTML landing page for this luxury product:

PRODUCT: ${displayTitle}
BRAND: ${brandName}
${description ? `DESCRIPTION: ${description.slice(0, 300)}` : ""}
${highlights ? `HIGHLIGHTS: ${highlights}` : ""}

⚠️ PRODUCT IMAGE - CRITICAL RULES:
EXACT URL: ${imageUrl}
- Display this image FULLY, NEVER CROPPED
- Image style: width:100%; max-width:500px; height:auto; object-fit:contain; display:block; margin:0 auto;
- Image MUST be FULLY visible (no overflow:hidden, no fixed height that crops)
- Use ONLY this exact URL

⚠️ BRAND HIGHLIGHTING - MANDATORY:
- The brand "${brandName}" must appear in:
  1. A visible badge/label in the hero
  2. Product description section: "By ${brandName}, this product..."
  3. Footer or trust section

MANDATORY PREMIUM DESIGN:
- Luxury/high-end style, elegant and sophisticated
- Theme: ${theme} (bg: ${colors.bg}, text: ${colors.text}, accent: ${colors.accent})
- Refined typography: elegant serif headings, sans-serif body
- Generous spacing, visual breathing room

STRUCTURE (required sections):
1. HERO:
   - FULL product image (no cropping)
   - Elegant product title
   - Brand badge "${brandName}"
   - Main CTA "Buy Now"
2. VALUE PROPOSITION: 3 inline SVG icons (shipping, quality, guarantee)
3. PRODUCT DESCRIPTION: Text explicitly mentioning the brand "${brandName}"
4. FINAL CTA: Buy button

STRICT TECHNICAL RULES:
- HTML5 + inline CSS only
- Mobile-first responsive
- No JavaScript
- NON-CROPPED IMAGE: <img src="${imageUrl}" style="width:100%;max-width:500px;height:auto;object-fit:contain;display:block;margin:0 auto;" alt="${displayTitle}">
- DO NOT use overflow:hidden or fixed height on image container
- Icons: inline SVG only (simple)

Generate the complete HTML.`;

    console.log(`🚀 [Smart Landing Premium] Generating for: ${finalTitle}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Better model for premium quality
        messages: [
          {
            role: "system",
            content: language === "fr" 
              ? "Tu es un expert en design de landing pages e-commerce premium. Génère UNIQUEMENT du HTML valide et élégant, sans explications."
              : "You are an expert in premium e-commerce landing page design. Generate ONLY valid and elegant HTML, no explanations.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.6,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("❌ AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit atteint, réessayez dans quelques secondes" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let html = aiData.choices?.[0]?.message?.content || "";

    // Clean up the response
    html = html.replace(/```html\n?/gi, "").replace(/```\n?/gi, "").trim();

    // Ensure it starts with DOCTYPE
    if (!html.toLowerCase().startsWith("<!doctype")) {
      html = `<!DOCTYPE html>\n${html}`;
    }

    // Replace any placeholder images with actual product image
    if (imageUrl) {
      html = html.replace(/https?:\/\/via\.placeholder\.com\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/https?:\/\/placehold\.co\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/https?:\/\/picsum\.photos\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/https?:\/\/placeholder\.com\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/\[IMAGE_URL\]/gi, imageUrl);
      html = html.replace(/\[PRODUCT_IMAGE\]/gi, imageUrl);
    }

    console.log(`✅ [Smart Landing Premium] Generated ${html.length} chars for: ${finalTitle}`);

    return new Response(
      JSON.stringify({ html, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [Smart Landing Premium] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur de génération" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
