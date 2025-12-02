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

    const { postId, userId } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    const results: { facebook?: any; instagram?: any } = {};
    let totalCredits = 0;

    // Publish to Facebook if selected
    if (post.channels?.includes('facebook')) {
      const { data: fbConnection } = await supabase
        .from('facebook_page_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('auto_share_enabled', true)
        .single();

      if (fbConnection) {
        try {
          let fbResult;
          
          if (post.image_url) {
            // Post with photo
            const photoResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbConnection.page_id}/photos`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: post.image_url,
                  caption: post.caption,
                  access_token: fbConnection.page_access_token,
                }),
              }
            );
            fbResult = await photoResponse.json();
          } else {
            // Text only post
            const feedResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbConnection.page_id}/feed`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: post.caption,
                  access_token: fbConnection.page_access_token,
                }),
              }
            );
            fbResult = await feedResponse.json();
          }

          if (fbResult.id || fbResult.post_id) {
            results.facebook = { success: true, postId: fbResult.id || fbResult.post_id };
            totalCredits += 3;
          } else {
            results.facebook = { success: false, error: fbResult.error?.message };
          }
        } catch (fbError: any) {
          results.facebook = { success: false, error: fbError.message };
        }
      }
    }

    // Publish to Instagram if selected
    if (post.channels?.includes('instagram')) {
      const { data: igConnection } = await supabase
        .from('instagram_account_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('auto_share_enabled', true)
        .single();

      if (igConnection && post.image_url) {
        try {
          // Create media container
          const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igConnection.account_id}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: post.image_url,
                caption: post.caption,
                access_token: igConnection.access_token,
              }),
            }
          );
          const containerData = await containerResponse.json();

          if (containerData.id) {
            // Publish the container
            const publishResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igConnection.account_id}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: igConnection.access_token,
                }),
              }
            );
            const publishData = await publishResponse.json();

            if (publishData.id) {
              results.instagram = { success: true, postId: publishData.id };
              totalCredits += 3;
            } else {
              results.instagram = { success: false, error: publishData.error?.message };
            }
          } else {
            results.instagram = { success: false, error: containerData.error?.message };
          }
        } catch (igError: any) {
          results.instagram = { success: false, error: igError.message };
        }
      }
    }

    // Update post status
    const allSuccessful = 
      (!post.channels?.includes('facebook') || results.facebook?.success) &&
      (!post.channels?.includes('instagram') || results.instagram?.success);

    await supabase
      .from('social_posts')
      .update({
        status: allSuccessful ? 'published' : 'failed',
        published_at: allSuccessful ? new Date().toISOString() : null,
        facebook_post_id: results.facebook?.postId || null,
        instagram_post_id: results.instagram?.postId || null,
        credits_consumed: totalCredits,
        error_message: !allSuccessful 
          ? JSON.stringify({ facebook: results.facebook?.error, instagram: results.instagram?.error })
          : null,
      })
      .eq('id', postId);

    // Deduct credits
    if (totalCredits > 0) {
      await supabase.rpc('increment_usage', {
        p_seller_id: userId,
        p_field: 'optimizations_count',
        p_increment: totalCredits
      });
    }

    return new Response(JSON.stringify({
      success: allSuccessful,
      results,
      creditsConsumed: totalCredits,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Publish social post error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
