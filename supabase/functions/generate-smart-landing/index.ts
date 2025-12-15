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

    // Ultra-light prompt for fast generation
    const prompt = language === "fr" 
      ? `Landing page HTML simple pour: ${finalTitle} (${vendor || "Marque"}).
Image: ${imageUrl || "none"}
${description ? `Desc: ${description.slice(0, 150)}` : ""}
${highlights ? `Points: ${highlights}` : ""}

HTML inline CSS, thème ${theme} (bg:${colors.bg}, text:${colors.text}, primary:${colors.primary}).
Sections: Hero (image+titre), 3 avantages icônes SVG, description courte, CTA.
Max 200 lignes. Pas de JS. Mobile-first.`
      : `Simple HTML landing for: ${finalTitle} (${vendor || "Brand"}).
Image: ${imageUrl || "none"}
${description ? `Desc: ${description.slice(0, 150)}` : ""}
${highlights ? `Points: ${highlights}` : ""}

Inline CSS, ${theme} theme (bg:${colors.bg}, text:${colors.text}, primary:${colors.primary}).
Sections: Hero (image+title), 3 benefits with SVG icons, short description, CTA.
Max 200 lines. No JS. Mobile-first.`;

    console.log(`🚀 [Smart Landing] Generating for: ${finalTitle}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fastest model
        messages: [
          {
            role: "system",
            content: language === "fr" 
              ? "Génère du HTML pur compact. Réponds UNIQUEMENT avec du HTML valide."
              : "Generate compact pure HTML. Reply ONLY with valid HTML.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2500, // Reduced for speed
        temperature: 0.5,
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
