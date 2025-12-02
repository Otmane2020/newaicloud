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

    const { articleId, userId } = await req.json();

    if (!articleId || !userId) {
      throw new Error('Article ID and User ID are required');
    }

    console.log('Sharing article to Instagram:', articleId, 'for user:', userId);

    // Get article details
    const { data: article, error: articleError } = await supabaseClient
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found');
    }

    // Get Instagram connection
    const { data: instagramConnection, error: connectionError } = await supabaseClient
      .from('instagram_account_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('auto_share_enabled', true)
      .maybeSingle();

    if (connectionError || !instagramConnection) {
      console.log('No Instagram connection found or auto-share disabled');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No Instagram connection found or auto-share disabled' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Posting to Instagram account:', instagramConnection.account_name);

    // Create Instagram post
    // Note: Instagram requires an image URL for posts
    const imageUrl = article.featured_image || 'https://placehold.co/1080x1080';
    const caption = `${article.title}\n\n${article.meta_description || ''}`;

    // First, create a media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/v21.0/${instagramConnection.account_id}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: instagramConnection.access_token,
        }),
      }
    );

    const containerData = await containerResponse.json();
    console.log('Instagram container response:', containerData);

    if (containerData.id) {
      // Publish the media
      const publishResponse = await fetch(
        `https://graph.instagram.com/v21.0/${instagramConnection.account_id}/media_publish`,
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
      console.log('Instagram publish response:', publishData);

      if (publishData.id) {
        console.log('Article shared successfully to Instagram');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            postId: publishData.id,
            message: 'Article shared successfully to Instagram'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    throw new Error('Failed to share article on Instagram');
  } catch (error: any) {
    console.error('Error sharing article on Instagram:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
