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

    // Professional prompt for high-quality generation
    const prompt = `Génère une landing page HTML PROFESSIONNELLE et PREMIUM pour ce produit e-commerce:

PRODUIT: ${productTitle}
DESCRIPTION: ${productDescription || "Produit de qualité premium"}
MARQUE: ${vendor || ""}
${highlightsSection}

IMAGES PRODUIT (URLs EXACTES à utiliser - JAMAIS de placeholder):
- Image principale HERO: ${mainImage}
${additionalImagesStr}

STYLE: ${designStyle} - DESIGN PROFESSIONNEL ÉPURÉ
THÈME: ${theme}
LANGUE: ${language === "en" ? "Anglais" : "Français"}

TOKENS CSS HSL OBLIGATOIRES (UTILISER EXACTEMENT):
--primary: ${primaryColor}
--secondary: ${secondaryColor}
--text: ${textColor}
--background: ${bgColor}
--surface: ${surfaceColor}

⚠️ IMPORTANT: Utilise ces couleurs HSL EXACTES dans tout le CSS:
- Fond principal: background-color: hsl(${bgColor})
- Texte principal: color: hsl(${textColor})
- Boutons/Accents: background-color: hsl(${primaryColor})
- Sections alternées: background-color: hsl(${surfaceColor})

═══════════════════════════════════════════════════════
RÈGLES DE DESIGN STRICTES:
═══════════════════════════════════════════════════════

⚠️⚠️⚠️ INTERDITS ABSOLUS - VIOLATION = ÉCHEC TOTAL:
- https://via.placeholder.com (JAMAIS JAMAIS JAMAIS!)
- Toute URL contenant "placeholder" 
- Emoji comme icônes (❌🎉⭐ = INTERDIT)
- Icônes externes (Font Awesome, Material Icons, etc.)
- data:image URLs pour les images produit

✅ ICÔNES SVG INLINE OBLIGATOIRES (EXEMPLES EXACTS):
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>
Chaque icône DOIT avoir: viewBox="0 0 24 24", fill="none", stroke="currentColor", stroke-width="1.5"

✅ IMAGES PRODUIT - UTILISER LES URLs EXACTES FOURNIES:
- Image HERO: UTILISER "${mainImage}" DIRECTEMENT
- Autres images: UTILISER les URLs ${additionalImagesStr} DIRECTEMENT
- min-height: 400px, object-fit: cover, border-radius: 12px

✅ TYPOGRAPHIE:
- Titres: font-weight: 700
- Corps: font-weight: 400, line-height: 1.6

═══════════════════════════════════════════════════════
STRUCTURE HTML REQUISE:
═══════════════════════════════════════════════════════

1. HERO: image + titre + description

2. CARACTÉRISTIQUES: tableau élégant (Dimensions, Matériaux, Poids)

3. AVANTAGES: 3-4 cartes avec SVG

4. GALERIE IMAGES (si disponibles)

5. ⚠️ FAQ SECTION - ABSOLUMENT OBLIGATOIRE (3 questions minimum):
   CODE EXACT À UTILISER:
   <section style="padding: 3rem 1rem; background: hsl(${surfaceColor});">
     <h2 style="text-align: center; font-size: 1.75rem; margin-bottom: 2rem; color: hsl(${textColor});">Questions Fréquentes</h2>
     <div style="max-width: 800px; margin: 0 auto;">
       <div class="faq-item" onclick="this.classList.toggle('open')" style="margin-bottom: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid hsl(${primaryColor} / 0.2);">
         <div style="padding: 1rem; background: hsl(${bgColor}); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: 600; color: hsl(${textColor});">Comment entretenir ce produit ?</span>
           <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
         </div>
         <div class="faq-answer" style="padding: 1rem; background: hsl(${bgColor}); border-top: 1px solid hsl(${primaryColor} / 0.1); color: hsl(${textColor});">
           Réponse détaillée avec conseils d'entretien spécifiques au produit...
         </div>
       </div>
       <div class="faq-item" onclick="this.classList.toggle('open')" style="margin-bottom: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid hsl(${primaryColor} / 0.2);">
         <div style="padding: 1rem; background: hsl(${bgColor}); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: 600; color: hsl(${textColor});">Quels sont les délais de livraison ?</span>
           <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
         </div>
         <div class="faq-answer" style="padding: 1rem; background: hsl(${bgColor}); border-top: 1px solid hsl(${primaryColor} / 0.1); color: hsl(${textColor});">
           Informations sur la livraison...
         </div>
       </div>
       <div class="faq-item" onclick="this.classList.toggle('open')" style="margin-bottom: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid hsl(${primaryColor} / 0.2);">
         <div style="padding: 1rem; background: hsl(${bgColor}); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: 600; color: hsl(${textColor});">Quelle garantie est incluse ?</span>
           <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
         </div>
         <div class="faq-answer" style="padding: 1rem; background: hsl(${bgColor}); border-top: 1px solid hsl(${primaryColor} / 0.1); color: hsl(${textColor});">
           Détails sur la garantie...
         </div>
       </div>
     </div>
   </section>
   <style>.faq-item .faq-answer { display: none; } .faq-item.open .faq-answer { display: block; } .faq-icon { transition: transform 0.3s; } .faq-item.open .faq-icon { transform: rotate(180deg); }</style>

INTERDIT: Emoji, placeholders, boutons d'achat, menu/footer

Génère le HTML complet avec FAQ COMPLÈTE et couleurs HSL exactes.`;

    // Call OpenRouter AI with Qwen 2.5 14B (fast, cheap, great for HTML/SEO)
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://newai.sale",
        "X-Title": "NewAI Landing Generator",
      },
      body: JSON.stringify({
        model: "qwen/qwen-2.5-14b-instruct",
        messages: [
          {
            role: "system",
            content: language === "en"
              ? "You are a fast HTML generator for product landing pages. Generate clean, modern HTML. Be concise."
              : "Tu es un générateur HTML rapide pour landing pages produit. Génère du HTML propre et moderne. Sois concis.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 8000,
        temperature: 0.3,
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
