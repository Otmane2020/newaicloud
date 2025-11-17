// Helper pour générer le template HTML complet avec produits pré-intégrés

interface Product {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  currency_code?: string;
  handle: string;
  body_html?: string;
  images?: Array<{ src: string; alt?: string }>;
  image_url?: string;
  category?: string;
}

interface TemplateConfig {
  primaryColor: string;
  primaryColorRgb: string;
  layout: { tocColumns: number; productColumns: number; maxWidth: string };
  typography: 'serif' | 'sans-serif';
  products: Product[];
  storeUrl: string;
  title: string;
  language: { name: string; code: string; toc: string; intro: string; criteria: string; selection: string; comparison: string; advice: string; faq: string; conclusion: string; home: string; blog: string; publishedOn: string; minRead: string };
  wordCount: number;
  collectionTitle?: string;
  category?: string;
  keywords: string[];
  featuredImage?: string;
}

export function generateHTMLTemplate(config: TemplateConfig): string {
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
  } = config;

  const hasProducts = products.length > 0;
  
  // Générer les cartes produits HTML
  const productCardsHTML = products.map(product => {
    const hasPromotion = product.compare_at_price && product.compare_at_price > product.price;
    const discount = hasPromotion && product.compare_at_price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;
    
    const productUrl = storeUrl ? `${storeUrl}/products/${product.handle}` : '#';
    const images = product.images || [];
    const mainImage = product.image_url || (images.length > 0 ? images[0].src : '/placeholder.jpg');
    
    // Galerie d'images avec carousel pour multi-images
    let galleryHTML = '';
    if (images.length <= 1) {
      galleryHTML = `<img src="${mainImage}" alt="${product.title}" class="product-main-image" loading="lazy">`;
    } else if (images.length <= 4) {
      galleryHTML = `<div class="product-gallery">${images.map(img => 
        `<img src="${img.src}" alt="${img.alt || product.title}" class="gallery-image" loading="lazy">`
      ).join('')}</div>`;
    } else {
      galleryHTML = `
        <div class="product-carousel">
          <div class="carousel-track">
            ${images.map((img, idx) => 
              `<img src="${img.src}" alt="${img.alt || product.title}" class="carousel-image ${idx === 0 ? 'active' : ''}" loading="lazy">`
            ).join('')}
          </div>
          <button class="carousel-btn carousel-prev" onclick="prevImage(this)">‹</button>
          <button class="carousel-btn carousel-next" onclick="nextImage(this)">›</button>
          <div class="carousel-dots">
            ${images.map((_, idx) => `<span class="dot ${idx === 0 ? 'active' : ''}" onclick="goToImage(this, ${idx})"></span>`).join('')}
          </div>
        </div>
      `;
    }
    
    return `
      <div class="product-card">
        ${hasPromotion ? `<div class="promotion-badge">-${discount}%</div>` : ''}
        <a href="${productUrl}" target="_blank" rel="noopener" class="product-link">
          ${galleryHTML}
          <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            ${product.category ? `<span class="product-category">${product.category}</span>` : ''}
            <div class="product-price">
              ${hasPromotion ? `<span class="old-price">${product.compare_at_price?.toFixed(2)} ${product.currency_code || '€'}</span>` : ''}
              <span class="current-price">${product.price.toFixed(2)} ${product.currency_code || '€'}</span>
            </div>
            ${product.body_html ? `<p class="product-description">${product.body_html.replace(/<[^>]*>/g, '').substring(0, 120)}...</p>` : ''}
            <button class="product-cta">Voir le produit →</button>
          </div>
        </a>
      </div>
    `;
  }).join('');

  const fontFamily = typography === 'serif' 
    ? 'Georgia, "Times New Roman", serif' 
    : '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  return `<!DOCTYPE html>
<html lang="${lang.code}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
:root {
  --color-primary: ${primaryColor};
  --color-primary-rgb: ${primaryColorRgb};
  --font-family: ${fontFamily};
}

body {
  font-family: var(--font-family);
  line-height: 1.6;
  color: #1a1a1a;
  background: #ffffff;
  margin: 0;
  padding: 20px;
}

.blog-article {
  max-width: ${layout.maxWidth};
  margin: 0 auto;
}

.blog-header {
  text-align: center;
  margin-bottom: 3rem;
}

.featured-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 24px;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 1rem 0;
  color: #000;
}

.article-meta {
  color: #6b7280;
  margin: 1rem 0;
}

.toc-container {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary));
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin: 2rem 0;
}

.toc-list {
  columns: ${layout.tocColumns};
  gap: 2rem;
}

.toc-list a {
  color: white;
  text-decoration: none;
  display: block;
  padding: 0.5rem 0;
}

