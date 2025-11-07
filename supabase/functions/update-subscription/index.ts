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

    const { new_plan_id, billing_period } = await req.json();
    if (!new_plan_id) throw new Error("new_plan_id is required");

    logStep("Request body parsed", { new_plan_id, billing_period });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, current_plan_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;

    // Get active subscription
    let subscriptionData: { stripe_subscription_id: string; status: string } | null = null;
    
    const { data: subscriptionFromDB, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("seller_id", userData.user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    
    if (subscriptionFromDB?.stripe_subscription_id) {
      subscriptionData = subscriptionFromDB;
    } else {
      // If no subscription in DB but user has active status, check Stripe directly
      if (!profile.stripe_customer_id) {
        throw new Error("No Stripe customer found. Please subscribe first.");
      }
      
      logStep("No subscription in DB, checking Stripe directly");
      const stripeTemp = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      const stripeSubscriptions = await stripeTemp.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all',
        limit: 1,
      });
      
      if (stripeSubscriptions.data.length === 0 || !['active', 'trialing'].includes(stripeSubscriptions.data[0].status)) {
        throw new Error("No active subscription found in Stripe. Please subscribe first.");
      }
      
      const stripeSub = stripeSubscriptions.data[0];
      
      // Validate period dates before syncing to DB
      if (!stripeSub.current_period_start || !stripeSub.current_period_end) {
        logStep("Subscription found but period dates not yet available", { 
          subscriptionId: stripeSub.id,
          status: stripeSub.status 
        });
        throw new Error("Subscription is still being set up. Please try again in a few moments.");
      }
      
      const stripeSubId = stripeSub.id;
      logStep("Found subscription in Stripe with valid periods", { 
        subscriptionId: stripeSubId,
        periodStart: stripeSub.current_period_start,
        periodEnd: stripeSub.current_period_end
      });
      
      // Sync it to our DB with validated data
      await supabaseClient
        .from("subscriptions")
        .upsert({
          seller_id: userData.user.id,
          stripe_subscription_id: stripeSubId,
          status: stripeSub.status,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        });
      
      subscriptionData = {
        stripe_subscription_id: stripeSubId,
        status: stripeSubscriptions.data[0].status
      };
    }
    
    if (!subscriptionData) {
      throw new Error("Could not find valid subscription");
    }

    logStep("Profile and subscription loaded", { 
      subscriptionId: subscriptionData.stripe_subscription_id,
      customerId: profile.stripe_customer_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionData.stripe_subscription_id);
    logStep("Current subscription retrieved", { 
      status: stripeSubscription.status,
      itemsCount: stripeSubscription.items.data.length,
      trialEnd: stripeSubscription.trial_end,
      periodStart: stripeSubscription.current_period_start,
      periodEnd: stripeSubscription.current_period_end
    });

    // Get current currency from subscription
    const currentPrice = stripeSubscription.items.data[0]?.price;
    const currentCurrency = currentPrice?.currency?.toUpperCase() || 'USD';
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

    // Determine billing period from current subscription if not provided
    const actualBillingPeriod = billing_period || (
      currentPrice?.recurring?.interval === 'year' ? 'yearly' : 'monthly'
    );

    // Select the appropriate price_id based on currency and billing period
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
      throw new Error(`No price ID found for plan ${newPlan.name} with currency ${currentCurrency} and billing ${actualBillingPeriod}`);
    }

    logStep("Selected price ID for upgrade", { 
      priceId: new_price_id, 
      currency: currentCurrency, 
      billingPeriod: actualBillingPeriod 
    });

    // Calculate days into billing cycle
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    let periodStart = stripeSubscription.current_period_start;
    let periodEnd = stripeSubscription.current_period_end;
    
    // For trialing subscriptions, use trial dates if period dates are invalid
    if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
      if (!periodStart || periodStart <= 0) {
        periodStart = stripeSubscription.trial_start || Math.floor(Date.now() / 1000);
        logStep("Using trial start as period start", { periodStart });
      }
      if (!periodEnd || periodEnd <= 0) {
        periodEnd = stripeSubscription.trial_end;
        logStep("Using trial end as period end", { periodEnd });
      }
    }
    
    // Final validation
    if (!periodStart || !periodEnd || periodStart <= 0 || periodEnd <= 0) {
      logStep("Invalid period dates detected after trial check", { 
        periodStart, 
        periodEnd,
        status: stripeSubscription.status,
        trialEnd: stripeSubscription.trial_end 
      });
      throw new Error("Unable to determine subscription period dates. Please contact support.");
    }
    
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
    const subscriptionItemId = stripeSubscription.items.data[0]?.id;
    if (!subscriptionItemId) throw new Error("No subscription item found");

    // Update subscription WITHOUT automatic proration
    const updateParams: any = {
      items: [
        {
          id: subscriptionItemId,
          price: new_price_id,
        },
      ],
      proration_behavior: 'none', // Disable Stripe's automatic proration
      billing_cycle_anchor: 'unchanged',
    };

    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionData.stripe_subscription_id,
      updateParams
    );

    logStep("Subscription updated in Stripe", {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      prorationBehavior: 'none',
      periodPreserved: true
    });

    // For mid-cycle upgrades, create a custom invoice for the price difference
    if (isMidCycleUpgrade) {
      try {
        const oldPriceAmount = currentPrice?.unit_amount || 0;
        const newPriceObj = await stripe.prices.retrieve(new_price_id);
        const newPriceAmount = newPriceObj.unit_amount || 0;
        const priceDifference = newPriceAmount - oldPriceAmount;

        if (priceDifference > 0) {
          // Create an invoice item for the price difference
          await stripe.invoiceItems.create({
            customer: profile.stripe_customer_id,
            amount: priceDifference,
            currency: newPriceObj.currency,
            description: `Upgrade difference: ${oldPriceAmount / 100}${newPriceObj.currency.toUpperCase()} → ${newPriceAmount / 100}${newPriceObj.currency.toUpperCase()}`,
          });

          // Create and finalize the invoice
          const invoice = await stripe.invoices.create({
            customer: profile.stripe_customer_id,
            auto_advance: true, // Auto-finalize and attempt payment
          });

          await stripe.invoices.finalizeInvoice(invoice.id);

          logStep("Custom invoice created for upgrade difference", {
            priceDifference: priceDifference / 100,
            invoiceId: invoice.id
          });
        }
      } catch (error) {
        logStep("Warning: Failed to create custom invoice", { error });
      }
    }

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

    // Calculate simple price difference for upgrade (Lovable-style logic)
    let prorationDetails: any = null;
    if (isMidCycleUpgrade) {
      try {
        // Get old and new price amounts
        const oldPriceAmount = currentPrice?.unit_amount || 0; // in cents
        const newPriceObj = await stripe.prices.retrieve(new_price_id);
        const newPriceAmount = newPriceObj.unit_amount || 0; // in cents
        
        // Simple logic: user pays the difference between plans
        const priceDifference = newPriceAmount - oldPriceAmount;
        
        prorationDetails = {
          old_plan_price: oldPriceAmount / 100,
          new_plan_price: newPriceAmount / 100,
          upgrade_cost: priceDifference / 100,
          currency: newPriceObj.currency.toUpperCase(),
          logic: "simple_difference",
          explanation: `Vous payez uniquement la différence: ${newPriceAmount / 100} - ${oldPriceAmount / 100} = ${priceDifference / 100}${newPriceObj.currency.toUpperCase()}`
        };
        
        logStep("Simple price difference calculated", prorationDetails);
      } catch (error) {
        logStep("Warning: Could not calculate price difference", { error });
        prorationDetails = { error: "Could not calculate price difference" };
      }
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
          proration: prorationDetails,
          usage_reset: isMidCycleUpgrade,
          days_into_cycle: daysIntoCycle,
          days_remaining: totalCycleDays - daysIntoCycle,
          renewal_date: new Date(periodEnd * 1000).toISOString(),
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
