import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🆕 Fonction de nettoyage HTML robuste
function sanitizeHtml(html: string): string {
  if (!html) return "";

  let cleaned = html
    // Supprimer les blocs de code markdown
    .replace(/```(?:html|json)?/gi, "")
    // Supprimer les balises HTML/HEAD/BODY non désirées
    .replace(/<\/?(html|head|body|!DOCTYPE)[^>]*>/gi, "")
    // Nettoyer les balises script et style
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Supprimer les événements JavaScript
    .replace(/\son\w+\s*=\s*["'][^"']*["']/g, "")
    // Nettoyer les URLs JavaScript
    .replace(/\shref\s*=\s*["']\s*javascript:[^"']*["']/gi, ' href="#"')
    // Supprimer les balises dangereuses
    .replace(/<\/?(iframe|object|embed|applet|frame|frameset)[^>]*>/gi, "")
    // Normaliser les espaces
    .replace(/\s+/g, " ")
    .trim();

  // 🆕 Correction spécifique des répétitions
  const titleMatch = cleaned.match(/(Meuble à Chaussures en Chêne Artisanal[^<]*)/);
  if (titleMatch) {
    const duplicatePattern = new RegExp(titleMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ".*?Decora Home", "g");
    const matches = cleaned.match(duplicatePattern);
    if (matches && matches.length > 1) {
      // Garder seulement la première occurrence
      cleaned = cleaned.replace(duplicatePattern, (match, offset) => {
        return offset === 0 ? match : "";
      });
      // Nettoyer les espaces multiples créés par la suppression
      cleaned = cleaned.replace(/\s+/g, " ").replace(/(>)\s+(<)/g, "$1$2");
    }
  }

  return cleaned;
}

// 🆕 Fonction pour valider et corriger la structure HTML
function validateHtmlStructure(html: string): string {
  if (!html.includes("<div") && !html.includes("<section")) {
    // Si pas de structure HTML valide, wrapper dans une div
    return `<div class="product-landing-page">${html}</div>`;
  }

  // S'assurer que le HTML a une structure de base
  if (!html.includes("class=")) {
    html = html.replace(/<div/g, '<div class="product-section"');
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

    // 🆕 PROMPT CORRIGÉ avec instructions strictes
    const prompt = `
Tu es un expert en création de landing pages Shopify. Crée UNIQUEMENT du HTML propre avec Tailwind CSS.

🎯 EXIGENCES STRICTES:
- UNIQUEMENT du HTML valide avec classes Tailwind
- AUCUNE répétition de contenu
- Structure SEMANTIQUE correcte
- Design MOBILE-FIRST (grid-cols-1, puis sm:, lg:)
- MAXIMUM 1200 mots au total

🚫 INTERDICTIONS ABSOLUES:
- PAS de répétition du titre produit
- PAS de contenu dupliqué
- PAS de balises HTML/HEAD/BODY
- PAS de JavaScript
- PAS de markdown dans la sortie

🎨 CONFIGURATION:
- Style: ${style}
- Couleur: ${mainColor}
- Layout: ${layout}
- Longueur: ${length}
- Marque: ${vendor || "Decora Home"}
- Mobile-first: ${mobileFirst}

📦 PRODUIT:
Titre: ${productTitle}
Description: ${description}

${customHighlights ? `✨ POINTS FORTS:\n${customHighlights}\n` : ""}

🎨 SYSTÈME DE COULEUR:
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
    .mobile-text { font-size: 16px !important; }
    .touch-target { min-height: 44px; }
  }
</style>

📱 STRUCTURE IMPÉRATIVE:
1. HERO SECTION (h1 unique)
2. DESCRIPTION (p concis)
3. CARACTÉRISTIQUES (ul/li)
4. GALLERIE IMAGES
5. SPECIFICATIONS TECHNIQUES
6. APPEL À L'ACTION

✅ EXEMPLE DE STRUCTURE CORRECTE:
<section class="mobile-padding bg-white py-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold theme-text mb-4">${productTitle}</h1>
    <p class="text-gray-600 mobile-text mb-6">Description concise...</p>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <!-- Images -->
    </div>
    
    <div class="bg-gray-50 rounded-lg p-6">
      <h2 class="text-xl font-semibold theme-text mb-4">Caractéristiques</h2>
      <ul class="space-y-2">
        <li class="flex items-center gap-2">✅ Point fort 1</li>
      </ul>
    </div>
  </div>
</section>

Retourne UNIQUEMENT le code HTML, sans commentaires, sans markdown.
`;

    console.log("🤖 Calling AI with strict instructions...");

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 45000);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4", // 🆕 Utiliser GPT-4 pour de meilleurs résultats
        messages: [
          {
            role: "system",
            content:
              "Tu es un développeur frontend expert. Tu génères UNIQUEMENT du HTML/CSS propre, valide et responsive. Tu respectes STRICTEMENT les consignes de structure et évites TOUTE répétition. Tu utilises Tailwind CSS avec une approche mobile-first.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000, // 🆕 Limiter pour éviter les excès
        temperature: 0.3, // 🆕 Réduire la créativité pour plus de cohérence
      }),
      signal: aiController.signal,
    });

    clearTimeout(aiTimeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const data = await aiResponse.json();
    let html = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("🔍 Raw HTML length:", html.length);

    // 🆕 NETTOYAGE RENFORCÉ
    html = sanitizeHtml(html);
    html = validateHtmlStructure(html);

    // 🆕 VALIDATION FINALE
    const validation = {
      hasStructure: html.includes("<div") || html.includes("<section"),
      hasTitle: html.includes(productTitle.substring(0, 20)),
      hasRepeats: (html.match(new RegExp(productTitle.substring(0, 10), "g")) || []).length > 3,
      htmlLength: html.length,
      wordCount: html.split(/\s+/).length,
    };

    console.log("✅ Validation:", validation);

    // 🆕 CORRECTION DES RÉPÉTITIONS SI NÉCESSAIRE
    if (validation.hasRepeats) {
      console.warn("⚠️ Detected repetitions, applying fix...");
      const titleRegex = new RegExp(`(${productTitle.substring(0, 30)}[^<]*)`, "g");
      const matches = html.match(titleRegex);
      if (matches && matches.length > 1) {
        // Garder seulement la première occurrence
        html = html.replace(titleRegex, (match, offset) => {
          return offset === 0 ? match : "";
        });
        // Nettoyer
        html = html.replace(/\s+/g, " ").replace(/(>)\s+(<)/g, "$1$2");
      }
    }

    if (!html || html.length < 200) {
      throw new Error("Generated HTML is too short or empty");
    }

    if (html.length > 20000) {
      console.warn("⚠️ HTML too long, truncating...");
      html = html.substring(0, 20000);
    }

    // 🆕 SAUVEGARDE AVEC VALIDATION
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

    console.log("✅ Generation successful!");
    return new Response(
      JSON.stringify({
        html,
        success: true,
        validation,
        length: html.length,
        wordCount: validation.wordCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 CRITICAL ERROR:", err);
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
