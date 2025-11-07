import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting fix-stuck-subscriptions');

    // Get all profiles with stripe_customer_id but inactive status
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('stripe_customer_id', 'is', null)
      .eq('subscription_status', 'inactive');

    if (profilesError) throw profilesError;

    console.log(`📋 Found ${profiles?.length || 0} profiles to check`);

    const results = {
      checked: 0,
      fixed: 0,
      errors: [] as string[],
    };

    for (const profile of profiles || []) {
      results.checked++;
      console.log(`🔍 Checking profile ${profile.email}`);

      try {
        // Check Stripe for active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const planId = subscription.items.data[0].price.id;

          console.log(`✅ Found active subscription for ${profile.email}, updating...`);

          // Update profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              current_plan_id: planId,
              onboarding_completed: true,
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', profile.id);

          if (updateError) throw updateError;

          // Upsert subscription record
          await supabase
            .from('subscriptions')
            .upsert({
              seller_id: profile.id,
              stripe_subscription_id: subscription.id,
              plan_id: planId,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_start: subscription.trial_start 
                ? new Date(subscription.trial_start * 1000).toISOString()
                : null,
              trial_end: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            });

          results.fixed++;
          console.log(`✅ Fixed profile ${profile.email}`);
        } else {
          console.log(`ℹ️ No active subscription found for ${profile.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${profile.email}:`, error);
        results.errors.push(`${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Fix complete:', results);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in fix-stuck-subscriptions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
