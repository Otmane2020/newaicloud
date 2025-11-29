import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Health check
    if (body.healthCheck) {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { articleId } = body;
    
    if (!articleId) {
      throw new Error('articleId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the scheduled article
    const { data: article, error: fetchError } = await supabase
      .from('scheduled_blog_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Article not found: ${fetchError?.message || 'Unknown'}`);
    }

    if (article.status !== 'generated') {
      return new Response(
        JSON.stringify({ success: false, message: 'Article must be generated first', status: article.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PUBLISH-SCHEDULED] Publishing: ${article.title}`);

    // Insert into promotional_articles
    const { data: published, error: insertError } = await supabase
      .from('promotional_articles')
      .insert({
        title: article.title,
        slug: article.slug,
        meta_description: article.meta_description,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        featured_image: article.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
        read_time: article.read_time || 5,
        published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Update scheduled article status
    await supabase
      .from('scheduled_blog_articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', articleId);

    console.log(`[PUBLISH-SCHEDULED] ✅ Published: ${article.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        articleId,
        publishedId: published.id,
        title: article.title,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PUBLISH-SCHEDULED] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
