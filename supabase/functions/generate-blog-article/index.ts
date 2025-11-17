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

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
    }
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestData = await req.json();

    // 🔁 MODE AUTO : campagne d’articles planifiés
    if (requestData.mode === "auto") {
      console.log("Mode auto : génération d'articles de campagnes...");

      const now = new Date();

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

      const results: any[] = [];

      for (const campaign of campaigns) {
        try {
          const { data: storeData } = await supabase
            .from("shopify_connections")
            .select("id")
            .eq("user_id", campaign.user_id)
            .eq("is_active", true)
            .single();

          if (!storeData?.id) {
            console.error(`❌ Aucun store actif pour user ${campaign.user_id}`);
            throw new Error("Aucun store actif trouvé");
          }

          console.log(`[AUTO] Campaign ${campaign.name} - store_id: ${storeData.id}`);

          const res = await generateSingleArticle(
            {
              user_id: campaign.user_id,
              store_id: storeData.id,
              category: campaign.topic_niche || "Guide",
              keywords: campaign.keywords || [],
              title: null,
              language: "fr",
              articleLength: "2000",
            },
            supabase,
            lovableApiKey,
          );

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            ...res,
          });

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
          message: `${results.filter((r) => r.success).length}/${campaigns.length} articles générés.`,
          results,
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    // 🧠 MODE NORMAL : un seul article
    const result = await generateSingleArticle(
      requestData,
      supabase,
      lovableApiKey,
      req.headers.get("Authorization") || undefined,
    );

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

function calculateNextExecution(frequency: string, lastExecution: Date): Date {
  const next = new Date(lastExecution);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }

  return next;
}

