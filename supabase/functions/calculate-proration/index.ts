import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-PRORATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    if (!userData.user) throw new Error("User not found");

    logStep("User authenticated", { userId: userData.user.id });

    const { new_plan_id, billing_period } = await req.json();
    if (!new_plan_id) throw new Error("new_plan_id is required");

    logStep("Request body parsed", { new_plan_id, billing_period });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, current_plan_id, subscription_status, trial_ends_at")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;

    // Check if user is in trial
    const isInTrial = profile?.subscription_status === 'trialing' || 
      (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date());

    if (isInTrial) {
      logStep("User is in trial - no proration calculation needed");
      return new Response(JSON.stringify({
        proration_needed: false,
        is_trial: true,
        message: "En trial, passage direct au plan payant sans prorata"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get active subscription
    const { data: subscriptionFromDB, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, status, current_period_start, current_period_end")
      .eq("seller_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscriptionFromDB?.stripe_subscription_id) {
      logStep("No active paid subscription found");
      return new Response(JSON.stringify({
        proration_needed: false,
        is_new_customer: true,
        message: "Nouveau client, pas de prorata"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionFromDB.stripe_subscription_id);
    logStep("Current subscription retrieved from Stripe", { 
      status: stripeSubscription.status,
      periodStart: stripeSubscription.current_period_start,
      periodEnd: stripeSubscription.current_period_end
    });

    // Get period dates
    let periodStart = stripeSubscription.current_period_start;
    let periodEnd = stripeSubscription.current_period_end;

    if (!periodStart || !periodEnd) {
      if (subscriptionFromDB.current_period_start && subscriptionFromDB.current_period_end) {
        periodStart = Math.floor(new Date(subscriptionFromDB.current_period_start).getTime() / 1000);
        periodEnd = Math.floor(new Date(subscriptionFromDB.current_period_end).getTime() / 1000);
        logStep("Using period dates from DB", { periodStart, periodEnd });
      } else {
        throw new Error("Impossible de déterminer les dates de période");
      }
    }

    // Get current price
    const currentPrice = stripeSubscription.items.data[0]?.price;
    const currentCurrency = currentPrice?.currency?.toUpperCase() || 'EUR';
    logStep("Current subscription currency detected", { currency: currentCurrency });

    // Get the new plan details
    const { data: newPlan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", new_plan_id)
      .single();

    if (planError || !newPlan) {
      throw new Error("New plan not found");
    }

    // Determine billing period
    const actualBillingPeriod = billing_period || (
      currentPrice?.recurring?.interval === 'year' ? 'yearly' : 'monthly'
    );

    // Select appropriate price_id
    let new_price_id;
    if (actualBillingPeriod === 'yearly') {
      new_price_id = currentCurrency === 'EUR' && newPlan.stripe_price_id_yearly_eur
        ? newPlan.stripe_price_id_yearly_eur
        : newPlan.stripe_price_id_yearly;
    } else {
      new_price_id = currentCurrency === 'EUR' && newPlan.stripe_price_id_monthly_eur
        ? newPlan.stripe_price_id_monthly_eur
        : (newPlan.stripe_price_id_monthly || newPlan.stripe_price_id);
    }

    if (!new_price_id) {
      throw new Error(`No price ID found for plan ${newPlan.name}`);
    }

    // Get new price from Stripe
    const newPriceObj = await stripe.prices.retrieve(new_price_id);

    // Calculate proration
    const now = Math.floor(Date.now() / 1000);
    const daysIntoCycle = Math.floor((now - periodStart) / (24 * 60 * 60));
    const totalCycleDays = Math.floor((periodEnd - periodStart) / (24 * 60 * 60));
    const daysRemaining = Math.max(0, totalCycleDays - daysIntoCycle);

    const oldPriceAmount = currentPrice?.unit_amount || 0;
    const newPriceAmount = newPriceObj.unit_amount || 0;
    const priceDifference = newPriceAmount - oldPriceAmount;

    // Always calculate proration if there's a price difference
    const prorationNeeded = priceDifference > 0;

    let prorationDetails: any = {
      proration_needed: prorationNeeded,
      old_plan_name: profile.current_plan_id,
      new_plan_name: newPlan.name,
      old_plan_price: oldPriceAmount / 100,
      new_plan_price: newPriceAmount / 100,
      price_difference: priceDifference / 100,
      currency: currentCurrency,
      billing_period: actualBillingPeriod,
      days_into_cycle: daysIntoCycle,
      days_remaining: daysRemaining,
      total_cycle_days: totalCycleDays,
      period_start: new Date(periodStart * 1000).toISOString(),
      period_end: new Date(periodEnd * 1000).toISOString(),
    };

    if (prorationNeeded) {
      const proratedAmount = Math.round((priceDifference * daysRemaining) / totalCycleDays);
      
      prorationDetails = {
        ...prorationDetails,
        prorated_amount: proratedAmount / 100,
        amount_to_pay_now: proratedAmount / 100,
        explanation: `(${newPriceAmount / 100}${currentCurrency} - ${oldPriceAmount / 100}${currentCurrency}) × ${daysRemaining}j / ${totalCycleDays}j = ${proratedAmount / 100}${currentCurrency}`,
        next_billing_amount: newPriceAmount / 100,
        next_billing_date: new Date(periodEnd * 1000).toISOString(),
      };
    } else if (priceDifference <= 0) {
      prorationDetails = {
        ...prorationDetails,
        prorated_amount: 0,
        amount_to_pay_now: 0,
        explanation: "Downgrade ou prix identique, pas de paiement immédiat",
        next_billing_amount: newPriceAmount / 100,
        next_billing_date: new Date(periodEnd * 1000).toISOString(),
      };
    }

    logStep("Proration calculated", prorationDetails);

    return new Response(JSON.stringify(prorationDetails), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in calculate-proration", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
