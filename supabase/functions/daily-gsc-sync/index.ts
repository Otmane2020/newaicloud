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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[DAILY-GSC-SYNC] Starting daily sync for all users');

    // Get all users with auto-sync enabled and Google OAuth tokens
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, google_oauth_token, google_oauth_refresh_token')
      .not('google_oauth_token', 'is', null);

    if (!profiles || profiles.length === 0) {
      console.log('[DAILY-GSC-SYNC] No users with Google OAuth found');
      return new Response(
        JSON.stringify({ message: 'No users to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DAILY-GSC-SYNC] Found ${profiles.length} users with OAuth`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      alerts_detected: 0
    };

    for (const profile of profiles) {
      try {
        // Check if auto-sync is enabled for this user
        const { data: syncConfig } = await supabase
          .from('gsc_sync_config')
          .select('auto_sync_enabled, notification_enabled, last_sync_at')
          .eq('user_id', profile.id)
          .single();

        if (syncConfig && !syncConfig.auto_sync_enabled) {
          console.log(`[DAILY-GSC-SYNC] Auto-sync disabled for user ${profile.id}`);
          results.skipped++;
          continue;
        }

        // Get user's configured domains
        const { data: domains } = await supabase
          .from('gsc_configured_domains')
          .select('domain')
          .eq('user_id', profile.id);

        if (!domains || domains.length === 0) {
          console.log(`[DAILY-GSC-SYNC] No domains configured for user ${profile.id}`);
          results.skipped++;
          continue;
        }

        console.log(`[DAILY-GSC-SYNC] Syncing ${domains.length} domains for user ${profile.id}`);

        let userAlerts = 0;

        for (const { domain } of domains) {
          try {
            // Sync data for this domain
            const { error: syncError } = await supabase.functions.invoke('get-search-console-data', {
              body: { domain, days: 7 },
              headers: {
                Authorization: `Bearer ${profile.google_oauth_token}`
              }
            });

            if (syncError) {
              console.error(`[DAILY-GSC-SYNC] Sync error for ${domain}:`, syncError);
              continue;
            }

            // Analyze for anomalies
            const { data: analysisData } = await supabase.functions.invoke('analyze-gsc-anomalies', {
              body: { domain, days: 7 },
              headers: {
                Authorization: `Bearer ${profile.google_oauth_token}`
              }
            });

            if (analysisData?.summary?.total_alerts > 0) {
              userAlerts += analysisData.summary.total_alerts;
            }

            console.log(`[DAILY-GSC-SYNC] Completed sync for ${domain}`);
          } catch (domainError) {
            console.error(`[DAILY-GSC-SYNC] Domain error for ${domain}:`, domainError);
          }
        }

        // Update last sync time
        await supabase
          .from('gsc_sync_config')
          .upsert({
            user_id: profile.id,
            last_sync_at: new Date().toISOString(),
            next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });

        // Send summary notification if enabled
        if (syncConfig?.notification_enabled) {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: profile.id,
              title: '✅ Synchronisation Google Search Console',
              message: userAlerts > 0 
                ? `Synchronisation terminée avec ${userAlerts} alerte(s) détectée(s)`
                : 'Synchronisation quotidienne terminée avec succès',
              category: 'system',
              priority: userAlerts > 0 ? 'high' : 'low',
              action_url: '/seo?tab=google-console',
              action_label: 'Voir les détails',
              force_browser: userAlerts > 0,
            }
          });
        }

        results.success++;
        results.alerts_detected += userAlerts;

      } catch (userError) {
        console.error(`[DAILY-GSC-SYNC] User error for ${profile.id}:`, userError);
        results.failed++;
      }
    }

    console.log('[DAILY-GSC-SYNC] Daily sync complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Daily sync completed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[DAILY-GSC-SYNC] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});