async function generateSingleArticle(requestData: any, supabaseClient: any, apiKey: string, authHeader?: string) {
  try {
    const {
      user_id,
      store_id,
      category = "Guide",
      keywords = [],
      title,
      articleLength = "2000",
      language = "fr",
      collectionTitle = "",
      productIds = [],
      opportunityData,
      articleConfig,
    } = requestData;

    if (!user_id) throw new Error("user_id is required");

    if (!store_id || typeof store_id !== "string" || store_id.trim() === "") {
      console.error("❌ [VALIDATION] store_id manquant ou invalide:", store_id);
      throw new Error("store_id est requis et doit être une chaîne non vide");
    }

    console.log("📥 [REQUEST]");
    console.log("  - user_id:", user_id);
    console.log("  - store_id:", store_id);
    console.log("  - productIds:", productIds?.length || 0);
    console.log("  - keywords:", keywords?.length || 0);

    if (opportunityData) {
      console.log(`📋 [OPPORTUNITY] Using opportunity data`);
      console.log(`  - Angle: ${opportunityData.angle || "N/A"}`);
      console.log(`  - Target audience: ${opportunityData.targetAudience || "N/A"}`);
    }

    // 🔐 Limites d’usage (optionnel si tu as déjà une RPC check-usage-limits)
    if (authHeader) {
      try {
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
      } catch (e) {
        console.warn("⚠️ Impossible de vérifier les limites, on continue quand même:", e);
      }
    }

    const articleTitle = title || `Guide complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`📝 [GENERATION] Article: ${articleTitle}`);

    // 🔎 1) Récupération des produits
    let products: any[] = [];

    // a) Si productIds fournis → ciblés
    if (productIds && productIds.length > 0) {
      console.log("🎯 Recherche de produits par IDs:", productIds);
      const { data, error } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, smart_weight, smart_dimensions",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .in("id", productIds);

      if (error) console.error("❌ [PRODUCTS] Erreur sur IDs:", error);
      if (data && data.length > 0) {
        products = data;
        console.log(`✅ [PRODUCTS] ${products.length} produits trouvés par IDs`);
      } else {
        console.log("⚠️ [PRODUCTS] Aucun produit trouvé avec ces IDs");
      }
    }

    // b) Sinon → par catégorie / texte libre
    if (products.length === 0 && category && category !== "Guide" && category !== "Tous produits") {
      console.log(`📂 [PRODUCTS] Recherche par catégorie: "${category}"`);
      const { data, error } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, smart_weight, smart_dimensions",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .or(
          `product_type.ilike.%${category}%,vendor.ilike.%${category}%,title.ilike.%${category}%,description.ilike.%${category}%,tags.ilike.%${category}%`,
        )
        .limit(12);

      if (error) console.error("❌ [PRODUCTS] Erreur par catégorie:", error);
      if (data && data.length > 0) {
        products = data;
        console.log(`✅ [PRODUCTS] ${products.length} produits trouvés pour "${category}"`);
      }
    }

    // c) Fallback → derniers produits du store
    if (products.length === 0) {
      console.log(`🔄 [PRODUCTS] Fallback produits récents du store`);
      const { data, error } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, smart_weight, smart_dimensions, created_at",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) console.error("❌ [PRODUCTS] Erreur fallback:", error);
      if (data && data.length > 0) {
        products = data;
        console.log(`✅ [PRODUCTS] ${products.length} produits pris en fallback`);
      } else {
        console.warn("⚠️ [PRODUCTS] Aucun produit trouvé pour ce store, article sans section produits");
      }
    }

    const hasProducts = products && products.length > 0;
    console.log("📊 [PRODUCTS] hasProducts =", hasProducts);

    // 🔗 URL du store Shopify
    let storeUrl = "";
    const { data: storeData } = await supabaseClient
      .from("shopify_connections")
      .select("store_url")
      .eq("id", store_id)
      .single();

    if (storeData?.store_url) {
      storeUrl = storeData.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      storeUrl = `https://${storeUrl}`;
    }
    console.log("🔗 Store URL:", storeUrl || "non défini");

    // 🧩 Cartes produits HTML (grille simple)
    const productCardsHtml = hasProducts
      ? products
          .map((product) => {
            const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
            const discount = hasPromo
              ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
              : 0;

            const productUrl = storeUrl ? `${storeUrl}/products/${product.handle}` : "#";

            const descriptionText = (product.description || "").replace(/<[^>]*>/g, "").substring(0, 150);

            return `
<div class="product-card">
  <a href="${productUrl}" target="_blank" rel="noopener" class="product-card-link">
    <div class="product-card-image-wrapper">
      <img src="${product.image_url || ""}" alt="${product.title}" class="product-card-image" loading="lazy" />
      ${hasPromo ? `<div class="product-card-badge">-${discount}%</div>` : ""}
    </div>
    <div class="product-card-body">
      <h3 class="product-card-title">${product.title}</h3>
      <div class="product-card-prices">
        ${
          hasPromo
            ? `<span class="product-card-price-old">${product.compare_at_price.toFixed(
                2,
              )} ${product.currency_code || "€"}</span>`
            : ""
        }
        <span class="product-card-price-current">${product.price.toFixed(2)} ${product.currency_code || "€"}</span>
      </div>
      ${descriptionText ? `<p class="product-card-description">${descriptionText}...</p>` : ""}
      <span class="product-card-cta">Voir le produit →</span>
    </div>
  </a>
</div>`;
          })
          .join("\n")
      : "<p>Aucun produit sélectionné pour cet article.</p>";

    // 🧠 Config langue
    const languageConfig: Record<
      string,
      {
        name: string;
        toc: string;
        intro: string;
        criteria: string;
        selection: string;
        comparison: string;
        advice: string;
        faq: string;
        conclusion: string;
      }
    > = {
      fr: {
        name: "français",
        toc: "Table des matières",
        intro: "Introduction",
        criteria: "Critères essentiels de choix",
        selection: "Notre sélection de produits",
        comparison: "Guide d'achat comparatif",
        advice: "Conseils d'expert",
        faq: "Questions fréquentes",
        conclusion: "Conclusion",
      },
      en: {
        name: "English",
        toc: "Table of Contents",
        intro: "Introduction",
        criteria: "Key selection criteria",
        selection: "Our product selection",
        comparison: "Buying guide & comparison",
        advice: "Expert tips",
        faq: "FAQ",
        conclusion: "Conclusion",
      },
    };

    const lang = languageConfig[language] || languageConfig.fr;
    const topicInfo = collectionTitle ? `Collection: ${collectionTitle}` : category;

    // 🎨 Paramètres Wizard (layout, couleurs, style)
    const primaryColor = articleConfig?.colorScheme || "#667eea";
    const layout = articleConfig?.layout || "1-colonne";
    const style = articleConfig?.style || "blog";

    const styleDescriptions: Record<string, string> = {
      magazine: "style magazine premium, éditorial, structuré",
      blog: "style blog conversationnel, accessible et chaleureux",
      minimal: "style minimaliste, direct et professionnel",
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.blog;

    // 🧠 Résumé produits pour le prompt
    const productSummaries = hasProducts
      ? products
          .map(
            (p: any, i: number) =>
              `${i + 1}. ${p.title} – prix: ${p.price} ${
                p.currency_code || "€"
              } – type: ${p.product_type || "n/c"} – marque: ${p.vendor || "n/c"}`,
          )
          .join("\n")
      : "Aucun produit disponible, écrire un guide générique.";

    // 🧠 Pages Shopify pour netlinking (optionnel)
    let shopifyPages: any[] = [];
    try {
      const { data: pagesData } = await supabaseClient
        .from("shopify_pages")
        .select("title, handle")
        .eq("user_id", user_id)
        .limit(10);

      if (pagesData && pagesData.length > 0) {
        shopifyPages = pagesData;
        console.log(`${shopifyPages.length} pages Shopify trouvées pour netlinking`);
      }
    } catch (e) {
      console.warn("⚠️ Impossible de récupérer les pages Shopify:", e);
    }

    const pagesContext =
      shopifyPages.length > 0
        ? `Pages internes disponibles pour le maillage interne (ne mets que des suggestions textuelles, pas les URLs exactes) :
${shopifyPages.map((p) => `- ${p.title}`).join("\n")}`
        : "Pas d'information de pages internes à utiliser.";

    const wordCountTarget = parseInt(articleLength, 10) || 2000;

    // 🧠 PROMPT JSON → on ne demande PLUS d'HTML à l'IA
    const prompt = `
Tu es un expert en rédaction SEO e-commerce pour boutiques Shopify.

Objectif :
Écrire un article de blog optimisé en ${lang.name} sur le thème :
"${topicInfo}"

Mots-clés principaux :
${targetKeywords.join(", ")}

Style éditorial :
${styleDesc}
Mise en page cible :
- Layout : ${layout}
- Couleur principale : ${primaryColor}

Contexte produits :
${productSummaries}

${pagesContext}

Contexte opportunité (si présent) :
${opportunityData ? JSON.stringify(opportunityData) : "Aucun"}

⚠️ IMPORTANT : tu ne génères PAS de HTML.
Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans backticks, sans commentaire.

Structure JSON EXACTE attendue :

{
  "INTRODUCTION": "Texte d'introduction de 200-250 mots...",
  "CRITERES_QUALITE": "Texte sur les critères de qualité (150-200 mots)...",
  "CRITERES_PRIX": "Texte sur les critères de prix (150-200 mots)...",
  "CRITERES_DESIGN": "Texte sur le design et les fonctions (150-200 mots)...",
  "COMPARATIF": "Comparatif et guide d'achat détaillé (300-400 mots)...",
  "CONSEILS": "Conseils pratiques d'expert (250-300 mots)...",
  "FAQ_1": "Question + réponse complète (100-150 mots)...",
  "FAQ_2": "Question + réponse complète (100-150 mots)...",
  "FAQ_3": "Question + réponse complète (100-150 mots)...",
  "FAQ_4": "Question + réponse complète (100-150 mots)...",
  "CONCLUSION": "Texte de conclusion (150-200 mots)..."
}

Règles :
- Tu écris tout en ${lang.name}.
- Chaque champ doit contenir du TEXTE complet, pas de placeholder.
- Les FAQ doivent contenir la question + la réponse dans le même champ (format libre).
- Tu intègres naturellement les produits dans l'INTRODUCTION, le COMPARATIF, les CONSEILS et la CONCLUSION (sans lister les prix un par un, mais en reliant les arguments aux types de produits).
- Tu ne retournes que cet objet JSON, rien d'autre.`;

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
            content:
              "Tu es un assistant spécialisé e-commerce. Tu dois TOUJOURS répondre avec un objet JSON STRICT, sans backticks, sans HTML.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Error: ${errText}`);
    }

    let aiContent = (await aiResponse.json()).choices[0].message.content.trim();

    // Nettoyage dans le cas où Gemini renvoie quand même ```json ... ```
    aiContent = aiContent
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let textBlocks: any;
    try {
      textBlocks = JSON.parse(aiContent);
      console.log("✅ [JSON] Parsing Gemini OK");
    } catch (parseError) {
      console.error("❌ [JSON] Erreur de parsing:", parseError);
      console.error("Contenu brut reçu:", aiContent.slice(0, 500));
      throw new Error("Impossible de parser la réponse JSON de Gemini");
    }

    const optimizedTitle = textBlocks.TITLE || articleTitle;

    // 🖼️ Image featured (optionnel)
    let featuredImage = "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        const imagePrompt = `E-commerce hero image for a blog article about ${topicInfo}, modern, clean, 16:9, high quality product photography, main color ${primaryColor}`;
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
          console.log("🖼️ Image featured générée");
        }
      } catch (e) {
        console.warn("⚠️ Erreur génération image:", e);
      }
    }

    // 🧱 TEMPLATE HTML FINAL (simple, propre, avec produits inclus)
    let content = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${optimizedTitle}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.7;
      color: #1a202c;
      background: #f7fafc;
      padding: 2rem;
    }
    .blog-article {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    h1 {
      font-size: 2.4rem;
      margin-bottom: 1.5rem;
      color: #0f172a;
    }
    h2 {
      font-size: 1.7rem;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: #111827;
    }
    h3 {
      font-size: 1.25rem;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      color: #1f2933;
    }
    p { margin-bottom: 0.9rem; }
    .featured-image {
      width: 100%;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      object-fit: cover;
      max-height: 420px;
    }
    .products-section {
      margin-top: 2.5rem;
      padding: 1.5rem;
      border-radius: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .product-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .product-card-link {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .product-card-image-wrapper {
      position: relative;
      overflow: hidden;
      max-height: 210px;
    }
    .product-card-image {
      width: 100%;
      height: 210px;
      object-fit: cover;
      display: block;
    }
    .product-card-badge {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      background: #ef4444;
      color: #ffffff;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .product-card-body {
      padding: 1rem 1.1rem 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }
    .product-card-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
      color: #111827;
    }
    .product-card-prices {
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
    }
    .product-card-price-old {
      text-decoration: line-through;
      color: #9ca3af;
      font-size: 0.9rem;
    }
    .product-card-price-current {
      font-weight: 700;
      color: #111827;
    }
    .product-card-description {
      font-size: 0.9rem;
      color: #4b5563;
    }
    .product-card-cta {
      margin-top: 0.3rem;
      font-size: 0.9rem;
      color: #2563eb;
      font-weight: 600;
    }
    .faq-item {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }
  </style>
</head>
<body>
  <article class="blog-article">
    ${featuredImage ? `<img src="${featuredImage}" alt="${optimizedTitle}" class="featured-image" />` : ""}
    <h1>${optimizedTitle}</h1>

    <section id="introduction">
      <h2>${lang.intro}</h2>
      <p>${textBlocks.INTRODUCTION || ""}</p>
    </section>

    <section id="criteres">
      <h2>${lang.criteria}</h2>
      <h3>Qualité et durabilité</h3>
      <p>${textBlocks.CRITERES_QUALITE || ""}</p>
      <h3>Rapport qualité / prix</h3>
      <p>${textBlocks.CRITERES_PRIX || ""}</p>
      <h3>Design, usage et fonctionnalités</h3>
      <p>${textBlocks.CRITERES_DESIGN || ""}</p>
    </section>

    ${
      hasProducts
        ? `
    <section id="produits" class="products-section">
      <h2>${lang.selection}${collectionTitle ? " – " + collectionTitle : ""}</h2>
      <div class="product-grid">
        ${productCardsHtml}
      </div>
    </section>`
        : ""
    }

    <section id="comparatif">
      <h2>${lang.comparison}</h2>
      <p>${textBlocks.COMPARATIF || ""}</p>
    </section>

    <section id="conseils">
      <h2>${lang.advice}</h2>
      <p>${textBlocks.CONSEILS || ""}</p>
    </section>

    <section id="faq">
      <h2>${lang.faq}</h2>
      ${textBlocks.FAQ_1 ? `<div class="faq-item">${textBlocks.FAQ_1}</div>` : ""}
      ${textBlocks.FAQ_2 ? `<div class="faq-item">${textBlocks.FAQ_2}</div>` : ""}
      ${textBlocks.FAQ_3 ? `<div class="faq-item">${textBlocks.FAQ_3}</div>` : ""}
      ${textBlocks.FAQ_4 ? `<div class="faq-item">${textBlocks.FAQ_4}</div>` : ""}
    </section>

    <section id="conclusion">
      <h2>${lang.conclusion}</h2>
      <p>${textBlocks.CONCLUSION || ""}</p>
    </section>
  </article>
</body>
</html>`.trim();

    // 🧪 Nettoyage résiduel d'éventuels placeholders
    content = content.replace(/\[[^\]]+\]/g, "");

    // 🧠 Mots-clés SEO
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
            content: "Expert SEO, tu génères uniquement une liste de mots-clés séparés par des virgules.",
          },
          {
            role: "user",
            content: `Génère 8 à 12 mots-clés SEO pertinents pour l'article "${optimizedTitle}" sur le thème "${topicInfo}".`,
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

    console.log("💾 [SAVE] Sauvegarde article dans blog_articles");

    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id,
          store_id,
          title: optimizedTitle,
          content,
          featured_image: featuredImage || null,
          meta_description:
            opportunityData?.metaDescription ||
            `Guide complet : ${optimizedTitle}. Comparatif, conseils d'achat et sélection de produits.`,
          keywords: [...targetKeywords, ...seoKeywords].slice(0, 15),
          status: "draft",
          source: "ai_generated",
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("❌ Erreur sauvegarde blog_articles:", saveError);
      throw saveError;
    }

    // 🔗 Lier à l’opportunité si besoin
    if (opportunityData?.opportunityId && savedArticle) {
      try {
        await supabaseClient
          .from("blog_opportunities")
          .update({
            article_id: savedArticle.id,
            generated_at: new Date().toISOString(),
          })
          .eq("id", opportunityData.opportunityId);
      } catch (e) {
        console.warn("⚠️ Erreur mise à jour blog_opportunities:", e);
      }
    }

    // 🧩 Netlinking (si ta function existe)
    try {
      await supabaseClient.functions.invoke("extract-netlinking-from-articles", {
        body: { article_ids: [savedArticle.id] },
      });
      console.log("🔗 Netlinking extrait");
    } catch (e) {
      console.warn("⚠️ Erreur extract-netlinking-from-articles:", e);
    }

    // Compteur d’usage (si ta RPC existe)
    try {
      await supabaseClient.rpc("increment_usage", {
        p_seller_id: user_id,
        p_field: "articles_count",
        p_increment: 1,
      });
    } catch (e) {
      console.warn("⚠️ Erreur increment_usage:", e);
    }

    return {
      success: true,
      article_id: savedArticle.id,
      article: savedArticle,
      featured_image: featuredImage,
    };
  } catch (err) {
    console.error("❌ Erreur génération article:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
