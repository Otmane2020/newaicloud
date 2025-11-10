import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/```(?:html|json)?/gi, "")
    .replace(/<\/?(html|head|body|!DOCTYPE)[^>]*>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/g, "")
    .replace(/\shref\s*=\s*["']\s*javascript:[^"']*["']/gi, ' href="#"')
    .replace(/<\/?(iframe|object|embed|applet|frame|frameset)[^>]*>/gi, "")
    .trim();
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
      mainColor = "#3B82F6",
      layout = "classique",
      length = "moyenne",
      customHighlights,
      language = "fr",
    } = body ?? {};

    if (!productTitle) {
      return new Response(JSON.stringify({ error: "Product title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // 🎯 PROMPT AMÉLIORÉ MAIS SIMPLE
    const prompt =
      language === "fr"
        ? `
CRÉE une landing page HTML pour: "${productTitle}"

CONTEXTE PRODUIT:
${description ? `Description: ${description}` : ""}
${vendor ? `Marque: ${vendor}` : ""}

STYLE: ${style}
COULEUR PRINCIPALE: ${mainColor}
DISPOSITION: ${layout}

EXIGENCES:
- HTML valide avec Tailwind CSS
- Design mobile-first responsive
- Structure: Hero section + caractéristiques + appel à l'action
- Utilise la couleur ${mainColor} pour les boutons et accents
- Texte ${length === "courte" ? "concis" : length === "longue" ? "détaillé" : "équilibré"}

GÉNÈRE UNIQUEMENT LE CODE HTML SANS COMMENTAIRES:
`
        : `
CREATE an HTML landing page for: "${productTitle}"

PRODUCT CONTEXT:
${description ? `Description: ${description}` : ""}
${vendor ? `Brand: ${vendor}` : ""}

STYLE: ${style}
PRIMARY COLOR: ${mainColor}
LAYOUT: ${layout}

REQUIREMENTS:
- Valid HTML with Tailwind CSS
- Mobile-first responsive design
- Structure: Hero section + features + call to action
- Use color ${mainColor} for buttons and accents
- ${length === "short" ? "Concise" : length === "long" ? "Detailed" : "Balanced"} text

GENERATE ONLY HTML CODE WITHOUT COMMENTS:
`;

    console.log("🤖 Calling AI with corrected model...");

    // 🔄 LOGIQUE DE RETRY
    const MAX_RETRIES = 2;
    let html = "";
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${MAX_RETRIES}`);

        const aiController = new AbortController();
        const aiTimeout = setTimeout(() => aiController.abort(), 25000);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // ✅ MODÈLES CORRECTS POUR LOVABLE
            model: "google/gemini-2.0-flash", // Modèle garanti disponible
            // model: "anthropic/claude-3.5-sonnet", // Alternative
            messages: [
              {
                role: "system",
                content:
                  language === "fr"
                    ? "Tu es un développeur frontend expert. Tu génères du HTML/CSS valide avec Tailwind. Structure mobile-first. Pas de commentaires dans le code."
                    : "You are an expert frontend developer. You generate valid HTML/CSS with Tailwind. Mobile-first structure. No comments in the code.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 3000,
            temperature: 0.4,
          }),
          signal: aiController.signal,
        });

        clearTimeout(aiTimeout);

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API Error (attempt ${attempt}):`, errorText);

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        html = data.choices?.[0]?.message?.content?.trim() || "";

        if (html && html.length > 100) {
          console.log("✅ HTML generated successfully");
          break;
        } else if (attempt < MAX_RETRIES) {
          console.log("⚠️ Empty response, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      }
    }

    // 🆘 FALLBACK SI TOUT ÉCHOUE
    if (!html || html.length < 100) {
      console.log("🔄 Using fallback template");
      html = `
<!DOCTYPE html>
<html lang="${language === "fr" ? "fr" : "en"}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .theme-bg { background-color: ${mainColor}; }
        .theme-text { color: ${mainColor}; }
        .theme-border { border-color: ${mainColor}; }
    </style>
</head>
<body class="bg-white">
    <section class="min-h-screen flex items-center justify-center px-4 py-12">
        <div class="max-w-4xl mx-auto text-center">
            <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">${productTitle}</h1>
            ${description ? `<p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">${description}</p>` : ""}
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="w-12 h-12 theme-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-white font-bold">✓</span>
                    </div>
                    <h3 class="font-semibold text-lg mb-2">${language === "fr" ? "Haute Qualité" : "High Quality"}</h3>
                    <p class="text-gray-600">${language === "fr" ? "Matériaux premium et durables" : "Premium and durable materials"}</p>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="w-12 h-12 theme-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-white font-bold">⚡</span>
                    </div>
                    <h3 class="font-semibold text-lg mb-2">${language === "fr" ? "Design Moderne" : "Modern Design"}</h3>
                    <p class="text-gray-600">${language === "fr" ? "Style contemporain et élégant" : "Contemporary and elegant style"}</p>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="w-12 h-12 theme-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-white font-bold">♥</span>
                    </div>
                    <h3 class="font-semibold text-lg mb-2">${language === "fr" ? "Facile à Utiliser" : "Easy to Use"}</h3>
                    <p class="text-gray-600">${language === "fr" ? "Installation et utilisation simples" : "Simple installation and use"}</p>
                </div>
            </div>
            
            <button class="theme-bg text-white px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition">
                ${language === "fr" ? "Découvrir le Produit" : "Discover Product"}
            </button>
        </div>
    </section>
</body>
</html>`.trim();
    } else {
      // Nettoyer le HTML généré
      html = sanitizeHtml(html);
    }

    // 💾 SAUVEGARDE (optionnelle)
    if (userId && product_id) {
      try {
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
          config: { style, mainColor, layout, language },
          version: newVersion,
          is_active: true,
        });

        console.log("💾 Saved version", newVersion);
      } catch (saveError) {
        console.error("❌ Save error (non-blocking):", saveError);
      }
    }

    return new Response(
      JSON.stringify({
        html,
        success: true,
        length: html.length,
        used_fallback: html.includes("min-h-screen flex items-center justify-center"),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 FINAL ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
