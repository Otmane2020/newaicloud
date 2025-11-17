// Type definitions
interface Product {
  id?: string;
  title: string;
  price: number;
  compare_at_price?: number;
  handle?: string;
  image_url?: string;
  images?: { src: string }[];
  category?: string;
  currency_code?: string;
  body_html?: string;
}

interface TemplateConfig {
  primaryColor: string;
  primaryColorRgb: string;
  layout: any; // Can be string or object with maxWidth, tocColumns, productColumns
  typography: string;
  products: Product[];
  storeUrl?: string;
  title: string;
  language: any;
  wordCount: number;
  collectionTitle?: string;
  category?: string;
  keywords: string[];
  featuredImage?: string;
  content?: any;
}

// Nouvelle fonction generateHTMLTemplate améliorée
export function generateSEOHTMLTemplate(config: TemplateConfig): string {
  const {
    primaryColor,
    primaryColorRgb,
    layout,
    typography,
    products,
    storeUrl,
    title,
    language: lang,
    wordCount,
    collectionTitle,
    category,
    keywords,
    featuredImage,
    content, // Contenu textuel généré par l'IA
  } = config;

  const hasProducts = products.length > 0;

  // ✅ GÉNÉRATION DE CARTES PRODUITS MOBILE-FIRST
  const generateProductCards = (products: Product[]) => {
    return products
      .map((product) => {
        const hasPromotion = product.compare_at_price && product.compare_at_price > product.price;
        const discount =
          hasPromotion && product.compare_at_price
            ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
            : 0;

        const productUrl = storeUrl ? `${storeUrl}/products/${product.handle}` : "#";
        const mainImage = product.image_url || product.images?.[0]?.src || "/placeholder.jpg";

        return `
        <div class="product-card" itemscope itemtype="https://schema.org/Product">
          ${hasPromotion ? `<div class="promotion-badge" aria-label="Promotion de ${discount} pourcent">-${discount}%</div>` : ""}
          
          <div class="product-image">
            <a href="${productUrl}" target="_blank" rel="noopener sponsored" aria-label="Voir le produit ${product.title}">
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
                <span class="original-price" aria-hidden="true">
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
              product.body_html
                ? `
            <div class="product-description" itemprop="description">
              ${product.body_html.replace(/<[^>]*>/g, "").substring(0, 120)}...
            </div>
            `
                : ""
            }
            
            <div class="product-actions">
              <a href="${productUrl}" 
                 class="product-cta" 
                 target="_blank" 
                 rel="noopener sponsored"
                 aria-label="Acheter ${product.title}"
                 itemprop="url">
                Voir le produit →
              </a>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  };

  const productCardsHTML = generateProductCards(products);

  return `<!DOCTYPE html>
<html lang="${lang.code}" itemscope itemtype="https://schema.org/Article">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Guide d'achat expert</title>
  <meta name="description" content="Guide complet et expert pour bien choisir ${keywords[0] || category}. Comparatif, conseils et sélection des meilleurs produits ${new Date().getFullYear()}.">
  <meta name="keywords" content="${keywords.join(", ")}, guide d'achat, comparatif, avis expert">
  <meta itemprop="name" content="${title}">
  <meta itemprop="description" content="Guide complet et expert pour bien choisir ${keywords[0] || category}">
  ${featuredImage ? `<meta itemprop="image" content="${featuredImage}">` : ""}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="Guide complet et expert pour bien choisir ${keywords[0] || category}">
  <meta property="og:type" content="article">
  ${featuredImage ? `<meta property="og:image" content="${featuredImage}">` : ""}
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "Guide complet et expert pour bien choisir ${keywords[0] || category}",
    "author": {
      "@type": "Organization",
      "name": "Équipe éditoriale"
    },
    "publisher": {
      "@type": "Organization",
      "name": "${storeUrl?.replace("https://", "") || "Notre Boutique"}",
      "logo": {
        "@type": "ImageObject",
        "url": "${storeUrl}/logo.png"
      }
    },
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${storeUrl}/blog/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"
    },
    "articleSection": "${category}",
    "keywords": "${keywords.join(", ")}"
  }
  </script>

  <style>
    /* RESET MOBILE-FIRST */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary-color: ${primaryColor};
      --primary-rgb: ${primaryColorRgb};
      --text-primary: #1a1a1a;
      --text-secondary: #4b5563;
      --text-muted: #6b7280;
      --bg-white: #ffffff;
      --bg-gray: #f8fafc;
      --border-light: #e5e7eb;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --radius: 8px;
      --radius-lg: 12px;
      --font-family: ${typography === "serif" ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: var(--font-family);
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--bg-white);
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeSpeed;
    }

    /* TYPOGRAPHY MOBILE-FIRST */
    h1 {
      font-size: 1.875rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 1rem 0;
      color: var(--text-primary);
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.3;
      margin: 2rem 0 1rem 0;
      color: var(--text-primary);
      scroll-margin-top: 2rem;
    }

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
      margin: 1.5rem 0 0.75rem 0;
      color: var(--text-primary);
    }

    p {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-secondary);
    }

    /* LAYOUT */
    .blog-article {
      max-width: min(100% - 2rem, ${layout.maxWidth});
      margin: 0 auto;
      padding: 1rem;
    }

    /* HEADER */
    .article-header {
      text-align: center;
      margin: 0 0 3rem 0;
      padding: 2rem 0;
      border-bottom: 1px solid var(--border-light);
    }

    .featured-image {
      width: 100%;
      height: auto;
      max-height: 400px;
      object-fit: cover;
      border-radius: var(--radius-lg);
      margin: 0 0 1.5rem 0;
      box-shadow: var(--shadow-md);
    }

    .article-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 1rem 0 0 0;
    }

    /* TABLE OF CONTENTS MOBILE */
    .toc-container {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-color));
      color: white;
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      margin: 0 0 2rem 0;
      box-shadow: var(--shadow-md);
    }

    .toc-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .toc-list {
      columns: 1;
      gap: 1rem;
    }

    .toc-list ol {
      margin: 0;
      padding-left: 1rem;
    }

    .toc-list li {
      margin: 0.5rem 0;
      break-inside: avoid;
    }

    .toc-list a {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
      display: block;
      padding: 0.25rem 0;
      font-size: 0.95rem;
    }

    .toc-list a:hover {
      opacity: 0.9;
      text-decoration: underline;
    }

    /* SECTIONS */
    .article-section {
      margin: 0 0 3rem 0;
      padding: 0 0 2rem 0;
      border-bottom: 1px solid var(--border-light);
    }

    .article-section:last-of-type {
      border-bottom: none;
    }

    /* PRODUCTS GRID MOBILE-FIRST */
    .products-section {
      background: var(--bg-gray);
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      margin: 2rem 0;
    }

    .product-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin: 1.5rem 0 0 0;
    }

    .product-card {
      background: var(--bg-white);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s ease;
      border: 1px solid var(--border-light);
      position: relative;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .promotion-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: #ef4444;
      color: white;
      padding: 0.375rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      z-index: 10;
    }

    .product-image {
      position: relative;
      overflow: hidden;
    }

    .product-image img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-card:hover .product-image img {
      transform: scale(1.05);
    }

    .product-content {
      padding: 1.25rem;
    }

    .product-title {
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.4;
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .product-category {
      display: inline-block;
      background: var(--bg-gray);
      color: var(--text-muted);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0 0 0.75rem 0;
    }

    .product-price {
      margin: 0 0 0.75rem 0;
    }

    .original-price {
      text-decoration: line-through;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0 0.5rem 0 0;
    }

    .current-price {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .product-description {
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1rem 0;
    }

    .product-actions {
      margin: 1rem 0 0 0;
    }

    .product-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: white;
      text-decoration: none;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
    }

    .product-cta:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    /* FAQ */
    .faq-section {
      background: var(--bg-gray);
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      margin: 2rem 0;
    }

    .faq-item {
      background: var(--bg-white);
      border-radius: var(--radius);
      margin: 0 0 1rem 0;
      border: 1px solid var(--border-light);
      overflow: hidden;
    }

    .faq-question {
      padding: 1rem 1.25rem;
      background: var(--bg-white);
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .faq-answer {
      padding: 0 1.25rem 1.25rem;
      color: var(--text-secondary);
      line-height: 1.6;
      font-size: 0.9rem;
      display: none;
    }

    .faq-answer.active {
      display: block;
    }

    /* RESPONSIVE DESKTOP */
    @media (min-width: 768px) {
      body {
        font-size: 18px;
      }

      .blog-article {
        padding: 2rem;
      }

      h1 {
        font-size: 3rem;
      }

      h2 {
        font-size: 2rem;
      }

      .toc-list {
        columns: ${layout.tocColumns};
      }

      .product-grid {
        grid-template-columns: repeat(${Math.min(layout.productColumns, 2)}, 1fr);
      }

      .article-header {
        padding: 3rem 0;
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

    /* PERFORMANCE OPTIMIZATIONS */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* FOCUS INDICATORS FOR ACCESSIBILITY */
    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    /* PRINT STYLES */
    @media print {
      .product-cta,
      .toc-container {
        display: none;
      }
      
      .blog-article {
        max-width: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <article class="blog-article" itemprop="articleBody">
    <header class="article-header">
      ${
        featuredImage
          ? `
        <img src="${featuredImage}" 
             alt="${title}" 
             class="featured-image"
             loading="eager"
             width="1200" 
             height="630">`
          : ""
      }
      
      <h1 itemprop="headline">${title}</h1>
      
      <div class="article-meta">
        <span>${lang.publishedOn} <time datetime="${new Date().toISOString()}">${new Date().toLocaleDateString(lang.code)}</time></span>
        <span>• ⏱️ ${Math.ceil(wordCount / 200)} ${lang.minRead}</span>
        <span>• 📊 ${products.length} produits comparés</span>
      </div>
    </header>

    <nav class="toc-container" aria-label="Table des matières">
      <div class="toc-title">📑 ${lang.toc}</div>
      <div class="toc-list">
        <ol>
          <li><a href="#introduction">${lang.intro}</a></li>
          <li><a href="#pourquoi-guide">Pourquoi ce guide est essentiel</a></li>
          <li><a href="#criteres-achat">${lang.criteria}</a></li>
          ${hasProducts ? `<li><a href="#selection-produits">${lang.selection}</a></li>` : ""}
          <li><a href="#guide-achat">${lang.comparison}</a></li>
          <li><a href="#conseils-experts">${lang.advice}</a></li>
          <li><a href="#faq">${lang.faq}</a></li>
          <li><a href="#conclusion">${lang.conclusion}</a></li>
        </ol>
      </div>
    </nav>

    <section id="introduction" class="article-section">
      <h2>${lang.intro}</h2>
      <div>${content?.introduction || "[Introduction optimisée SEO]"}</div>
    </section>

    <section id="pourquoi-guide" class="article-section">
      <h2>💡 Pourquoi ce guide est essentiel</h2>
      <div>${content?.pourquoi_guide || "[Valeur unique du guide]"}</div>
    </section>

    <section id="criteres-achat" class="article-section">
      <h2>🎯 ${lang.criteria}</h2>
      <div>${content?.criteres_achat || "[Critères détaillés]"}</div>
    </section>

    ${
      hasProducts
        ? `
    <section id="selection-produits" class="products-section">
      <h2>🏆 ${lang.selection}${collectionTitle ? ` - ${collectionTitle}` : ""}</h2>
      <p class="selection-intro">${content?.selection_expert || "Notre sélection expert basée sur des tests rigoureux"}</p>
      
      <div class="product-grid">
        ${productCardsHTML}
      </div>
    </section>
    `
        : ""
    }

    <section id="guide-achat" class="article-section">
      <h2>📊 ${lang.comparison}</h2>
      <div>${content?.guide_achat || "[Guide comparatif détaillé]"}</div>
    </section>

    <section id="conseils-experts" class="article-section">
      <h2>💎 ${lang.advice}</h2>
      <div>${content?.conseils_experts || "[Conseils pratiques]"}</div>
    </section>

    <section id="faq" class="faq-section">
      <h2>❓ ${lang.faq}</h2>
      <div class="faq-content">
        ${content?.faq || "[Questions fréquentes]"}
      </div>
    </section>

    <section id="conclusion" class="article-section">
      <h2>✅ ${lang.conclusion}</h2>
      <div>${content?.conclusion || "[Conclusion récapitulative]"}</div>
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

      // Lazy loading amélioré
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
    });

    // Schema.org pour les produits
    const productData = ${JSON.stringify(
      products.map((p) => ({
        name: (p as Product).title,
        price: p.price,
        priceCurrency: p.currency_code || "EUR",
        url: storeUrl ? `${storeUrl}/products/${p.handle}` : "#",
        image: p.image_url,
        description: p.body_html?.replace(/<[^>]*>/g, "").substring(0, 200),
      })),
    )};

    // Structured data pour les produits
    const productStructuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": productData.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.name,
          "image": product.image,
          "description": product.description,
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": product.priceCurrency,
            "url": product.url,
            "availability": "https://schema.org/InStock"
          }
        }
      }))
    };

    // Injection du structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(productStructuredData);
    document.head.appendChild(script);
  </script>
</body>
</html>`;
}
