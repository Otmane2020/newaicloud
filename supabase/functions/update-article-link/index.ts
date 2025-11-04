import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkLink(url: string): Promise<{ status: number | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)',
      },
    });

    clearTimeout(timeout);
    return { status: response.status, error: null };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { status: null, error: 'Timeout' };
    }
    return { status: null, error: error.message || 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { link_id, new_url, update_all_identical } = await req.json();

    if (!link_id || !new_url) {
      throw new Error('Missing required fields: link_id and new_url');
    }

    console.log(`Replacing link ${link_id} with ${new_url} for user ${user.id}`);

    // Get the original link
    const { data: originalLink, error: linkError } = await supabaseClient
      .from('blog_netlinking')
      .select('*')
      .eq('id', link_id)
      .eq('user_id', user.id)
      .single();

    if (linkError || !originalLink) {
      throw new Error('Link not found or access denied');
    }

    // Check if the new URL is valid
    const { status, error: checkError } = await checkLink(new_url);
    const isNewUrlBroken = status === null || status >= 400;

    if (isNewUrlBroken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `The new URL appears to be broken: ${checkError || `HTTP ${status}`}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the article
    const { data: article, error: articleError } = await supabaseClient
      .from('blog_articles')
      .select('id, content')
      .eq('id', originalLink.article_id)
      .eq('user_id', user.id)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found or access denied');
    }

    // Replace the URL in the HTML content
    const oldUrl = originalLink.target_url;
    let updatedContent = article.content;
    
    // Create a regex to match the old URL in href attributes
    const urlRegex = new RegExp(`href=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
    updatedContent = updatedContent.replace(urlRegex, `href="${new_url}"`);

    // Update the article
    const { error: updateArticleError } = await supabaseClient
      .from('blog_articles')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    if (updateArticleError) throw updateArticleError;

    // Update the netlinking record
    const now = new Date().toISOString();
    const { error: updateLinkError } = await supabaseClient
      .from('blog_netlinking')
      .update({
        target_url: new_url,
        is_broken: false,
        last_checked_at: now,
        http_status_code: status,
        error_message: null,
        broken_since: null,
        updated_at: now,
      })
      .eq('id', link_id);

    if (updateLinkError) throw updateLinkError;

    let updatedCount = 1;

    // If update_all_identical is true, update other identical links
    if (update_all_identical) {
      // Find all other links with the same URL
      const { data: identicalLinks } = await supabaseClient
        .from('blog_netlinking')
        .select('id, article_id')
        .eq('user_id', user.id)
        .eq('target_url', oldUrl)
        .neq('id', link_id);

      if (identicalLinks && identicalLinks.length > 0) {
        console.log(`Found ${identicalLinks.length} identical links to update`);

        // Update each article
        for (const link of identicalLinks) {
          const { data: otherArticle } = await supabaseClient
            .from('blog_articles')
            .select('content')
            .eq('id', link.article_id)
            .eq('user_id', user.id)
            .single();

          if (otherArticle) {
            let otherUpdatedContent = otherArticle.content;
            otherUpdatedContent = otherUpdatedContent.replace(urlRegex, `href="${new_url}"`);

            await supabaseClient
              .from('blog_articles')
              .update({ 
                content: otherUpdatedContent,
                updated_at: now
              })
              .eq('id', link.article_id);
          }

          // Update the netlinking record
          await supabaseClient
            .from('blog_netlinking')
            .update({
              target_url: new_url,
              is_broken: false,
              last_checked_at: now,
              http_status_code: status,
              error_message: null,
              broken_since: null,
              updated_at: now,
            })
            .eq('id', link.id);

          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} link(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully updated ${updatedCount} link(s)`,
        updated_count: updatedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error updating article link:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});