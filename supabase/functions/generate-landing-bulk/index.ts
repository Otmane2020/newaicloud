import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: "ok", function: "generate-landing-bulk" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      product_id,
      productTitle,
      productDescription,
      productImages = [],
      vendor,
      designStyle = "modern",
      colorScheme,
      theme = "light",
      language = "fr",
    } = body;

    if (!productTitle) {
      return new Response(
        JSON.stringify({ error: "productTitle is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🚀 [Bulk Landing] Generating for: ${productTitle}`);

    // Get auth from request
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_ANON_KEY") || "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    // Simple color tokens based on colorScheme or defaults
    const primaryColor = colorScheme?.primary || "221 83% 53%";
    const secondaryColor = colorScheme?.secondary || "212 95% 51%";
    const textColor = theme === "dark" ? "0 0% 95%" : "222 47% 11%";
    const bgColor = theme === "dark" ? "222 47% 11%" : "0 0% 100%";
    const surfaceColor = theme === "dark" ? "217 33% 17%" : "210 40% 98%";

    // Build images list (max 4)
    const images: string[] = productImages.slice(0, 4);
    const mainImage = images[0] || "";
    const additionalImages = images.slice(1, 4);

    // Build additional images string
    const additionalImagesStr = additionalImages
      .map((img: string, i: number) => `- Image ${i + 2}: ${img}`)
      .join("\n");

    // Simplified prompt for fast generation
    const prompt = `Génère une landing page HTML complète et moderne pour ce produit:

PRODUIT: ${productTitle}
DESCRIPTION: ${productDescription || "Produit de qualité premium"}
MARQUE: ${vendor || ""}

IMAGES PRODUIT (utilise UNIQUEMENT ces URLs, jamais de placeholders):
- Image principale: ${mainImage}
${additionalImagesStr}

STYLE: ${designStyle}
THÈME: ${theme}
LANGUE: ${language === "en" ? "Anglais" : "Français"}

TOKENS CSS (utilise ces valeurs HSL):
--primary: ${primaryColor}
--secondary: ${secondaryColor}
--text: ${textColor}
--background: ${bgColor}
--surface: ${surfaceColor}

RÈGLES STRICTES:
1. HTML complet avec <!DOCTYPE html>, <html>, <head>, <body>
2. CSS inline avec styles modernes (gradients, shadows, rounded)
3. Responsive avec media queries
4. AUCUN placeholder image - utilise UNIQUEMENT les URLs fournies
5. AUCUN bouton d'achat ou CTA
6. AUCUN menu navigation ou footer
7. Sections: Hero, Points Forts (3-4 cards), Galerie, FAQ

STRUCTURE MINIMALE REQUISE:
- Hero avec image principale grande
- Section Points Forts avec 3-4 cartes iconiques
- Galerie d'images si plusieurs images
- FAQ courte (3 questions)

Génère UNIQUEMENT le HTML complet, rien d'autre.`;

    // Call AI with shorter timeout for bulk
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
            content: language === "en"
              ? "You are a fast HTML generator for product landing pages. Generate clean, modern HTML. Be concise."
              : "Tu es un générateur HTML rapide pour landing pages produit. Génère du HTML propre et moderne. Sois concis.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000, // Reduced for speed
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("❌ AI Error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited - veuillez réessayer dans quelques secondes" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `AI Error: ${aiResponse.status}` }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResponse.json();
    let html = data?.choices?.[0]?.message?.content?.trim() || "";

    // Basic cleanup
    html = html.replace(/```html\n?/gi, "").replace(/```\n?/gi, "");

    // Ensure closing tags
    if (!html.includes("</body>")) html += "\n</body>";
    if (!html.includes("</html>")) html += "\n</html>";

    // Replace any placeholder images with product images
    html = html.replace(/https?:\/\/via\.placeholder\.com[^\s"')]+/gi, mainImage || "");
    html = html.replace(/placeholder\.(com|jpg|png|webp)/gi, mainImage || "");

    if (html.length < 500) {
      return new Response(
        JSON.stringify({ error: "HTML généré trop court" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [Bulk Landing] Generated ${html.length} chars for ${productTitle}`);

    // Save to database if we have product_id and userId
    if (product_id && userId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      );

      await supabaseAdmin
        .from("shopify_products")
        .update({
          landing_page_html: html,
          has_landing_page: true,
          last_landing_generation_at: new Date().toISOString(),
        })
        .eq("id", product_id)
        .eq("seller_id", userId);

      // Track usage (5 credits for bulk vs 10 for full)
      await supabaseAdmin.rpc("increment_usage", {
        p_seller_id: userId,
        p_field: "optimizations_count",
        p_increment: 5,
      });
    }

    return new Response(
      JSON.stringify({ html, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("💥 ERROR:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
