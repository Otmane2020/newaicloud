//------------------------------------------------------------
// generate-blog-article (DeepSeek + Lovable) — VERSION COMPACTE
//------------------------------------------------------------
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

//------------------------------------------------------------
// ENV
//------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;

//------------------------------------------------------------
// INIT
//------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

//------------------------------------------------------------
// CORS
//------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey",
};

//------------------------------------------------------------
// Detect Language
//------------------------------------------------------------
async function detectLanguage(userId: string) {
  let lang = "fr";

  const { data: store } = await supabase
    .from("shopify_connections")
    .select("store_url, primary_locale")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (store?.primary_locale) {
    const detected = store.primary_locale.split("-")[0];
    if (["fr", "en", "es", "de", "it"].includes(detected)) return detected;
  }

  if (store?.store_url) {
    const url = store.store_url.toLowerCase();
    if (url.endsWith(".fr")) return "fr";
    if (url.endsWith(".es")) return "es";
    if (url.endsWith(".de")) return "de";
    if (url.endsWith(".it")) return "it";
    return "en";
  }

  return lang;
}
//------------------------------------------------------------
// Generate Featured Image (Lovable)
//------------------------------------------------------------
async function generateFeaturedImage(productTitle: string, baseImage?: string) {
  try {
    const prompt = `
High-end professional product photo.
Clean studio lighting, soft reflections, premium aesthetic.
Product: ${productTitle}
Reference image (if any): ${baseImage || "none"}
`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cosmos_image_v1",
        prompt,
        size: "1024x1024",
      }),
    });

    const json = await res.json();
    return json?.data?.[0]?.url || baseImage || null;
  } catch {
    return baseImage || null;
  }
}

