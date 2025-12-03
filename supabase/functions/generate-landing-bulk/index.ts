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

    if (!LOVABLE_API_KEY) {
      console.error("❌ LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Professional prompt for high-quality generation
    const prompt = `Génère une landing page HTML PROFESSIONNELLE et PREMIUM pour ce produit e-commerce:

PRODUIT: ${productTitle}
DESCRIPTION: ${productDescription || "Produit de qualité premium"}
MARQUE: ${vendor || ""}

IMAGES PRODUIT (URLs EXACTES à utiliser - JAMAIS de placeholder):
- Image principale HERO: ${mainImage}
${additionalImagesStr}

STYLE: ${designStyle} - DESIGN PROFESSIONNEL ÉPURÉ
THÈME: ${theme}
LANGUE: ${language === "en" ? "Anglais" : "Français"}

TOKENS CSS HSL:
--primary: ${primaryColor}
--secondary: ${secondaryColor}
--text: ${textColor}
--background: ${bgColor}
--surface: ${surfaceColor}

═══════════════════════════════════════════════════════
RÈGLES DE DESIGN STRICTES (CRITIQUE):
═══════════════════════════════════════════════════════

1. ICÔNES PROFESSIONNELLES UNIQUEMENT:
   - Utilise des SVG inline avec style professionnel (traits fins, style Lucide/Feather)
   - stroke-width: 1.5 ou 2, viewBox="0 0 24 24", fill="none", stroke="currentColor"
   - JAMAIS d'emoji, JAMAIS d'icônes clip-art ou enfantines
   - Exemples de SVG autorisés:
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>

2. IMAGES PRODUIT BIEN POSITIONNÉES:
   - Image HERO: min-height: 400px, object-fit: cover, width 100% ou 60% sur desktop
   - Galerie: display: grid, grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)), gap: 1rem
   - Toutes images avec border-radius: 12px et box-shadow subtile
   - aspect-ratio: 1/1 ou 4/3 pour cohérence

3. TYPOGRAPHIE PREMIUM:
   - Titres: font-weight: 700, letter-spacing: -0.02em
   - Corps: font-weight: 400, line-height: 1.6
   - Hierarchy claire avec tailles distinctes (2.5rem titre, 1.25rem sous-titres, 1rem texte)

4. COULEURS ET EFFETS:
   - Gradients subtils pour backgrounds (linear-gradient avec opacité faible)
   - Box-shadows douces: 0 4px 20px rgba(0,0,0,0.08)
   - Contraste élevé texte/fond
   - Pas de couleurs criardes ou néon

═══════════════════════════════════════════════════════
STRUCTURE HTML REQUISE:
═══════════════════════════════════════════════════════

<!DOCTYPE html><html><head>...</head><body>
1. HERO SECTION:
   - Layout flex: image (60%) + texte (40%) sur desktop, stack sur mobile
   - Image principale grande, bien cadrée
   - Titre produit + marque + description courte

2. SECTION AVANTAGES (3-4 cartes):
   - Grid responsive 3 colonnes desktop, 1 mobile
   - Chaque carte: SVG professionnel (24x24) + titre + description courte
   - Background surface avec border subtile

3. GALERIE IMAGES (si images additionnelles):
   - Grid 2-3 colonnes avec gap
   - Hover effect subtil (scale 1.02, shadow)
   - Images bien cadrées

4. FAQ SECTION (3 questions max):
   - Accordéon simple ou liste Q/R
   - Questions pertinentes au produit
</body></html>

═══════════════════════════════════════════════════════
INTERDIT ABSOLUMENT:
═══════════════════════════════════════════════════════
- Emoji ou icônes enfantines ❌
- Images placeholder (via.placeholder.com, etc.) ❌
- Boutons d'achat ou CTA ❌
- Menu navigation ou footer ❌
- JavaScript ou animations complexes ❌
- Couleurs trop vives ou néon ❌

Génère UNIQUEMENT le HTML complet (<!DOCTYPE html> jusqu'à </html>), rien d'autre.`;

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

      const { error: updateError } = await supabaseAdmin
        .from("shopify_products")
        .update({
          landing_page: html,  // Sauvegarde HTML directement (comme generate-landing-ai)
          last_landing_generation_at: new Date().toISOString(),
        })
        .eq("id", product_id)
        .eq("seller_id", userId);
      
      if (updateError) {
        console.error("❌ Database update error:", updateError.message);
      } else {
        console.log(`💾 Saved landing page for product ${product_id}`);
      }

      // Track usage (10 credits per bulk landing page)
      await supabaseAdmin.rpc("increment_usage", {
        p_seller_id: userId,
        p_field: "optimizations_count",
        p_increment: 10,
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
