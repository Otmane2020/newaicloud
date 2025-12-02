import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
}

type TemplateStyle = 'gold' | 'red-promo' | 'minimal' | 'tech' | 'black-friday' | 'story';
type ExportFormat = 'png' | 'jpg' | 'webp';

const templateConfigs: Record<TemplateStyle, { bgColor: string; textColor: string; accentColor: string }> = {
  minimal: { bgColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#6366f1' },
  gold: { bgColor: '#fef3c7', textColor: '#78350f', accentColor: '#b45309' },
  'red-promo': { bgColor: '#dc2626', textColor: '#ffffff', accentColor: '#fbbf24' },
  tech: { bgColor: '#1e1b4b', textColor: '#ffffff', accentColor: '#22d3ee' },
  'black-friday': { bgColor: '#0a0a0a', textColor: '#ffffff', accentColor: '#facc15' },
  story: { bgColor: '#7c3aed', textColor: '#ffffff', accentColor: '#fbbf24' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { product, template, caption, format = 'png' } = body as {
      product: Product;
      template: TemplateStyle;
      caption: string;
      format: ExportFormat;
    };

    if (!product) {
      throw new Error('Product is required');
    }

    const config = templateConfigs[template] || templateConfigs.minimal;
    const isStory = template === 'story';
    const width = isStory ? 1080 : 1080;
    const height = isStory ? 1920 : 1080;

    // Calculate discount if applicable
    let discountPercent = 0;
    if (product.price && product.compare_at_price) {
      discountPercent = Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100);
    }

    // Generate HTML for the creative
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${config.bgColor};
      font-family: 'Segoe UI', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      position: relative;
      overflow: hidden;
    }
    ${template === 'gold' ? `
    body::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 80px; height: 80px;
      border-top: 6px solid rgba(180, 83, 9, 0.4);
      border-left: 6px solid rgba(180, 83, 9, 0.4);
    }
    body::after {
      content: '';
      position: absolute;
      bottom: 0; right: 0;
      width: 80px; height: 80px;
      border-bottom: 6px solid rgba(180, 83, 9, 0.4);
      border-right: 6px solid rgba(180, 83, 9, 0.4);
    }
    ` : ''}
    ${template === 'red-promo' ? `
    .promo-badge {
      position: absolute;
      top: 40px;
      background: #facc15;
      color: #dc2626;
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 18px;
      animation: pulse 1s infinite;
    }
    ` : ''}
    ${template === 'black-friday' ? `
    .bf-badge {
      position: absolute;
      top: 40px;
      background: #facc15;
      color: #0a0a0a;
      padding: 16px 32px;
      font-weight: 900;
      font-size: 24px;
      letter-spacing: 2px;
    }
    ` : ''}
    .product-image {
      max-width: 60%;
      max-height: ${isStory ? '50%' : '55%'};
      object-fit: contain;
      margin-bottom: 40px;
      ${template === 'minimal' ? 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.15));' : ''}
      ${template === 'tech' ? 'filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));' : ''}
      ${template === 'gold' ? 'filter: drop-shadow(0 15px 30px rgba(180, 150, 50, 0.3));' : ''}
    }
    .title {
      color: ${config.textColor};
      font-size: ${isStory ? '48px' : '42px'};
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
      max-width: 90%;
    }
    .price-container {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }
    .compare-price {
      color: ${config.textColor};
      opacity: 0.5;
      font-size: 28px;
      text-decoration: line-through;
    }
    .current-price {
      color: ${config.accentColor};
      font-size: 56px;
      font-weight: bold;
    }
    .discount-badge {
      background: ${template === 'red-promo' ? '#facc15' : '#22c55e'};
      color: ${template === 'red-promo' ? '#dc2626' : '#ffffff'};
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 20px;
    }
    .caption {
      color: ${config.textColor};
      opacity: 0.8;
      font-size: 22px;
      text-align: center;
      max-width: 80%;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  ${template === 'red-promo' ? '<div class="promo-badge">🔥 PROMO</div>' : ''}
  ${template === 'black-friday' ? '<div class="bf-badge">BLACK FRIDAY</div>' : ''}
  
  ${product.image ? `<img src="${product.image}" alt="${product.title}" class="product-image">` : ''}
  
  <h1 class="title">${product.title}</h1>
  
  ${product.price ? `
  <div class="price-container">
    ${product.compare_at_price ? `<span class="compare-price">${product.compare_at_price}€</span>` : ''}
    <span class="current-price">${product.price}€</span>
    ${discountPercent > 0 ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
  </div>
  ` : ''}
  
  ${caption ? `<p class="caption">${caption}</p>` : ''}
</body>
</html>`;

    // For now, return the HTML - in production you'd use a service like Puppeteer or a screenshot API
    // We'll return the HTML and let the frontend handle rendering
    console.log(`[EXPORT] Generated HTML creative for product: ${product.title}`);

    // Use Lovable AI to generate an image based on the product
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY && product.image) {
      try {
        // Generate a promotional image using Gemini Image Preview
        const imagePrompt = `Create a professional ${template} style e-commerce promotional image for this product: "${product.title}". 
${product.price ? `Price: ${product.price}€` : ''}
${discountPercent > 0 ? `Discount: ${discountPercent}% off` : ''}
Style: ${template === 'gold' ? 'Luxurious gold and amber tones' : 
        template === 'red-promo' ? 'Bold red promotional style with yellow accents' :
        template === 'minimal' ? 'Clean white minimalist design' :
        template === 'tech' ? 'Dark purple tech gradient with cyan accents' :
        template === 'black-friday' ? 'Black background with gold text' :
        'Vibrant gradient Instagram story style'}
Make it look professional for social media advertising. Square 1:1 aspect ratio.`;

        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: imagePrompt },
                  { type: 'image_url', image_url: { url: product.image } }
                ]
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (generatedImage) {
            console.log('[EXPORT] AI generated promotional image');
            return new Response(JSON.stringify({ 
              base64: generatedImage.replace('data:image/png;base64,', ''),
              format: 'png'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (imageError) {
        console.error('[EXPORT] Image generation failed, returning HTML:', imageError);
      }
    }

    // Fallback: return HTML for client-side rendering
    return new Response(JSON.stringify({ 
      html,
      width,
      height,
      message: 'Use html2canvas or similar library to convert to image'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[EXPORT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
