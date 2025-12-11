import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeGeneratedHTML } from "../_shared/html-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

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
      productTitle: rawProductTitle,
      productDescription,
      productImages = [],
      vendor,
      designStyle = "modern",
      colorScheme,
      theme = "light",
      language = "fr",
      customHighlights = "",
    } = body;

    // Clean title: remove existing vendor/brand names to avoid duplication
    const cleanTitle = (title: string, vendorName?: string): string => {
      if (!title || !vendorName) return title || "";
      
      // Common brand patterns to remove from title
      const brandPatterns = [
        new RegExp(`\\b${vendorName}\\b`, 'gi'),
        new RegExp(`\\s+${vendorName}\\s+`, 'gi'),
        // Remove brand at start or end
        new RegExp(`^${vendorName}\\s+`, 'gi'),
        new RegExp(`\\s+${vendorName}$`, 'gi'),
      ];
      
      let cleanedTitle = title;
      brandPatterns.forEach(pattern => {
        cleanedTitle = cleanedTitle.replace(pattern, ' ');
      });
      
      // Clean up extra spaces
      return cleanedTitle.replace(/\s+/g, ' ').trim();
    };

    // If we have a vendor in the title, try to detect and remove it
    const detectAndCleanBrandFromTitle = (title: string): string => {
      if (!title) return "";
      
      // Common uppercase brand patterns (e.g., "PIANO", "IKEA", "ZARA")
      const uppercaseBrandMatch = title.match(/\b([A-Z]{2,})\b/);
      if (uppercaseBrandMatch) {
        const detectedBrand = uppercaseBrandMatch[1];
        // Only remove if it looks like a brand (not common words like "LED", "USB", "XXL")
        const commonWords = ['LED', 'USB', 'XXL', 'XXS', 'XL', 'CM', 'MM', 'EUR', 'USD'];
        if (!commonWords.includes(detectedBrand)) {
          return cleanTitle(title, detectedBrand);
        }
      }
      return title;
    };

    // Clean the product title
    const productTitle = vendor 
      ? cleanTitle(detectAndCleanBrandFromTitle(rawProductTitle), vendor)
      : detectAndCleanBrandFromTitle(rawProductTitle);

    if (!OPENROUTER_API_KEY) {
      console.error("❌ OPENROUTER_API_KEY not configured");
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

    // Build custom highlights section if provided
    const highlightsSection = customHighlights && customHighlights.trim() 
      ? `\n\n⭐ POINTS FORTS À METTRE EN AVANT (OBLIGATOIRE - intégrer dans la description et les avantages):\n${customHighlights.trim()}\n`
      : "";

    // Professional prompt for high-quality generation - MOBILE FIRST like DeepSeek
    const prompt = `Tu es un EXPERT en création de landing pages e-commerce HAUTE CONVERSION. Génère une page HTML EXCEPTIONNELLE, RICHE EN CONTENU, et 100% MOBILE-FIRST.

═══════════════════════════════════════════════════════
📦 INFORMATIONS PRODUIT
═══════════════════════════════════════════════════════
TITRE: ${productTitle}
DESCRIPTION: ${productDescription || "Produit de qualité supérieure, conçu avec soin pour répondre aux exigences les plus élevées."}
MARQUE: ${vendor || "Marque Premium"}
${highlightsSection}

IMAGES (URLs EXACTES - JAMAIS de placeholder):
- HERO: ${mainImage}
${additionalImagesStr}

═══════════════════════════════════════════════════════
🎨 STYLE & COULEURS (HSL OBLIGATOIRE)
═══════════════════════════════════════════════════════
DESIGN: ${designStyle} - Élégant, professionnel
THÈME: ${theme}
LANGUE: ${language === "en" ? "English" : "Français"}

CSS VARIABLES HSL:
--primary: hsl(${primaryColor})
--secondary: hsl(${secondaryColor})  
--text: hsl(${textColor})
--bg: hsl(${bgColor})
--surface: hsl(${surfaceColor})

═══════════════════════════════════════════════════════
📱 RÈGLES MOBILE-FIRST CRITIQUES
═══════════════════════════════════════════════════════

⚠️ OBLIGATOIRE - Chaque section DOIT avoir ces styles de base:
- padding: 2rem 1rem (pas plus de 1rem horizontal!)
- max-width: 100%; box-sizing: border-box
- Textes: font-size clamp(1rem, 4vw, 1.125rem)
- Titres: font-size clamp(1.5rem, 6vw, 2.5rem)
- Images: width: 100%; height: auto; display: block
- Grilles: display: flex; flex-direction: column; gap: 1rem
- Boutons: width: 100%; padding: 1rem; font-size: 1.1rem

POUR DESKTOP (min-width: 768px) via @media:
- Container: max-width: 1200px; margin: 0 auto; padding: 3rem 2rem
- Grilles: flex-direction: row; flex-wrap: wrap
- Cartes: flex: 1 1 300px

═══════════════════════════════════════════════════════
🚫 INTERDICTIONS ABSOLUES
═══════════════════════════════════════════════════════
❌ via.placeholder.com ou toute URL "placeholder"
❌ Emoji comme icônes (✅❌⭐🎉 = INTERDIT)
❌ Font Awesome, Material Icons, CDN externes
❌ Boutons d'achat, prix, panier, menu, footer
❌ width: 50%, 33% sans media queries (casse le mobile!)
❌ font-size en px fixes (utiliser clamp ou rem)

✅ Utiliser UNIQUEMENT des SVG inline:
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="..."/></svg>

═══════════════════════════════════════════════════════
📋 STRUCTURE OBLIGATOIRE (7 SECTIONS RICHES)
═══════════════════════════════════════════════════════

1️⃣ HERO SECTION (plein écran mobile)
<section style="min-height: 100vh; padding: 2rem 1rem; background: linear-gradient(180deg, hsl(${bgColor}), hsl(${surfaceColor})); display: flex; flex-direction: column; justify-content: center;">
  <img src="${mainImage}" alt="${productTitle}" style="width: 100%; max-height: 50vh; object-fit: contain; border-radius: 16px; margin-bottom: 1.5rem;">
  <h1 style="font-size: clamp(1.75rem, 7vw, 3rem); font-weight: 800; line-height: 1.2; margin-bottom: 1rem; color: hsl(${textColor});">${productTitle}</h1>
  <p style="font-size: clamp(1rem, 4vw, 1.25rem); line-height: 1.6; color: hsl(${textColor} / 0.8); margin-bottom: 1.5rem;">
    [DESCRIPTION RICHE ET ENGAGEANTE - 3-4 phrases minimum sur les bénéfices]
  </p>
  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
    <span style="padding: 0.5rem 1rem; background: hsl(${primaryColor} / 0.1); border-radius: 20px; font-size: 0.9rem; color: hsl(${primaryColor});">✓ Qualité Premium</span>
    <span style="padding: 0.5rem 1rem; background: hsl(${primaryColor} / 0.1); border-radius: 20px; font-size: 0.9rem; color: hsl(${primaryColor});">✓ Livraison Rapide</span>
  </div>
</section>

2️⃣ BÉNÉFICES CLÉS (4 cartes avec SVG)
<section style="padding: 3rem 1rem; background: hsl(${surfaceColor});">
  <h2 style="text-align: center; font-size: clamp(1.5rem, 5vw, 2rem); margin-bottom: 2rem; color: hsl(${textColor});">Pourquoi Choisir Ce Produit ?</h2>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <!-- 4 cartes avec icône SVG, titre, description 2-3 phrases -->
    <div style="padding: 1.5rem; background: hsl(${bgColor}); border-radius: 12px; box-shadow: 0 2px 8px hsl(${textColor} / 0.05);">
      <svg width="40" height="40" style="margin-bottom: 1rem; color: hsl(${primaryColor});">...</svg>
      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: hsl(${textColor});">Titre Bénéfice</h3>
      <p style="font-size: 0.95rem; line-height: 1.5; color: hsl(${textColor} / 0.7);">Description détaillée du bénéfice...</p>
    </div>
  </div>
</section>

3️⃣ CARACTÉRISTIQUES TECHNIQUES (tableau élégant)
<section style="padding: 3rem 1rem; background: hsl(${bgColor});">
  <h2>Caractéristiques Détaillées</h2>
  <div style="background: hsl(${surfaceColor}); border-radius: 12px; overflow: hidden;">
    <div style="display: flex; justify-content: space-between; padding: 1rem; border-bottom: 1px solid hsl(${textColor} / 0.1);">
      <span style="font-weight: 600;">Dimensions</span>
      <span>[Valeur estimée]</span>
    </div>
    <!-- Minimum 5 lignes: Dimensions, Matériaux, Poids, Couleur, Style -->
  </div>
</section>

4️⃣ GALERIE IMAGES (grille responsive)
<section style="padding: 3rem 1rem;">
  <h2>Découvrez en Détail</h2>
  <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
    <!-- Images avec coins arrondis, 100% width sur mobile -->
    <img src="[URL exacte]" style="width: 100%; border-radius: 12px;">
  </div>
</section>
@media (min-width: 768px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }

5️⃣ TÉMOIGNAGES / CONFIANCE
<section style="padding: 3rem 1rem; background: hsl(${surfaceColor});">
  <h2>Ils Ont Adopté Ce Produit</h2>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <div style="padding: 1.5rem; background: hsl(${bgColor}); border-radius: 12px; border-left: 4px solid hsl(${primaryColor});">
      <p style="font-style: italic; margin-bottom: 0.5rem;">"Témoignage fictif mais réaliste..."</p>
      <span style="font-weight: 600;">- Marie D.</span>
    </div>
    <!-- 2-3 témoignages -->
  </div>
</section>

6️⃣ FAQ INTERACTIVE (3-5 questions)
<section style="padding: 3rem 1rem; background: hsl(${bgColor});">
  <h2 style="text-align: center; margin-bottom: 2rem;">Questions Fréquentes</h2>
  <div style="max-width: 800px; margin: 0 auto;">
    <div class="faq-item" onclick="this.classList.toggle('open')" style="margin-bottom: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid hsl(${primaryColor} / 0.2); cursor: pointer;">
      <div style="padding: 1rem; background: hsl(${surfaceColor}); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; color: hsl(${textColor});">[Question pertinente 1]</span>
        <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="faq-answer" style="padding: 1rem; border-top: 1px solid hsl(${primaryColor} / 0.1); color: hsl(${textColor} / 0.8);">
        [Réponse détaillée et utile - 2-3 phrases]
      </div>
    </div>
  </div>
</section>
<style>.faq-item .faq-answer { display: none; } .faq-item.open .faq-answer { display: block; } .faq-icon { transition: transform 0.3s; } .faq-item.open .faq-icon { transform: rotate(180deg); }</style>

7️⃣ CALL TO ACTION FINAL
<section style="padding: 4rem 1rem; background: linear-gradient(135deg, hsl(${primaryColor}), hsl(${secondaryColor})); text-align: center;">
  <h2 style="font-size: clamp(1.5rem, 6vw, 2.5rem); color: white; margin-bottom: 1rem;">Prêt à Découvrir ${productTitle} ?</h2>
  <p style="color: white; opacity: 0.9; margin-bottom: 1.5rem;">Faites le choix de la qualité aujourd'hui.</p>
</section>

═══════════════════════════════════════════════════════
⚡ CONSIGNES FINALES
═══════════════════════════════════════════════════════
- CONTENU RICHE: Chaque section doit avoir du VRAI contenu, pas juste des titres
- MOBILE-FIRST: Tout doit être parfait sur mobile AVANT desktop
- IMAGES: Utiliser UNIQUEMENT les URLs fournies, JAMAIS de placeholder
- LONGUEUR: Minimum 4000 caractères de HTML
- STYLE: Inline CSS uniquement, HSL pour toutes les couleurs

Génère maintenant le HTML COMPLET avec tout le contenu riche.`;

    // Call OpenRouter AI with Qwen 2.5 72B for rich content
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://newai.sale",
        "X-Title": "NewAI Landing Generator",
      },
      body: JSON.stringify({
        model: "qwen/qwen-2.5-72b-instruct",
        messages: [
          {
            role: "system",
            content: language === "en"
              ? "You are an EXPERT e-commerce landing page designer. Generate RICH, PROFESSIONAL, MOBILE-FIRST HTML with detailed content in each section. Every section must have real, valuable content - not just headings. Use inline CSS with HSL colors. Output at least 4000 characters of high-quality HTML."
              : "Tu es un EXPERT en design de landing pages e-commerce. Génère du HTML RICHE, PROFESSIONNEL et MOBILE-FIRST avec du contenu détaillé dans chaque section. Chaque section doit avoir du vrai contenu de valeur - pas juste des titres. Utilise du CSS inline avec des couleurs HSL. Produis au moins 4000 caractères de HTML de haute qualité.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 12000,
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

    // Basic cleanup - remove markdown fences
    html = html.replace(/```html\n?/gi, "").replace(/```\n?/gi, "");

    // Ensure closing tags
    if (!html.includes("</body>")) html += "\n</body>";
    if (!html.includes("</html>")) html += "\n</html>";

    // Build product images array for sanitization
    const productImagesForSanitize = images.map((src: string, index: number) => ({
      src,
      alt: `${productTitle} - Image ${index + 1}`
    }));

    // Apply full sanitization with image replacement (like generate-landing-ai)
    html = sanitizeGeneratedHTML(html, productTitle, language, {
      allowRootCss: true,
      productImages: productImagesForSanitize
    });

    // Additional forced cleanup for any remaining placeholders
    if (html.includes('via.placeholder.com') || html.includes('placeholder.')) {
      console.warn("⚠️ Placeholders still detected after sanitization, forcing replacement...");
      html = html.replace(/https?:\/\/via\.placeholder\.com[^\s"')]+/gi, mainImage || "");
      html = html.replace(/https?:\/\/[^\s"')]*placeholder[^\s"')]+/gi, mainImage || "");
    }

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
