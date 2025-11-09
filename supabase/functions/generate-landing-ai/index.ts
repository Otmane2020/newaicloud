import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeHtmlUnsafe(html: string): string {
  if (!html) return "";
  return html
    .replace(/^\s*```(?:html)?/gi, "")
    .replace(/```\s*$/g, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, ' href="#"')
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();
}

function ensureResponsiveWrapper(html: string): string {
  if (!html) return "";
  if (!html.includes("max-w-7xl")) {
    html = `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">${html}</div>`;
  }
  if (!html.includes("viewport")) {
    html = `<meta name="viewport" content="width=device-width, initial-scale=1.0">${html}`;
  }
  return html;
}

function buildEnrichedSummary(p: any, language = "fr") {
  if (!p) return "";
  const lines: string[] = [];

  if (p.ai_color) lines.push(`${language === "en" ? "Color" : "Couleur"}: ${p.ai_color}`);
  if (p.ai_material) lines.push(`${language === "en" ? "Material" : "Matériau"}: ${p.ai_material}`);
  if (p.ai_finish) lines.push(`${language === "en" ? "Finish" : "Finition"}: ${p.ai_finish}`);

  const dims = [];
  if (p.smart_length) dims.push(`L: ${p.smart_length}${p.smart_length_unit || "cm"}`);
  if (p.smart_width) dims.push(`l: ${p.smart_width}${p.smart_width_unit || "cm"}`);
  if (p.smart_height) dims.push(`H: ${p.smart_height}${p.smart_height_unit || "cm"}`);
  if (dims.length) lines.push(`${language === "en" ? "Dimensions" : "Dimensions"}: ${dims.join(" × ")}`);

  if (p.smart_weight)
    lines.push(`${language === "en" ? "Weight" : "Poids"}: ${p.smart_weight}${p.smart_weight_unit || "kg"}`);

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    let userId: string | null = null;
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) userId = data.user.id;
    }

    const body = await req.json();
    const {
      product_id,
      productTitle,
      imageUrl,
      description,
      vendor,
      style,
      mainColor = "#3B82F6",
      layout,
      length,
      customHighlights,
      language = "fr",
    } = body ?? {};

    if (!product_id || !productTitle)
      return new Response(JSON.stringify({ error: "Missing product_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    // 1️⃣ Enrichissement du produit
    try {
      await supabase.functions.invoke("enrich-product", { body: { productId: product_id } });
    } catch (_) {
      console.log("⚠️ Enrichment skipped (timeout or not needed)");
    }

    // 2️⃣ Récupération produit enrichi + boutique
    const [prodRes, storeRes] = await Promise.all([
      supabase.from("shopify_products").select("*").eq("id", product_id).maybeSingle(),
      userId
        ? supabase.from("shopify_connections").select("shop_domain").eq("seller_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const product = prodRes.data || {};
    const shopDomain = storeRes.data?.shop_domain || "";
    const productUrl = shopDomain && product.handle ? `https://${shopDomain}/products/${product.handle}` : "#";

    const enrichedSummary = buildEnrichedSummary(product, language);

    // 3️⃣ Prompt premium
    const prompt =
      language === "en"
        ? `
You are a Shopify designer. Create a responsive, premium Tailwind HTML landing page.
Product: ${productTitle}
${vendor ? `Brand: ${vendor}` : ""}
${description ? `Description: ${description}` : ""}
${enrichedSummary ? `\nDetected attributes:\n${enrichedSummary}` : ""}
Style: ${style || "modern"}
Main color: ${mainColor}
Highlights:
${customHighlights || "- High quality\n- Fast delivery\n- 2 years warranty"}

STRUCTURE:
1. Hero section (title, image, “Buy now” button)
2. Key benefits (3–4 cards)
3. Technical specs (use detected attributes if available)
4. Reviews (3 realistic)
5. FAQ
6. Final CTA with “Buy Now” using real Shopify cart add script.

💡 CTA EXAMPLE:
<button onclick="addToCart()" class="w-full sm:w-auto px-8 py-4 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 transition-all duration-300" style="background-color:${mainColor}">
  Buy Now - ${productTitle}
</button>

<script>
function addToCart(){
 fetch('/cart/add.js', {
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({items:[{id:${product.shopify_variant_id || 0},quantity:1}]})
 }).then(()=>window.location.href='/cart');
}
</script>

Return only clean HTML (Tailwind-based).
`
        : `
Tu es un designer Shopify expert. Crée une page produit responsive et premium en HTML Tailwind.
Produit : ${productTitle}
${vendor ? `Marque : ${vendor}` : ""}
${description ? `Description : ${description}` : ""}
${enrichedSummary ? `\nCaractéristiques détectées :\n${enrichedSummary}` : ""}
Style : ${style || "moderne"}
Couleur principale : ${mainColor}
Points forts :
${customHighlights || "- Qualité supérieure\n- Livraison rapide\n- Garantie 2 ans"}

STRUCTURE :
1️⃣ Section Hero (titre, image, bouton “Acheter maintenant”)
2️⃣ Points forts (3 à 4 cartes)
3️⃣ Caractéristiques techniques (affiche dimensions / matériaux si disponibles)
4️⃣ Avis clients (3 exemples réalistes)
5️⃣ FAQ
6️⃣ CTA final avec bouton “Acheter maintenant” fonctionnel (AJAX add to cart).

💡 EXEMPLE BOUTON :
<button onclick="addToCart()" class="w-full sm:w-auto px-8 py-4 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 transition-all duration-300" style="background-color:${mainColor}">
  Acheter maintenant - ${productTitle}
</button>

<script>
function addToCart(){
 fetch('/cart/add.js',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({items:[{id:${product.shopify_variant_id || 0},quantity:1}]})
 }).then(()=>window.location.href='/cart');
}
</script>

Retourne UNIQUEMENT le HTML propre.
`;

    // 4️⃣ Appel IA Lovable
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content:
              language === "en"
                ? "You are a Shopify landing page generator using TailwindCSS. Focus on conversion and responsive layout."
                : "Tu es un générateur de pages Shopify utilisant TailwindCSS, optimisé pour la conversion et le mobile.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4500,
      }),
    });

    if (!aiRes.ok) {
      const msg = await aiRes.text();
      return new Response(JSON.stringify({ error: msg }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    let html = data?.choices?.[0]?.message?.content?.trim() || "";
    html = sanitizeHtmlUnsafe(html);
    html = ensureResponsiveWrapper(html);

    if (!html || html.length < 400) {
      return new Response(JSON.stringify({ error: "Generated HTML too short." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5️⃣ Sauvegarde historique
    if (userId) {
      await supabase.from("product_landing_pages").insert({
        product_id,
        seller_id: userId,
        html_content: html,
        is_active: true,
        config: { language, style, layout, mainColor, customHighlights },
      });
    }

    console.log("✅ Landing generated successfully");
    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
