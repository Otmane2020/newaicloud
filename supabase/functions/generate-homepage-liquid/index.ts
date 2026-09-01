import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  handle?: string;
}

interface GenerationRequest {
  storeId: string;
  storeName: string;
  storeUrl: string;
  selectionMode: 'products' | 'collection' | 'smart';
  eventType: 'normal' | 'promotion' | 'black_friday' | 'valentine' | 'christmas' | 'summer_sale' | 'new_arrivals';
  products: Product[];
  collection: { id: string; title: string; imageUrl: string | null } | null;
  customTitle?: string;
  customSubtitle?: string;
  language: string;
}

const EVENT_STYLES: Record<string, { primaryColor: string; accentColor: string; bgGradient: string; bannerEn: string; bannerFr: string; ctaEn: string; ctaFr: string }> = {
  normal: { 
    primaryColor: '#1a1a2e', 
    accentColor: '#e67e22', 
    bgGradient: 'linear-gradient(135deg, #f8f6f3 0%, #ebe7e0 100%)',
    bannerEn: 'Elevate Your Interior',
    bannerFr: 'Sublimez votre intérieur',
    ctaEn: 'Discover Collection',
    ctaFr: 'Découvrir la collection'
  },
  promotion: { 
    primaryColor: '#c0392b', 
    accentColor: '#e74c3c', 
    bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
    bannerEn: 'Exclusive Offers',
    bannerFr: 'Offres Exclusives',
    ctaEn: 'Shop Now',
    ctaFr: 'Acheter maintenant'
  },
  black_friday: { 
    primaryColor: '#000000', 
    accentColor: '#f1c40f', 
    bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    bannerEn: 'Black Friday Deals',
    bannerFr: 'Black Friday',
    ctaEn: 'Shop Deals',
    ctaFr: 'Voir les offres'
  },
  valentine: { 
    primaryColor: '#c0392b', 
    accentColor: '#e74c3c', 
    bgGradient: 'linear-gradient(135deg, #fff0f3 0%, #ffe4e9 100%)',
    bannerEn: "Valentine's Special",
    bannerFr: 'Spécial Saint-Valentin',
    ctaEn: 'Find the Perfect Gift',
    ctaFr: 'Trouver le cadeau parfait'
  },
  christmas: { 
    primaryColor: '#27ae60', 
    accentColor: '#c0392b', 
    bgGradient: 'linear-gradient(135deg, #f0fff4 0%, #e8f5e9 100%)',
    bannerEn: 'Christmas Collection',
    bannerFr: 'Collection de Noël',
    ctaEn: 'Shop Christmas',
    ctaFr: 'Collection Noël'
  },
  summer_sale: { 
    primaryColor: '#2980b9', 
    accentColor: '#f39c12', 
    bgGradient: 'linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%)',
    bannerEn: 'Summer Sale',
    bannerFr: 'Soldes d\'Été',
    ctaEn: 'Shop Summer',
    ctaFr: 'Soldes été'
  },
  new_arrivals: { 
    primaryColor: '#8e44ad', 
    accentColor: '#9b59b6', 
    bgGradient: 'linear-gradient(135deg, #f5f0ff 0%, #ede7f6 100%)',
    bannerEn: 'New Arrivals',
    bannerFr: 'Nouveautés',
    ctaEn: 'Discover New',
    ctaFr: 'Découvrir'
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerationRequest = await req.json();
    const { storeId, storeName, storeUrl, selectionMode, eventType, products, collection, customTitle, customSubtitle, language } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    console.log(`[GENERATE-HOMEPAGE-LIQUID] Generating for store ${storeName}, event: ${eventType}, mode: ${selectionMode}, lang: ${language}`);

    const isFrench = language === 'fr';
    const style = EVENT_STYLES[eventType] || EVENT_STYLES.normal;
    const bannerText = customTitle || (isFrench ? style.bannerFr : style.bannerEn);
    const ctaText = isFrench ? style.ctaFr : style.ctaEn;
    const subtitle = customSubtitle || (isFrench 
      ? 'Des pièces uniques pour exprimer votre personnalité' 
      : 'Unique pieces to express your personality');

    // Format price based on language
    const formatPrice = (price: number | null, currency: string) => {
      if (!price) return '';
      if (isFrench) {
        return `${price.toFixed(2).replace('.', ',')} €`;
      }
      return `$${price.toFixed(2)}`;
    };

    // Generate product cards HTML
    const productCardsHtml = products.slice(0, 6).map(product => `
      <div class="newai-product-card">
        <div class="newai-product-image">
          ${product.imageUrl 
            ? `<img src="${product.imageUrl}" alt="${product.title}" loading="lazy">`
            : `<div class="newai-no-image"><span>${isFrench ? 'Pas d\'image' : 'No Image'}</span></div>`
          }
          <button class="newai-wishlist-btn">♡</button>
          ${eventType !== 'normal' ? `<span class="newai-badge">${isFrench ? 'Promo' : 'Sale'}</span>` : ''}
        </div>
        <div class="newai-product-info">
          <h3 class="newai-product-title">${product.title}</h3>
          <div class="newai-product-price">
            ${product.price ? `<span class="newai-price">${formatPrice(product.price, product.currency)}</span>` : ''}
            ${eventType !== 'normal' && product.price ? `<span class="newai-old-price">${formatPrice(product.price * 1.3, product.currency)}</span>` : ''}
          </div>
          <a href="${storeUrl}/products/${product.handle || product.id}" class="newai-add-btn">
            ${isFrench ? 'Ajouter au panier' : 'Add to Cart'}
          </a>
        </div>
      </div>
    `).join('\n');

    // Generate category cards if we have enough products
    const categories = isFrench 
      ? ['Salon', 'Chambre', 'Salle à manger', 'Bureau', 'Extérieur']
      : ['Living Room', 'Bedroom', 'Dining Room', 'Office', 'Outdoor'];

    const categoryCardsHtml = categories.slice(0, 4).map((cat, i) => `
      <a href="${storeUrl}/collections/all" class="newai-category-card">
        <div class="newai-category-image" style="background: ${['#d4a373', '#bc6c25', '#606c38', '#283618'][i] || '#333'};">
          <span class="newai-category-icon">${['🛋️', '🛏️', '🍽️', '💼'][i] || '🏠'}</span>
        </div>
        <span class="newai-category-name">${cat}</span>
      </a>
    `).join('\n');

    // Generate testimonials
    const testimonials = isFrench ? [
      { text: "Qualité exceptionnelle et livraison rapide. Je recommande vivement !", author: "Marie L.", rating: 5 },
      { text: "Des meubles magnifiques qui ont transformé mon intérieur.", author: "Pierre D.", rating: 5 },
      { text: "Service client au top et produits conformes aux photos.", author: "Sophie M.", rating: 5 }
    ] : [
      { text: "Exceptional quality and fast delivery. Highly recommend!", author: "Sarah L.", rating: 5 },
      { text: "Beautiful furniture that transformed my home.", author: "John D.", rating: 5 },
      { text: "Great customer service and products match photos perfectly.", author: "Emma M.", rating: 5 }
    ];

    const testimonialsHtml = testimonials.map(t => `
      <div class="newai-testimonial-card">
        <div class="newai-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</div>
        <p class="newai-testimonial-text">"${t.text}"</p>
        <span class="newai-testimonial-author">— ${t.author}</span>
      </div>
    `).join('\n');

    // Benefits section
    const benefits = isFrench ? [
      { icon: '🚚', title: 'Livraison rapide', desc: 'Expédition sous 48h' },
      { icon: '💎', title: 'Qualité premium', desc: 'Matériaux durables' },
      { icon: '↩️', title: 'Retours gratuits', desc: 'Sous 30 jours' },
      { icon: '💬', title: 'Support 24/7', desc: 'À votre écoute' }
    ] : [
      { icon: '🚚', title: 'Fast Delivery', desc: 'Ships within 48h' },
      { icon: '💎', title: 'Premium Quality', desc: 'Durable materials' },
      { icon: '↩️', title: 'Free Returns', desc: 'Within 30 days' },
      { icon: '💬', title: '24/7 Support', desc: 'We are here for you' }
    ];

    const benefitsHtml = benefits.map(b => `
      <div class="newai-benefit">
        <span class="newai-benefit-icon">${b.icon}</span>
        <h4>${b.title}</h4>
        <p>${b.desc}</p>
      </div>
    `).join('\n');

    // Generate full HTML preview
    const htmlPreview = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bannerText} - ${storeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; }
    
    /* Hero Section */
    .newai-hero {
      position: relative;
      min-height: 70vh;
      display: flex;
      align-items: center;
      background: ${style.bgGradient};
      overflow: hidden;
    }
    .newai-hero::before {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      width: 55%;
      height: 100%;
      background: url('${products[0]?.imageUrl || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200'}') center/cover no-repeat;
      clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
    }
    .newai-hero-content {
      position: relative;
      z-index: 2;
      max-width: 500px;
      padding: 60px;
    }
    .newai-hero h1 {
      font-size: 48px;
      font-weight: 700;
      color: ${style.primaryColor};
      margin-bottom: 20px;
      line-height: 1.1;
    }
    .newai-hero p {
      font-size: 18px;
      color: #666;
      margin-bottom: 30px;
    }
    .newai-hero-btns {
      display: flex;
      gap: 16px;
    }
    .newai-btn-primary {
      display: inline-block;
      padding: 16px 32px;
      background: ${style.accentColor};
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .newai-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px ${style.accentColor}40;
    }
    .newai-btn-secondary {
      display: inline-block;
      padding: 16px 32px;
      background: transparent;
      color: ${style.primaryColor};
      text-decoration: none;
      border: 2px solid ${style.primaryColor};
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
    }
    .newai-btn-secondary:hover {
      background: ${style.primaryColor};
      color: white;
    }

    /* Benefits Bar */
    .newai-benefits {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      padding: 40px 60px;
      background: white;
      border-bottom: 1px solid #eee;
    }
    .newai-benefit {
      text-align: center;
    }
    .newai-benefit-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 12px;
    }
    .newai-benefit h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .newai-benefit p {
      font-size: 14px;
      color: #888;
    }

    /* Categories */
    .newai-categories {
      padding: 60px;
      background: #fafafa;
    }
    .newai-section-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .newai-section-header h2 {
      font-size: 32px;
      font-weight: 700;
      color: ${style.primaryColor};
      margin-bottom: 8px;
    }
    .newai-section-header p {
      color: #666;
      font-size: 16px;
    }
    .newai-categories-grid {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .newai-category-card {
      text-decoration: none;
      text-align: center;
      transition: transform 0.2s;
    }
    .newai-category-card:hover {
      transform: translateY(-4px);
    }
    .newai-category-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .newai-category-icon {
      font-size: 40px;
    }
    .newai-category-name {
      font-size: 14px;
      font-weight: 600;
      color: ${style.primaryColor};
    }

    /* Products */
    .newai-products {
      padding: 60px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .newai-products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    .newai-products-header h2 {
      font-size: 28px;
      font-weight: 700;
    }
    .newai-see-all {
      color: ${style.accentColor};
      text-decoration: none;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .newai-products-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    .newai-product-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      transition: all 0.3s;
    }
    .newai-product-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.12);
    }
    .newai-product-image {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      background: #f5f5f5;
    }
    .newai-product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s;
    }
    .newai-product-card:hover .newai-product-image img {
      transform: scale(1.08);
    }
    .newai-wishlist-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: white;
      border: none;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    .newai-wishlist-btn:hover {
      background: ${style.accentColor};
      color: white;
    }
    .newai-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: ${style.accentColor};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .newai-product-info {
      padding: 20px;
    }
    .newai-product-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${style.primaryColor};
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .newai-product-price {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .newai-price {
      font-size: 20px;
      font-weight: 700;
      color: ${style.accentColor};
    }
    .newai-old-price {
      font-size: 14px;
      color: #999;
      text-decoration: line-through;
    }
    .newai-add-btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: ${style.accentColor};
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }
    .newai-add-btn:hover {
      background: ${style.primaryColor};
    }
    .newai-no-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
    }

    /* Testimonials */
    .newai-testimonials {
      background: ${style.primaryColor};
      color: white;
      padding: 80px 60px;
    }
    .newai-testimonials .newai-section-header h2 {
      color: white;
    }
    .newai-testimonials .newai-section-header p {
      color: rgba(255,255,255,0.7);
    }
    .newai-testimonials-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .newai-testimonial-card {
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
    }
    .newai-stars {
      color: ${style.accentColor};
      font-size: 20px;
      margin-bottom: 16px;
    }
    .newai-testimonial-text {
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 20px;
      font-style: italic;
    }
    .newai-testimonial-author {
      font-size: 14px;
      color: rgba(255,255,255,0.7);
    }

    /* CTA */
    .newai-cta {
      padding: 80px 60px;
      text-align: center;
      background: #fafafa;
    }
    .newai-cta h2 {
      font-size: 36px;
      font-weight: 700;
      color: ${style.primaryColor};
      margin-bottom: 16px;
    }
    .newai-cta p {
      font-size: 18px;
      color: #666;
      margin-bottom: 32px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .newai-products-grid { grid-template-columns: repeat(2, 1fr); }
      .newai-testimonials-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .newai-hero { min-height: 50vh; }
      .newai-hero::before { width: 100%; clip-path: none; opacity: 0.3; }
      .newai-hero-content { padding: 40px 20px; max-width: 100%; }
      .newai-hero h1 { font-size: 32px; }
      .newai-benefits { grid-template-columns: repeat(2, 1fr); padding: 30px 20px; }
      .newai-categories, .newai-products { padding: 40px 20px; }
      .newai-products-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .newai-testimonials { padding: 60px 20px; }
      .newai-testimonials-grid { grid-template-columns: 1fr; }
      .newai-cta { padding: 60px 20px; }
      .newai-cta h2 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="newai-hero">
    <div class="newai-hero-content">
      <h1>${bannerText}</h1>
      <p>${subtitle}</p>
      <div class="newai-hero-btns">
        <a href="${storeUrl}/collections/all" class="newai-btn-primary">${ctaText}</a>
        <a href="${storeUrl}/pages/about" class="newai-btn-secondary">${isFrench ? 'En savoir plus' : 'Learn More'}</a>
      </div>
    </div>
  </section>

  <!-- Benefits -->
  <section class="newai-benefits">
    ${benefitsHtml}
  </section>

  <!-- Categories -->
  <section class="newai-categories">
    <div class="newai-section-header">
      <h2>${isFrench ? 'Explorez nos univers' : 'Explore Our Collections'}</h2>
      <p>${isFrench ? 'Trouvez l\'inspiration pour chaque pièce' : 'Find inspiration for every room'}</p>
    </div>
    <div class="newai-categories-grid">
      ${categoryCardsHtml}
    </div>
  </section>

  <!-- Products -->
  <section class="newai-products">
    <div class="newai-products-header">
      <h2>${collection ? collection.title : (isFrench ? 'Nos produits populaires' : 'Popular Products')}</h2>
      <a href="${storeUrl}/collections/all" class="newai-see-all">${isFrench ? 'Voir tout' : 'See All'} →</a>
    </div>
    <div class="newai-products-grid">
      ${productCardsHtml}
    </div>
  </section>

  <!-- Testimonials -->
  <section class="newai-testimonials">
    <div class="newai-section-header">
      <h2>${isFrench ? 'Ils ont transformé leur intérieur' : 'They Transformed Their Home'}</h2>
      <p>${isFrench ? 'Des clients satisfaits partagent leur expérience' : 'Satisfied customers share their experience'}</p>
    </div>
    <div class="newai-testimonials-grid">
      ${testimonialsHtml}
    </div>
  </section>

  <!-- CTA -->
  <section class="newai-cta">
    <h2>${isFrench ? 'Votre intérieur mérite le meilleur' : 'Your Home Deserves the Best'}</h2>
    <p>${isFrench ? 'Découvrez notre collection complète et trouvez les pièces parfaites pour votre espace.' : 'Discover our complete collection and find the perfect pieces for your space.'}</p>
    <a href="${storeUrl}/collections/all" class="newai-btn-primary">${ctaText}</a>
  </section>
</body>
</html>
    `.trim();

    // Generate Shopify Liquid code
    const liquidCode = `
{% comment %}
  Generated by NewAI Homepage Generator
  Event: ${eventType}
  Store: ${storeName}
  Language: ${language}
{% endcomment %}

<style>
  * { box-sizing: border-box; }
  
  .newai-hero {
    position: relative;
    min-height: 70vh;
    display: flex;
    align-items: center;
    background: ${style.bgGradient};
    overflow: hidden;
  }
  .newai-hero::before {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    width: 55%;
    height: 100%;
    background: url('{{ section.settings.hero_image | img_url: "master" }}') center/cover no-repeat;
    clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);
  }
  .newai-hero-content {
    position: relative;
    z-index: 2;
    max-width: 500px;
    padding: 60px;
  }
  .newai-hero h1 {
    font-size: 48px;
    font-weight: 700;
    color: ${style.primaryColor};
    margin-bottom: 20px;
    line-height: 1.1;
  }
  .newai-hero p {
    font-size: 18px;
    color: #666;
    margin-bottom: 30px;
  }
  .newai-hero-btns {
    display: flex;
    gap: 16px;
  }
  .newai-btn-primary {
    display: inline-block;
    padding: 16px 32px;
    background: ${style.accentColor};
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .newai-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px ${style.accentColor}40;
  }
  .newai-btn-secondary {
    display: inline-block;
    padding: 16px 32px;
    background: transparent;
    color: ${style.primaryColor};
    text-decoration: none;
    border: 2px solid ${style.primaryColor};
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    transition: all 0.2s;
  }
  .newai-btn-secondary:hover {
    background: ${style.primaryColor};
    color: white;
  }

  .newai-benefits {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    padding: 40px 60px;
    background: white;
    border-bottom: 1px solid #eee;
  }
  .newai-benefit {
    text-align: center;
  }
  .newai-benefit-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 12px;
  }
  .newai-benefit h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .newai-benefit p {
    font-size: 14px;
    color: #888;
    margin: 0;
  }

  .newai-products {
    padding: 60px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .newai-products-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
  }
  .newai-products-header h2 {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
  }
  .newai-see-all {
    color: ${style.accentColor};
    text-decoration: none;
    font-weight: 600;
  }
  .newai-products-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .newai-product-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transition: all 0.3s;
  }
  .newai-product-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.12);
  }
  .newai-product-image {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: #f5f5f5;
  }
  .newai-product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s;
  }
  .newai-product-card:hover .newai-product-image img {
    transform: scale(1.08);
  }
  .newai-wishlist-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: white;
    border: none;
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .newai-product-info {
    padding: 20px;
  }
  .newai-product-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: ${style.primaryColor};
  }
  .newai-product-price {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .newai-price {
    font-size: 20px;
    font-weight: 700;
    color: ${style.accentColor};
  }
  .newai-add-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: ${style.accentColor};
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
  }
  .newai-add-btn:hover {
    background: ${style.primaryColor};
  }

  .newai-testimonials {
    background: ${style.primaryColor};
    color: white;
    padding: 80px 60px;
  }
  .newai-section-header {
    text-align: center;
    margin-bottom: 40px;
  }
  .newai-section-header h2 {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }
  .newai-section-header p {
    margin: 0;
    opacity: 0.7;
  }
  .newai-testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .newai-testimonial-card {
    background: rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .newai-stars {
    color: ${style.accentColor};
    font-size: 20px;
    margin-bottom: 16px;
  }
  .newai-testimonial-text {
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 20px;
    font-style: italic;
  }
  .newai-testimonial-author {
    font-size: 14px;
    opacity: 0.7;
  }

  .newai-cta {
    padding: 80px 60px;
    text-align: center;
    background: #fafafa;
  }
  .newai-cta h2 {
    font-size: 36px;
    font-weight: 700;
    color: ${style.primaryColor};
    margin: 0 0 16px 0;
  }
  .newai-cta p {
    font-size: 18px;
    color: #666;
    margin: 0 auto 32px;
    max-width: 600px;
  }

  @media (max-width: 768px) {
    .newai-hero { min-height: 50vh; }
    .newai-hero::before { width: 100%; clip-path: none; opacity: 0.3; }
    .newai-hero-content { padding: 40px 20px; max-width: 100%; }
    .newai-hero h1 { font-size: 32px; }
    .newai-benefits { grid-template-columns: repeat(2, 1fr); padding: 30px 20px; }
    .newai-products { padding: 40px 20px; }
    .newai-products-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .newai-testimonials { padding: 60px 20px; }
    .newai-testimonials-grid { grid-template-columns: 1fr; }
    .newai-cta { padding: 60px 20px; }
    .newai-cta h2 { font-size: 28px; }
  }
</style>

<!-- Hero Section -->
<section class="newai-hero">
  <div class="newai-hero-content">
    <h1>${bannerText}</h1>
    <p>${subtitle}</p>
    <div class="newai-hero-btns">
      <a href="/collections/all" class="newai-btn-primary">${ctaText}</a>
      <a href="/pages/about" class="newai-btn-secondary">${isFrench ? 'En savoir plus' : 'Learn More'}</a>
    </div>
  </div>
</section>

<!-- Benefits -->
<section class="newai-benefits">
  ${benefitsHtml}
</section>

<!-- Products -->
<section class="newai-products">
  <div class="newai-products-header">
    <h2>${isFrench ? 'Nos produits populaires' : 'Popular Products'}</h2>
    <a href="/collections/all" class="newai-see-all">${isFrench ? 'Voir tout' : 'See All'} →</a>
  </div>
  <div class="newai-products-grid">
    {% for product in collections.all.products limit: 6 %}
      <div class="newai-product-card">
        <div class="newai-product-image">
          <img src="{{ product.featured_image | img_url: 'large' }}" alt="{{ product.title }}" loading="lazy">
          <button class="newai-wishlist-btn">♡</button>
        </div>
        <div class="newai-product-info">
          <h3 class="newai-product-title">{{ product.title }}</h3>
          <div class="newai-product-price">
            <span class="newai-price">{{ product.price | money }}</span>
            {% if product.compare_at_price > product.price %}
              <span class="newai-old-price">{{ product.compare_at_price | money }}</span>
            {% endif %}
          </div>
          <a href="{{ product.url }}" class="newai-add-btn">${isFrench ? 'Ajouter au panier' : 'Add to Cart'}</a>
        </div>
      </div>
    {% endfor %}
  </div>
</section>

<!-- Testimonials -->
<section class="newai-testimonials">
  <div class="newai-section-header">
    <h2>${isFrench ? 'Ils ont transformé leur intérieur' : 'They Transformed Their Home'}</h2>
    <p>${isFrench ? 'Des clients satisfaits partagent leur expérience' : 'Satisfied customers share their experience'}</p>
  </div>
  <div class="newai-testimonials-grid">
    ${testimonialsHtml}
  </div>
</section>

<!-- CTA -->
<section class="newai-cta">
  <h2>${isFrench ? 'Votre intérieur mérite le meilleur' : 'Your Home Deserves the Best'}</h2>
  <p>${isFrench ? 'Découvrez notre collection complète et trouvez les pièces parfaites pour votre espace.' : 'Discover our complete collection and find the perfect pieces for your space.'}</p>
  <a href="/collections/all" class="newai-btn-primary">${ctaText}</a>
</section>
    `.trim();

    console.log(`[GENERATE-HOMEPAGE-LIQUID] Successfully generated premium homepage for ${storeName}`);

    return new Response(
      JSON.stringify({
        success: true,
        htmlPreview,
        liquidCode
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GENERATE-HOMEPAGE-LIQUID] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to generate homepage"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
