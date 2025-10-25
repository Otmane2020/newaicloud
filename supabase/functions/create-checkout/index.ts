import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
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
    console.log('🚀 Starting checkout session creation...');

    const { plan_id, billing_period, success_url, cancel_url } = await req.json();

    if (!plan_id || !billing_period) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: plan_id and billing_period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['monthly', 'yearly'].includes(billing_period)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing_period. Must be "monthly" or "yearly"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Plan found:', plan.name);

    // Get Stripe Price ID
    const stripePriceId = billing_period === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : (plan.stripe_price_id_monthly || plan.stripe_price_id);

    if (!stripePriceId || !stripePriceId.startsWith('price_')) {
      console.error(`❌ Invalid Stripe Price ID: ${stripePriceId}`);
      return new Response(
        JSON.stringify({ 
          error: `Configuration incomplète: Le forfait "${plan.name}" n'a pas de tarif Stripe configuré.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      console.log('👥 Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    console.log('🎫 Creating Stripe checkout session...');

    const origin = req.headers.get('origin') || 'http://localhost:8080';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{
        price: stripePriceId,
        quantity: 1
      }],
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        billing_period: billing_period,
        plan_name: plan.name
      },
      subscription_data: {
        trial_period_days: plan.trial_days || 14,
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period
        }
      },
      success_url: success_url || `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/onboarding?checkout=cancelled&plan_id=${plan_id}`,
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    console.log('✅ Checkout session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        url: session.url,
        customer_id: customerId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});