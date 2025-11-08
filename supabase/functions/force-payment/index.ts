import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log('🚨 Force payment started');
    
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body to get optional plan_id and billing_period
    const body = await req.json().catch(() => ({}));
    const requestedPlanId = body.plan_id;
    const requestedBillingPeriod = body.billing_period || 'monthly';

    console.log('📋 Request params:', { requestedPlanId, requestedBillingPeriod });

    // Get current plan if no plan_id specified
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('current_plan_id')
      .eq('id', user.id)
      .single();

    // Determine which plan to use
    let planId = requestedPlanId || profile?.current_plan_id || 'starter';
    if (planId === 'trial') {
      planId = 'starter';
    }

    console.log('🎯 Using plan:', planId);

    // Get plan details
    const { data: plan } = await supabaseClient
      .from('subscription_plans')
      .select('stripe_price_id_monthly, stripe_price_id_yearly')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get the correct price ID based on billing period
    const stripePriceId = requestedBillingPeriod === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;

    if (!stripePriceId || !stripePriceId.startsWith('price_')) {
      throw new Error(`Invalid Stripe Price ID for plan ${planId}`);
    }

    console.log('💳 Using Stripe Price ID:', stripePriceId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('✅ Found existing customer:', customerId);
    }

    // Always create a new checkout session for plan changes
    // This allows users to review the change and confirm payment in Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          forced_payment: 'true'
        }
        // NO trial_period_days = immediate payment
      },
      success_url: `${req.headers.get("origin")}/account?tab=subscription&payment=success`,
      cancel_url: `${req.headers.get("origin")}/account?tab=subscription`,
    });

    console.log('✅ Checkout session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('Force payment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});