.toc-list a:hover {
  text-decoration: underline;
}

.article-section {
  margin: 3rem 0;
}

h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 2rem 0 1rem;
  color: #000;
}

h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: #2d3748;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(${layout.productColumns}, 1fr);
  gap: 2rem;
  margin: 2rem 0;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: transform 0.3s;
  position: relative;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.promotion-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  z-index: 10;
}

.product-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.product-main-image, .gallery-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
}

.product-gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
}

.product-carousel {
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s ease;
  height: 100%;
}

.carousel-image {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  display: none;
}

.carousel-image.active {
  display: block;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  z-index: 10;
}

.carousel-prev { left: 10px; }
.carousel-next { right: 10px; }

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  cursor: pointer;
}

.dot.active {
  background: white;
}

.product-info {
  padding: 1.5rem;
}

.product-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.product-category {
  display: inline-block;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.product-price {
  margin: 1rem 0;
}

.old-price {
  text-decoration: line-through;
  color: #9ca3af;
  margin-right: 0.5rem;
}

.current-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.product-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 1rem 0;
}

.product-cta {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.product-cta:hover {
  opacity: 0.9;
}

.faq-item {
  margin: 1.5rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.faq-question {
  padding: 1rem;
  background: #f9fafb;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-answer {
  padding: 1rem;
  display: none;
}

.faq-answer.active {
  display: block;
}
  </style>
</head>
<body>
<article class="blog-article">
  <div class="blog-header">
    ${featuredImage ? `<img src="${featuredImage}" alt="${title}" class="featured-image">` : ''}
    <h1>${title}</h1>
    <div class="article-meta">
      <span>${lang.publishedOn} ${new Date().toLocaleDateString(lang.code === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      <span> • ⏱️ ${Math.ceil(wordCount / 200)} ${lang.minRead}</span>
    </div>
  </div>

  <nav class="toc-container">
    <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">${lang.toc}</div>
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
    <h2>${lang.intro}</h2>
    <p>[Rédiger une introduction engageante de 200-250 mots intégrant naturellement les mots-clés: ${keywords.join(', ')}]</p>
  </section>

  <section id="criteres" class="article-section">
    <h2>${lang.criteria}</h2>
    <h3>Qualité et durabilité</h3>
    <p>[Détailler les critères de qualité - 150 mots]</p>
    
    <h3>Rapport qualité-prix</h3>
    <p>[Analyser les gammes de prix - 150 mots]</p>
    
    <h3>Design et fonctionnalités</h3>
    <p>[Présenter les caractéristiques - 150 mots]</p>
  </section>

  ${hasProducts ? `
  <section id="produits" class="article-section">
    <h2>${lang.selection}${collectionTitle ? ` - ${collectionTitle}` : ''}</h2>
    <div class="product-grid">
      ${productCardsHTML}
    </div>
  </section>
  ` : ''}

  <section id="comparaison" class="article-section">
    <h2>${lang.comparison}</h2>
    <p>[Tableau comparatif des produits - 200 mots]</p>
  </section>

  <section id="conseils" class="article-section">
    <h2>${lang.advice}</h2>
    <p>[Conseils pratiques d'utilisation - 200 mots]</p>
  </section>

  <section id="faq" class="article-section">
    <h2>${lang.faq}</h2>
    <div class="faq-item">
      <div class="faq-question" onclick="this.nextElementSibling.classList.toggle('active')">
        Question 1 ?
        <span>+</span>
      </div>
      <div class="faq-answer">
        Réponse détaillée 1
      </div>
    </div>
    [Ajouter 4-5 FAQ supplémentaires pertinentes]
  </section>

  <section id="conclusion" class="article-section">
    <h2>${lang.conclusion}</h2>
    <p>[Conclusion récapitulative - 150 mots]</p>
  </section>
</article>

<script>
function prevImage(btn) {
  const carousel = btn.closest('.product-carousel');
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  const currentIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
  const newIdx = currentIdx === 0 ? images.length - 1 : currentIdx - 1;
  
  images.forEach((img, idx) => img.classList.toggle('active', idx === newIdx));
  dots.forEach((dot, idx) => dot.classList.toggle('active', idx === newIdx));
}

function nextImage(btn) {
  const carousel = btn.closest('.product-carousel');
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  const currentIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
  const newIdx = (currentIdx + 1) % images.length;
  
  images.forEach((img, idx) => img.classList.toggle('active', idx === newIdx));
  dots.forEach((dot, idx) => dot.classList.toggle('active', idx === newIdx));
}

function goToImage(dot, idx) {
  const carousel = dot.closest('.product-carousel');
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  
  images.forEach((img, i) => img.classList.toggle('active', i === idx));
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
}
</script>
</body>
</html>`;
}
