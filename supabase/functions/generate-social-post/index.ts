import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { contentType, contentId, templateStyle, channels, includeLink, language = 'fr' } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get content details based on type
    let contentData: any = null;
    let imageUrl: string | null = null;
    let productLink: string | null = null;

    if (contentType === 'product') {
      const { data: product } = await supabase
        .from('shopify_products')
        .select('*, product_images(*)')
        .eq('id', contentId)
        .single();
      
      if (product) {
        contentData = product;
        imageUrl = product.product_images?.[0]?.src || null;
        
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
        imageUrl = collection.image_src || null;
      }
    } else if (contentType === 'article') {
      const { data: article } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('id', contentId)
        .single();
      
      if (article) {
        contentData = article;
        imageUrl = article.featured_image || null;
      }
    }

    if (!contentData) {
      throw new Error('Content not found');
    }

    // Generate caption with AI
    const systemPrompt = language === 'fr' 
      ? `Tu es un expert en marketing social media. Génère une légende engageante pour un post ${channels?.includes('instagram') ? 'Instagram' : 'Facebook'}. 
         La légende doit être concise (max 150 caractères), accrocheuse et inclure des emojis pertinents.
         Ne pas inclure de hashtags.`
      : `You are a social media marketing expert. Generate an engaging caption for a ${channels?.includes('instagram') ? 'Instagram' : 'Facebook'} post.
         The caption should be concise (max 150 characters), catchy and include relevant emojis.
         Do not include hashtags.`;

    const userPrompt = language === 'fr'
      ? `Génère une légende pour ce contenu:\nTitre: ${contentData.title}\nDescription: ${contentData.body_html || contentData.content || contentData.description || ''}`
      : `Generate a caption for this content:\nTitle: ${contentData.title}\nDescription: ${contentData.body_html || contentData.content || contentData.description || ''}`;

    let caption = contentData.title || '';

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

    // For styled templates, we would generate an image with overlay
    // For now, return the base image URL
    let finalImageUrl = imageUrl;

    // If overlay template requested and we have Gemini image generation
    if (templateStyle === 'overlay' && imageUrl && lovableApiKey) {
      // For overlay, we could use Gemini to generate styled image
      // This is a placeholder - actual implementation would use image generation
      console.log('Overlay template requested - using base image for now');
    }

    return new Response(JSON.stringify({
      success: true,
      caption,
      imageUrl: finalImageUrl,
      productLink,
      contentData: {
        title: contentData.title,
        type: contentType,
      }
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
