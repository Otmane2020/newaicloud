/**
 * Subscription Upgrade Logic:
 * 
 * MID-CYCLE UPGRADE (> 3 days into cycle):
 * - Applies proration (user pays difference for remaining days)
 * - Resets monthly usage counters (optimizations, articles, chat, shopify_requests)
 * - Preserves total counters (products_count, shopify_stores_count)
 * - Keeps same billing cycle dates
 * 
 * RENEWAL UPGRADE (≤ 3 days into cycle):
 * - No proration (user pays full new plan price)
 * - No usage reset (cycle just started, counters already at 0)
 * - Preserves billing cycle anchor
 * 
 * This ensures users get immediate access to new limits when upgrading
 * and proper billing based on upgrade timing.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const { new_price_id, new_plan_id } = await req.json();
    if (!new_price_id) throw new Error("new_price_id is required");

    logStep("Request body parsed", { new_price_id, new_plan_id });

    // Get user profile with current subscription
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, current_plan_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    logStep("Profile loaded", { 
      subscriptionId: profile.stripe_subscription_id,
      customerId: profile.stripe_customer_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    logStep("Current subscription retrieved", { 
      status: subscription.status,
      itemsCount: subscription.items.data.length 
    });

    // Calculate days into billing cycle
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;
    const daysIntoCycle = Math.floor((now - periodStart) / (24 * 60 * 60));
    const totalCycleDays = Math.floor((periodEnd - periodStart) / (24 * 60 * 60));

    // Determine if this is a renewal (within first 3 days) or mid-cycle upgrade
    const isRenewalUpgrade = daysIntoCycle <= 3;
    const isMidCycleUpgrade = !isRenewalUpgrade;

    logStep("Billing cycle analysis", {
      daysIntoCycle,
      totalCycleDays,
      isRenewalUpgrade,
      isMidCycleUpgrade,
      periodStart: new Date(periodStart * 1000).toISOString(),
      periodEnd: new Date(periodEnd * 1000).toISOString()
    });

    // Get the subscription item to update
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) throw new Error("No subscription item found");

    // Update subscription with appropriate proration behavior
    const updateParams: any = {
      items: [
        {
          id: subscriptionItemId,
          price: new_price_id,
        },
      ],
      proration_behavior: isMidCycleUpgrade ? 'always_invoice' : 'none',
    };

    // For renewal upgrades, preserve the billing cycle anchor
    if (isRenewalUpgrade) {
      updateParams.billing_cycle_anchor = 'unchanged';
    }

    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      updateParams
    );

    logStep("Subscription updated in Stripe", {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      prorationBehavior: updateParams.proration_behavior,
      periodPreserved: isRenewalUpgrade
    });

    // Update profile with new plan
    if (new_plan_id) {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          current_plan_id: new_plan_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile", { error: updateError });
      } else {
        logStep("Profile updated with new plan", { planId: new_plan_id });
      }
    }

    // Reset monthly usage counters for mid-cycle upgrades
    if (isMidCycleUpgrade) {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const monthKey = currentMonth.toISOString().split('T')[0];

      // Get current usage to preserve product/store counts
      const { data: currentUsage } = await supabaseClient
        .from('usage_tracking')
        .select('products_count, shopify_stores_count')
        .eq('seller_id', userData.user.id)
        .eq('month', monthKey)
        .single();

      // Reset monthly counters, keep total counters
      const { error: usageError } = await supabaseClient
        .from('usage_tracking')
        .upsert({
          seller_id: userData.user.id,
          month: monthKey,
          optimizations_count: 0,
          articles_count: 0,
          chat_responses_count: 0,
          shopify_requests_count: 0,
          products_count: currentUsage?.products_count || 0,
          shopify_stores_count: currentUsage?.shopify_stores_count || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'seller_id,month'
        });

      if (usageError) {
        logStep("Warning: Failed to reset usage counters", { error: usageError });
      } else {
        logStep("Usage counters reset for mid-cycle upgrade", {
          preservedProducts: currentUsage?.products_count || 0,
          preservedStores: currentUsage?.shopify_stores_count || 0
        });
      }
    } else {
      logStep("Renewal upgrade - usage counters not reset (cycle just started)");
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_period_end: updatedSubscription.current_period_end,
        },
        upgrade_details: {
          timing: isMidCycleUpgrade ? 'mid_cycle' : 'renewal',
          proration_applied: isMidCycleUpgrade,
          usage_reset: isMidCycleUpgrade,
          days_into_cycle: daysIntoCycle,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
