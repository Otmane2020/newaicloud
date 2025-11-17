// generate-template.ts - REMPLACER l'ancien template
export function generateSEOArticleTemplate(config: TemplateConfig & { content?: any }): string {
  const {
    primaryColor = '#2563eb',
    primaryColorRgb = '37, 99, 235',
    layout = { tocColumns: 2, productColumns: 3, maxWidth: '1200px' },
    typography = 'sans-serif',
    products = [],
    storeUrl = '',
    title,
    language: lang,
    wordCount = 2000,
    collectionTitle,
    category,
    keywords = [],
    featuredImage,
    content // Contenu généré par l'IA
  } = config;

  const hasProducts = products.length > 0;
  const readingTime = Math.ceil(wordCount / 200);

  // ✅ GÉNÉRATION DES CARTES PRODUITS AVEC SCHEMA.ORG
  const generateProductCards = () => {
    if (!hasProducts) return '';

    return products.map((product, index) => {
      const hasPromotion = product.compare_at_price && product.compare_at_price > product.price;
      const discount = hasPromotion && product.compare_at_price
        ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        : 0;
      
      const productUrl = storeUrl ? `${storeUrl}/products/${product.handle}` : '#';
      const mainImage = product.image_url || (product.images?.[0]?.src || '/placeholder.jpg');
      const productDescription = product.body_html?.replace(/<[^>]*>/g, '').substring(0, 150) || product.description || '';

      return `
        <div class="product-card" itemscope itemtype="https://schema.org/Product">
          <div class="product-badges">
            ${hasPromotion ? `<span class="discount-badge">-${discount}%</span>` : ''}
            ${index === 0 ? `<span class="featured-badge">⭐ Choix expert</span>` : ''}
          </div>
          
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
            
            ${product.category ? `
            <div class="product-category" itemprop="category">${product.category}</div>
            ` : ''}
            
            <div class="product-rating">
              <div class="stars">★★★★★</div>
              <span class="rating-text">(Note: 4.5/5)</span>
            </div>
            
            <div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              ${hasPromotion ? `
                <span class="original-price">
                  <del>${product.compare_at_price?.toFixed(2)} ${product.currency_code || '€'}</del>
                </span>
              ` : ''}
              <span class="current-price" itemprop="price" content="${product.price}">
                ${product.price.toFixed(2)} ${product.currency_code || '€'}
              </span>
              <meta itemprop="priceCurrency" content="${product.currency_code || 'EUR'}">
            </div>
            
            ${productDescription ? `
            <div class="product-description" itemprop="description">
              ${productDescription}...
            </div>
            ` : ''}
            
            <div class="product-features">
              <div class="feature">
                <span class="feature-icon">🚚</span>
                Livraison rapide
              </div>
              <div class="feature">
                <span class="feature-icon">↩️</span>
                Retour facile
              </div>
            </div>
            
            <div class="product-actions">
              <a href="${productUrl}" 
                 class="product-cta primary-cta" 
                 target="_blank" 
                 rel="noopener sponsored"
                 itemprop="url">
                👀 Voir le produit
              </a>
              <button class="product-cta secondary-cta" onclick="alert('Produit ajouté aux favoris')">
                💖 Sauvegarder
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const productCardsHTML = generateProductCards();

  // ✅ STRUCTURED DATA COMPLET
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": `Guide expert complet pour choisir les meilleurs ${keywords[0] || category}. Comparatif détaillé, avis et conseils d'achat ${new Date().getFullYear()}.`,
    "author": {
      "@type": "Organization",
      "name": "Équipe Éditoriale"
    },
    "publisher": {
      "@type": "Organization",
      "name": storeUrl?.replace('https://', '') || 'Expert Boutique',
      "logo": {
        "@type": "ImageObject",
        "url": `${storeUrl}/logo.png`
      }
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${storeUrl}/blog/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    },
    "articleSection": category,
    "keywords": keywords.join(', '),
    "wordCount": wordCount,
    "timeRequired": `PT${readingTime}M`,
    ...(hasProducts && {
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": products.length,
        "itemListElement": products.map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.title,
            "image": product.image_url,
            "description": product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200),
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": product.currency_code || "EUR",
              "availability": "https://schema.org/InStock"
            }
          }
        }))
      }
    })
  };

  return `<!DOCTYPE html>
<html lang="${lang.code}" itemscope itemtype="https://schema.org/Article">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Guide d'achat Expert ${new Date().getFullYear()}</title>
  
  <!-- META DESCRIPTION OPTIMISÉE -->
  <meta name="description" content="🚀 Guide complet ${new Date().getFullYear()} : Découvrez notre sélection expert des meilleurs ${keywords[0] || category}. Comparatif détaillé, avis réels, conseils d'achat et promotions exclusives. ✅ Livraison rapide.">
  
  <!-- KEYWORDS -->
  <meta name="keywords" content="${keywords.join(', ')}, avis, test, comparatif, guide d'achat, meilleur ${keywords[0] || category}, prix, promotion">
  
  <!-- OPEN GRAPH -->
  <meta property="og:title" content="${title} | Guide Expert ${new Date().getFullYear()}">
  <meta property="og:description" content="Découvrez notre sélection des meilleurs ${keywords[0] || category}. Guide d'achat complet avec comparatif et avis.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${storeUrl}/blog/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">
  ${featuredImage ? `<meta property="og:image" content="${featuredImage}">` : ''}
  
  <!-- TWITTER CARD -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="Guide complet pour choisir le meilleur ${keywords[0] || category}">
  
  <!-- STRUCTURED DATA -->
  <script type="application/ld+json">
  ${JSON.stringify(structuredData)}
  </script>
  
  <!-- FAVICON & THEME -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>">
  <meta name="theme-color" content="${primaryColor}">

  <style>
    /* ===== RESET & VARIABLES ===== */
    :root {
      --primary-color: ${primaryColor};
      --primary-rgb: ${primaryColorRgb};
      --text-primary: #1f2937;
      --text-secondary: #4b5563;
      --text-muted: #6b7280;
      --bg-white: #ffffff;
      --bg-gray: #f8fafc;
      --bg-gray-50: #f9fafb;
      --border-light: #e5e7eb;
      --border-medium: #d1d5db;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --radius: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --font-family: ${typography === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
      font-size: 16px;
    }

    body {
      font-family: var(--font-family);
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--bg-white);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeSpeed;
    }

    /* ===== TYPOGRAPHY MOBILE-FIRST ===== */
    h1 {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 1rem 0;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.3;
      margin: 2.5rem 0 1.25rem 0;
      color: var(--text-primary);
      scroll-margin-top: 2rem;
      position: relative;
    }

    h2::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(135deg, var(--primary-color), #7c3aed);
      border-radius: 2px;
    }

    h3 {
      font-size: 1.375rem;
      font-weight: 600;
      line-height: 1.4;
      margin: 2rem 0 1rem 0;
      color: var(--text-primary);
    }

    h4 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem 0;
      color: var(--text-secondary);
    }

    p {
      margin: 0 0 1.5rem 0;
      font-size: 1.0625rem;
      line-height: 1.7;
      color: var(--text-secondary);
    }

    /* ===== LAYOUT ===== */
    .blog-article {
      max-width: min(100% - 2rem, ${layout.maxWidth});
      margin: 0 auto;
      padding: 1rem 0;
    }

    /* ===== HEADER ===== */
    .article-header {
      text-align: center;
      margin: 0 0 3rem 0;
      padding: 2rem 0 3rem 0;
      background: linear-gradient(135deg, var(--bg-gray) 0%, var(--bg-white) 100%);
      border-bottom: 1px solid var(--border-light);
    }

    .featured-image {
      width: 100%;
      height: auto;
      max-height: 400px;
      object-fit: cover;
      border-radius: var(--radius-xl);
      margin: 0 auto 2rem auto;
      box-shadow: var(--shadow-xl);
      display: block;
    }

    .article-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      align-items: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 1.5rem 0 0 0;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-white);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    /* ===== TABLE OF CONTENTS ===== */
    .toc-container {
      background: linear-gradient(135deg, var(--primary-color) 0%, #7c3aed 100%);
      color: white;
      padding: 2rem;
      border-radius: var(--radius-xl);
      margin: 0 0 3rem 0;
      box-shadow: var(--shadow-lg);
      position: relative;
      overflow: hidden;
    }

    .toc-container::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 100px;
      height: 100px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      transform: translate(30px, -30px);
    }

    .toc-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 1.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
      z-index: 2;
    }

    .toc-list {
      columns: 1;
      gap: 1rem;
      position: relative;
      z-index: 2;
    }

    .toc-list ol {
      margin: 0;
      padding-left: 1.25rem;
    }

    .toc-list li {
      margin: 0.75rem 0;
      break-inside: avoid;
    }

    .toc-list a {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;
      display: block;
      padding: 0.5rem 0;
      font-size: 1rem;
      position: relative;
    }

    .toc-list a:hover {
      transform: translateX(5px);
      text-decoration: underline;
    }

    /* ===== SECTIONS ===== */
    .article-section {
      margin: 0 0 4rem 0;
      padding: 0 0 2rem 0;
    }

    .section-intro {
      font-size: 1.125rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin: 0 0 2rem 0;
      padding: 1.5rem;
      background: var(--bg-gray-50);
      border-radius: var(--radius-lg);
      border-left: 4px solid var(--primary-color);
    }

    /* ===== PRODUCTS SECTION ===== */
    .products-section {
      background: var(--bg-gray);
      padding: 2.5rem 1.5rem;
      border-radius: var(--radius-xl);
      margin: 3rem 0;
      position: relative;
    }

    .products-header {
      text-align: center;
      margin: 0 0 2rem 0;
    }

    .products-subtitle {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin: 0.5rem 0 0 0;
    }

    .product-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      margin: 2rem 0 0 0;
    }

    .product-card {
      background: var(--bg-white);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      transition: all 0.3s ease;
      border: 1px solid var(--border-light);
      position: relative;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: var(--shadow-xl);
    }

    .product-badges {
      position: absolute;
      top: 1rem;
      left: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
      z-index: 10;
    }

    .discount-badge {
      background: #ef4444;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .featured-badge {
      background: #f59e0b;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .product-image {
      position: relative;
      overflow: hidden;
    }

    .product-image img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-card:hover .product-image img {
      transform: scale(1.05);
    }

    .product-content {
      padding: 1.5rem;
    }

    .product-title {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .product-category {
      display: inline-block;
      background: var(--bg-gray);
      color: var(--text-muted);
      padding: 0.375rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0 0 1rem 0;
    }

    .product-rating {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem 0;
    }

    .stars {
      color: #fbbf24;
      font-size: 1rem;
    }

    .rating-text {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .product-price {
      margin: 0 0 1rem 0;
    }

    .original-price {
      text-decoration: line-through;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0 0.5rem 0 0;
    }

    .current-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .product-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }

    .product-features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 0 0 1.5rem 0;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .feature-icon {
      font-size: 0.875rem;
    }

    .product-actions {
      display: flex;
      gap: 0.75rem;
    }

    .product-cta {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
    }

    .primary-cta {
      background: var(--primary-color);
      color: white;
    }

    .primary-cta:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .secondary-cta {
      background: var(--bg-gray);
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
    }

    .secondary-cta:hover {
      background: var(--border-light);
    }

    /* ===== FAQ ===== */
    .faq-section {
      background: var(--bg-gray);
      padding: 2.5rem 1.5rem;
      border-radius: var(--radius-xl);
      margin: 3rem 0;
    }

    .faq-item {
      background: var(--bg-white);
      border-radius: var(--radius-lg);
      margin: 0 0 1rem 0;
      border: 1px solid var(--border-light);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .faq-item:hover {
      box-shadow: var(--shadow-md);
    }

    .faq-question {
      padding: 1.5rem;
      background: var(--bg-white);
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-primary);
      font-size: 1.0625rem;
      transition: background-color 0.2s ease;
    }

    .faq-question:hover {
      background: var(--bg-gray-50);
    }

    .faq-answer {
      padding: 0 1.5rem 1.5rem;
      color: var(--text-secondary);
      line-height: 1.6;
      display: none;
    }

    .faq-answer.active {
      display: block;
    }

    /* ===== COMPARISON TABLE ===== */
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      background: var(--bg-white);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-md);
    }

    .comparison-table th,
    .comparison-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-light);
    }

    .comparison-table th {
      background: var(--bg-gray);
      font-weight: 600;
      color: var(--text-primary);
    }

    .comparison-table tr:last-child td {
      border-bottom: none;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (min-width: 768px) {
      html {
        font-size: 18px;
      }

      .blog-article {
        padding: 2rem 0;
      }

      h1 {
        font-size: 3rem;
      }

      h2 {
        font-size: 2.25rem;
      }

      .toc-list {
        columns: ${layout.tocColumns};
      }

      .product-grid {
        grid-template-columns: repeat(${Math.min(layout.productColumns, 2)}, 1fr);
      }

      .article-header {
        padding: 3rem 0 4rem 0;
      }
    }

    @media (min-width: 1024px) {
      .product-grid {
        grid-template-columns: repeat(${layout.productColumns}, 1fr);
      }

      h1 {
        font-size: 3.5rem;
      }
    }

    /* ===== ACCESSIBILITY ===== */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      html {
        scroll-behavior: auto;
      }
    }

    /* ===== FOCUS INDICATORS ===== */
    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      border-radius: var(--radius);
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      .product-cta,
      .toc-container,
      .faq-question {
        display: none;
      }
      
      .blog-article {
        max-width: none;
        padding: 0;
      }
      
      .product-card {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #000;
      }
    }
  </style>
</head>
<body>
  <article class="blog-article" itemprop="articleBody">
    <!-- Header -->
    <header class="article-header">
      ${featuredImage ? `
        <img src="${featuredImage}" 
             alt="${title}" 
             class="featured-image"
             loading="eager"
             width="1200" 
             height="630"
             itemprop="image">` : ''}
      
      <h1 itemprop="headline">${title}</h1>
      
      <div class="article-meta">
        <div class="meta-item">
          <span>📅</span>
          <span>${lang.publishedOn} <time datetime="${new Date().toISOString()}" itemprop="datePublished">${new Date().toLocaleDateString(lang.code)}</time></span>
        </div>
        <div class="meta-item">
          <span>⏱️</span>
          <span>${readingTime} ${lang.minRead}</span>
        </div>
        ${hasProducts ? `
        <div class="meta-item">
          <span>📊</span>
          <span>${products.length} produits analysés</span>
        </div>
        ` : ''}
        <div class="meta-item">
          <span>⭐</span>
          <span>Guide mis à jour ${new Date().getFullYear()}</span>
        </div>
      </div>
    </header>

    <!-- Table of Contents -->
    <nav class="toc-container" aria-label="Table des matières">
      <div class="toc-title">
        <span>📑</span>
        ${lang.toc}
      </div>
      <div class="toc-list">
        <ol>
          <li><a href="#introduction">${lang.intro}</a></li>
          <li><a href="#pourquoi-guide">🎯 Pourquoi ce guide est essentiel</a></li>
          <li><a href="#criteres-achat">📋 ${lang.criteria}</a></li>
          ${hasProducts ? `<li><a href="#selection-produits">🏆 ${lang.selection}</a></li>` : ''}
          <li><a href="#guide-achat">📊 ${lang.comparison}</a></li>
          <li><a href="#conseils-experts">💎 ${lang.advice}</a></li>
          <li><a href="#faq">❓ ${lang.faq}</a></li>
          <li><a href="#conclusion">✅ ${lang.conclusion}</a></li>
        </ol>
      </div>
    </nav>

    <!-- Introduction -->
    <section id="introduction" class="article-section">
      <h2>${lang.intro}</h2>
      <div class="section-intro">
        Découvrez notre guide complet ${new Date().getFullYear()} pour faire le meilleur choix. Analyse détaillée, comparatif et conseils d'experts.
      </div>
      <div itemprop="articleBody">${content?.introduction || '[Introduction optimisée SEO]'}</div>
    </section>

    <!-- Pourquoi ce guide -->
    <section id="pourquoi-guide" class="article-section">
      <h2>🎯 Pourquoi ce guide est essentiel</h2>
      <div>${content?.pourquoi_guide || '[Valeur unique et expertise]'}</div>
    </section>

    <!-- Critères d'achat -->
    <section id="criteres-achat" class="article-section">
      <h2>📋 ${lang.criteria}</h2>
      <div>${content?.criteres_achat || '[Critères détaillés d\\'évaluation]'}</div>
    </section>

    <!-- Sélection de produits -->
    ${hasProducts ? `
    <section id="selection-produits" class="products-section">
      <div class="products-header">
        <h2>🏆 ${lang.selection}${collectionTitle ? ` - ${collectionTitle}` : ''}</h2>
        <p class="products-subtitle">Notre sélection expert ${new Date().getFullYear()} basée sur des tests rigoureux et l'analyse des avis clients</p>
      </div>
      
      <div class="product-grid">
        ${productCardsHTML}
      </div>
    </section>
    ` : ''}

    <!-- Guide d'achat -->
    <section id="guide-achat" class="article-section">
      <h2>📊 ${lang.comparison}</h2>
      <div>${content?.guide_achat || '[Guide comparatif détaillé]'}</div>
    </section>

    <!-- Conseils d'experts -->
    <section id="conseils-experts" class="article-section">
      <h2>💎 ${lang.advice}</h2>
      <div>${content?.conseils_experts || '[Conseils pratiques et astuces]'}</div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="faq-section">
      <h2>❓ ${lang.faq}</h2>
      <div class="faq-content">
        ${content?.faq || '[Questions fréquentes avec réponses détaillées]'}
      </div>
    </section>

    <!-- Conclusion -->
    <section id="conclusion" class="article-section">
      <h2>✅ ${lang.conclusion}</h2>
      <div>${content?.conclusion || '[Synthèse et recommandations finales]'}</div>
    </section>
  </article>

  <script>
    // FAQ Accordéon
    document.addEventListener('DOMContentLoaded', function() {
      const faqQuestions = document.querySelectorAll('.faq-question');
      
      faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
          const answer = this.nextElementSibling;
          const isOpen = answer.style.display === 'block';
          
          // Fermer toutes les réponses
          document.querySelectorAll('.faq-answer').forEach(ans => {
            ans.style.display = 'none';
          });
          
          // Ouvrir/fermer la réponse actuelle
          answer.style.display = isOpen ? 'none' : 'block';
          this.setAttribute('aria-expanded', !isOpen);
        });
      });

      // Smooth scroll pour les ancres
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });

      // Analytics pour les clics produits
      document.querySelectorAll('.product-cta').forEach(button => {
        button.addEventListener('click', function(e) {
          const productName = this.closest('.product-card').querySelector('.product-title').textContent;
          console.log('Produit cliqué:', productName);
          // Ici vous pouvez ajouter Google Analytics ou autre tracking
        });
      });
    });

    // Performance: Lazy loading des images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  </script>
</body>
</html>`;
}