import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-FULL-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('current_plan_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_plan_id) {
      throw new Error("No plan found for user");
    }

    // Get plan details
    const { data: plan } = await supabaseClient
      .from('subscription_plans')
      .select('stripe_price_id_monthly')
      .eq('id', profile.current_plan_id)
      .single();

    if (!plan?.stripe_price_id_monthly) {
      throw new Error("No Stripe price ID found for plan");
    }

    logStep("Plan details", { planId: profile.current_plan_id, priceId: plan.stripe_price_id_monthly });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please complete checkout first.");
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check if customer has payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      throw new Error("No payment method found. Please add a payment method first.");
    }

    logStep("Found payment method", { paymentMethodId: paymentMethods.data[0].id });

    // Annuler les anciens abonnements avant de créer un nouveau
    logStep('Checking for existing subscriptions to cancel');
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    const cancelableStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    for (const sub of existingSubscriptions.data) {
      if (cancelableStatuses.includes(sub.status)) {
        logStep('Cancelling existing subscription', { subscriptionId: sub.id, status: sub.status });
        await stripe.subscriptions.cancel(sub.id, {
          prorate: true,
        });
      }
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripe_price_id_monthly }],
      default_payment_method: paymentMethods.data[0].id,
      expand: ['latest_invoice.payment_intent'],
    });

    logStep("Subscription created", { subscriptionId: subscription.id, status: subscription.status });

    // Update user profile
    await supabaseClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: subscription.id,
        trial_ends_at: null,
      })
      .eq('id', user.id);

    logStep("Profile updated");

    // Reset usage counters (except products and stores)
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
    await supabaseClient
      .from('usage_tracking')
      .update({
        optimizations_count: 0,
        articles_count: 0,
        chat_responses_count: 0,
        shopify_requests_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_id', user.id)
      .eq('month', currentMonth);

    logStep("Usage counters reset (products and stores preserved)");

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription_id: subscription.id,
        status: subscription.status 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
