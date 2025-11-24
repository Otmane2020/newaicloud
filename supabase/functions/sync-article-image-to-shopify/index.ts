import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🎯 [SYNC-ARTICLE-IMAGE] Function invoked - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [SYNC-ARTICLE-IMAGE] Starting article image sync...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { article_id } = await req.json();
    console.log(`📰 [SYNC-ARTICLE-IMAGE] Article ID: ${article_id}`);

    // Get article data
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('shopify_article_id, title, user_id')
      .eq('id', article_id)
      .single();

    if (articleError) {
      console.error('❌ [SYNC-ARTICLE-IMAGE] Article fetch error:', articleError);
      throw articleError;
    }

    console.log(`🔍 [SYNC-ARTICLE-IMAGE] Article:`, {
      shopify_id: article.shopify_article_id,
      title: article.title
    });

    if (!article.shopify_article_id) {
      console.log('⚠️ [SYNC-ARTICLE-IMAGE] Article not synced to Shopify yet');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'NOT_SYNCED',
          message: 'Article must be synced to Shopify first before updating image. Please use sync-blog-to-shopify first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get featured image
    const { data: featuredImage, error: imageError } = await supabase
      .from('content_images')
      .select('src, alt_text')
      .eq('content_type', 'article')
      .eq('content_id', article_id)
      .eq('position', 0)
      .maybeSingle();

    if (imageError) {
      console.error('❌ [SYNC-ARTICLE-IMAGE] Image fetch error:', imageError);
      throw imageError;
    }

    if (!featuredImage?.src) {
      console.log('⚠️ [SYNC-ARTICLE-IMAGE] No featured image found');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No featured image found for this article' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📸 [SYNC-ARTICLE-IMAGE] Featured image found:`, featuredImage.src.substring(0, 80) + '...');

    // ✅ CRITICAL: Validate image URL format
    if (featuredImage.src.startsWith('data:')) {
      console.error('❌ [SYNC-ARTICLE-IMAGE] Base64 image detected - Shopify cannot process base64');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Base64 images not supported',
          message: 'L\'image doit être une URL publique HTTP, pas du base64'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store connection
    const { data: storeData, error: storeError } = await supabase
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('user_id', article.user_id)
      .eq('is_active', true)
      .maybeSingle();
      
    if (storeError) throw storeError;
    
    if (!storeData) {
      console.error('❌ [SYNC-ARTICLE-IMAGE] No store connection found');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No Shopify store connected' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🏪 [SYNC-ARTICLE-IMAGE] Store: ${storeData.store_url}`);

    // Get the blog ID (we need it to update the article)
    const blogsResp = await fetch(
      `https://${storeData.store_url}/admin/api/2025-01/blogs.json`,
      {
        headers: {
          'X-Shopify-Access-Token': storeData.access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!blogsResp.ok) {
      throw new Error(`Failed to fetch blogs: ${blogsResp.status}`);
    }

    const blogsData = await blogsResp.json();
    const blogId = blogsData.blogs?.[0]?.id;

    if (!blogId) {
      throw new Error('No blog found in Shopify');
    }

    console.log(`📚 [SYNC-ARTICLE-IMAGE] Blog ID: ${blogId}`);

    // Update the article with the featured image (always use PUT for updates)
    console.log(`🔄 [${new Date().toISOString()}] [SYNC-ARTICLE-IMAGE] Updating article ${article.shopify_article_id} image...`);
    console.log(`📸 [SYNC-ARTICLE-IMAGE] Image URL: ${featuredImage.src.substring(0, 80)}...`);
    
    const shopifyResponse = await fetch(
      `https://${storeData.store_url}/admin/api/2025-01/blogs/${blogId}/articles/${article.shopify_article_id}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': storeData.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: {
            id: article.shopify_article_id,
            image: {
              src: featuredImage.src,
              alt: featuredImage.alt_text || article.title
            }
          }
        })
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error(`❌ [SYNC-ARTICLE-IMAGE] Shopify API error: ${shopifyResponse.status}`);
      console.error(`Response: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Shopify API error: ${shopifyResponse.status}`,
          details: errorText
        }),
        { status: shopifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await shopifyResponse.json();
    console.log('✅ [SYNC-ARTICLE-IMAGE] Article image synced to Shopify successfully');
    console.log(`📸 [SYNC-ARTICLE-IMAGE] Shopify response:`, JSON.stringify(responseData).substring(0, 200));

    // Update last_synced_at for the content_image
    await supabase
      .from('content_images')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('content_type', 'article')
      .eq('content_id', article_id)
      .eq('position', 0);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Image de l\'article synchronisée avec Shopify',
        shopify_response: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [SYNC-ARTICLE-IMAGE] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Erreur lors de la synchronisation avec Shopify'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
