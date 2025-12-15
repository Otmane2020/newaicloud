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
      originalVendor, // L'ancien vendor à supprimer du titre
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

    // Le nouveau brand/vendor généré (Velvetto, etc.)
    const brandName = vendor || (language === "fr" ? "Marque Premium" : "Premium Brand");
    const hasNewBrand = !!vendor;

    // Extraire le TYPE de produit du titre (chaise, table, canapé, etc.) sans les anciens noms
    function extractProductType(title: string): string {
      const typePatterns = [
        /\b(chaise|fauteuil|canapé|table|bureau|lit|armoire|commode|étagère|lampe|miroir|tapis|pouf|tabouret|banc|buffet|console|bibliothèque|meuble|siège)\b/i,
        /\b(chair|armchair|sofa|table|desk|bed|wardrobe|dresser|shelf|lamp|mirror|rug|ottoman|stool|bench|sideboard|console|bookcase|furniture|seat)\b/i,
      ];
      
      for (const pattern of typePatterns) {
        const match = title.match(pattern);
        if (match) return match[1];
      }
      return language === "fr" ? "produit" : "product";
    }

    // Extraire les caractéristiques visuelles (couleur, matière, style) SANS les noms propres
    function extractCharacteristics(title: string): string {
      // Enlever les noms propres (mots commençant par majuscule qui ne sont pas des caractéristiques connues)
      const knownWords = /\b(noir|blanc|gris|beige|bleu|rouge|vert|rose|gold|chrome|velours|cuir|bois|métal|tissu|moderne|vintage|design|chic|luxe|premium|black|white|gray|blue|red|green|pink|gold|chrome|velvet|leather|wood|metal|fabric|modern|vintage|design|chic|luxury|premium)\b/gi;
      const characteristics: string[] = [];
      let match;
      while ((match = knownWords.exec(title)) !== null) {
        characteristics.push(match[1].toLowerCase());
      }
      return characteristics.join(" ");
    }

    const productType = extractProductType(productTitle || "");
    const characteristics = extractCharacteristics(productTitle || "");
    
    // Créer un displayTitle simplifié SANS anciens noms quand un nouveau brand est fourni
    const displayTitle = hasNewBrand 
      ? `${productType} ${characteristics}`.trim() 
      : productTitle;

    console.log(`🏷️ Brand: ${brandName}, Type: ${productType}, Characteristics: ${characteristics}`);
    console.log(`📝 Display title: "${displayTitle}" (original: "${productTitle}")`);
    

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
    
    const prompt = language === "fr" 
      ? `Crée une landing page HTML PREMIUM pour ce produit de luxe:

TYPE DE PRODUIT: ${productType}
CARACTÉRISTIQUES: ${characteristics}
MARQUE: ${brandName}
${description ? `DESCRIPTION ORIGINALE: ${description.slice(0, 300)}` : ""}
${highlights ? `POINTS FORTS: ${highlights}` : ""}

⚠️ RÈGLE CRITIQUE - NOUVEAU NOM DE PRODUIT:
- Tu DOIS créer un NOUVEAU nom élégant pour ce produit basé UNIQUEMENT sur la marque "${brandName}"
- Exemple: "${productType} ${brandName}" ou "Collection ${brandName} - ${productType}"
- NE JAMAIS utiliser d'anciens noms, modèles ou références présents dans la description originale
- Le nom doit être court, élégant et mettre en avant la marque ${brandName}

⚠️ IMAGE PRODUIT - RÈGLES CRITIQUES:
URL EXACTE: ${imageUrl}
- Affiche cette image EN ENTIER, JAMAIS TRONQUÉE
- Style image: width:100%; max-width:500px; height:auto; object-fit:contain; display:block; margin:0 auto;
- L'image DOIT être visible ENTIÈREMENT (pas de overflow:hidden, pas de hauteur fixe qui coupe)

⚠️ MARQUE MISE EN AVANT - OBLIGATOIRE:
- La marque "${brandName}" doit apparaître dans:
  1. Un badge/label visible dans le hero
  2. La description: "Signé ${brandName}, ce ${productType}..."
  3. Le footer ou section confiance

DESIGN PREMIUM OBLIGATOIRE:
- Style luxe/haut de gamme, élégant et sophistiqué
- Thème: ${theme} (fond: ${colors.bg}, texte: ${colors.text}, accent: ${colors.accent})
- Typographie raffinée: titres en serif élégant, corps sans-serif
- Espacement généreux, respiration visuelle

STRUCTURE (sections obligatoires):
1. HERO: Image produit ENTIÈRE + NOUVEAU nom élégant avec marque ${brandName} + Badge marque + CTA "Découvrir"
2. PROPOSITION DE VALEUR: 3 icônes SVG inline (livraison, qualité, garantie)
3. DESCRIPTION PRODUIT: Texte mentionnant la marque "${brandName}" explicitement
4. CTA FINAL: Bouton "En savoir plus" ou "Découvrir"

⚠️ EXCLUSIONS - NE JAMAIS INCLURE:
- PAS de bouton "Ajouter au Panier" ou "Add to Cart"
- PAS de bouton "Acheter" ou "Buy Now"
- PAS de fonctionnalités e-commerce (quantité, panier, checkout)
- Les CTA doivent être informatifs: "Découvrir", "En savoir plus", "Voir les détails"

RÈGLES TECHNIQUES STRICTES:
- HTML5 + CSS inline uniquement
- Mobile-first responsive
- Pas de JavaScript
- IMAGE: <img src="${imageUrl}" style="width:100%;max-width:500px;height:auto;object-fit:contain;display:block;margin:0 auto;" alt="${productType} ${brandName}">
- Icônes: SVG inline uniquement

Génère le HTML complet.`

      : `Create a PREMIUM HTML landing page for this luxury product:

PRODUCT TYPE: ${productType}
CHARACTERISTICS: ${characteristics}
BRAND: ${brandName}
${description ? `ORIGINAL DESCRIPTION: ${description.slice(0, 300)}` : ""}
${highlights ? `HIGHLIGHTS: ${highlights}` : ""}

⚠️ CRITICAL RULE - NEW PRODUCT NAME:
- You MUST create a NEW elegant name for this product based ONLY on the brand "${brandName}"
- Example: "${brandName} ${productType}" or "${brandName} Collection - ${productType}"
- NEVER use old names, models or references from the original description
- The name must be short, elegant and highlight the brand ${brandName}

⚠️ PRODUCT IMAGE - CRITICAL RULES:
EXACT URL: ${imageUrl}
- Display this image FULLY, NEVER CROPPED
- Image style: width:100%; max-width:500px; height:auto; object-fit:contain; display:block; margin:0 auto;
- Image MUST be FULLY visible (no overflow:hidden, no fixed height that crops)

⚠️ BRAND HIGHLIGHTING - MANDATORY:
- The brand "${brandName}" must appear in:
  1. A visible badge/label in the hero
  2. Description: "By ${brandName}, this ${productType}..."
  3. Footer or trust section

MANDATORY PREMIUM DESIGN:
- Luxury/high-end style, elegant and sophisticated
- Theme: ${theme} (bg: ${colors.bg}, text: ${colors.text}, accent: ${colors.accent})
- Refined typography: elegant serif headings, sans-serif body
- Generous spacing, visual breathing room

STRUCTURE (required sections):
1. HERO: FULL product image + NEW elegant name with brand ${brandName} + Brand badge + CTA "Discover"
2. VALUE PROPOSITION: 3 inline SVG icons (shipping, quality, guarantee)
3. PRODUCT DESCRIPTION: Text explicitly mentioning the brand "${brandName}"
4. FINAL CTA: "Learn More" or "Discover" button

⚠️ EXCLUSIONS - NEVER INCLUDE:
- NO "Add to Cart" or "Ajouter au Panier" button
- NO "Buy Now" or "Acheter" button
- NO e-commerce features (quantity, cart, checkout)
- CTAs must be informative: "Discover", "Learn More", "View Details"

STRICT TECHNICAL RULES:
- HTML5 + inline CSS only
- Mobile-first responsive
- No JavaScript
- IMAGE: <img src="${imageUrl}" style="width:100%;max-width:500px;height:auto;object-fit:contain;display:block;margin:0 auto;" alt="${productType} ${brandName}">
- Icons: inline SVG only

Generate the complete HTML.`;

    console.log(`🚀 [Smart Landing Premium] Generating for: ${displayTitle} (brand: ${brandName})`);

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

    console.log(`✅ [Smart Landing Premium] Generated ${html.length} chars for: ${displayTitle}`);

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
