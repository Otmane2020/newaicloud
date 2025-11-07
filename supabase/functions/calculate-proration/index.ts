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

    const { new_price_id } = await req.json();
    if (!new_price_id) throw new Error("new_price_id is required");

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;

    // Get active subscription
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("seller_id", userData.user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (subscriptionError) throw subscriptionError;
    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    const now = Math.floor(Date.now() / 1000);
    const periodStart = stripeSubscription.current_period_start;
    const periodEnd = stripeSubscription.current_period_end;

    if (!periodStart || !periodEnd) {
      throw new Error("Invalid subscription period dates");
    }

    const daysIntoCycle = Math.floor((now - periodStart) / (24 * 60 * 60));
    const totalCycleDays = Math.floor((periodEnd - periodStart) / (24 * 60 * 60));
    const daysRemaining = totalCycleDays - daysIntoCycle;
    const isRenewalUpgrade = daysIntoCycle <= 3;

    logStep("Billing cycle calculated", {
      daysIntoCycle,
      totalCycleDays,
      daysRemaining,
      isRenewalUpgrade
    });

    // Get new price details
    const newPrice = await stripe.prices.retrieve(new_price_id);
    const currentPrice = await stripe.prices.retrieve(
      stripeSubscription.items.data[0].price.id
    );

    // Calculate proration amount
    let prorationAmount = 0;
    if (!isRenewalUpgrade && newPrice.unit_amount && currentPrice.unit_amount) {
      const priceDifference = (newPrice.unit_amount - currentPrice.unit_amount) / 100; // Convert to dollars
      prorationAmount = (priceDifference * daysRemaining) / totalCycleDays;
    }

    logStep("Proration calculated", {
      currentPrice: currentPrice.unit_amount ? currentPrice.unit_amount / 100 : 0,
      newPrice: newPrice.unit_amount ? newPrice.unit_amount / 100 : 0,
      prorationAmount,
      willProrate: !isRenewalUpgrade
    });

    return new Response(
      JSON.stringify({
        willProrate: !isRenewalUpgrade,
        prorationAmount: Math.max(0, prorationAmount),
        daysIntoCycle,
        daysRemaining,
        renewalDate: new Date(periodEnd * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
