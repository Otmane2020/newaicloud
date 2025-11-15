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
  colorScheme: string = "#1E40AF",
) {
  const product = products[0];
  
  // Construct image gallery HTML
  const imageGalleryHTML = products.slice(0, 4)
    .map(p => `  <img src="${p.full_image_url || p.image_url}" alt="${p.title}" class="w-full rounded-lg shadow-lg" />`)
    .join('\n');

  const prompt = `Tu es un expert e-commerce Shopify, rédacteur SEO professionnel et designer UX.
Ta mission : créer un **ARTICLE PRODUIT** complet, en **HTML pur** (sans markdown), prêt à être publié sur Shopify Blog.

🎯 OBJECTIF :
Générer un article haut de gamme, esthétique, commercial, SEO-friendly, contenant :
- H1 / H2 / H3 stricts
- Galerie produit
- Lien vers le produit
- Caractéristiques techniques
- Avantages et mise en situation
- FAQ complète
- Call-to-action forts
- Maillage interne vers les pages Shopify importantes (contact, livraison, retours, about us)
- Style professionnel + classes Tailwind

📌 INFORMATIONS PRODUIT :
- Nom du produit : ${product.title}
- Prix : ${product.price}€
- URL produit : ${product.product_url}
- Images : ${products.length} image(s) disponible(s)
- Catégorie : ${product.product_type || 'Non spécifié'}
- Marque : ${product.vendor || 'Non spécifié'}
- Mots-clés SEO : ${keywords.join(', ')}
- Couleur principale : ${colorScheme}
- Longueur voulue : ${length} mots

📌 INFORMATIONS BOUTIQUE :
- URL boutique : ${storeUrl}
- Pages Shopify internes :
  - Contact : ${storeUrl}/pages/contact
  - Livraison : ${storeUrl}/pages/shipping
  - Retours : ${storeUrl}/pages/returns
  - À propos : ${storeUrl}/pages/about-us

📌 STRUCTURE OBLIGATOIRE :

<h1>[Titre SEO contenant mot-clé principal]</h1>

<div class="intro text-lg leading-relaxed my-6">
Introduction de 120–180 mots, storytelling, contexte d'utilisation, bénéfices majeurs, intégration naturelle des mots-clés.
</div>

<h2>Présentation du Produit</h2>

<h3>Description Générale</h3>
<p>Texte descriptif détaillé et vendeur.</p>

<h3>Galerie Produit</h3>
<div class="gallery grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
${imageGalleryHTML}
</div>

<h3>Fiche d'Achat</h3>
<div class="purchase-card p-6 border rounded-xl my-6" style="border-color: ${colorScheme}">
  <p class="text-4xl font-bold">${product.price}€</p>
  <a href="${product.product_url}" target="_blank" class="inline-block px-6 py-4 rounded-xl text-white font-bold text-xl mt-3" style="background: ${colorScheme}">
    Acheter Maintenant →
  </a>
</div>

<h2>Caractéristiques Techniques</h2>
<table class="w-full border rounded-xl overflow-hidden my-4">
<tr><td class="p-3 font-semibold">Catégorie</td><td class="p-3">${product.product_type || 'Non spécifié'}</td></tr>
<tr><td class="p-3 font-semibold">Marque</td><td class="p-3">${product.vendor || 'Non spécifié'}</td></tr>
<tr><td class="p-3 font-semibold">Prix</td><td class="p-3">${product.price}€</td></tr>
</table>

<h2>Avantages & Points Forts</h2>
<ul class="list-disc pl-6 space-y-2">
  <li>Bénéfice 1 (à détailler)</li>
  <li>Bénéfice 2 (à détailler)</li>
  <li>Bénéfice 3 (à détailler)</li>
  <li>Bénéfice 4 (à détailler)</li>
</ul>

<h2>Intégration dans Votre Intérieur</h2>
<h3>Style Moderne</h3>
<p>Comment intégrer ce produit dans un intérieur moderne...</p>

<h3>Style Scandinave</h3>
<p>Comment intégrer ce produit dans un intérieur scandinave...</p>

<h2>Pages Shopify Importantes</h2>
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
  <a href="${storeUrl}/pages/contact" class="p-4 bg-white shadow rounded-lg text-center hover:shadow-lg transition">
    📞 Contact
  </a>
  <a href="${storeUrl}/pages/shipping" class="p-4 bg-white shadow rounded-lg text-center hover:shadow-lg transition">
    🚚 Livraison
  </a>
  <a href="${storeUrl}/pages/returns" class="p-4 bg-white shadow rounded-lg text-center hover:shadow-lg transition">
    ↩️ Retours
  </a>
  <a href="${storeUrl}/pages/about-us" class="p-4 bg-white shadow rounded-lg text-center hover:shadow-lg transition">
    ℹ️ À propos
  </a>
</div>

<h2>FAQ</h2>
<details class="p-4 bg-gray-50 rounded-xl my-2">
  <summary class="font-semibold cursor-pointer">📦 Quels sont les délais de livraison ?</summary>
  <p class="mt-2">Réponse SEO optimisée.</p>
</details>

<details class="p-4 bg-gray-50 rounded-xl my-2">
  <summary class="font-semibold cursor-pointer">🛡 Quelle garantie offrez-vous ?</summary>
  <p class="mt-2">Réponse claire et rassurante.</p>
</details>

<details class="p-4 bg-gray-50 rounded-xl my-2">
  <summary class="font-semibold cursor-pointer">💳 Quels modes de paiement acceptez-vous ?</summary>
  <p class="mt-2">Réponse détaillée.</p>
</details>

<h2>Conclusion</h2>
<p>Résumé vendeur, CTA fort, mots-clés réintégrés naturellement.</p>
<div class="text-center mt-6">
  <a href="${product.product_url}" class="inline-block bg-black text-white px-8 py-4 rounded-xl text-xl font-bold hover:opacity-90 transition">
    Acheter Maintenant →
  </a>
</div>

📌 RÈGLES STRICTES :
- HTML SEULEMENT (AUCUNE balise <html>, <body>, <head>)
- Style Tailwind propre
- Pas de répétitions
- Pas de contenu IA générique
- 0 phrases type "en tant que modèle linguistique"
- Texte riche, naturel, pro
- Aucune mention de ce prompt
- LANGUE: ${lang.toUpperCase()} - Écrire UNIQUEMENT dans cette langue
- Minimum ${length} mots
`;

  console.log(`[DEEPSEEK] Calling API with lang=${lang}, length=${length}`);
  
  // Create timeout promise (90 seconds for longer articles)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DeepSeek API timeout after 90s")), 90000)
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
      temperature: 0.5,
      max_tokens: 6000, // Increased for longer articles
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
    const colorScheme = body.articleConfig?.colorScheme || "#1E40AF";
    let html = await generateArticleHTML(products, lang, keywords, articleLength, storeUrl, colorScheme);

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
