import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { articleId, productId, imageUrl, caption, productTitle, userId } = body;

    // Use userId from body if provided, otherwise use authenticated user
    const targetUserId = userId || user.id;

    let postCaption = '';
    let postImageUrl = '';

    // Handle product post (Quick Post)
    if (productId) {
      if (!imageUrl || !caption) {
        throw new Error('Image URL and caption are required for product posts');
      }
      postCaption = caption;
      postImageUrl = imageUrl;
      console.log('[SHARE-INSTAGRAM] Posting product:', productTitle);
    }
    // Handle article post
    else if (articleId) {
      const { data: article, error: articleError } = await supabaseClient
        .from('blog_articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (articleError || !article) {
        throw new Error('Article not found');
      }

      postCaption = `${article.title}\n\n${article.meta_description || ''}`;
      postImageUrl = article.featured_image || '';
      console.log('[SHARE-INSTAGRAM] Posting article:', article.title);
    } else {
      throw new Error('Either articleId or productId is required');
    }

    // Validate image URL
    if (!postImageUrl || postImageUrl.includes('placehold')) {
      throw new Error('A valid image URL is required for Instagram posts');
    }

    // Get Instagram connection
    const { data: instagramConnection, error: connectionError } = await supabaseClient
      .from('instagram_account_connections')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('auto_share_enabled', true)
      .maybeSingle();

    if (connectionError || !instagramConnection) {
      console.log('[SHARE-INSTAGRAM] No Instagram connection found or auto-share disabled');
      throw new Error('No active Instagram connection found. Please connect an Instagram Business account first.');
    }

    console.log('[SHARE-INSTAGRAM] Posting to Instagram account:', instagramConnection.account_name);

    // Create media container
    console.log('[SHARE-INSTAGRAM] Creating media container...');
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramConnection.account_id}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: postImageUrl,
          caption: postCaption,
          access_token: instagramConnection.access_token,
        }),
      }
    );

    const containerData = await containerResponse.json();
    console.log('[SHARE-INSTAGRAM] Container response:', containerData);

    if (containerData.error) {
      console.error('[SHARE-INSTAGRAM] Container creation error:', containerData.error);
      throw new Error(containerData.error.message || 'Failed to create Instagram media container');
    }

    if (containerData.id) {
      // Publish the media
      console.log('[SHARE-INSTAGRAM] Publishing media...');
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramConnection.account_id}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: instagramConnection.access_token,
          }),
        }
      );

      const publishData = await publishResponse.json();
      console.log('[SHARE-INSTAGRAM] Publish response:', publishData);

      if (publishData.error) {
        console.error('[SHARE-INSTAGRAM] Publish error:', publishData.error);
        throw new Error(publishData.error.message || 'Failed to publish Instagram media');
      }

      if (publishData.id) {
        console.log('[SHARE-INSTAGRAM] ✅ Post successful');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            postId: publishData.id,
            message: 'Published to Instagram successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    throw new Error('Failed to publish to Instagram');
  } catch (error: any) {
    console.error('[SHARE-INSTAGRAM] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
