import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => console.log(`[SYNC-STRIPE] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { customerId } = body;

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    log('Checking Stripe customer', { customerId, userId: user.id });

    // Récupérer les souscriptions actives de Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    log('Found subscriptions', { count: subscriptions.data.length });

    if (subscriptions.data.length === 0) {
      log('No active subscriptions');
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
      log('No matching plan', { priceId });
      return new Response(
        JSON.stringify({ hasActiveSubscription: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer billing_period depuis Stripe
    const interval = activeSubscription.items.data[0]?.price.recurring?.interval;
    const billingPeriod = interval === 'year' ? 'yearly' : 'monthly';

    // Synchroniser la souscription dans notre DB (CRITICAL: use seller_id)
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        seller_id: user.id,
        stripe_subscription_id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        plan_id: plan.id,
        billing_period: billingPeriod,
      }, {
        onConflict: 'seller_id'
      });

    if (upsertError) {
      log('ERROR upserting', upsertError);
      throw upsertError;
    }

    log('✅ Synced successfully', { subscriptionId: activeSubscription.id, planId: plan.id });

    return new Response(
      JSON.stringify({ 
        hasActiveSubscription: true,
        subscriptionId: activeSubscription.id,
        planId: plan.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log('ERROR', error.message ?? String(error));
    return new Response(
      JSON.stringify({ error: error.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
