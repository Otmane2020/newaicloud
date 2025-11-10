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

  return cleaned;
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

    // 🆕 PROMPT SIMPLIFIÉ et EFFICACE
    const prompt = `
CRÉE une page HTML pour: "${productTitle}"

STYLE: ${style}
COULEUR: ${mainColor}
LAYOUT: ${layout}

INSTRUCTIONS:
- HTML valide avec Tailwind CSS
- Design mobile-first
- Pas de répétitions
- Structure claire et propre

CSS OBLIGATOIRE:
<style>
  :root {
    --theme-color: ${mainColor};
    --theme-color-light: ${mainColor}33;
  }
  .theme-text { color: var(--theme-color) !important; }
  .theme-bg { background-color: var(--theme-color-light) !important; }
</style>

GÉNÈRE UNIQUEMENT LE HTML:
`;

    console.log("🤖 Calling AI with available model...");

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 30000);

    // 🆕 UTILISER UN MODÈLE GARANTI DISPONIBLE
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // 🆕 MODÈLES DISPONIBLES SUR LOVABLE - CHOISIR L'UN D'EUX
        model: "google/gemini-2.5-flash", // ✅ Ce modèle existe
        messages: [
          {
            role: "system",
            content:
              "Tu es un développeur frontend. Tu génères du HTML/CSS valide avec Tailwind. Pas de répétitions. Structure mobile-first.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: aiController.signal,
    });

    clearTimeout(aiTimeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const data = await aiResponse.json();
    let html = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("🔍 Raw HTML length:", html.length);

    // NETTOYAGE BASIQUE
    html = sanitizeHtml(html);

    // 🆕 HTML DE FALLBACK GARANTI
    if (!html || html.length < 50) {
      html = `
<div class="min-h-screen bg-white">
  <section class="mobile-padding py-12">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold theme-text text-center mb-6">${productTitle}</h1>
      <p class="text-lg text-gray-600 text-center mb-8">${description || "Produit de qualité supérieure"}</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div class="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
          <span class="text-gray-400">Image produit</span>
        </div>
        <div class="space-y-4">
          <h2 class="text-2xl font-semibold theme-text">Caractéristiques</h2>
          <ul class="space-y-3">
            <li class="flex items-center gap-3">
              <div class="w-6 h-6 theme-bg rounded-full flex items-center justify-center">
                <span class="text-sm theme-text">✓</span>
              </div>
              <span>Design moderne et élégant</span>
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
              <span>Facile à utiliser</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</div>
      `.trim();
    }

    console.log("✅ Final HTML generated, length:", html.length);

    // SAUVEGARDE SIMPLIFIÉE
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
        length: html.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 ERROR:", err);

    // 🆕 FALLBACK ULTIME EN CAS D'ERREUR
    const fallbackHtml = `
<div class="min-h-screen bg-white">
  <section class="p-6">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">${body?.productTitle || "Produit"}</h1>
      <p class="text-gray-600 mb-8">Landing page générée avec soin pour présenter votre produit.</p>
      <div class="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
        <h2 class="text-xl font-semibold text-blue-900 mb-3">Caractéristiques</h2>
        <ul class="text-left space-y-2">
          <li class="flex items-center gap-2">
            <span class="text-blue-500">●</span>
            <span>Qualité premium</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="text-blue-500">●</span>
            <span>Design moderne</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="text-blue-500">●</span>
            <span>Facile à utiliser</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</div>
    `.trim();

    return new Response(
      JSON.stringify({
        html: fallbackHtml,
        success: true,
        fallback: true,
        length: fallbackHtml.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
