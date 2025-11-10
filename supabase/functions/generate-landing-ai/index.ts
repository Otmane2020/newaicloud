import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🆕 Fonction de nettoyage HTML robuste
function sanitizeHtml(html: string): string {
  if (!html) return "";

  let cleaned = html
    .replace(/```(?:html|json)?/gi, "")
    .replace(/<\/?(html|head|body|!DOCTYPE)[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/g, "")
    .replace(/\shref\s*=\s*["']\s*javascript:[^"']*["']/gi, ' href="#"')
    .replace(/<\/?(iframe|object|embed|applet|frame|frameset)[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Correction des répétitions spécifiques
  const problematicPatterns = [
    /Meuble à Chaussures en Chêne Artisanal.*?Decora Home/g,
    /Meuble à Chaussures en Chêne Artisanal.*?Rangement Pratique et Élégant/g,
  ];

  problematicPatterns.forEach((pattern) => {
    const matches = cleaned.match(pattern);
    if (matches && matches.length > 1) {
      cleaned = cleaned.replace(pattern, (match, offset) => {
        return offset === 0 ? match : "";
      });
    }
  });

  // Nettoyer les espaces multiples
  cleaned = cleaned.replace(/\s+/g, " ").replace(/(>)\s+(<)/g, "$1$2");

  return cleaned;
}

// 🆕 Fonction pour valider et corriger la structure HTML
function validateHtmlStructure(html: string): string {
  if (!html.includes("<div") && !html.includes("<section")) {
    return `<div class="product-landing-page">${html}</div>`;
  }

  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) userId = user.id;
    }

    const body = await req.json();

    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style = "moderne",
      mainColor = "#003366",
      layout = "1 colonne",
      length = "moyenne (800 mots)",
      customHighlights,
      mentionBrand = true,
      vendorSource = "shopify",
      language = "fr",
      mobileFirst = true,
    } = body ?? {};

    console.log("🎯 Starting generation with:", { productTitle, style, mainColor, layout });

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Product title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // 🆕 PROMPT ULTRA-STRICT avec instructions claires
    const prompt = `
CRÉATION DE LANDING PAGE SHOPIFY - INSTRUCTIONS STRICTES

Tu dois créer UNIQUEMENT du HTML propre avec Tailwind CSS pour une landing page produit.

🚫 INTERDICTIONS ABSOLUES:
- PAS de répétition du titre "${productTitle}"
- PAS de contenu dupliqué ou en boucle
- PAS de balises HTML, HEAD, BODY
- PAS de JavaScript
- PAS de markdown dans la sortie
- PAS de "Decora Home" répété
- UNIQUEMENT le contenu demandé

✅ STRUCTURE OBLIGATOIRE:
1. HERO SECTION (un seul H1 avec le titre)
2. DESCRIPTION (texte unique de 2-3 phrases)
3. CARACTÉRISTIQUES (liste à puces, 4-6 points)
4. GALLERIE IMAGES (placeholder)
5. SPÉCIFICATIONS TECHNIQUES
6. APPEL À L'ACTION

🎨 CONFIGURATION:
- Style: ${style} (design épuré et moderne)
- Couleur principale: ${mainColor}
- Layout: ${layout}
- Mobile-first: OUI

📦 PRODUIT:
"${productTitle}"
${description ? `Description: ${description.substring(0, 200)}...` : ""}

${customHighlights ? `✨ POINTS FORTS À INTÉGRER:\n${customHighlights}` : ""}

🎨 CODE CSS OBLIGATOIRE:
<style>
  :root {
    --theme-color: ${mainColor};
    --theme-color-light: ${mainColor}33;
    --theme-color-dark: ${mainColor};
  }
  .theme-text { color: var(--theme-color) !important; }
  .theme-bg { background-color: var(--theme-color-light) !important; }
  .theme-border { border-color: var(--theme-color) !important; }
  
  @media (max-width: 767px) {
    .mobile-padding { padding: 1rem !important; }
    .mobile-text { font-size: 16px !important; line-height: 1.5; }
    .touch-target { min-height: 44px; min-width: 44px; }
  }
</style>

📱 EXEMPLE DE STRUCTURE CORRECTE:
<section class="mobile-padding bg-white py-8">
  <div class="max-w-4xl mx-auto">
    <!-- HERO -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold theme-text mb-4">${productTitle}</h1>
      <p class="text-gray-600 mobile-text">Description concise et unique ici...</p>
    </div>
    
    <!-- CARACTÉRISTIQUES -->
    <div class="bg-gray-50 rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold theme-text mb-4">Caractéristiques</h2>
      <ul class="space-y-3">
        <li class="flex items-center gap-3">
          <div class="w-6 h-6 theme-bg rounded-full flex items-center justify-center">
            <span class="text-sm theme-text">✓</span>
          </div>
          <span>Caractéristique unique 1</span>
        </li>
      </ul>
    </div>
  </div>
</section>

GÉNÈRE UNIQUEMENT LE CODE HTML FINAL SANS COMMENTAIRES.
`;

    console.log("🤖 Calling AI with corrected model...");

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 40000);

    // 🆕 UTILISER UN MODÈLE DISPONIBLE
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // 🆕 MODÈLES DISPONIBLES SUR LOVABLE
        model: "google/gemini-2.5-flash", // ✅ Modèle disponible et performant
        messages: [
          {
            role: "system",
            content:
              "Tu es un développeur frontend expert. Tu génères UNIQUEMENT du HTML/CSS valide et responsive avec Tailwind. Tu respectes STRICTEMENT les consignes et évites TOUTE répétition. Structure mobile-first obligatoire.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2500, // 🆕 Limiter pour éviter les excès
        temperature: 0.2, // 🆕 Très bas pour la cohérence
      }),
      signal: aiController.signal,
    });

    clearTimeout(aiTimeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", await aiResponse.text());
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    let html = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("🔍 Raw HTML received, length:", html.length);

    // 🆕 NETTOYAGE AGGRESSIF
    html = sanitizeHtml(html);
    html = validateHtmlStructure(html);

    // 🆕 VALIDATION RENFORCÉE
    const titleOccurrences = (html.match(new RegExp(productTitle.substring(0, 20), "g")) || []).length;
    const validation = {
      hasStructure: html.includes("<div") || html.includes("<section"),
      hasTitle: html.includes(productTitle.substring(0, 20)),
      titleOccurrences: titleOccurrences,
      hasRepeats: titleOccurrences > 1,
      htmlLength: html.length,
      wordCount: html.split(/\s+/).length,
    };

    console.log("✅ Validation results:", validation);

    // 🆕 CORRECTION ULTIME SI BESOIN
    if (validation.hasRepeats) {
      console.warn("⚠️ Applying repetition fix...");
      // Supprimer les répétitions du titre
      const firstTitleIndex = html.indexOf(productTitle);
      if (firstTitleIndex !== -1) {
        let cleanedHtml = html.substring(0, firstTitleIndex + productTitle.length);
        const remaining = html.substring(firstTitleIndex + productTitle.length);
        // Supprimer les occurrences suivantes du titre
        cleanedHtml += remaining.replace(new RegExp(productTitle, "g"), "");
        html = cleanedHtml;
      }
    }

    // 🆕 GARANTIR UN HTML VALIDE
    if (!html || html.length < 100) {
      // Fallback HTML minimal
      html = `
<section class="mobile-padding bg-white py-8">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold theme-text mb-4">${productTitle}</h1>
      <p class="text-gray-600 mobile-text">${description?.substring(0, 150) || "Produit de qualité supérieure"}</p>
    </div>
    
    <div class="bg-gray-50 rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold theme-text mb-4">Caractéristiques Principales</h2>
      <ul class="space-y-3">
        <li class="flex items-center gap-3">
          <div class="w-6 h-6 theme-bg rounded-full flex items-center justify-center">
            <span class="text-sm theme-text">✓</span>
          </div>
          <span>Design moderne et fonctionnel</span>
        </li>
        <li class="flex items-center gap-3">
          <div class="w-6 h-6 theme-bg rounded-full flex items-center justify-center">
            <span class="text-sm theme-text">✓</span>
          </div>
          <span>Matériaux de haute qualité</span>
        </li>
        <li class="flex items-center gap-3">
          <div class="w-6 h-6 theme-bg rounded-full flex items-center justify-center">
            <span class="text-sm theme-text">✓</span>
          </div>
          <span>Facile à installer et entretenir</span>
        </li>
      </ul>
    </div>
  </div>
</section>
      `.trim();
    }

    // 🆕 LIMITER LA TAILLE
    if (html.length > 15000) {
      console.warn("⚠️ HTML too long, truncating...");
      html = html.substring(0, 15000);
    }

    console.log("✅ Final HTML length:", html.length);

    // SAUVEGARDE
    if (userId && product_id) {
      try {
        await supabaseAdmin
          .from("product_landing_pages")
          .update({ is_active: false })
          .eq("product_id", product_id)
          .eq("seller_id", userId);

        const { data: existingPages } = await supabaseAdmin
          .from("product_landing_pages")
          .select("version")
          .eq("product_id", product_id)
          .order("version", { ascending: false })
          .limit(1);

        const newVersion = existingPages?.[0]?.version + 1 || 1;

        await supabaseAdmin.from("product_landing_pages").insert({
          product_id,
          seller_id: userId,
          html_content: html,
          config: {
            style,
            mainColor,
            layout,
            length,
            vendor,
            mobileFirst,
            validation,
            generated_at: new Date().toISOString(),
          },
          version: newVersion,
          is_active: true,
        });

        console.log("💾 Saved version", newVersion);
      } catch (saveError) {
        console.error("❌ Save error:", saveError);
      }
    }

    return new Response(
      JSON.stringify({
        html,
        success: true,
        validation,
        length: html.length,
        wordCount: html.split(/\s+/).length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Generation failed",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
