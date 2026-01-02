import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CRON Job: Sync Shopify subscription statuses
 * Runs daily to catch missed webhooks and transition trial → active
 * 
 * Fixes the critical billing issue where users aren't billed after trial
 */

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SHOPIFY-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    logStep('Starting daily subscription sync');

    // 1️⃣ Get all Shopify users with trialing or active subscriptions
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, subscription_status, current_plan_id, trial_ends_at, shopify_subscription_id')
      .eq('billing_provider', 'shopify')
      .in('subscription_status', ['trialing', 'active', 'past_due']);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    logStep(`Found ${profiles?.length || 0} Shopify users to check`);

    const results = {
      checked: 0,
      updated: 0,
      errors: 0,
      trialToActive: 0,
      cancelled: 0,
      pastDue: 0,
    };

    for (const profile of profiles || []) {
      results.checked++;
      
      try {
        // Get Shopify connection for this user
        const { data: connection, error: connError } = await supabase
          .from('shopify_connections')
          .select('store_url, access_token')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single();

        if (connError || !connection) {
          logStep(`No active connection for user ${profile.id}`, { error: connError?.message });
          continue;
        }

        // Query Shopify for active subscriptions
        const query = `
          query {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                currentPeriodEnd
                trialDays
              }
            }
          }
        `;

        const shopifyResponse = await fetch(
          `https://${connection.store_url}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': connection.access_token,
            },
            body: JSON.stringify({ query }),
          }
        );

        if (!shopifyResponse.ok) {
          logStep(`Shopify API error for ${profile.email}`, { status: shopifyResponse.status });
          results.errors++;
          continue;
        }

        const shopifyData = await shopifyResponse.json();
        const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];

        if (activeSubscriptions.length === 0) {
          // No active subscription - user might have cancelled
          if (profile.subscription_status !== 'cancelled' && profile.subscription_status !== 'inactive') {
            logStep(`User ${profile.email} has no active subscription - marking as cancelled`);
            
            await supabase
              .from('profiles')
              .update({
                subscription_status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);

            await supabase
              .from('subscriptions')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('seller_id', profile.id)
              .eq('billing_provider', 'shopify');

            results.cancelled++;
            results.updated++;
          }
          continue;
        }

        const subscription = activeSubscriptions[0];
        const hasTrialDays = subscription.trialDays > 0;
        const shopifyStatus = subscription.status?.toUpperCase();

        // Determine correct local status
        let correctStatus = 'active';
        if (shopifyStatus === 'ACTIVE') {
          correctStatus = hasTrialDays ? 'trialing' : 'active';
        } else if (shopifyStatus === 'FROZEN') {
          correctStatus = 'past_due';
        } else if (shopifyStatus === 'CANCELLED' || shopifyStatus === 'EXPIRED') {
          correctStatus = 'cancelled';
        }

        // 🔑 KEY FIX: Check if trial has ended but user is still marked as trialing
        const trialEnded = profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date();
        if (profile.subscription_status === 'trialing' && trialEnded && shopifyStatus === 'ACTIVE' && !hasTrialDays) {
          logStep(`🎉 Trial ended for ${profile.email} - transitioning to ACTIVE`, {
            oldStatus: 'trialing',
            newStatus: 'active',
            trialEndedAt: profile.trial_ends_at,
          });
          correctStatus = 'active';
          results.trialToActive++;
        }

        // Update if status doesn't match
        if (profile.subscription_status !== correctStatus) {
          logStep(`Updating ${profile.email}: ${profile.subscription_status} → ${correctStatus}`);

          const updateData: Record<string, any> = {
            subscription_status: correctStatus,
            updated_at: new Date().toISOString(),
          };

          // Clear trial_ends_at when transitioning to active
          if (correctStatus === 'active' && profile.subscription_status === 'trialing') {
            updateData.trial_ends_at = null;
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id);

          await supabase
            .from('subscriptions')
            .update({
              status: correctStatus,
              current_period_end: subscription.currentPeriodEnd || null,
              updated_at: new Date().toISOString(),
            })
            .eq('seller_id', profile.id)
            .eq('billing_provider', 'shopify');

          results.updated++;

          if (correctStatus === 'past_due') {
            results.pastDue++;
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (userError) {
        logStep(`Error processing user ${profile.email}`, { error: String(userError) });
        results.errors++;
      }
    }

    // Log results
    await supabase.from('system_logs').insert({
      type: 'subscription_sync',
      function_name: 'sync-shopify-subscriptions',
      message: `Daily subscription sync completed`,
      metadata: {
        ...results,
        timestamp: new Date().toISOString(),
      },
    });

    logStep('Sync completed', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message });

    await supabase.from('system_logs').insert({
      type: 'subscription_sync_error',
      function_name: 'sync-shopify-subscriptions',
      message: `Sync failed: ${message}`,
      metadata: { error: message, timestamp: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
