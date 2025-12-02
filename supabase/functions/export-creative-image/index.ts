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

    const { product, template, caption } = body as {
      product: Product;
      template: string;
      caption: string;
    };

    if (!product) {
      throw new Error('Product is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Calculate discount
    let discountText = "";
    if (product.price && product.compare_at_price) {
      const discount = Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price)) * 100);
      if (discount > 0) {
        discountText = `-${discount}%`;
      }
    }

    // Build a descriptive prompt based on template
    const templateStyles: Record<string, string> = {
      "bf-neon": "Dark black background with neon yellow/gold accents, Black Friday sale style, dramatic lighting",
      "bf-red": "Deep red and black gradient, bold sale typography, urgency-driven design",
      "bf-gold": "Black and gold luxury Black Friday design, premium feel",
      "bf-electric": "Purple and blue neon gradients, electric/cyber aesthetic",
      "promo-red": "Vibrant red promotional poster, yellow accent badges, fire/hot sale energy",
      "promo-flash": "Orange to pink gradient, flash sale urgency, bold white text",
      "promo-summer": "Cyan to purple ocean gradient, summer vibes, fresh and bright",
      "promo-limited": "Emerald green luxury, limited edition feel, exclusive",
      "minimal-white": "Clean white background, minimalist design, elegant shadows",
      "minimal-beige": "Soft beige/cream tones, sophisticated and warm",
      "minimal-gray": "Modern gray gradient, professional and sleek",
      "minimal-cream": "Elegant cream and amber tones, classic luxury",
      "bold-gradient": "Vibrant violet to indigo gradient, modern and bold",
      "bold-sunset": "Orange to purple sunset gradient, warm and energetic",
      "bold-ocean": "Deep blue ocean gradient, calm yet powerful",
      "bold-forest": "Forest green gradient, eco-friendly natural feel",
      "gold-premium": "Golden amber gradient, premium luxury, exclusive feel",
      "gold-elegant": "Soft gold and yellow tones, elegant and refined",
      "tech-dark": "Dark purple tech gradient with cyan accents, futuristic",
      "tech-neon": "Fuchsia and purple neon glow, cyberpunk aesthetic",
      "story-gradient": "Pink to indigo vertical gradient, Instagram story format",
      "story-sunset": "Orange to purple vertical gradient, sunset story style",
      "story-ocean": "Cyan to indigo vertical gradient, ocean story vibes",
      "story-dark": "Dark gray to black vertical gradient, moody story",
      "testimonial-soft": "Soft blue to purple pastel, review/testimonial style",
      "testimonial-dark": "Dark slate background, gold star ratings, review style",
    };

    const styleDescription = templateStyles[template] || "Clean professional e-commerce style";

    const imagePrompt = `Create a professional e-commerce promotional image advertisement.

PRODUCT: "${product.title}"
${product.price ? `PRICE: ${product.price}€` : ''}
${discountText ? `DISCOUNT: ${discountText}` : ''}
${caption ? `TAGLINE: "${caption}"` : ''}

STYLE: ${styleDescription}

REQUIREMENTS:
- Square 1:1 aspect ratio (1024x1024 pixels)
- Product should be the focal point, centered
- Include the product name as stylish typography
- If there's a price, display it prominently
- If there's a discount, make it stand out with a badge or burst
- Professional advertising quality
- No watermarks or logos
- Make it look like a real social media ad

The image should look like a professional advertisement ready for Instagram or Facebook.`;

    console.log(`[EXPORT] Generating creative for: ${product.title} with template: ${template}`);

    // If product has an image, use image editing
    if (product.image) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EXPORT] AI API error:', response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (generatedImageUrl) {
          // Extract base64 from data URL
          const base64Match = generatedImageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          const base64Data = base64Match ? base64Match[1] : generatedImageUrl;
          
          console.log('[EXPORT] Successfully generated promotional image');
          return new Response(JSON.stringify({ 
            base64: base64Data,
            format: 'png',
            success: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (aiError) {
        console.error('[EXPORT] AI image generation failed:', aiError);
      }
    }

    // Fallback: Generate without product image
    try {
      const textOnlyPrompt = `Create a professional e-commerce promotional banner.

TEXT TO DISPLAY: "${product.title}"
${product.price ? `PRICE: ${product.price}€` : ''}
${discountText ? `DISCOUNT: ${discountText}` : ''}

STYLE: ${styleDescription}

Create a square 1024x1024 promotional banner with stylish typography showing the product name and price. Make it look like a professional social media advertisement.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: textOnlyPrompt }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (generatedImageUrl) {
          const base64Match = generatedImageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
          const base64Data = base64Match ? base64Match[1] : generatedImageUrl;
          
          console.log('[EXPORT] Generated text-only promotional banner');
          return new Response(JSON.stringify({ 
            base64: base64Data,
            format: 'png',
            success: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (fallbackError) {
      console.error('[EXPORT] Fallback generation failed:', fallbackError);
    }

    // Final fallback
    return new Response(JSON.stringify({ 
      error: 'Image generation failed',
      message: 'Could not generate promotional image. Please try again.'
    }), {
      status: 500,
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
