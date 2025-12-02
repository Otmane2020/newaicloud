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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { articleId, productId, imageUrl, caption, productTitle } = body;

    let postMessage = '';
    let postLink = '';
    let postImageUrl = '';

    // Handle product post (Quick Post)
    if (productId) {
      if (!imageUrl || !caption) {
        throw new Error('Image URL and caption are required for product posts');
      }
      postMessage = caption;
      postImageUrl = imageUrl;
      postLink = ''; // No link for product posts unless we add store URL
      console.log('[Facebook] Posting product:', productTitle);
    } 
    // Handle article post
    else if (articleId) {
      const { data: article, error: articleError } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (articleError || !article) {
        throw new Error('Article not found');
      }

      postMessage = `${article.title}\n\n${article.meta_description || ''}`;
      postLink = `https://newai.sale/article/${article.id}`;
      postImageUrl = article.featured_image || '';
      console.log('[Facebook] Posting article:', article.title);
    } else {
      throw new Error('Either articleId or productId is required');
    }

    // Get Facebook page connection
    const { data: fbConnection, error: fbError } = await supabase
      .from('facebook_page_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('auto_share_enabled', true)
      .limit(1)
      .maybeSingle();

    if (fbError || !fbConnection) {
      throw new Error('No active Facebook connection found. Please connect a Facebook page first.');
    }

    // Build post data
    const postData: any = {
      message: postMessage,
      access_token: fbConnection.page_access_token
    };

    // Add link if available
    if (postLink) {
      postData.link = postLink;
    }

    // For posts with images but no link, use photo endpoint
    let endpoint = `https://graph.facebook.com/v18.0/${fbConnection.page_id}/feed`;
    
    if (postImageUrl && !postLink) {
      endpoint = `https://graph.facebook.com/v18.0/${fbConnection.page_id}/photos`;
      postData.url = postImageUrl;
    }

    const fbResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData)
    });

    const fbResult = await fbResponse.json();

    if (fbResult.error) {
      console.error('[Facebook] API error:', fbResult.error);
      throw new Error(fbResult.error.message);
    }

    console.log('[Facebook] Post successful:', fbResult.id || fbResult.post_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        postId: fbResult.id || fbResult.post_id,
        message: 'Published to Facebook successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Facebook share error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
