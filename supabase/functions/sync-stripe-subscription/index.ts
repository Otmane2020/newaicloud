import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { customerId } = await req.json();

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('[sync-stripe-subscription] Checking Stripe for customer:', customerId);

    // Récupérer les souscriptions actives de Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    console.log('[sync-stripe-subscription] Found', subscriptions.data.length, 'active subscriptions');

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ hasActiveSubscription: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const activeSubscription = subscriptions.data[0];
    const priceId = activeSubscription.items.data[0]?.price.id;

    // Trouver le plan correspondant dans notre DB
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .single();

    if (!plan) {
      console.warn('[sync-stripe-subscription] No matching plan found for price ID:', priceId);
      return new Response(
        JSON.stringify({ hasActiveSubscription: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Synchroniser la souscription dans notre DB
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_subscription_id: activeSubscription.id,
        stripe_customer_id: customerId,
        status: activeSubscription.status,
        current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        plan_id: plan.id,
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('[sync-stripe-subscription] Error upserting subscription:', upsertError);
      throw upsertError;
    }

    console.log('[sync-stripe-subscription] ✅ Subscription synced successfully');

    return new Response(
      JSON.stringify({ 
        hasActiveSubscription: true,
        subscriptionId: activeSubscription.id,
        planId: plan.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-stripe-subscription] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
