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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    console.log(`[PROCESS-SCHEDULED] Starting at ${now}`);

    // 1. Find articles that are scheduled and past their scheduled_for time
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from('scheduled_blog_articles')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled articles: ${fetchError.message}`);
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      console.log('[PROCESS-SCHEDULED] No articles to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No articles due for processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS-SCHEDULED] Found ${scheduledArticles.length} articles to process`);

    const results = {
      generated: 0,
      published: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const article of scheduledArticles) {
      try {
        console.log(`[PROCESS-SCHEDULED] Processing: ${article.title} (${article.id})`);

        // Step 1: Generate content if not already generated
        if (article.status === 'scheduled') {
          console.log(`[PROCESS-SCHEDULED] Generating content for: ${article.title}`);
          
          const generateResponse = await fetch(
            `${supabaseUrl}/functions/v1/generate-scheduled-article`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ articleId: article.id }),
            }
          );

          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            throw new Error(`Generation failed: ${errorText}`);
          }

          const generateResult = await generateResponse.json();
          console.log(`[PROCESS-SCHEDULED] Generated: ${generateResult.title}`);
          results.generated++;

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 2: Publish the article
        console.log(`[PROCESS-SCHEDULED] Publishing: ${article.title}`);
        
        const publishResponse = await fetch(
          `${supabaseUrl}/functions/v1/publish-scheduled-article`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ articleId: article.id }),
          }
        );

        if (!publishResponse.ok) {
          const errorText = await publishResponse.text();
          throw new Error(`Publishing failed: ${errorText}`);
        }

        const publishResult = await publishResponse.json();
        
        if (publishResult.success) {
          console.log(`[PROCESS-SCHEDULED] ✅ Published: ${article.title}`);
          results.published++;
        } else {
          console.log(`[PROCESS-SCHEDULED] ⚠️ Not published (status): ${publishResult.message}`);
        }

      } catch (error) {
        console.error(`[PROCESS-SCHEDULED] ❌ Error processing ${article.title}:`, error);
        results.failed++;
        results.errors.push(`${article.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Mark as failed in database
        await supabase
          .from('scheduled_blog_articles')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', article.id);
      }
    }

    console.log(`[PROCESS-SCHEDULED] Complete: ${results.generated} generated, ${results.published} published, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: scheduledArticles.length,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PROCESS-SCHEDULED] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
