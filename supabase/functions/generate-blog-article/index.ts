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

  const prompt = `
LANGUAGE: ${lang.toUpperCase()}
FORMAT: PURE HTML ONLY
WORDS: approx ${length}
KEYWORDS: ${keywords.join(", ")}

Create a full SEO PRODUCT ARTICLE for Shopify Blog.

STRUCTURE REQUIRED:

<h1>Main SEO Title including the main keyword</h1>

<h2>Introduction</h2>
<p>100–150 words…</p>

<h2>Présentation du Produit</h2>
<h3>Description générale</h3>
<p>…</p>

<h3>Galerie Produit</h3>
<div class="gallery">
${products
  .slice(0, 4)
  .map((p) => `<img src="${p.full_image_url || p.image_url}" alt="${p.title}" />`)
  .join("\n")}
</div>

<h3>Caractéristiques Techniques</h3>
<table>
<tr><td>Marque</td><td>${product.vendor}</td></tr>
<tr><td>Type</td><td>${product.product_type}</td></tr>
<tr><td>Prix</td><td>${product.price}€</td></tr>
</table>

<h2>Avantages</h2>
<ul>
<li>Point fort 1</li>
<li>Point fort 2</li>
<li>Point fort 3</li>
</ul>

<h2>Produits Similaires</h2>
${products
  .slice(1, 4)
  .map((p) => `<p><a href="${p.product_url}">${p.title}</a></p>`)
  .join("\n")}

<h2>FAQ</h2>
<ul>
<li>Q1 + réponse</li>
<li>Q2 + réponse</li>
</ul>

<h2>Conclusion</h2>
<p>Résumé + CTA</p>

Return ONLY HTML.`;

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
