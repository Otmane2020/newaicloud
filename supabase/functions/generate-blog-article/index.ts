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
      console.log("Mode auto : génération d'articles de campagnes...");

      const now = new Date();

      // Récupérer les campagnes actives qui doivent être exécutées
      const { data: campaigns, error: campaignError } = await supabase
        .from("blog_campaigns")
        .select("*")
        .eq("is_active", true)
        .lte("next_execution_at", now.toISOString())
        .limit(requestData.limit || 10);

      if (campaignError) throw campaignError;
      
      if (!campaigns?.length) {
        console.log("Aucune campagne à exécuter pour le moment");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Aucune campagne à exécuter.",
            campaigns_checked: 0,
          }),
          { status: 200, headers: corsHeaders },
        );
      }

      console.log(`${campaigns.length} campagnes à traiter`);

      const results = [];
      for (const campaign of campaigns) {
        try {
          // Générer l'article avec les paramètres de la campagne
          const res = await generateSingleArticle({
            user_id: campaign.user_id,
            category: campaign.topic_niche || "Guide",
            keywords: campaign.keywords || [],
            title: null,
            language: "fr",
            articleLength: "2000",
          }, supabase, lovableApiKey);

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            ...res,
          });

          // Mettre à jour la campagne avec la prochaine date d'exécution
          if (res.success) {
            const nextExecution = calculateNextExecution(campaign.frequency, now);
            
            await supabase
              .from("blog_campaigns")
              .update({
                last_generation_date: now.toISOString(),
                next_execution_at: nextExecution.toISOString(),
              })
              .eq("id", campaign.id);

            console.log(`✅ Campagne ${campaign.name} - Prochain article: ${nextExecution.toISOString()}`);
          }
        } catch (err) {
          console.error(`❌ Erreur campagne ${campaign.name}:`, err);
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${results.filter(r => r.success).length}/${campaigns.length} articles générés.`,
          results,
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    function calculateNextExecution(frequency: string, lastExecution: Date): Date {
      const next = new Date(lastExecution);
      
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'biweekly':
          next.setDate(next.getDate() + 14);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        default:
          next.setDate(next.getDate() + 7); // Par défaut: hebdomadaire
      }
      
      return next;
    }

    const result = await generateSingleArticle(requestData, supabase, lovableApiKey);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
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
    const { 
      user_id, 
      category = "Guide", 
      keywords = [], 
      title, 
      articleLength = "2000",
      language = "fr",
      collectionTitle = "",
      productIds = []
    } = requestData;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Vérification des limites d'usage
    if (authHeader) {
      console.log("Vérification des limites pour user:", user_id);
      const limitResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-usage-limits`, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (limitResponse.ok) {
        const limitCheck = await limitResponse.json();
        if (!limitCheck?.canUseArticles) {
          console.log("Limite atteinte pour cet utilisateur");
          throw new Error("trial_limit_reached: Limite d'essai atteinte. Activez votre abonnement pour continuer.");
        }
        console.log("Limites OK, génération en cours");
      }
    }

    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`Génération article : ${articleTitle} pour user ${user_id}`);

    // Recherche des produits
    let products: any[] = [];

    // Si des IDs de produits spécifiques sont fournis
    if (productIds && productIds.length > 0) {
      console.log(`Récupération des produits sélectionnés: ${productIds.length}`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .in("id", productIds);

      if (data && data.length > 0) {
        products = data;
        console.log(`${products.length} produits spécifiques trouvés`);
      }
    }
    // Sinon recherche par catégorie
    else if (category && category !== "Guide" && category !== "Tous produits") {
      console.log(`Recherche produits avec catégorie: ${category}`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .or(
          `category.ilike.%${category}%,product_type.ilike.%${category}%,vendor.ilike.%${category}%,title.ilike.%${category}%,description.ilike.%${category}%,tags.ilike.%${category}%`,
        )
        .limit(12);

      if (data && data.length > 0) {
        products = data;
        console.log(`${products.length} produits trouvés`);
      }
    }

    // Fallback si aucun produit trouvé
    if (products.length === 0) {
      console.log(`Aucun produit trouvé, utilisation de tous les produits`);
      const { data } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, images",
        )
        .eq("seller_id", user_id)
        .limit(8);

      if (data) {
        products = data;
      }
    }

    const hasProducts = products && products.length > 0;

    if (!hasProducts) {
      console.log("Aucun produit trouvé, génération d'un article générique");
    }

    // Génération de l'image featured avec OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let featuredImage = "";

    if (openaiKey) {
      try {
        console.log("Génération image featured...");
        const imagePrompt = `Professional e-commerce hero image for an article about ${category}, modern minimalist design, clean background, high quality product photography, blog featured image style, 16:9 ratio`;

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1792x1024",
            quality: "standard",
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          featuredImage = imageData.data[0].url;
          console.log("Image featured générée avec succès");
        }
      } catch (imgErr) {
        console.error("Erreur génération image:", imgErr);
      }
    }

    // Génération du titre optimisé SEO
    const mainKeyword = keywords.length > 0 ? keywords[0] : category;

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
            content: "Expert SEO spécialisé dans la création de titres percutants et optimisés.",
          },
          {
            role: "user",
            content: `Crée un titre d'article SEO engageant contenant "${mainKeyword}". 50-70 caractères, accrocheur. Retourne uniquement le titre.`,
          },
        ],
      }),
    });

    const titleData = await titleResponse.json();
    const optimizedTitle = titleData.choices[0].message.content.trim().replace(/^["']|["']$/g, "");

    console.log(`Titre optimisé: ${optimizedTitle}`);

    // Récupération de l'URL du store
    let storeUrl = "";
    if (hasProducts && products[0]?.store_id) {
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

    // Récupération des pages Shopify réelles pour netlinking
    let shopifyPages: any[] = [];
    if (user_id) {
      const { data: pagesData } = await supabaseClient
        .from("shopify_pages")
        .select("title, handle, body_html")
        .eq("user_id", user_id)
        .limit(10);

      if (pagesData && pagesData.length > 0) {
        shopifyPages = pagesData;
        console.log(`${shopifyPages.length} pages Shopify trouvées pour netlinking`);
      }
    }

    const pagesContext = shopifyPages.length > 0
      ? `\n\nPAGES SHOPIFY DISPONIBLES POUR NETLINKING:\n${shopifyPages.map(p => `- ${p.title} (handle: ${p.handle})`).join('\n')}\n**IMPORTANT: Intègre des liens vers ces pages dans l'article pour améliorer le maillage interne.**`
      : "";

    // Génération du contenu HTML complet avec présentation améliorée
    const wordCountTarget = parseInt(articleLength);
    
    // Configuration de la langue pour le prompt
    const languageConfig: Record<string, { name: string; toc: string; intro: string; criteria: string; selection: string; comparison: string; advice: string; faq: string; conclusion: string }> = {
      fr: { 
        name: "français", 
        toc: "Table des matières",
        intro: "Introduction",
        criteria: "Critères essentiels de choix",
        selection: "Notre sélection de produits",
        comparison: "Guide d'achat comparatif",
        advice: "Conseils d'experts",
        faq: "Questions Fréquentes",
        conclusion: "Conclusion"
      },
      en: { 
        name: "English", 
        toc: "Table of Contents",
        intro: "Introduction",
        criteria: "Essential Selection Criteria",
        selection: "Our Product Selection",
        comparison: "Buyer's Guide & Comparison",
        advice: "Expert Tips",
        faq: "Frequently Asked Questions",
        conclusion: "Conclusion"
      },
      es: { 
        name: "español", 
        toc: "Tabla de contenidos",
        intro: "Introducción",
        criteria: "Criterios esenciales de selección",
        selection: "Nuestra selección de productos",
        comparison: "Guía de compra comparativa",
        advice: "Consejos de expertos",
        faq: "Preguntas Frecuentes",
        conclusion: "Conclusión"
      },
      de: { 
        name: "Deutsch", 
        toc: "Inhaltsverzeichnis",
        intro: "Einführung",
        criteria: "Wesentliche Auswahlkriterien",
        selection: "Unsere Produktauswahl",
        comparison: "Kaufratgeber & Vergleich",
        advice: "Expertentipps",
        faq: "Häufig gestellte Fragen",
        conclusion: "Fazit"
      },
      it: { 
        name: "italiano", 
        toc: "Sommario",
        intro: "Introduzione",
        criteria: "Criteri essenziali di scelta",
        selection: "La nostra selezione di prodotti",
        comparison: "Guida all'acquisto comparativa",
        advice: "Consigli degli esperti",
        faq: "Domande Frequenti",
        conclusion: "Conclusione"
      }
    };
    
    const lang = languageConfig[language] || languageConfig.fr;
    const topicInfo = collectionTitle ? `Collection: ${collectionTitle}` : category;
    
    const prompt = `Tu es un rédacteur expert en e-commerce. Crée un article professionnel en ${lang.name} d'environ ${wordCountTarget} mots.

SUJET : ${topicInfo}
MOTS-CLÉS : ${targetKeywords.join(", ")}
${
  hasProducts
    ? `PRODUITS SÉLECTIONNÉS (${products.length}) :
${products.map((p: any) => `- ${p.title} (${p.price}€)${p.category ? ` - Catégorie: ${p.category}` : ""} : ${p.description?.substring(0, 100) || "Description non disponible"}`).join("\n")}`
    : `Article informatif générique sur ${topicInfo}`
}${pagesContext}

STRUCTURE HTML À SUIVRE :

<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .blog-article {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      line-height: 1.7;
      color: #1a1a1a;
    }

    /* Header et Featured Image */
    .article-header {
      text-align: center;
      margin-bottom: 4rem;
      position: relative;
    }
    
    .featured-image-container {
      position: relative;
      margin-bottom: 2rem;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
    }
    
    .featured-image {
      width: 100%;
      height: 500px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .featured-image:hover {
      transform: scale(1.02);
    }
    
    .article-title {
      font-size: 3rem;
      font-weight: 800;
      margin: 2rem 0 1rem;
      color: #000;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    /* Table des matières */
    .toc-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2.5rem;
      border-radius: 16px;
      margin: 3rem 0;
    }
    
    .toc-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .toc-list {
      columns: 2;
      gap: 2rem;
    }
    
    .toc-list ol {
      margin: 0;
      padding-left: 1rem;
    }
    
    .toc-list li {
      margin: 0.75rem 0;
      break-inside: avoid;
    }
    
    .toc-list a {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
      display: block;
      padding: 0.5rem 0;
    }
    
    .toc-list a:hover {
      opacity: 0.9;
      text-decoration: underline;
    }

    /* Sections de contenu */
    .article-section {
      margin: 4rem 0;
      scroll-margin-top: 2rem;
    }
    
    .section-title {
      font-size: 2.25rem;
      font-weight: 700;
      margin: 2.5rem 0 1.5rem;
      color: #000;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
    }
    
    .subsection-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
      color: #2d3748;
    }

    /* Présentation des produits */
    .products-section {
      background: #f8fafc;
      padding: 3rem;
      border-radius: 16px;
      margin: 3rem 0;
    }
    
    .view-toggle {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      justify-content: center;
    }
    
    .view-btn {
      padding: 0.75rem 1.5rem;
      border: 2px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .view-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    /* Mode Grille */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
      margin: 2rem 0;
    }
    
    .product-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
      border: 1px solid #e2e8f0;
    }
    
    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }
    
    .product-image-link {
      display: block;
      position: relative;
      overflow: hidden;
    }
    
    .product-image {
      width: 100%;
      height: 240px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .product-image:hover {
      transform: scale(1.05);
    }
    
    .product-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #48bb78;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    /* Mode Liste */
    .product-list {
      display: none;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .product-list-item {
      display: grid;
      grid-template-columns: 120px 1fr auto;
      gap: 1.5rem;
      align-items: center;
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    
    .product-list-item:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }
    
    .list-view.active {
      display: flex;
    }
    
    .grid-view.active {
      display: grid;
    }

    .product-info {
      padding: 1.5rem;
    }
    
    .product-name {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      color: #1a202c;
    }
    
    .product-description {
      color: #718096;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0.5rem 0;
    }
    
    .product-pricing {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    
    .current-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2d3748;
    }
    
    .original-price {
      font-size: 1.1rem;
      color: #a0aec0;
      text-decoration: line-through;
    }
    
    .product-meta {
      display: flex;
      gap: 1rem;
      margin: 1rem 0;
      flex-wrap: wrap;
    }
    
    .stock-status {
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    
    .in-stock {
      background: #c6f6d5;
      color: #22543d;
    }
    
    .out-of-stock {
      background: #fed7d7;
      color: #742a2a;
    }
    
    .product-actions {
      margin-top: 1.5rem;
    }
    
    .product-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.875rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .product-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    /* Section FAQ */
    .faq-section {
      background: #f7fafc;
      padding: 3rem;
      border-radius: 16px;
      margin: 4rem 0;
    }
    
    .faq-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 2rem;
      text-align: center;
      color: #1a202c;
    }
    
    .faq-item {
      background: white;
      border-radius: 12px;
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    
    .faq-question {
      padding: 1.5rem;
      font-weight: 600;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #2d3748;
    }
    
    .faq-answer {
      padding: 0 1.5rem 1.5rem;
      color: #4a5568;
      line-height: 1.6;
    }

    /* Pages Shopify intégrées */
    .shopify-pages {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin: 3rem 0;
    }
    
    .page-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    
    .page-card:hover {
      border-color: #667eea;
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .page-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    
    .page-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #2d3748;
    }
    
    .page-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    
    .page-link:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .article-title { font-size: 2rem; }
      .toc-list { columns: 1; }
      .product-grid { grid-template-columns: 1fr; }
      .product-list-item { grid-template-columns: 1fr; text-align: center; }
      .view-toggle { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
<article class="blog-article">
  <header class="article-header">
    ${
      featuredImage
        ? `
    <div class="featured-image-container">
      <img src="${featuredImage}" alt="${optimizedTitle}" class="featured-image" />
    </div>
    `
        : ""
    }
    <h1 class="article-title">${optimizedTitle}</h1>
  </header>

  <nav class="toc-container">
    <div class="toc-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
      </svg>
      ${lang.toc}
    </div>
    <div class="toc-list">
      <ol>
        <li><a href="#introduction">${lang.intro}</a></li>
        <li><a href="#criteres">${lang.criteria}</a></li>
        <li><a href="#produits">${lang.selection}</a></li>
        <li><a href="#comparaison">${lang.comparison}</a></li>
        <li><a href="#conseils">${lang.advice}</a></li>
        <li><a href="#faq">${lang.faq}</a></li>
        <li><a href="#conclusion">${lang.conclusion}</a></li>
      </ol>
    </div>
  </nav>

  <section id="introduction" class="article-section">
    <h2 class="section-title">${lang.intro}</h2>
    <p>[${lang.intro} engageante de 200-250 mots présentant ${topicInfo} et intégrant naturellement les mots-clés : ${targetKeywords.join(", ")}]</p>
  </section>

  <section id="criteres" class="article-section">
    <h2 class="section-title">${lang.criteria}</h2>
    
    <h3 class="subsection-title">Qualité et durabilité</h3>
    <p>[Détail des aspects qualité à considérer - 150 mots]</p>
    
    <h3 class="subsection-title">Rapport qualité-prix</h3>
    <p>[Analyse des différentes gammes de prix - 150 mots]</p>
    
    <h3 class="subsection-title">Design et fonctionnalités</h3>
    <p>[Présentation des caractéristiques importantes - 150 mots]</p>
  </section>

  ${
    hasProducts
      ? `
  <section id="produits" class="products-section">
    <h2 class="section-title">${lang.selection}${collectionTitle ? ` - ${collectionTitle}` : ""}</h2>
    
    <div class="view-toggle">
      <button class="view-btn active" data-view="grid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z"/>
        </svg>
        Vue grille
      </button>
      <button class="view-btn" data-view="list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0 4h2v-2H3v2zm4-8h14v-2H7v2zm0 4h14v-2H7v2zm0 4h14v-2H7v2z"/>
        </svg>
        Vue liste
      </button>
    </div>

    <!-- Mode Grille -->
    <div class="product-grid grid-view active">
      ${products
        .map(
          (product: any) => `
      <div class="product-card">
        <a href="${storeUrl ? `${storeUrl}/products/${product.handle}` : `/products/${product.id}`}" 
           class="product-image-link" 
           target="${storeUrl ? "_blank" : "_self"}">
          <img src="${product.image_url || "/placeholder-product.jpg"}" 
               alt="${product.title}" 
               class="product-image"
               loading="lazy">
          ${
            product.compare_at_price && product.compare_at_price > product.price
              ? `
          <div class="product-badge">Promotion</div>
          `
              : ""
          }
        </a>
        <div class="product-info">
          <h3 class="product-name">${product.title}</h3>
          <p class="product-description">${(product.description || "").substring(0, 120)}...</p>
          
          <div class="product-pricing">
            ${
              product.compare_at_price && product.compare_at_price > product.price
                ? `
            <span class="original-price">${product.compare_at_price} €</span>
            `
                : ""
            }
            <span class="current-price">${product.price} €</span>
          </div>
          
          <div class="product-meta">
            <div class="stock-status ${product.inventory_quantity > 0 ? "in-stock" : "out-of-stock"}">
              ${
                product.inventory_quantity > 0
                  ? `En stock${product.inventory_quantity > 10 ? "" : ` (${product.inventory_quantity})`}`
                  : "Rupture"
              }
            </div>
          </div>
          
          <div class="product-actions">
            <a href="${storeUrl ? `${storeUrl}/products/${product.handle}` : `/products/${product.id}`}" 
               class="product-link"
               target="${storeUrl ? "_blank" : "_self"}">
              Voir le produit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
      `,
        )
        .join("")}
    </div>

    <!-- Mode Liste -->
    <div class="product-list list-view">
      ${products
        .map(
          (product: any) => `
      <div class="product-list-item">
        <a href="${storeUrl ? `${storeUrl}/products/${product.handle}` : `/products/${product.id}`}" 
           class="product-image-link"
           target="${storeUrl ? "_blank" : "_self"}">
          <img src="${product.image_url || "/placeholder-product.jpg"}" 
               alt="${product.title}" 
               class="product-image"
               loading="lazy"
               style="height: 80px; width: 80px; border-radius: 8px;">
        </a>
        <div class="product-details">
          <h3 class="product-name">${product.title}</h3>
          <p class="product-description">${product.description || "Description non disponible"}</p>
          <div class="product-pricing">
            ${
              product.compare_at_price && product.compare_at_price > product.price
                ? `
            <span class="original-price">${product.compare_at_price} €</span>
            `
                : ""
            }
            <span class="current-price">${product.price} €</span>
          </div>
        </div>
        <div class="product-actions">
          <a href="${storeUrl ? `${storeUrl}/products/${product.handle}` : `/products/${product.id}`}" 
             class="product-link"
             target="${storeUrl ? "_blank" : "_self"}">
            Acheter
          </a>
        </div>
      </div>
      `,
        )
        .join("")}
    </div>
  </section>
  `
      : ""
  }

  <section id="comparaison" class="article-section">
    <h2 class="section-title">${lang.comparison}</h2>
    <p>[Section détaillée de comparaison et d'analyse des produits ${collectionTitle || topicInfo} - 400 mots]</p>
  </section>

  <section id="conseils" class="article-section">
    <h2 class="section-title">${lang.advice}</h2>
    <p>[Recommandations et astuces pratiques pour ${collectionTitle || topicInfo} - 300 mots]</p>
  </section>

  <!-- Section FAQ -->
  <section id="faq" class="faq-section">
    <h2 class="faq-title">${lang.faq}</h2>
    
    <div class="faq-item">
      <div class="faq-question">
        Quels sont les critères les plus importants à considérer ?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      <div class="faq-answer">
        [Réponse détaillée sur les critères essentiels - 100-150 mots]
      </div>
    </div>
    
    <div class="faq-item">
      <div class="faq-question">
        Quel est le budget moyen recommandé ?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      <div class="faq-answer">
        [Conseils sur les budgets et fourchettes de prix - 100-150 mots]
      </div>
    </div>
    
    <div class="faq-item">
      <div class="faq-question">
        Comment entretenir et prolonger la durée de vie ?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      <div class="faq-answer">
        [Guide d'entretien et maintenance - 100-150 mots]
      </div>
    </div>
    
    <div class="faq-item">
      <div class="faq-question">
        Quelles sont les garanties offertes ?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      <div class="faq-answer">
        [Informations sur les garanties et retours - 100-150 mots]
      </div>
    </div>
  </section>

  <!-- Pages Shopify intégrées -->
  <div class="shopify-pages">
    <div class="page-card">
      <div class="page-icon">📞</div>
      <h3 class="page-title">Contact</h3>
      <p>Une question ? Notre équipe vous répond</p>
      <a href="/contact" class="page-link">Nous contacter</a>
    </div>
    
    <div class="page-card">
      <div class="page-icon">🚚</div>
      <h3 class="page-title">Livraison</h3>
      <p>Informations sur les délais et frais</p>
      <a href="/pages/shipping" class="page-link">En savoir plus</a>
    </div>
    
    <div class="page-card">
      <div class="page-icon">↩️</div>
      <h3 class="page-title">Retours</h3>
      <p>Notre politique de retour simplifiée</p>
      <a href="/pages/returns" class="page-link">Découvrir</a>
    </div>
    
    <div class="page-card">
      <div class="page-icon">❓</div>
      <h3 class="page-title">Aide</h3>
      <p>Centre d'aide et support</p>
      <a href="/pages/help" class="page-link">Accéder</a>
    </div>
  </div>

  <section id="conclusion" class="article-section">
    <h2 class="section-title">${lang.conclusion}</h2>
    <p>[Synthèse et recommandation finale sur ${collectionTitle || topicInfo} - 200 mots]</p>
  </section>
</article>

<script>
  // Toggle entre vue grille et liste
  document.addEventListener('DOMContentLoaded', function() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const gridView = document.querySelector('.grid-view');
    const listView = document.querySelector('.list-view');
    
    viewButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const view = this.dataset.view;
        
        // Update active button
        viewButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Show/hide views
        if (view === 'grid') {
          gridView.classList.add('active');
          listView.classList.remove('active');
        } else {
          gridView.classList.remove('active');
          listView.classList.add('active');
        }
      });
    });
    
    // FAQ accordéon
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
      question.addEventListener('click', function() {
        const answer = this.nextElementSibling;
        const isOpen = answer.style.display === 'block';
        
        // Close all answers
        document.querySelectorAll('.faq-answer').forEach(ans => {
          ans.style.display = 'none';
        });
        
        // Toggle current answer
        answer.style.display = isOpen ? 'none' : 'block';
      });
    });
  });
</script>
</body>
</html>

RÈGLES DE CRÉATION :
- LANGUE: Tout le contenu doit être rédigé en ${lang.name}
- Structure HTML complète et responsive
- Collection/Catégorie: ${collectionTitle || category}
- Intégration naturelle des mots-clés : ${targetKeywords.join(", ")}
- Longueur totale : ${wordCountTarget} mots environ
- Ton professionnel et engageant en ${lang.name}
- ${hasProducts ? `Utilisation des ${products.length} produits sélectionnés avec liens cliquables vers la boutique` : "Guide informatif générique"}
- FAQ complète avec 4-6 questions pertinentes en ${lang.name}
- Tables des matières (H1-H5) bien structurée en ${lang.name}
- Tags SEO optimisés pour ${collectionTitle || category}
- Galerie d'images produits avec liens cliquables
- Retourne le code HTML complet et fonctionnel`;

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
            content: "Expert en rédaction e-commerce et création de contenu HTML professionnel.",
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

    // Nettoyage du contenu
    content = content
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Génération des mots-clés SEO
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
            content: "Expert SEO pour la génération de mots-clés pertinents.",
          },
          {
            role: "user",
            content: `Génère 8-12 mots-clés SEO pour "${optimizedTitle}". Liste séparée par des virgules.`,
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

    // Sauvegarde de l'article
    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id,
          title: optimizedTitle,
          content,
          featured_image: featuredImage,
          meta_description: `Guide complet : ${optimizedTitle}. Comparatif expert, conseils d'achat et sélection des meilleurs produits. Livraison offerte.`,
          keywords: [...targetKeywords, ...seoKeywords].slice(0, 15),
          status: "draft",
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("Erreur sauvegarde:", saveError);
      throw saveError;
    }

    console.log(`Article sauvegardé : ${savedArticle.id}`);

    // Extraction des données de netlinking
    try {
      await supabaseClient.functions.invoke("extract-netlinking-from-articles", {
        body: { article_ids: [savedArticle.id] },
      });
      console.log("Netlinking extrait avec succès");
    } catch (netlinkError) {
      console.error("Erreur extraction netlinking:", netlinkError);
    }

    // Mise à jour du compteur d'usage
    await supabaseClient.rpc("increment_usage", {
      p_seller_id: user_id,
      p_field: "articles_count",
      p_increment: 1,
    });

    return {
      success: true,
      article_id: savedArticle.id,
      article: savedArticle,
      featured_image: featuredImage,
    };
  } catch (err) {
    console.error("Erreur génération:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
