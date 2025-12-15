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
    const langLabels = language === "fr" ? {
      discover: "Découvrir",
      addToCart: "Ajouter au panier",
      buyNow: "Acheter maintenant",
      freeShipping: "Livraison gratuite",
      securePayment: "Paiement sécurisé",
      satisfaction: "Satisfaction garantie",
      benefits: "Avantages",
      whyChoose: "Pourquoi choisir",
    } : {
      discover: "Discover",
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
      freeShipping: "Free Shipping",
      securePayment: "Secure Payment",
      satisfaction: "Satisfaction Guaranteed",
      benefits: "Benefits",
      whyChoose: "Why Choose",
    };

    // Theme colors
    const colors = theme === "dark" ? {
      bg: "#111827",
      surface: "#1F2937",
      text: "#F9FAFB",
      textMuted: "#9CA3AF",
      primary: "#3B82F6",
      primaryHover: "#2563EB",
    } : {
      bg: "#FFFFFF",
      surface: "#F3F4F6",
      text: "#111827",
      textMuted: "#6B7280",
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
    };

    const prompt = `Tu es un expert en landing pages e-commerce. Génère une landing page HTML COMPACTE et RESPONSIVE pour:

PRODUIT: ${finalTitle}
MARQUE: ${vendor || "Marque Premium"}
DESCRIPTION: ${description?.slice(0, 300) || "Produit de qualité supérieure"}
IMAGE: ${imageUrl || ""}
${highlights ? `POINTS FORTS: ${highlights}` : ""}
LANGUE: ${language === "fr" ? "Français" : "English"}
THÈME: ${theme}

RÈGLES STRICTES:
1. HTML COMPLET avec <!DOCTYPE html>, <html>, <head>, <body>
2. CSS INLINE uniquement (pas de <style> externe)
3. RESPONSIVE: mobile-first avec media queries inline
4. MAXIMUM 400 lignes de code
5. PAS de JavaScript
6. PAS de faux témoignages ni faux avis
7. Utiliser les couleurs du thème ${theme}:
   - Background: ${colors.bg}
   - Surface: ${colors.surface}
   - Text: ${colors.text}
   - TextMuted: ${colors.textMuted}
   - Primary: ${colors.primary}

STRUCTURE SIMPLE:
1. HERO: Image + Titre + Prix + CTA
2. AVANTAGES: 3 icônes (${langLabels.freeShipping}, ${langLabels.securePayment}, ${langLabels.satisfaction})
3. DESCRIPTION: Texte court avec highlights
4. CTA FINAL: Bouton "${langLabels.buyNow}"

STYLE ${designStyle.toUpperCase()}:
${designStyle === "minimalist" ? "Épuré, beaucoup d'espace blanc, typo simple" : ""}
${designStyle === "modern" ? "Gradients subtils, ombres douces, coins arrondis" : ""}
${designStyle === "premium" ? "Élégant, accents dorés, typo serif pour titres" : ""}

Génère UNIQUEMENT le HTML, rien d'autre.`;

    console.log(`🚀 [Smart Landing] Generating for: ${finalTitle}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "Tu génères du HTML pur pour des landing pages e-commerce. Réponds UNIQUEMENT avec du code HTML valide.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
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

    // Replace placeholder images with actual product image
    if (imageUrl) {
      html = html.replace(/https?:\/\/via\.placeholder\.com\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/https?:\/\/placehold\.co\/[^\s"'>]+/gi, imageUrl);
      html = html.replace(/https?:\/\/picsum\.photos\/[^\s"'>]+/gi, imageUrl);
    }

    console.log(`✅ [Smart Landing] Generated ${html.length} chars for: ${finalTitle}`);

    return new Response(
      JSON.stringify({ html, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [Smart Landing] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur de génération" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
