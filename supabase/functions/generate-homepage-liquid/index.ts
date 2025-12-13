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

const EVENT_STYLES: Record<string, { colors: string; accent: string; banner: string }> = {
  normal: { colors: '#1a1a2e, #16213e', accent: '#e94560', banner: 'Discover Our Collection' },
  promotion: { colors: '#ff6b6b, #ee5a24', accent: '#ffffff', banner: 'Special Offer!' },
  black_friday: { colors: '#000000, #1a1a1a', accent: '#ffcc00', banner: 'Black Friday Deals!' },
  valentine: { colors: '#ff6b81, #ee5a6b', accent: '#ffffff', banner: "Valentine's Day Special" },
  christmas: { colors: '#c0392b, #27ae60', accent: '#f1c40f', banner: 'Christmas Collection' },
  summer_sale: { colors: '#00b894, #00cec9', accent: '#fdcb6e', banner: 'Summer Sale!' },
  new_arrivals: { colors: '#6c5ce7, #a29bfe', accent: '#ffffff', banner: 'New Arrivals' },
};

const EVENT_STYLES_FR: Record<string, string> = {
  normal: 'Découvrez Notre Collection',
  promotion: 'Offre Spéciale !',
  black_friday: 'Black Friday !',
  valentine: 'Spécial Saint-Valentin',
  christmas: 'Collection de Noël',
  summer_sale: 'Soldes d\'Été !',
  new_arrivals: 'Nouveautés',
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

    console.log(`[GENERATE-HOMEPAGE-LIQUID] Generating for store ${storeName}, event: ${eventType}, mode: ${selectionMode}`);

    const style = EVENT_STYLES[eventType] || EVENT_STYLES.normal;
    const bannerText = customTitle || (language === 'fr' ? EVENT_STYLES_FR[eventType] : style.banner);
    const subtitle = customSubtitle || (language === 'fr' ? 'Qualité premium pour votre maison' : 'Premium quality for your home');

    // Generate product grid HTML
    const productGridHtml = products.map(product => `
      <div class="product-card" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s;">
        <div style="aspect-ratio: 1; overflow: hidden;">
          ${product.imageUrl 
            ? `<img src="${product.imageUrl}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">`
            : `<div style="width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
                <span style="color: #999;">No Image</span>
              </div>`
          }
        </div>
        <div style="padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333;">${product.title}</h3>
          ${product.price 
            ? `<p style="font-size: 16px; font-weight: 700; color: ${style.accent}; margin: 0;">${product.currency} ${product.price}</p>`
            : ''
          }
          <a href="${storeUrl}/products/${product.handle || product.id}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: linear-gradient(135deg, ${style.colors}); color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
            ${language === 'fr' ? 'Voir le produit' : 'View Product'}
          </a>
        </div>
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .hero { 
      background: linear-gradient(135deg, ${style.colors}); 
      color: white; 
      padding: 80px 20px; 
      text-align: center;
    }
    .hero h1 { font-size: 48px; font-weight: 700; margin-bottom: 16px; }
    .hero p { font-size: 20px; opacity: 0.9; }
    .products-section { padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
    .section-title { text-align: center; margin-bottom: 40px; }
    .section-title h2 { font-size: 32px; color: #333; margin-bottom: 8px; }
    .product-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
      gap: 24px; 
    }
    .product-card:hover { transform: translateY(-4px); }
    .cta-section {
      background: linear-gradient(135deg, ${style.colors});
      color: white;
      padding: 60px 20px;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: ${style.accent};
      color: ${eventType === 'black_friday' ? '#000' : '#fff'};
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin-top: 20px;
    }
    @media (max-width: 768px) {
      .hero h1 { font-size: 32px; }
      .product-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <h1>${bannerText}</h1>
    <p>${subtitle}</p>
  </section>

  <!-- Products Section -->
  <section class="products-section">
    <div class="section-title">
      <h2>${collection ? collection.title : (language === 'fr' ? 'Nos Produits Vedettes' : 'Featured Products')}</h2>
      <p style="color: #666;">${language === 'fr' ? 'Sélectionnés avec soin pour vous' : 'Carefully selected for you'}</p>
    </div>
    <div class="product-grid">
      ${productGridHtml}
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <h2>${language === 'fr' ? 'Prêt à découvrir plus ?' : 'Ready to discover more?'}</h2>
    <a href="${storeUrl}/collections/all" class="cta-button">
      ${language === 'fr' ? 'Voir toute la collection' : 'View All Collection'}
    </a>
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
{% endcomment %}

<style>
  .newai-hero { 
    background: linear-gradient(135deg, ${style.colors}); 
    color: white; 
    padding: 80px 20px; 
    text-align: center;
  }
  .newai-hero h1 { font-size: 48px; font-weight: 700; margin-bottom: 16px; }
  .newai-hero p { font-size: 20px; opacity: 0.9; }
  .newai-products { padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
  .newai-section-title { text-align: center; margin-bottom: 40px; }
  .newai-section-title h2 { font-size: 32px; color: #333; margin-bottom: 8px; }
  .newai-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
    gap: 24px; 
  }
  .newai-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.3s;
  }
  .newai-card:hover { transform: translateY(-4px); }
  .newai-card-img { aspect-ratio: 1; overflow: hidden; }
  .newai-card-img img { width: 100%; height: 100%; object-fit: cover; }
  .newai-card-content { padding: 16px; }
  .newai-card-title { font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #333; }
  .newai-card-price { font-size: 16px; font-weight: 700; color: ${style.accent}; margin: 0; }
  .newai-card-btn {
    display: inline-block;
    margin-top: 12px;
    padding: 8px 16px;
    background: linear-gradient(135deg, ${style.colors});
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }
  .newai-cta {
    background: linear-gradient(135deg, ${style.colors});
    color: white;
    padding: 60px 20px;
    text-align: center;
  }
  .newai-cta-btn {
    display: inline-block;
    padding: 16px 32px;
    background: ${style.accent};
    color: ${eventType === 'black_friday' ? '#000' : '#fff'};
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 18px;
    margin-top: 20px;
  }
  @media (max-width: 768px) {
    .newai-hero h1 { font-size: 32px; }
    .newai-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  }
</style>

<!-- Hero Section -->
<section class="newai-hero">
  <h1>${bannerText}</h1>
  <p>${subtitle}</p>
</section>

<!-- Products Section -->
<section class="newai-products">
  <div class="newai-section-title">
    <h2>${collection ? '{{ collection.title }}' : (language === 'fr' ? 'Nos Produits Vedettes' : 'Featured Products')}</h2>
    <p style="color: #666;">${language === 'fr' ? 'Sélectionnés avec soin pour vous' : 'Carefully selected for you'}</p>
  </div>
  
  <div class="newai-grid">
    ${collection 
      ? `{% for product in collections['${collection.title.toLowerCase().replace(/\s+/g, '-')}'].products limit: 8 %}
      <div class="newai-card">
        <div class="newai-card-img">
          <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}" loading="lazy">
        </div>
        <div class="newai-card-content">
          <h3 class="newai-card-title">{{ product.title }}</h3>
          <p class="newai-card-price">{{ product.price | money }}</p>
          <a href="{{ product.url }}" class="newai-card-btn">${language === 'fr' ? 'Voir le produit' : 'View Product'}</a>
        </div>
      </div>
    {% endfor %}`
      : products.map(p => `
      <div class="newai-card">
        <div class="newai-card-img">
          ${p.imageUrl 
            ? `<img src="${p.imageUrl}" alt="${p.title}" loading="lazy">`
            : `<div style="width:100%;height:100%;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><span style="color:#999;">No Image</span></div>`
          }
        </div>
        <div class="newai-card-content">
          <h3 class="newai-card-title">${p.title}</h3>
          ${p.price ? `<p class="newai-card-price">${p.currency} ${p.price}</p>` : ''}
          <a href="/products/${p.handle || p.id}" class="newai-card-btn">${language === 'fr' ? 'Voir le produit' : 'View Product'}</a>
        </div>
      </div>`).join('\n')
    }
  </div>
</section>

<!-- CTA Section -->
<section class="newai-cta">
  <h2>${language === 'fr' ? 'Prêt à découvrir plus ?' : 'Ready to discover more?'}</h2>
  <a href="/collections/all" class="newai-cta-btn">
    ${language === 'fr' ? 'Voir toute la collection' : 'View All Collection'}
  </a>
</section>
    `.trim();

    console.log(`[GENERATE-HOMEPAGE-LIQUID] Successfully generated homepage for ${storeName}`);

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
