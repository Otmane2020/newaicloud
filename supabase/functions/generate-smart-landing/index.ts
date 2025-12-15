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

    // Premium prompt for high-quality landing pages - USE ORIGINAL TITLE FOR DISPLAY
    const displayTitle = productTitle; // Always use original product title for display
    
    const prompt = language === "fr" 
      ? `Crée une landing page HTML PREMIUM pour ce produit de luxe:

PRODUIT: ${displayTitle}
MARQUE: ${brandName}
${description ? `DESCRIPTION: ${description.slice(0, 300)}` : ""}
${highlights ? `POINTS FORTS: ${highlights}` : ""}

⚠️ IMAGE PRODUIT OBLIGATOIRE - CRITIQUE:
URL EXACTE: ${imageUrl}
- Affiche cette image EN GRAND dans le hero (min-height: 400px, object-fit: contain)
- L'image doit être le point focal de la page
- Utilise UNIQUEMENT cette URL, jamais de placeholder ou autre URL

DESIGN PREMIUM OBLIGATOIRE:
- Style luxe/haut de gamme, élégant et sophistiqué
- Thème: ${theme} (fond: ${colors.bg}, texte: ${colors.text}, accent: ${colors.accent})
- Typographie raffinée: titres en serif élégant, corps sans-serif
- Espacement généreux, respiration visuelle
- Effets subtils: ombres douces, hover élégants

STRUCTURE (sections obligatoires):
1. HERO: 
   - Image produit GRANDE (min 400px hauteur) avec l'URL exacte fournie
   - Titre du produit élégant centré
   - Badge marque
   - CTA principal "Acheter maintenant"
2. PROPOSITION DE VALEUR: 3-4 icônes SVG inline avec avantages clés (livraison, qualité, garantie)
3. DÉTAILS PRODUIT: Description enrichie avec mise en forme élégante
4. CONFIANCE: Logos paiement sécurisé, avis clients stylisés
5. CTA FINAL: Bouton achat proéminent avec urgence subtile

RÈGLES TECHNIQUES:
- HTML5 + CSS inline uniquement
- Mobile-first responsive (max-width media queries)
- Pas de JavaScript
- IMAGE: <img src="${imageUrl}" style="width:100%;max-width:600px;height:auto;min-height:400px;object-fit:contain;">
- Icônes: SVG inline uniquement (truck, shield, star, check, heart)
- Police: font-family avec fallbacks système

Génère le HTML complet.`

      : `Create a PREMIUM HTML landing page for this luxury product:

PRODUCT: ${displayTitle}
BRAND: ${brandName}
${description ? `DESCRIPTION: ${description.slice(0, 300)}` : ""}
${highlights ? `HIGHLIGHTS: ${highlights}` : ""}

⚠️ PRODUCT IMAGE MANDATORY - CRITICAL:
EXACT URL: ${imageUrl}
- Display this image LARGE in the hero (min-height: 400px, object-fit: contain)
- The image must be the focal point of the page
- Use ONLY this URL, never placeholders or other URLs

MANDATORY PREMIUM DESIGN:
- Luxury/high-end style, elegant and sophisticated
- Theme: ${theme} (bg: ${colors.bg}, text: ${colors.text}, accent: ${colors.accent})
- Refined typography: elegant serif headings, sans-serif body
- Generous spacing, visual breathing room
- Subtle effects: soft shadows, elegant hovers

STRUCTURE (required sections):
1. HERO:
   - LARGE product image (min 400px height) with exact provided URL
   - Elegant centered product title
   - Brand badge
   - Main CTA "Buy Now"
2. VALUE PROPOSITION: 3-4 inline SVG icons with key benefits (shipping, quality, guarantee)
3. PRODUCT DETAILS: Enhanced description with elegant formatting
4. TRUST: Secure payment logos, styled customer reviews
5. FINAL CTA: Prominent buy button with subtle urgency

TECHNICAL RULES:
- HTML5 + inline CSS only
- Mobile-first responsive (max-width media queries)
- No JavaScript
- IMAGE: <img src="${imageUrl}" style="width:100%;max-width:600px;height:auto;min-height:400px;object-fit:contain;">
- Icons: inline SVG only (truck, shield, star, check, heart)
- Font: font-family with system fallbacks

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
