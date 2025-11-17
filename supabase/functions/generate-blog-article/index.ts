import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Non autorisé");
    }

    const requestData = await req.json();
    console.log("[GENERATE-BLOG-ARTICLE] Request data received");

    const {
      user_id,
      store_id,
      collection_ids = [],
      collectionTitles = [],
      keywords = [],
      productIds = [],
      articleLength = "2000",
      articleConfig = {},
      context = {},
    } = requestData;

    // ✅ VALIDATION CRITIQUE
    if (!user_id || !store_id) {
      throw new Error("user_id et store_id sont requis");
    }

    console.log(`[GENERATE-BLOG-ARTICLE] Processing: ${productIds.length} products, ${keywords.length} keywords`);

    // ✅ RÉCUPÉRATION DES PRODUITS
    let products: any[] = [];

    // 1. Produits spécifiquement sélectionnés
    if (productIds && productIds.length > 0) {
      // Valider que ce sont des UUIDs valides
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validIds = productIds.filter((id: string) => uuidRegex.test(id));
      
      if (validIds.length !== productIds.length) {
        console.warn(`[GENERATE-BLOG-ARTICLE] Invalid product IDs filtered:`, 
          productIds.filter((id: string) => !validIds.includes(id)));
      }
      
      console.log(`[GENERATE-BLOG-ARTICLE] Fetching specific products:`, validIds);
      const { data: specificProducts, error: specificError } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, body_html, images",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .in("id", validIds);

      console.log(`[GENERATE-BLOG-ARTICLE] Query executed:`, {
        validIds: validIds.length,
        seller_id: user_id,
        store_id,
        found: specificProducts?.length || 0,
        error: specificError?.message || null
      });

      if (!specificError && specificProducts) {
        products = specificProducts;
        console.log(`[GENERATE-BLOG-ARTICLE] ✅ Found ${products.length} specific products`);
      } else {
        console.error(`[GENERATE-BLOG-ARTICLE] ❌ Error fetching products:`, specificError);
      }
    }

    // 2. Fallback: produits des collections
    if (products.length === 0 && collection_ids.length > 0) {
      console.log(`[GENERATE-BLOG-ARTICLE] Fetching products from collections:`, collection_ids);
      const { data: allStoreProducts, error: storeError } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, body_html, images, collection_ids",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .limit(50);

      if (!storeError && allStoreProducts) {
        products = allStoreProducts.filter(
          (product) =>
            product.collection_ids && product.collection_ids.some((colId: string) => collection_ids.includes(colId)),
        );
        console.log(`[GENERATE-BLOG-ARTICLE] Found ${products.length} products from collections`);
      }
    }

    // 3. Fallback final: produits récents
    if (products.length === 0) {
      console.log(`[GENERATE-BLOG-ARTICLE] ⚠️ Fallback: fetching recent products`);
      const { data: recentProducts, error: recentError } = await supabaseClient
        .from("shopify_products")
        .select(
          "id, title, handle, price, category, description, product_type, vendor, tags, image_url, compare_at_price, inventory_quantity, store_id, currency_code, body_html, images",
        )
        .eq("seller_id", user_id)
        .eq("store_id", store_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!recentError && recentProducts) {
        products = recentProducts;
        console.log(`[GENERATE-BLOG-ARTICLE] ✅ Found ${products.length} recent products`);
      } else if (recentError) {
        console.error(`[GENERATE-BLOG-ARTICLE] ❌ Error fetching recent products:`, recentError);
      }
      
      if (products.length === 0) {
        console.warn(`[GENERATE-BLOG-ARTICLE] ⚠️ CRITICAL: No products found in store ${store_id}`);
      }
    }

    console.log(`[GENERATE-BLOG-ARTICLE] Final products count: ${products.length}`);

    // ✅ RÉCUPÉRATION DES INFOS DU STORE
    const { data: storeData } = await supabaseClient
      .from("shopify_connections")
      .select("store_url, store_name")
      .eq("id", store_id)
      .single();

    const storeUrl = storeData?.store_url
      ? `https://${storeData.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : "";
    const storeName = storeData?.store_name || storeData?.store_url || "Notre Boutique";

    // ✅ GÉNÉRATION DU TITRE SEO
    const mainKeyword = keywords.length > 0 ? keywords[0] : collectionTitles[0] || "Guide";

    const titlePrompt = `Génère un titre SEO optimisé de 50-70 caractères pour un article sur "${mainKeyword}". 
    Le titre doit être accrocheur, contenir le mot-clé principal et inciter au clic.
    Retourne UNIQUEMENT le titre, sans guillemets.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "Expert SEO spécialisé dans la création de titres percutants.",
          },
          { role: "user", content: titlePrompt },
        ],
      }),
    });

    const titleData = await titleResponse.json();
    const optimizedTitle =
      titleData.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || `Guide Complet : ${mainKeyword}`;

    console.log(`[GENERATE-BLOG-ARTICLE] Generated title: ${optimizedTitle}`);

    // ✅ GÉNÉRATION DU CONTENU TEXTUEL
    const wordCountTarget = parseInt(articleLength);
    const hasProducts = products.length > 0;

    const contentPrompt = `Tu es un expert SEO et rédacteur e-commerce. Crée un article professionnel en français d'environ ${wordCountTarget} mots.

CONTEXTE:
- Titre: ${optimizedTitle}
- Produits: ${products.length} produits à intégrer
- Mots-clés principaux: ${keywords.join(", ")}
- Longueur cible: ${wordCountTarget} mots
- Style: ${articleConfig?.style || "magazine"}
- Angle: ${articleConfig?.articleAngle || "guide"}
- Audience: ${articleConfig?.targetAudience || "general"}

PRODUITS À INTÉGRER:
${products
  .map(
    (p, i) => `