//------------------------------------------------------------
// Generate Article (DeepSeek)
//------------------------------------------------------------
async function generateArticleHTML(
  products: any[],
  lang: string,
  keywords: string[],
  length: string,
  storeUrl: string,
) {
  const product = products[0];

  const prompt = `Tu es un rédacteur SEO expert e-commerce. Génère un article PRODUIT complet en HTML pur pour Shopify Blog.

LANGUE: Français (${lang})
LONGUEUR: ${length} mots minimum
MOTS-CLÉS: ${keywords.join(", ")}

PRODUIT:
- Titre: ${product.title}
- Prix: ${product.price}€
- Type: ${product.product_type}
- Marque: ${product.vendor}

STRUCTURE OBLIGATOIRE (respecte l'ordre exact):

<h1>Titre SEO optimisé avec mot-clé principal</h1>

<div class="intro">
<p>Introduction 150-200 mots expliquant le produit et ses bénéfices.</p>
</div>

<h2>Présentation du Produit ${product.title}</h2>

<h3>Description Détaillée</h3>
<p>Paragraphe complet décrivant le produit, ses caractéristiques, son usage.</p>

<h3>Galerie Photos</h3>
<div class="product-gallery" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 2rem 0;">
${products.slice(0, 4).map((p) => `  <img src="${p.full_image_url || p.image_url}" alt="${p.title}" style="width: 100%; border-radius: 8px;">`).join('\n')}
</div>

<h3>Fiche Produit</h3>
<div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
<p><strong>Prix:</strong> ${product.price}€</p>
<p><strong>Type:</strong> ${product.product_type}</p>
<p><strong>Marque:</strong> ${product.vendor}</p>
<a href="${products[0].product_url}" style="display: inline-block; background: #1e40af; color: white; padding: 0.75rem 2rem; border-radius: 6px; text-decoration: none; margin-top: 1rem;">Voir le Produit</a>
</div>

<h2>Caractéristiques Techniques</h2>
<table style="width: 100%; border-collapse: collapse; margin: 2rem 0;">
<tr style="background: #f3f4f6;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Caractéristique</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Détail</th></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Marque</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.vendor}</td></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Type</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.product_type}</td></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Prix</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.price}€</td></tr>
</table>

<h2>Avantages et Points Forts</h2>
<h3>Qualité des Matériaux</h3>
<p>Paragraphe sur la qualité, les matériaux utilisés.</p>

<h3>Design et Esthétique</h3>
<p>Paragraphe sur le design, le style, l'apparence.</p>

<h3>Pourquoi Choisir Ce Produit?</h3>
<ul>
<li>Premier avantage concret</li>
<li>Deuxième avantage important</li>
<li>Troisième point fort</li>
</ul>

<h2>Idées d'Utilisation et Décoration</h2>
<h3>Style Moderne et Minimaliste</h3>
<p>Comment intégrer le produit dans un décor moderne.</p>

<h3>Style Industriel</h3>
<p>Comment l'utiliser dans un style industriel.</p>

<h3>Style Classique</h3>
<p>Comment l'intégrer dans un intérieur classique.</p>

<h2>Produits Similaires</h2>
<p>Découvrez aussi nos autres produits dans la catégorie <a href="${storeUrl}/collections/${product.product_type || 'all'}" style="color: #1e40af; text-decoration: underline;">${product.product_type}</a>.</p>

<h2>Avis Clients</h2>
<div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
<p><strong>⭐⭐⭐⭐⭐ Sophie M.</strong></p>
<p>"Excellent produit, très satisfaite de mon achat!"</p>
</div>

<h2>Liens Utiles</h2>
<ul>
<li><a href="${storeUrl}/pages/contact" style="color: #1e40af;">Contactez-nous</a></li>
<li><a href="${storeUrl}/pages/shipping" style="color: #1e40af;">Livraison</a></li>
<li><a href="${storeUrl}/pages/returns" style="color: #1e40af;">Retours</a></li>
</ul>

<h2>FAQ</h2>
<h3>Quelle est la livraison?</h3>
<p>Réponse sur la livraison.</p>

<h3>Comment entretenir ce produit?</h3>
<p>Conseils d'entretien.</p>

<h2>Conclusion</h2>
<p>Résumé des points clés et rappel des avantages. Invitation à l'achat.</p>
<div style="text-align: center; margin: 2rem 0;">
<a href="${products[0].product_url}" style="display: inline-block; background: #1e40af; color: white; padding: 1rem 3rem; border-radius: 6px; text-decoration: none; font-size: 1.125rem; font-weight: 600;">Acheter Maintenant</a>
</div>

RÈGLES CRITIQUES:
- Retourne UNIQUEMENT le HTML (pas de balises html, head, body)
- Français parfait, naturel, sans fautes
- Intègre les mots-clés naturellement
- Minimum ${length} mots
- Liens produits cliquables avec ${products[0].product_url}
- Structure H1 > H2 > H3 respectée
`;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45,
      max_tokens: 2000,
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
//------------------------------------------------------------
// MAIN SERVE
//------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, productIds = [], keywords = [], articleLength = "1600" } = body;

    if (!user_id) throw new Error("Missing user_id");

    //------------------------------------------------------------
    // Detect language
    //------------------------------------------------------------
    const lang = await detectLanguage(user_id);

    //------------------------------------------------------------
    // Fetch store
    //------------------------------------------------------------
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("store_url, id")
      .eq("user_id", user_id)
      .maybeSingle();

    const storeUrl = store?.store_url || "";
    const storeId = store?.id || null;

    //------------------------------------------------------------
    // Fetch products
    //------------------------------------------------------------
    let { data: products } = await supabase
      .from("shopify_products")
      .select("*")
      .in("id", productIds)
      .eq("seller_id", user_id);

    if (!products?.length) {
      const fallback = await supabase.from("shopify_products").select("*").eq("seller_id", user_id).limit(5);
      products = fallback.data || [];
    }

    if (!products.length) throw new Error("No products found");

    //------------------------------------------------------------
    // Enrich products
    //------------------------------------------------------------
    products = products.map((p) => ({
      ...p,
      full_image_url: p.image_url,
      product_url: `${storeUrl}/products/${p.handle}`,
    }));
    //------------------------------------------------------------
    // Featured image (Lovable)
    //------------------------------------------------------------
    const featuredImage = await generateFeaturedImage(products[0].title, products[0].image_url);

    //------------------------------------------------------------
    // Generate article HTML (DeepSeek)
    //------------------------------------------------------------
    let html = await generateArticleHTML(products, lang, keywords, articleLength, storeUrl);

    //------------------------------------------------------------
    // Clean HTML
    //------------------------------------------------------------
    html = html.replace(/```html|```/g, "").trim();

    if (html.length > 50000) {
      html = html.substring(0, 50000);
    }

    //------------------------------------------------------------
    // Save in DB
    //------------------------------------------------------------
    const { data: saved, error } = await supabase
      .from("blog_articles")
      .insert({
        user_id,
        store_id: storeId,
        title: products[0].title.substring(0, 200),
        content: html,
        featured_image: featuredImage,
        keywords: keywords.slice(0, 3),
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    //------------------------------------------------------------
    // Response
    //------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        article_id: saved.id,
        article: saved,
        featured_image: featuredImage,
      }),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
