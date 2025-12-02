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

    const { articleId } = await req.json();

    // Get article details
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found');
    }

    // Get Facebook page connection
    const { data: fbConnection, error: fbError } = await supabase
      .from('facebook_page_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('auto_share_enabled', true)
      .single();

    if (fbError || !fbConnection) {
      throw new Error('No active Facebook connection');
    }

    // Construct article URL (adjust based on your actual URL structure)
    const articleUrl = `https://newai.sale/article/${article.id}`;

    // Post to Facebook Page
    const postData = {
      message: `${article.title}\n\n${article.meta_description || ''}`,
      link: articleUrl,
      access_token: fbConnection.page_access_token
    };

    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${fbConnection.page_id}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      }
    );

    const fbResult = await fbResponse.json();

    if (fbResult.error) {
      throw new Error(fbResult.error.message);
    }

    console.log('[Facebook] Article shared successfully:', fbResult.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        postId: fbResult.id,
        message: 'Article shared to Facebook'
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