${i + 1}. "${p.title}"
   - Prix actuel: ${p.price} ${p.currency_code || "€"}
   ${p.compare_at_price ? `- Prix barré: ${p.compare_at_price} ${p.currency_code || "€"} (PROMO -${Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)}%)` : ''}
   - URL: ${storeUrl}/products/${p.handle}
   - Catégorie: ${p.category || p.product_type || "Non spécifiée"}
   - Type: ${p.product_type || "N/A"}
   - Vendeur: ${p.vendor || "N/A"}
   - Description courte: ${p.body_html?.replace(/<[^>]*>/g, "").substring(0, 200) || p.description || "Aucune description"}
   - Stock: ${p.inventory_quantity || 0} unités
`,
  )
  .join("")}

**INSTRUCTIONS CRITIQUES:**
- Mentionne EXACTEMENT les titres de produits tels quels entre guillemets
- Utilise les VRAIS PRIX indiqués ci-dessus
- Mets en avant les PROMOTIONS (-X%) s'il y en a
- Crée des liens contextuels vers les produits avec leurs handles exacts
- Intègre les informations de stock/disponibilité de manière naturelle
- Parle des produits de façon authentique et personnalisée

**STRUCTURE OBLIGATOIRE:**

1. INTRODUCTION (200-250 mots)
   - Accroche engageante avec mot-clé principal
   - Problème du lecteur + solution apportée
   - Présentation de l'expertise

2. CRITÈRES D'ACHAT (400-500 mots)
   - 3-4 critères essentiels avec explications détaillées
   - Conseils d'expert pour chaque critère
   - Intégration naturelle des mots-clés secondaires

3. GUIDE D'ACHAT (300 mots)
   - Tableau mental des différences
   - Recommandations par usage/budget
   - Conseils personnalisés

4. CONSEILS D'EXPERTS (250 mots)
   - Astuces pratiques
   - Erreurs à éviter
   - Meilleures pratiques

5. FAQ COMPLÈTE (300 mots)
   - 5-6 questions réellement posées par les acheteurs
   - Réponses détaillées et utiles
   - Mots-clés de question dans les réponses

6. CONCLUSION (150 mots)
   - Récapitulatif des points clés
   - Recommandation finale
   - Call-to-action fort

**RÈGLES CRITIQUES:**
- Densité de mots-clés: 1-2% naturellement intégrés
- Structure H2/H3 optimisée
- Ton: expert mais accessible
- Longueur des paragraphes: 2-4 lignes maximum
- Pas de language trop commercial - focus sur la valeur

Génère UNIQUEMENT le contenu textuel au format JSON avec ces clés:
{
  "introduction": "texte HTML avec paragraphes...",
  "criteres_achat": "texte HTML avec listes et explications...",
  "guide_achat": "texte HTML comparatif...",
  "conseils_experts": "texte HTML avec conseils pratiques...",
  "faq": "texte HTML avec questions/réponses...",
  "conclusion": "texte HTML de synthèse..."
}`;

    console.log("[GENERATE-BLOG-ARTICLE] Generating content with AI...");

    const contentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "Expert SEO générant du contenu textuel structuré en JSON. Pas de HTML de template.",
          },
          { role: "user", content: contentPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!contentResponse.ok) {
      const err = await contentResponse.text();
      throw new Error(`AI Error: ${err}`);
    }

    const result = await contentResponse.json();
    let aiContent = result.choices[0]?.message?.content?.trim() || "";

    // Nettoyer et parser le JSON
    aiContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    let textBlocks;
    try {
      textBlocks = JSON.parse(aiContent);
      console.log("[GENERATE-BLOG-ARTICLE] Successfully parsed AI content");
    } catch (parseError) {
      console.error("[GENERATE-BLOG-ARTICLE] JSON parsing error:", parseError);
      // Fallback content
      textBlocks = {
        introduction: `<p>Découvrez notre guide expert pour bien choisir ${mainKeyword}. Nous avons analysé les meilleures options du marché pour vous aider à faire le bon choix.</p>`,
        criteres_achat: `<p>Les critères essentiels incluent la qualité des matériaux, la durabilité et le rapport qualité-prix.</p>`,
        guide_achat: `<p>Notre comparatif vous aide à identifier l'option qui correspond le mieux à vos besoins.</p>`,
        conseils_experts: `<p>Voici nos conseils pratiques pour optimiser votre achat.</p>`,
        faq: `<div class="faq-item"><h3>Question fréquente ?</h3><p>Réponse détaillée.</p></div>`,
        conclusion: `<p>En conclusion, prenez le temps d'analyser vos besoins avant de choisir.</p>`,
      };
    }

    // ✅ GÉNÉRATION DU HTML COMPLET
    const generateProductCards = () => {
      if (!hasProducts) return "";

      return products
        .map((product, index) => {
          const hasPromotion = product.compare_at_price && product.compare_at_price > product.price;
          const discount =
            hasPromotion && product.compare_at_price
              ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
              : 0;

          const productUrl = storeUrl ? `${storeUrl}/products/${product.handle}` : "#";
          
          // Fallback intelligent pour l'image
          const mainImage = product.image_url || 
                            (product.images && product.images.length > 0 ? product.images[0].src : null) ||
                            `https://via.placeholder.com/300x300?text=${encodeURIComponent(product.title)}`;
          
          // Description enrichie
          const productDescription = product.body_html?.replace(/<[^>]*>/g, "").substring(0, 150) || 
                                    product.description?.substring(0, 150) || 
                                    `Découvrez ${product.title} disponible chez ${storeName}`;
          
          // Badge de stock
          const stockBadge = product.inventory_quantity > 0 
            ? `<div class="stock-badge in-stock">✓ En stock (${product.inventory_quantity})</div>` 
            : `<div class="stock-badge limited">⚠ Stock limité</div>`;

          return `
          <div class="product-card" itemscope itemtype="https://schema.org/Product">
            <div class="product-badges">
              ${hasPromotion ? `<span class="discount-badge">-${discount}%</span>` : ""}
              ${index === 0 ? `<span class="featured-badge">⭐ Choix expert</span>` : ""}
            </div>
            ${stockBadge}
            
            <div class="product-image">
              <a href="${productUrl}" target="_blank" rel="noopener sponsored">
                <img src="${mainImage}" 
                     alt="${product.title}" 
                     loading="lazy" 
                     width="300" 
                     height="300"
                     itemprop="image">
              </a>
            </div>
            
            <div class="product-content">
              <h3 class="product-title" itemprop="name">${product.title}</h3>
              
              ${
                product.category
                  ? `
              <div class="product-category" itemprop="category">${product.category}</div>
              `
                  : ""
              }
              
              <div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
                ${
                  hasPromotion
                    ? `
                  <span class="original-price">
                    <del>${product.compare_at_price?.toFixed(2)} ${product.currency_code || "€"}</del>
                  </span>
                `
                    : ""
                }
                <span class="current-price" itemprop="price" content="${product.price}">
                  ${product.price.toFixed(2)} ${product.currency_code || "€"}
                </span>
                <meta itemprop="priceCurrency" content="${product.currency_code || "EUR"}">
              </div>
              
              ${
                productDescription
                  ? `
              <div class="product-description" itemprop="description">
                ${productDescription}...
              </div>
              `
                  : ""
              }
              
              <div class="product-actions">
                <a href="${productUrl}" 
                   class="product-cta primary-cta" 
                   target="_blank" 
                   rel="noopener sponsored"
                   itemprop="url">
                  👀 Voir le produit
                </a>
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    };

    const productCardsHTML = generateProductCards();

    // ✅ CONFIGURATION DU TEMPLATE
    const primaryColor = articleConfig?.colorScheme || "#2563eb";
    const primaryColorRgb = "37, 99, 235";
    const layout = articleConfig?.layout || "2-colonnes";
    const typography = articleConfig?.typography || "sans-serif";

    const layoutConfig = {
      "1-colonne": { tocColumns: 1, productColumns: 1, maxWidth: "800px" },
      "2-colonnes": { tocColumns: 2, productColumns: 2, maxWidth: "1000px" },
      "3-colonnes": { tocColumns: 2, productColumns: 3, maxWidth: "1200px" },
    };

    const currentLayout = layoutConfig[layout as keyof typeof layoutConfig] || layoutConfig["2-colonnes"];

    // ✅ GÉNÉRATION DU HTML FINAL
    const finalHtml = `<!DOCTYPE html>
<html lang="fr" itemscope itemtype="https://schema.org/Article">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${optimizedTitle} | Guide d'achat Expert</title>
  <meta name="description" content="Guide complet pour bien choisir ${mainKeyword}. Comparatif expert, conseils d'achat et selection des meilleurs produits.">
  <meta name="keywords" content="${keywords.join(", ")}, guide d'achat, comparatif, avis expert">
  
  <style>
    :root {
      --primary-color: ${primaryColor};
      --primary-rgb: ${primaryColorRgb};
      --text-primary: #1f2937;
      --text-secondary: #4b5563;
      --bg-white: #ffffff;
      --bg-gray: #f8fafc;
      --border-light: #e5e7eb;
      --font-family: ${typography === "serif" ? "Georgia, serif" : "system-ui, sans-serif"};
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-family); line-height: 1.7; color: var(--text-primary); background: var(--bg-white); margin: 0; padding: 20px; }
    .blog-article { max-width: ${currentLayout.maxWidth}; margin: 0 auto; }
    
    h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 1rem 0; color: #000; }
    h2 { font-size: 2rem; font-weight: 700; margin: 2.5rem 0 1.25rem 0; color: #000; }
    h3 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem 0; color: #2d3748; }
    p { margin: 0 0 1.5rem 0; font-size: 1.125rem; line-height: 1.7; color: var(--text-secondary); }
    
    .article-header { text-align: center; margin: 0 0 3rem 0; padding: 2rem 0; }
    .article-meta { display: flex; gap: 1rem; justify-content: center; color: #6b7280; font-size: 0.875rem; margin: 1rem 0 0 0; }
    
    .toc-container { background: linear-gradient(135deg, var(--primary-color), #7c3aed); color: white; padding: 2rem; border-radius: 16px; margin: 0 0 3rem 0; }
    .toc-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem 0; }
    .toc-list { columns: ${currentLayout.tocColumns}; gap: 2rem; }
    .toc-list a { color: white; text-decoration: none; font-weight: 500; display: block; padding: 0.5rem 0; }
    .toc-list a:hover { text-decoration: underline; }
    
    .article-section { margin: 0 0 4rem 0; }
    
    .products-section { background: var(--bg-gray); padding: 2.5rem 1.5rem; border-radius: 16px; margin: 3rem 0; }
    .product-grid { display: grid; grid-template-columns: repeat(${currentLayout.productColumns}, 1fr); gap: 2rem; margin: 2rem 0 0 0; }
    
    .product-card { background: var(--bg-white); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s ease; border: 1px solid var(--border-light); position: relative; }
    .product-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
    
    .discount-badge { position: absolute; top: 1rem; right: 1rem; background: #ef4444; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 700; z-index: 10; }
    .featured-badge { position: absolute; top: 1rem; left: 1rem; background: #f59e0b; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 700; z-index: 10; }
    
    .stock-badge { position: absolute; top: 3.5rem; right: 1rem; padding: 0.375rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; z-index: 10; background: rgba(255,255,255,0.95); backdrop-filter: blur(4px); }
    .stock-badge.in-stock { color: #10b981; border: 1px solid #10b981; }
    .stock-badge.limited { color: #f59e0b; border: 1px solid #f59e0b; }
    
    .product-image img { width: 100%; height: 250px; object-fit: cover; transition: transform 0.3s ease; }
    .product-card:hover .product-image img { transform: scale(1.05); }
    
    .product-content { padding: 1.5rem; }
    .product-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; }
    .product-category { display: inline-block; background: var(--bg-gray); color: var(--text-secondary); padding: 0.375rem 0.75rem; border-radius: 20px; font-size: 0.75rem; margin: 0 0 1rem 0; }
    .current-price { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
    .original-price { text-decoration: line-through; color: #9ca3af; margin: 0 0.5rem 0 0; }
    .product-description { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.5rem 0; }
    
    .product-cta { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.2s ease; }
    .product-cta:hover { opacity: 0.9; transform: translateY(-1px); }
    
    .faq-item { background: var(--bg-white); border-radius: 12px; margin: 0 0 1rem 0; border: 1px solid var(--border-light); overflow: hidden; }
    .faq-question { padding: 1.5rem; background: var(--bg-white); cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .faq-answer { padding: 0 1.5rem 1.5rem; color: var(--text-secondary); line-height: 1.6; }
    
    @media (max-width: 768px) {
      .product-grid { grid-template-columns: 1fr; }
      .toc-list { columns: 1; }
      h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <article class="blog-article" itemprop="articleBody">
    <header class="article-header">
      <h1 itemprop="headline">${optimizedTitle}</h1>
      <div class="article-meta">
        <span>Publié le ${new Date().toLocaleDateString("fr-FR")}</span>
        <span>• ⏱️ ${Math.ceil(wordCountTarget / 200)} min de lecture</span>
        ${hasProducts ? `<span>• 📊 ${products.length} produits analysés</span>` : ""}
      </div>
    </header>

    <nav class="toc-container" aria-label="Table des matières">
      <div class="toc-title">📑 Table des matières</div>
      <div class="toc-list">
        <ol>
          <li><a href="#introduction">Introduction</a></li>
          <li><a href="#criteres-achat">Critères d'achat</a></li>
          ${hasProducts ? `<li><a href="#selection-produits">Notre sélection</a></li>` : ""}
          <li><a href="#guide-achat">Guide d'achat</a></li>
          <li><a href="#conseils-experts">Conseils d'experts</a></li>
          <li><a href="#faq">Questions fréquentes</a></li>
          <li><a href="#conclusion">Conclusion</a></li>
        </ol>
      </div>
    </nav>

    <section id="introduction" class="article-section">
      <h2>Introduction</h2>
      ${textBlocks.introduction || "<p>Découvrez notre guide complet pour faire le meilleur choix.</p>"}
    </section>

    <section id="criteres-achat" class="article-section">
      <h2>Critères d'achat essentiels</h2>
      ${textBlocks.criteres_achat || "<p>Les critères essentiels pour faire le bon choix.</p>"}
    </section>

    ${
      hasProducts
        ? `
    <section id="selection-produits" class="products-section">
      <h2>Notre sélection de produits</h2>
      <p>Découvrez notre sélection expert basée sur des critères rigoureux et l'analyse des avis clients.</p>
      <div class="product-grid">
        ${productCardsHTML}
      </div>
    </section>
    `
        : ""
    }

    <section id="guide-achat" class="article-section">
      <h2>Guide d'achat comparatif</h2>
      ${textBlocks.guide_achat || "<p>Notre analyse comparative pour vous aider à choisir.</p>"}
    </section>

    <section id="conseils-experts" class="article-section">
      <h2>Conseils d'experts</h2>
      ${textBlocks.conseils_experts || "<p>Nos conseils pratiques pour optimiser votre achat.</p>"}
    </section>

    <section id="faq" class="article-section">
      <h2>Questions fréquentes</h2>
      ${textBlocks.faq || "<p>Réponses aux questions les plus courantes.</p>"}
    </section>

    <section id="conclusion" class="article-section">
      <h2>Conclusion</h2>
      ${textBlocks.conclusion || "<p>Synthèse et recommandations finales.</p>"}
    </section>
  </article>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // FAQ Accordéon
      const faqQuestions = document.querySelectorAll('.faq-question');
      faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
          const answer = this.nextElementSibling;
          const isOpen = answer.style.display === 'block';
          answer.style.display = isOpen ? 'none' : 'block';
        });
      });

      // Smooth scroll
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    });
  </script>
</body>
</html>`;

    // ✅ GÉNÉRATION DE L'IMAGE FEATURED (optionnelle)
    let featuredImage = null;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (OPENAI_API_KEY && products.length > 0) {
      try {
        const imagePrompt = `Professional e-commerce hero image for an article about ${mainKeyword}, modern minimalist design, clean background, high quality product photography, blog featured image style, 16:9 ratio`;

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
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
          console.log("[GENERATE-BLOG-ARTICLE] Featured image generated");
        }
      } catch (imgErr) {
        console.error("[GENERATE-BLOG-ARTICLE] Image generation error:", imgErr);
        // Fallback to first product image
        featuredImage = products[0]?.image_url || null;
      }
    } else {
      featuredImage = products[0]?.image_url || null;
    }

    // ✅ VALIDATION DE LA QUALITÉ DE L'ARTICLE
    const validateArticleQuality = (html: string, productsCount: number) => {
      const issues = [];
      
      if (!html.includes('product-card')) {
        issues.push('Aucune carte produit détectée');
      }
      
      if (productsCount > 0 && !html.includes('product-price')) {
        issues.push('Prix des produits manquants');
      }
      
      if (html.length < 5000) {
        issues.push(`Article trop court (${html.length} caractères)`);
      }
      
      if (!html.includes('</h2>')) {
        issues.push('Structure de titres manquante');
      }
      
      if (issues.length > 0) {
        console.warn('[GENERATE-BLOG-ARTICLE] ⚠️ Quality issues detected:', issues);
      } else {
        console.log('[GENERATE-BLOG-ARTICLE] ✅ Quality validation passed');
      }
      
      return { 
        valid: issues.length === 0, 
        issues,
        score: Math.max(0, 100 - (issues.length * 25))
      };
    };

    const qualityCheck = validateArticleQuality(finalHtml, products.length);
    console.log('[GENERATE-BLOG-ARTICLE] Quality check:', {
      valid: qualityCheck.valid,
      score: qualityCheck.score,
      htmlLength: finalHtml.length,
      productCards: (finalHtml.match(/product-card/g) || []).length,
      h2Count: (finalHtml.match(/<h2>/g) || []).length
    });

    // ✅ SAUVEGARDE DE L'ARTICLE
    const { data: savedArticle, error: saveError } = await supabaseClient
      .from("blog_articles")
      .insert([
        {
          user_id: user_id,
          store_id: store_id,
          title: optimizedTitle,
          content: finalHtml,
          featured_image: featuredImage,
          meta_description: `Guide complet : ${optimizedTitle}. Comparatif expert, conseils d'achat et sélection des meilleurs produits.`,
          keywords: [...keywords, mainKeyword].slice(0, 15),
          status: "draft",
          source: "ai_generated",
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("[GENERATE-BLOG-ARTICLE] Save error:", saveError);
      throw saveError;
    }

    console.log(`[GENERATE-BLOG-ARTICLE] Article saved: ${savedArticle.id}`);

    // ✅ MISE À JOUR DU COMPTEUR D'USAGE
    await supabaseClient.rpc("increment_usage", {
      p_seller_id: user_id,
      p_field: "articles_count",
      p_increment: 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        article_id: savedArticle.id,
        article: savedArticle,
        featured_image: featuredImage,
        message: "Article généré avec succès",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[GENERATE-BLOG-ARTICLE] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
