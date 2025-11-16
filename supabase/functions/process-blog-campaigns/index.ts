import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey",
};

// Helper to calculate next execution date
function calculateNextExecution(frequency: string, lastRun: Date): Date {
  const next = new Date(lastRun);
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7); // Default to weekly
  }
  
  return next;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("🔄 [CRON] Starting blog campaign processing...");

    // Fetch active campaigns that need to run
    const now = new Date().toISOString();
    const { data: campaigns, error: fetchError } = await supabase
      .from('blog_campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_at', now);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📋 [CRON] Found ${campaigns?.length || 0} campaigns to process`);

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No campaigns to process',
          processed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    // Process each campaign
    for (const campaign of campaigns) {
      console.log(`🚀 [CRON] Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Generate article for this campaign
        const { data: generationResult, error: generationError } = await supabase.functions.invoke(
          'generate-blog-article',
          {
            body: {
              user_id: campaign.user_id,
              campaign_id: campaign.id,
              keywords: campaign.keywords,
              mode: 'auto'
            }
          }
        );

        if (generationError) {
          throw generationError;
        }

        console.log(`✅ [CRON] Article generated for campaign: ${campaign.name}`);

        // Calculate next execution date
        const nextExecution = calculateNextExecution(
          campaign.frequency || 'weekly',
          new Date()
        );

        // Update campaign
        const { error: updateError } = await supabase
          .from('blog_campaigns')
          .update({
            last_run_at: now,
            next_execution_at: nextExecution.toISOString(),
            last_generation_date: now
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.error(`❌ [CRON] Failed to update campaign: ${campaign.name}`, updateError);
        }

        // Auto-publish if enabled
        if (campaign.auto_post && generationResult?.article?.id) {
          console.log(`📤 [CRON] Auto-publishing article for campaign: ${campaign.name}`);
          
          const { error: syncError } = await supabase.functions.invoke(
            'sync-blog-to-shopify',
            {
              body: {
                articleId: generationResult.article.id
              }
            }
          );

          if (syncError) {
            console.error(`❌ [CRON] Failed to publish article:`, syncError);
          }
        }

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          success: true,
          article_id: generationResult?.article?.id,
          next_execution: nextExecution.toISOString()
        });

      } catch (error: any) {
        console.error(`❌ [CRON] Error processing campaign ${campaign.name}:`, error);
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`✅ [CRON] Processed ${results.length} campaigns`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} campaigns`,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [CRON] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
