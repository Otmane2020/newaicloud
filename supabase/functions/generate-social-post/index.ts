import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analyze image with AI Vision
async function analyzeProductImage(imageUrl: string, lovableApiKey: string): Promise<string> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Décris cette image de produit de manière concise et attrayante pour une publication sur les réseaux sociaux. 
                       Inclus: couleurs, matériaux visibles, style, ambiance.
                       Maximum 50 mots. En français.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('Vision analysis error:', error);
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contentType, contentId, templateStyle, channels, includeLink, language = 'fr', postFormat } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get content details based on type
    let contentData: any = null;
    let images: string[] = [];
    let mainImage: string | null = null;
    let productLink: string | null = null;
    let variants: any[] = [];
    let priceRange: { min: number; max: number } | null = null;
    let visionDescription = '';

    if (contentType === 'product') {
      const { data: product } = await supabase
        .from('shopify_products')
        .select(`
          id, title, body_html, handle, vendor, tags, status, store_id,
          product_images(id, src, alt_text, position),
          product_variants(id, title, price, compare_at_price, sku, option1, option2, option3)
        `)
        .eq('id', contentId)
        .single();
      
      if (product) {
        contentData = product;
        
        // Get all images sorted by position
        const sortedImages = (product.product_images || [])
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        images = sortedImages.map((img: any) => img.src).filter(Boolean);
        mainImage = images[0] || null;
        
        // Analyze main image with AI Vision
        if (mainImage && lovableApiKey) {
          visionDescription = await analyzeProductImage(mainImage, lovableApiKey);
          console.log('[generate-social-post] Vision analysis:', visionDescription);
        }
        
        // Get variants with prices
        variants = product.product_variants || [];
        if (variants.length > 0) {
          const prices = variants.map((v: any) => parseFloat(v.price) || 0).filter(p => p > 0);
          if (prices.length > 0) {
            priceRange = {
              min: Math.min(...prices),
              max: Math.max(...prices),
            };
          }
        }
        
        // Get store domain for product link
        if (product.store_id) {
          const { data: store } = await supabase
            .from('shopify_connections')
            .select('shop_url')
            .eq('id', product.store_id)
            .single();
          
          if (store?.shop_url) {
            productLink = `https://${store.shop_url}/products/${product.handle}`;
          }
        }
      }
    } else if (contentType === 'collection') {
      const { data: collection } = await supabase
        .from('shopify_collections')
        .select('*')
        .eq('id', contentId)
        .single();
      
      if (collection) {
        contentData = collection;
        mainImage = collection.image_src || null;
        if (mainImage) {
          images = [mainImage];
          // Analyze collection image
          if (lovableApiKey) {
            visionDescription = await analyzeProductImage(mainImage, lovableApiKey);
          }
        }
      }
    } else if (contentType === 'article') {
      const { data: article } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('id', contentId)
        .single();
      
      if (article) {
        contentData = article;
        mainImage = article.featured_image || null;
        if (mainImage) images = [mainImage];
      }
    }

    if (!contentData) {
      throw new Error('Content not found');
    }

    // Build rich prompt with all product details
    const title = contentData.title || '';
    const description = contentData.body_html || contentData.content || contentData.description || '';
    const cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 300);
    
    // Build variant info for prompt
    let variantInfo = '';
    if (variants.length > 0) {
      const uniqueOptions = new Set<string>();
      variants.forEach((v: any) => {
        if (v.option1) uniqueOptions.add(v.option1);
        if (v.option2) uniqueOptions.add(v.option2);
      });
      if (uniqueOptions.size > 0) {
        variantInfo = `\nVariations disponibles: ${Array.from(uniqueOptions).slice(0, 5).join(', ')}`;
      }
    }

    // Build price info
    let priceInfo = '';
    if (priceRange) {
      if (priceRange.min === priceRange.max) {
        priceInfo = `\nPrix: ${priceRange.min.toFixed(2)}€`;
      } else {
        priceInfo = `\nPrix: ${priceRange.min.toFixed(2)}€ - ${priceRange.max.toFixed(2)}€`;
      }
    }

    // Generate caption with AI - enriched with vision analysis
    const platformName = channels?.includes('instagram') ? 'Instagram' : 'Facebook';
    const isReel = postFormat === 'reel' || postFormat === 'video';
    
    const systemPrompt = language === 'fr' 
      ? `Tu es un expert en marketing social media. Génère une légende engageante pour un post ${platformName}${isReel ? ' Reel/vidéo' : ''}.
         La légende doit être concise (max 150 caractères), accrocheuse et inclure des emojis pertinents.
         ${isReel ? 'Adapte le ton pour une vidéo courte et dynamique.' : ''}
         Ne pas inclure de hashtags.
         UTILISE la description visuelle de l'image pour rendre le texte plus authentique et descriptif.`
      : `You are a social media marketing expert. Generate an engaging caption for a ${platformName}${isReel ? ' Reel/video' : ''} post.
         The caption should be concise (max 150 characters), catchy and include relevant emojis.
         ${isReel ? 'Adapt the tone for a short, dynamic video.' : ''}
         Do not include hashtags.
         USE the visual description of the image to make the text more authentic and descriptive.`;

    const userPrompt = language === 'fr'
      ? `Génère une légende pour ce contenu:
Titre: ${title}
Description produit: ${cleanDescription}${variantInfo}${priceInfo}
${visionDescription ? `\nAnalyse visuelle de l'image: ${visionDescription}` : ''}
${images.length > 1 ? `Photos disponibles: ${images.length} images du produit` : ''}`
      : `Generate a caption for this content:
Title: ${title}
Product description: ${cleanDescription}${variantInfo}${priceInfo}
${visionDescription ? `\nVisual analysis of image: ${visionDescription}` : ''}
${images.length > 1 ? `Available photos: ${images.length} product images` : ''}`;

    let caption = title;

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          caption = aiData.choices?.[0]?.message?.content || caption;
        }
      } catch (aiError) {
        console.error('AI generation error:', aiError);
      }
    }

    // Add link if requested
    if (includeLink && productLink) {
      caption += `\n\n🔗 ${productLink}`;
    }

    return new Response(JSON.stringify({
      success: true,
      caption,
      imageUrl: mainImage,
      images: images, // All product images for carousel
      productLink,
      visionDescription, // Include vision analysis in response
      variants: variants.map(v => ({
        title: v.title,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        options: [v.option1, v.option2, v.option3].filter(Boolean),
      })),
      priceRange,
      contentData: {
        title: contentData.title,
        description: cleanDescription,
        type: contentType,
        vendor: contentData.vendor,
        tags: contentData.tags,
      },
      postFormat,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Generate social post error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
