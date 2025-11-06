import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    console.log('Starting automatic Search Console data sync...');

    // Get all users with Google OAuth connected and active domains
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, google_oauth_token, google_refresh_token, google_token_expires_at, google_console_email')
      .not('google_oauth_token', 'is', null);

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with Google Search Console connected');
      return new Response(
        JSON.stringify({ message: 'No users to sync' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const profile of profiles) {
      try {
        // Get user's domains
        const { data: domainsData } = await supabaseClient
          .from('google_search_console_domains')
          .select('domain')
          .eq('user_id', profile.id);

        if (!domainsData || domainsData.length === 0) {
          console.log(`No domains configured for user ${profile.id}`);
          continue;
        }

        // Sync data for each domain
        for (const domainRow of domainsData) {
          try {
            // Call get-search-console-data for each domain
            const { data: syncData, error: syncError } = await supabaseClient.functions.invoke(
              'get-search-console-data',
              {
                body: {
                  domain: domainRow.domain,
                  days: 30
                }
              }
            );

            if (syncError) {
              console.error(`Failed to sync ${domainRow.domain} for user ${profile.id}:`, syncError);
              results.push({
                user_id: profile.id,
                domain: domainRow.domain,
                success: false,
                error: syncError.message
              });
              continue;
            }

            console.log(`Successfully synced ${domainRow.domain} for user ${profile.id}`);
            results.push({
              user_id: profile.id,
              domain: domainRow.domain,
              success: true,
              data_points: syncData?.data?.length || 0
            });

            // Send notification to user
            try {
              await supabaseClient.functions.invoke('send-notification', {
                body: {
                  user_id: profile.id,
                  template_code: 'search_console_sync',
                  message: {
                    title: 'Synchronisation Search Console',
                    body: `Les données de ${domainRow.domain} ont été synchronisées avec succès.`,
                  },
                  priority: 'low',
                  metadata: {
                    domain: domainRow.domain,
                    data_points: syncData?.data?.length || 0
                  }
                }
              });
            } catch (notifError) {
              console.error('Failed to send notification:', notifError);
            }
          } catch (domainError) {
            console.error(`Error processing domain ${domainRow.domain}:`, domainError);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.id}:`, userError);
      }
    }

    console.log('Automatic sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automatic sync completed',
        results,
        total_synced: results.filter(r => r.success).length,
        total_failed: results.filter(r => !r.success).length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in sync-search-console-data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
