import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const requestData = await req.json();

    if (requestData.mode === "auto") {
      console.log("🧠 MODE AUTO : génération d'articles...");

      const { data: campaigns, error: campaignError } = await supabase
        .from("blog_campaigns")
        .select("*")
        .eq("is_active", true)
        .limit(requestData.limit || 5);

      if (campaignError) throw campaignError;
      if (!campaigns?.length) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Aucune campagne active.",
          }),
          { status: 200, headers: corsHeaders },
        );
      }

      const results = [];
      for (const campaign of campaigns) {
        const res = await generateSingleArticle({ campaign_id: campaign.id }, supabase, lovableApiKey);
        results.push(res);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${results.length} articles générés.`,
          results,
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    const result = await generateSingleArticle(requestData, supabase, lovableApiKey);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

async function generateSingleArticle(requestData: any, supabaseClient: any, apiKey: string, authHeader?: string) {
  try {
    const { user_id, category = "Guide", keywords = [], title } = requestData;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Check usage limits before proceeding
    if (authHeader) {
      console.log("🔍 Checking usage limits for user:", user_id);
      const limitResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-usage-limits`, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (limitResponse.ok) {
        const limitCheck = await limitResponse.json();
        if (!limitCheck?.canUseArticles) {
          console.log("⚠️ User has reached article generation limit");
          throw new Error("trial_limit_reached: Limite d'essai atteinte. Activez votre abonnement pour continuer.");
        }
        console.log("✅ Usage limits OK, proceeding with article generation");
      }
    }

    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`🎯 Génération article : ${articleTitle} pour user ${user_id}`);

    // Filtrer produits par catégorie si spécifiée
    let productsQuery = supabaseClient
      .from("shopify_products")
      .select("id, title, handle, price, category, description, product_type, vendor")
      .eq("seller_id", user_id);

    if (category && category !== "Guide" && category !== "Tous produits") {
      productsQuery = productsQuery.or(
        `category.ilike.%${category}%,product_type.ilike.%${category}%,vendor.ilike.%${category}%`,
      );
    }

    const { data: products } = await productsQuery.limit(8);

    if (!products || products.length === 0) {
      throw new Error("Aucun produit trouvé pour cette catégorie");
    }

    const productDetails = products
      .map((p: any) => `- ${p.title} (${p.price}€) : ${p.description?.substring(0, 100) || "Pas de description"}`)
      .join("\n");

    console.log(`📦 ${products.length} produits sélectionnés`);

    // Générer l'image de couverture avec OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let imageUrl = "";

    if (openaiKey) {
      try {
        console.log("🎨 Génération image avec OpenAI...");
        const imagePrompt = `A professional e-commerce hero image for an article about ${category}, modern and clean design, high quality product photography style`;

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.data[0].url;
          console.log("✅ Image générée");
        }
      } catch (imgErr) {
        console.error("⚠️ Erreur génération image:", imgErr);
      }
    }

    // Générer un titre optimisé avec DeepSeek
    const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert SEO qui génère des titres d'articles percutants et optimisés pour le référencement.",
          },
          {
            role: "user",
            content: `Génère un titre d'article SEO captivant pour cette catégorie: ${category}. Le titre doit contenir entre 50-60 caractères, inclure des mots-clés pertinents, et inciter au clic. Retourne UNIQUEMENT le titre, sans guillemets ni explications.`,
          },
        ],
      }),
    });

    const titleData = await titleResponse.json();
    const optimizedTitle = titleData.choices[0].message.content.trim().replace(/^["']|["']$/g, "");

    console.log(`📝 Titre optimisé: ${optimizedTitle}`);

    // Get store URL for product links
    let storeUrl = "";
    if (products[0]?.store_id) {
      const { data: storeData } = await supabaseClient
        .from("shopify_connections")
        .select("store_url")
        .eq("id", products[0].store_id)
        .single();

      if (storeData?.store_url) {
        storeUrl = storeData.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        storeUrl = `https://${storeUrl}`;
      }
    }

    const productLinks = products
      .map((p: any) =>
        storeUrl
          ? `<a href="${storeUrl}/products/${p.handle}" class="product-link" target="_blank">${p.title}</a>`
          : `<a href="/product-landing/${p.id}" class="product-link">${p.title}</a>`,
      )
      .join(", ");

    const productCards = products
      .map(
        (p: any) => `
      <div class="product-card">
        ${
          p.image_url
            ? `<a href="${storeUrl ? `${storeUrl}/products/${p.handle}` : `/product-landing/${p.id}`}" target="${storeUrl ? "_blank" : "_self"}">
          <img src="${p.image_url}" alt="${p.title}" class="product-image" />
        </a>`
            : ""
        }
        <h4>${p.title}</h4>
        <div class="product-pricing">
          ${
            p.compare_at_price && p.compare_at_price > p.price
              ? `<span class="product-price-original">${p.compare_at_price} €</span>`
              : ""
          }
          <span class="product-price">${p.price} €</span>
        </div>
        ${
          p.inventory_quantity !== undefined
            ? `<div class="product-stock ${p.inventory_quantity > 0 ? "in-stock" : "out-of-stock"}">
            ${
              p.inventory_quantity > 0
                ? `✓ En stock (${p.inventory_quantity > 10 ? "10+" : p.inventory_quantity} disponible${p.inventory_quantity > 1 ? "s" : ""})`
                : "✗ Rupture de stock"
            }
          </div>`
            : ""
        }
        <p class="product-description">${(p.description || "").substring(0, 120)}...</p>
        <a href="${storeUrl ? `${storeUrl}/products/${p.handle}` : `/product-landing/${p.id}`}" 
           class="product-link" 
           target="${storeUrl ? "_blank" : "_self"}" 
           rel="${storeUrl ? "noopener" : ""}">
          Voir le produit →
        </a>
      </div>
    `,
      )
      .join("");

    const prompt = `Tu es un rédacteur expert en e-commerce. Rédige un article professionnel en français.

📦 PRODUITS SÉLECTIONNÉS :
${productDetails}

📝 STRUCTURE HTML STRICTE À RESPECTER :

<!DOCTYPE html>
<html lang="fr">
<head>
  <style>
    .blog-article { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; line-height: 1.8; color: #333; }
    .article-hero { text-align: center; margin-bottom: 3rem; }
    .hero-image { width: 100%; max-height: 500px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .article-title { font-size: 2.5rem; font-weight: 800; margin: 1rem 0; color: #1a202c; line-height: 1.2; }
    .article-toc { background: #f7fafc; border-left: 4px solid #3182ce; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
    .article-toc h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #2d3748; }
    .article-toc ol { margin: 0; padding-left: 1.5rem; }
    .article-toc li { margin: 0.5rem 0; }
    .article-toc a { color: #3182ce; text-decoration: none; font-weight: 500; transition: color 0.2s; }
    .article-toc a:hover { color: #2c5282; text-decoration: underline; }
    .article-section { margin: 3rem 0; scroll-margin-top: 2rem; }
    .article-section h2 { font-size: 2rem; font-weight: 700; margin: 2rem 0 1rem; color: #2d3748; border-bottom: 3px solid #3182ce; padding-bottom: 0.5rem; }
    .article-section h3 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 1rem; color: #4a5568; }
    .article-section p { margin: 1rem 0; font-size: 1.1rem; }
    .article-section ul, .article-section ol { margin: 1rem 0; padding-left: 2rem; }
    .article-section li { margin: 0.5rem 0; }
    .comparison-table { width: 100%; border-collapse: collapse; margin: 2rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    .comparison-table thead { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .comparison-table th { padding: 1rem; text-align: left; font-weight: 600; }
    .comparison-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; }
    .comparison-table tbody tr:hover { background: #f7fafc; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }
    .product-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; transition: all 0.3s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .product-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.15); border-color: #3182ce; }
    .product-image { width: 100%; height: 220px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; transition: opacity 0.2s; }
    .product-image:hover { opacity: 0.9; }
    .product-card h4 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; color: #2d3748; }
    .product-pricing { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0; }
    .product-price { font-size: 1.4rem; font-weight: 700; color: #3182ce; }
    .product-price-original { font-size: 1.1rem; color: #a0aec0; text-decoration: line-through; }
    .product-stock { font-size: 0.85rem; font-weight: 600; padding: 0.4rem 0.8rem; border-radius: 6px; margin: 0.5rem 0; display: inline-block; }
    .product-stock.in-stock { background: #c6f6d5; color: #22543d; }
    .product-stock.out-of-stock { background: #fed7d7; color: #742a2a; }
    .product-description { font-size: 0.9rem; color: #718096; margin: 1rem 0; line-height: 1.5; }
    .product-link { display: inline-block; color: white; background: #3182ce; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; transition: background 0.2s; margin-top: 0.5rem; width: 100%; text-align: center; box-sizing: border-box; }
    .product-link:hover { background: #2c5aa0; }
    .cta-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem; border-radius: 12px; text-align: center; margin: 3rem 0; }
    .cta-section h2 { color: white; border: none; font-size: 2rem; }
    .cta-button { display: inline-block; background: white; color: #667eea; padding: 1rem 2rem; border-radius: 8px; font-weight: 600; text-decoration: none; margin-top: 1rem; transition: transform 0.2s; }
    .cta-button:hover { transform: scale(1.05); }
  </style>
</head>
<body>
<article class="blog-article">
  <div class="article-hero">
    ${imageUrl ? `<img src="${imageUrl}" alt="${optimizedTitle}" class="hero-image" />` : ""}
    <h1 class="article-title">${optimizedTitle}</h1>
  </div>

  <nav class="article-toc">
    <h2>📋 Table des matières</h2>
    <ol>
      <li><a href="#section-1">Introduction</a></li>
      <li><a href="#section-2">Les critères essentiels</a></li>
      <li><a href="#section-3">Notre sélection de produits</a></li>
      <li><a href="#section-4">Comparatif détaillé</a></li>
      <li><a href="#section-5">Comment faire votre choix</a></li>
      <li><a href="#section-6">Conclusion</a></li>
    </ol>
  </nav>

  <section id="section-1" class="article-section">
    <h2>1. 🎯 Introduction</h2>
    <p>[Rédige une introduction captivante de 200-250 mots qui présente le sujet et inclut naturellement ces mots-clés : ${targetKeywords.join(", ")}. Explique pourquoi ce guide est important et ce que le lecteur va découvrir.]</p>
  </section>

  <section id="section-2" class="article-section">
    <h2>2. 🔍 Les critères essentiels de sélection</h2>
    <h3>2.1. Qualité et matériaux</h3>
    <p>[Détaille les aspects qualité à considérer - 150 mots]</p>
    
    <h3>2.2. Budget et rapport qualité-prix</h3>
    <p>[Explique comment évaluer le rapport qualité-prix - 150 mots]</p>
    
    <h3>2.3. Design et style</h3>
    <p>[Décrit les tendances et styles disponibles - 150 mots]</p>
    
    <h3>2.4. Fonctionnalités pratiques</h3>
    <p>[Liste les fonctionnalités importantes à rechercher - 150 mots]</p>
  </section>

  <section id="section-3" class="article-section">
    <h2>3. ⭐ Notre sélection de produits</h2>
    <p>Voici notre sélection de ${products.length} produits soigneusement choisis pour vous : ${productLinks}.</p>
    
    <div class="product-grid">
      ${productCards}
    </div>
    
    <p>[Pour chaque produit ci-dessus, rédige un paragraphe de 100-150 mots décrivant ses caractéristiques uniques, avantages, et pour quel type d'utilisateur il est idéal.]</p>
  </section>

  <section id="section-4" class="article-section">
    <h2>4. 📊 Comparatif détaillé</h2>
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th>Prix</th>
          <th>Points forts</th>
          <th>Pour qui ?</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        [Crée une ligne par produit avec des données réalistes basées sur les produits fournis]
      </tbody>
    </table>
  </section>

  <section id="section-5" class="article-section">
    <h2>5. 💡 Comment faire votre choix ?</h2>
    <h3>5.1. Selon votre budget</h3>
    <p>[Conseils pour choisir selon le budget - 200 mots]</p>
    
    <h3>5.2. Selon vos besoins spécifiques</h3>
    <p>[Conseils pour choisir selon les besoins - 200 mots]</p>
    
    <h3>5.3. Notre recommandation finale</h3>
    <p>[Donne une recommandation claire basée sur différents profils - 150 mots]</p>
  </section>

  <section id="section-6" class="article-section">
    <h2>6. ✅ Conclusion</h2>
    <p>[Résumé des points clés et rappel des meilleurs produits - 200 mots]</p>
  </section>

  <div class="cta-section">
    <h2>🛍️ Prêt à faire votre choix ?</h2>
    <p>Découvrez l'intégralité de notre collection et trouvez le produit parfait pour vous !</p>
    <a href="/products" class="cta-button">Voir toute notre collection →</a>
  </div>
</article>
</body>
</html>

⚠️ RÈGLES STRICTES :
- Utilise UNIQUEMENT les ${products.length} produits fournis
- Structure HTML complète avec balises H1, H2, H3
- Table des matières avec ancres cliquables (#section-X)
- Intègre les produits avec liens cliquables vers /product-landing/{id}
- Mots-clés naturellement intégrés : ${targetKeywords.join(", ")}
- Longueur totale : 2000-2500 mots
- Ton : professionnel, informatif, engageant
- Retourne le HTML complet prêt à l'emploi`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un rédacteur expert en e-commerce qui génère du contenu HTML structuré et professionnel.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI Error: ${err}`);
    }

    const result = await aiResponse.json();
    let content = result.choices[0].message.content.trim();

    // Nettoyer les balises markdown si présentes
    content = content
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Générer keywords SEO avec l'IA
    const keywordsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un expert SEO qui génère des mots-clés pertinents.",
          },
          {
            role: "user",
            content: `Génère 8-12 mots-clés SEO pour cet article sur "${optimizedTitle}". Retourne une liste séparée par des virgules, sans numérotation.`,
          },
        ],
      }),
    });

    const keywordsData = await keywordsResponse.json();
    const seoKeywords = keywordsData.choices[0].message.content
      .trim()
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean)
      .slice(0, 12);

    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id,
          title: optimizedTitle,
          content,
          meta_description: `Découvrez notre guide complet : ${optimizedTitle}. Comparatif, conseils d'experts et sélection des meilleurs produits. ✓ ${category}`,
          keywords: [...targetKeywords, ...seoKeywords].slice(0, 15),
          status: "draft",
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("❌ Erreur sauvegarde:", saveError);
      throw saveError;
    }

    console.log(`✅ Article sauvegardé : ${savedArticle.id}`);

    await supabaseClient.rpc("increment_usage", {
      p_seller_id: user_id,
      p_field: "articles_count",
      p_increment: 1,
    });

    return { success: true, article_id: savedArticle.id, article: savedArticle };
  } catch (err) {
    console.error("❌ Erreur génération:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
