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
// Detect Language (from store locale or product content)
//------------------------------------------------------------
async function detectLanguage(userId: string, productTitle?: string): Promise<string> {
  let lang = "fr";

  // 1. Try store locale
  const { data: store } = await supabase
    .from("shopify_connections")
    .select("store_url, primary_locale")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (store?.primary_locale) {
    const detected = store.primary_locale.split("-")[0].toLowerCase();
    if (["fr", "en", "es", "de", "it"].includes(detected)) {
      console.log(`[LANG] Detected from locale: ${detected}`);
      return detected;
    }
  }

  // 2. Try domain extension
  if (store?.store_url) {
    const url = store.store_url.toLowerCase();
    if (url.endsWith(".fr")) return "fr";
    if (url.endsWith(".es")) return "es";
    if (url.endsWith(".de")) return "de";
    if (url.endsWith(".it")) return "it";
    if (url.endsWith(".com") || url.endsWith(".co.uk")) return "en";
  }

  // 3. Try to detect from product title (basic heuristic)
  if (productTitle) {
    const title = productTitle.toLowerCase();
    // French indicators
    if (title.match(/\b(le|la|les|de|du|des|un|une)\b/)) lang = "fr";
    // English indicators
    else if (title.match(/\b(the|and|for|with|of)\b/)) lang = "en";
    // Spanish indicators
    else if (title.match(/\b(el|la|los|las|de|del|un|una)\b/)) lang = "es";
  }

  console.log(`[LANG] Final detected language: ${lang}`);
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
// Get language-specific prompts
//------------------------------------------------------------
function getPromptByLanguage(lang: string) {
  const prompts: Record<string, { intro: string; rules: string }> = {
    fr: {
      intro: "Tu es un rédacteur SEO expert e-commerce. Génère un article PRODUIT complet en HTML pur pour Shopify Blog.",
      rules: `RÈGLES CRITIQUES:
- Retourne UNIQUEMENT le HTML (pas de balises html, head, body)
- Français parfait, naturel, sans fautes
- Intègre les mots-clés naturellement
- Liens produits cliquables
- Structure H1 > H2 > H3 respectée`
    },
    en: {
      intro: "You are an expert SEO e-commerce writer. Generate a complete PRODUCT article in pure HTML for Shopify Blog.",
      rules: `CRITICAL RULES:
- Return ONLY HTML (no html, head, body tags)
- Perfect, natural English without errors
- Integrate keywords naturally
- Clickable product links
- Follow H1 > H2 > H3 structure`
    },
    es: {
      intro: "Eres un redactor SEO experto en comercio electrónico. Genera un artículo PRODUCTO completo en HTML puro para Shopify Blog.",
      rules: `REGLAS CRÍTICAS:
- Devuelve SOLO HTML (sin etiquetas html, head, body)
- Español perfecto, natural, sin errores
- Integra palabras clave naturalmente
- Enlaces de productos clicables
- Sigue estructura H1 > H2 > H3`
    },
    de: {
      intro: "Sie sind ein SEO-E-Commerce-Experte. Erstellen Sie einen vollständigen PRODUKT-Artikel in reinem HTML für Shopify Blog.",
      rules: `KRITISCHE REGELN:
- Nur HTML zurückgeben (keine html, head, body Tags)
- Perfektes, natürliches Deutsch ohne Fehler
- Keywords natürlich integrieren
- Anklickbare Produktlinks
- H1 > H2 > H3 Struktur befolgen`
    },
    it: {
      intro: "Sei un esperto scrittore SEO e-commerce. Genera un articolo PRODOTTO completo in HTML puro per Shopify Blog.",
      rules: `REGOLE CRITICHE:
- Restituisci SOLO HTML (nessun tag html, head, body)
- Italiano perfetto, naturale, senza errori
- Integra le parole chiave naturalmente
- Link prodotti cliccabili
- Segui struttura H1 > H2 > H3`
    }
  };
  return prompts[lang] || prompts.fr;
}

//------------------------------------------------------------
// Generate Article (DeepSeek with Timeout)
//------------------------------------------------------------
async function generateArticleHTML(
  products: any[],
  lang: string,
  keywords: string[],
  length: string,
  storeUrl: string,
) {
  const product = products[0];
  const langPrompt = getPromptByLanguage(lang);

  const prompt = `${langPrompt.intro}

LANGUAGE: ${lang.toUpperCase()}
LENGTH: Minimum ${length} words
KEYWORDS: ${keywords.join(", ")}

PRODUCT:
- Title: ${product.title}
- Price: ${product.price}€
- Type: ${product.product_type}
- Brand: ${product.vendor}

REQUIRED STRUCTURE (follow exact order):

<h1>SEO-optimized title with main keyword</h1>

<div class="intro">
<p>Introduction 150-200 words explaining the product and its benefits.</p>
</div>

<h2>Product Presentation: ${product.title}</h2>

<h3>Detailed Description</h3>
<p>Complete paragraph describing the product, its features, its use.</p>

<h3>Photo Gallery</h3>
<div class="product-gallery" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 2rem 0;">
${products.slice(0, 4).map((p) => `  <img src="${p.full_image_url || p.image_url}" alt="${p.title}" style="width: 100%; border-radius: 8px;">`).join('\n')}
</div>

<h3>Product Sheet</h3>
<div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
<p><strong>Price:</strong> ${product.price}€</p>
<p><strong>Type:</strong> ${product.product_type}</p>
<p><strong>Brand:</strong> ${product.vendor}</p>
<a href="${products[0].product_url}" style="display: inline-block; background: #1e40af; color: white; padding: 0.75rem 2rem; border-radius: 6px; text-decoration: none; margin-top: 1rem;">View Product</a>
</div>

<h2>Technical Specifications</h2>
<table style="width: 100%; border-collapse: collapse; margin: 2rem 0;">
<tr style="background: #f3f4f6;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Feature</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Detail</th></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Brand</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.vendor}</td></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Type</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.product_type}</td></tr>
<tr><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">Price</td><td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${product.price}€</td></tr>
</table>

<h2>Advantages and Strengths</h2>
<h3>Material Quality</h3>
<p>Paragraph about quality, materials used.</p>

<h3>Design and Aesthetics</h3>
<p>Paragraph about design, style, appearance.</p>

<h3>Why Choose This Product?</h3>
<ul>
<li>First concrete advantage</li>
<li>Second important benefit</li>
<li>Third strong point</li>
</ul>

<h2>FAQ</h2>
<h3>Question 1</h3>
<p>Answer...</p>

INTERNAL LINKS (insert naturally):
- <a href="${storeUrl}/pages/contact">Contact</a>
- <a href="${storeUrl}/pages/shipping">Shipping</a>
- <a href="${storeUrl}/pages/returns">Returns</a>

${langPrompt.rules}
- Minimum ${length} words
- Write in ${lang.toUpperCase()} language matching product language
`;

  console.log(`[DEEPSEEK] Calling API with lang=${lang}, length=${length}`);
  
  // Create timeout promise (55 seconds to stay under 60s function limit)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DeepSeek API timeout after 55s")), 55000)
  );

  // Create fetch promise
  const fetchPromise = fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45,
      max_tokens: 4000, // Increased for longer articles
    }),
  });

  // Race between fetch and timeout
  const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[DEEPSEEK] API Error: ${res.status} - ${errorText}`);
    throw new Error(`DeepSeek API error: ${res.status}`);
  }

  const data = await res.json();
  console.log(`[DEEPSEEK] Response received, tokens: ${data.usage?.total_tokens || 'unknown'}`);
  
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
    // Fetch products first (needed for language detection)
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
    // Detect language from store and product content
    //------------------------------------------------------------
    const lang = await detectLanguage(user_id, products[0]?.title);
    console.log(`[MAIN] Using language: ${lang}`);

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
    // Enrich products with full URLs
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
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[ERROR] ${error.message}`);
    console.error(error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack?.split('\n').slice(0, 3).join('\n')
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
