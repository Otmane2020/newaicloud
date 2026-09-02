import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CALCULATE-PRORATION] ${step}${detailsStr}`);
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) return json({ ok: true });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe is not configured on the server." }, 503);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required." }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401);

    const { new_plan_id, new_price_id: requestedPriceId, billing_period } = body;
    if (!new_plan_id && !requestedPriceId) {
      return json({ error: "new_plan_id or new_price_id is required" }, 400);
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, current_plan_id, subscription_status, trial_ends_at")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;

    const isInTrial = profile?.subscription_status === "trialing" ||
      (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date());

    if (isInTrial) {
      return json({
        proration_needed: false,
        is_trial: true,
        prorationAmount: 0,
        amount_to_pay_now: 0,
        breakdown: null,
        message: "Trial subscription: no proration is due now.",
      });
    }

    const { data: subscriptionFromDB, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, status, current_period_start, current_period_end")
      .eq("seller_id", userData.user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscriptionFromDB?.stripe_subscription_id) {
      return json({
        proration_needed: false,
        is_new_customer: true,
        prorationAmount: 0,
        amount_to_pay_now: 0,
        breakdown: null,
        message: "No active paid subscription found. Checkout is required instead.",
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionFromDB.stripe_subscription_id);

    let periodStart = stripeSubscription.current_period_start;
    let periodEnd = stripeSubscription.current_period_end;

    if (!periodStart || !periodEnd) {
      if (subscriptionFromDB.current_period_start && subscriptionFromDB.current_period_end) {
        periodStart = Math.floor(new Date(subscriptionFromDB.current_period_start).getTime() / 1000);
        periodEnd = Math.floor(new Date(subscriptionFromDB.current_period_end).getTime() / 1000);
      } else {
        throw new Error("Unable to determine the current billing period.");
      }
    }

    const currentPrice = stripeSubscription.items.data[0]?.price;
    if (!currentPrice) throw new Error("Current Stripe subscription price was not found.");

    const currentCurrency = currentPrice.currency?.toUpperCase() || "EUR";
    const actualBillingPeriod = billing_period || (currentPrice.recurring?.interval === "year" ? "yearly" : "monthly");

    let newPriceId = requestedPriceId as string | undefined;
    let newPlanName = new_plan_id || "Selected plan";

    if (!newPriceId) {
      const { data: newPlan, error: planError } = await supabaseClient
        .from("subscription_plans")
        .select("*")
        .eq("id", new_plan_id)
        .single();

      if (planError || !newPlan) throw new Error("New plan not found");
      newPlanName = newPlan.name || new_plan_id;

      if (actualBillingPeriod === "yearly") {
        newPriceId = currentCurrency === "EUR" && newPlan.stripe_price_id_yearly_eur
          ? newPlan.stripe_price_id_yearly_eur
          : newPlan.stripe_price_id_yearly;
      } else {
        newPriceId = currentCurrency === "EUR" && newPlan.stripe_price_id_monthly_eur
          ? newPlan.stripe_price_id_monthly_eur
          : (newPlan.stripe_price_id_monthly || newPlan.stripe_price_id);
      }
    } else {
      const { data: matchingPlan } = await supabaseClient
        .from("subscription_plans")
        .select("id, name")
        .or([
          `stripe_price_id_monthly.eq.${newPriceId}`,
          `stripe_price_id_yearly.eq.${newPriceId}`,
          `stripe_price_id_monthly_eur.eq.${newPriceId}`,
          `stripe_price_id_yearly_eur.eq.${newPriceId}`,
        ].join(","))
        .maybeSingle();
      if (matchingPlan) newPlanName = matchingPlan.name || matchingPlan.id;
    }

    if (!newPriceId) throw new Error("No Stripe price ID found for the selected plan.");

    const newPriceObj = await stripe.prices.retrieve(newPriceId);
    const newCurrency = newPriceObj.currency?.toUpperCase() || currentCurrency;
    if (newCurrency !== currentCurrency) {
      return json({
        error: `Cannot change a ${currentCurrency} subscription to a ${newCurrency} price.`,
      }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const totalCycleSeconds = Math.max(1, periodEnd - periodStart);
    const remainingSeconds = Math.max(0, periodEnd - now);
    const totalCycleDays = Math.max(1, Math.ceil(totalCycleSeconds / 86400));
    const daysRemaining = Math.max(0, Math.ceil(remainingSeconds / 86400));
    const daysIntoCycle = Math.max(0, totalCycleDays - daysRemaining);

    const oldPriceAmount = currentPrice.unit_amount || 0;
    const newPriceAmount = newPriceObj.unit_amount || 0;
    const priceDifference = newPriceAmount - oldPriceAmount;
    const prorationNeeded = priceDifference > 0 && remainingSeconds > 0;
    const proratedAmountCents = prorationNeeded
      ? Math.max(0, Math.round(priceDifference * (remainingSeconds / totalCycleSeconds)))
      : 0;

    const oldPlanPrice = oldPriceAmount / 100;
    const newPlanPrice = newPriceAmount / 100;
    const amountToPayNow = proratedAmountCents / 100;
    const unusedCurrentPlanAmount = Math.max(0, Math.round(oldPriceAmount * (remainingSeconds / totalCycleSeconds)) / 100);

    const result = {
      proration_needed: prorationNeeded,
      old_plan_name: profile.current_plan_id,
      new_plan_name: newPlanName,
      old_plan_price: oldPlanPrice,
      new_plan_price: newPlanPrice,
      price_difference: priceDifference / 100,
      currency: currentCurrency.toLowerCase(),
      billing_period: actualBillingPeriod,
      days_into_cycle: daysIntoCycle,
      days_remaining: daysRemaining,
      total_cycle_days: totalCycleDays,
      period_start: new Date(periodStart * 1000).toISOString(),
      period_end: new Date(periodEnd * 1000).toISOString(),
      prorated_amount: amountToPayNow,
      amount_to_pay_now: amountToPayNow,
      next_billing_amount: newPlanPrice,
      next_billing_date: new Date(periodEnd * 1000).toISOString(),
      explanation: prorationNeeded
        ? `Estimated prorated charge for the remaining ${daysRemaining} day(s). Stripe calculates the final amount at checkout.`
        : "No immediate charge is expected for this change.",
      // Backward-compatible fields currently consumed by SubscriptionPlans.tsx.
      prorationAmount: amountToPayNow,
      breakdown: {
        currentPlanAmount: oldPlanPrice,
        newPlanAmount: newPlanPrice,
        unusedAmount: unusedCurrentPlanAmount,
        proratedAmount: amountToPayNow,
      },
    };

    logStep("Proration calculated", {
      userId: userData.user.id,
      newPriceId,
      amountToPayNow,
      currency: result.currency,
    });

    return json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return json({ error: errorMessage }, 500);
  }
});
