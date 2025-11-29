/**
 * Subscription Upgrade Logic:
 * 
 * UPGRADE BILLING:
 * - Uses Stripe automatic proration with 'always_invoice' behavior
 * - Stripe automatically creates, finalizes, and attempts payment of proration invoice
 * - Fair billing regardless of upgrade timing in the cycle
 * - Immediate payment confirmation for better UX
 * 
 * STRIPE PRORATION BEHAVIOR (always_invoice):
 * - Stripe calculates the prorated amount automatically
 * - Creates and finalizes the invoice immediately
 * - Attempts to charge the customer's default payment method
 * - Works for both trial and paid subscriptions
 * - Handles edge cases (currency mismatch, interval changes) with clear errors
 * 
 * PRORATION VALIDATION:
 * For proration to work correctly, these conditions must match:
 * 1. Currency Match: Current and new price must use same currency (EUR->EUR or USD->USD)
 * 2. Interval Match: Current and new price must use same interval (monthly->monthly or yearly->yearly)
 * 
 * USAGE COUNTER RESETS:
 * - MID-CYCLE UPGRADE (> 3 days into cycle):
 *   - Resets monthly usage counters (optimizations, articles, chat, shopify_requests)
 *   - Preserves total counters (products_count, shopify_stores_count)
 * - RENEWAL UPGRADE (≤ 3 days into cycle):
 *   - No usage reset (cycle just started, counters already at 0)
 * 
 * This ensures users get immediate access to new limits when upgrading
 * and Stripe handles billing automatically with proper validations.
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

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
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

    const { new_plan_id, billing_period } = body;
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
      const stripeSubId = stripeSub.id;
      
      logStep("Found subscription in Stripe", { 
        subscriptionId: stripeSubId,
        status: stripeSub.status,
        periodStart: stripeSub.current_period_start,
        periodEnd: stripeSub.current_period_end
      });
      
      // Sync to DB if we have period dates, otherwise just save the subscription ID
      const upsertData: any = {
        seller_id: userData.user.id,
        stripe_subscription_id: stripeSubId,
        status: stripeSub.status,
      };
      
      if (stripeSub.current_period_start && stripeSub.current_period_end) {
        upsertData.current_period_start = new Date(stripeSub.current_period_start * 1000).toISOString();
        upsertData.current_period_end = new Date(stripeSub.current_period_end * 1000).toISOString();
      }
      
      await supabaseClient
        .from("subscriptions")
        .upsert(upsertData);
      
      subscriptionData = {
        stripe_subscription_id: stripeSubId,
        status: stripeSub.status
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
    logStep("Current subscription retrieved from Stripe", { 
      status: stripeSubscription.status,
      itemsCount: stripeSubscription.items.data.length,
      trialEnd: stripeSubscription.trial_end,
      periodStart: stripeSubscription.current_period_start,
      periodEnd: stripeSubscription.current_period_end
    });

    // If Stripe doesn't have period dates yet, try to get them from our DB (webhook may have synced them)
    let periodStart = stripeSubscription.current_period_start;
    let periodEnd = stripeSubscription.current_period_end;

    if (!periodStart || !periodEnd) {
      logStep("Period dates missing from Stripe, checking DB");
      
      const { data: dbSubscription } = await supabaseClient
        .from("subscriptions")
        .select("current_period_start, current_period_end")
        .eq("stripe_subscription_id", subscriptionData.stripe_subscription_id)
        .single();

      if (dbSubscription?.current_period_start && dbSubscription?.current_period_end) {
        periodStart = Math.floor(new Date(dbSubscription.current_period_start).getTime() / 1000);
        periodEnd = Math.floor(new Date(dbSubscription.current_period_end).getTime() / 1000);
        logStep("Using period dates from DB", { periodStart, periodEnd });
      } else if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
        // Use trial dates as fallback
        periodStart = stripeSubscription.trial_start || Math.floor(Date.now() / 1000);
        periodEnd = stripeSubscription.trial_end;
        logStep("Using trial dates as fallback", { periodStart, periodEnd });
      } else {
        // Final fallback: Calculate period based on subscription creation and interval
        // For active subscriptions without period dates, assume cycle started now
        const nowTimestamp = Math.floor(Date.now() / 1000);
        const subPrice = stripeSubscription.items.data[0]?.price;
        const interval = subPrice?.recurring?.interval || 'month';
        const intervalSeconds = interval === 'year' ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
        
        periodStart = stripeSubscription.created || nowTimestamp;
        periodEnd = periodStart + intervalSeconds;
        
        logStep("Using calculated period dates as final fallback", { 
          status: stripeSubscription.status,
          interval,
          periodStart: new Date(periodStart * 1000).toISOString(),
          periodEnd: new Date(periodEnd * 1000).toISOString()
        });
      }
    }

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

    // ✅ VALIDATE PRORATION CONDITIONS BEFORE ATTEMPTING
    // Stripe requires specific conditions for proration to work
    
    // Get the new price details to validate
    const newPrice = await stripe.prices.retrieve(new_price_id);
    const newCurrency = newPrice.currency?.toUpperCase();
    const newInterval = newPrice.recurring?.interval;
    const currentInterval = currentPrice?.recurring?.interval;

    logStep("Proration validation checks", {
      currentCurrency,
      newCurrency,
      currentInterval,
      newInterval,
      subscriptionStatus: stripeSubscription.status
    });

    // Check 1: Currency must match
    if (currentCurrency !== newCurrency) {
      logStep("❌ PRORATION BLOCKED: Currency mismatch", {
        current: currentCurrency,
        target: newCurrency
      });
      throw new Error(
        `Impossible de changer de devise lors d'un upgrade. ` +
        `Votre abonnement actuel est en ${currentCurrency}, le nouveau plan est en ${newCurrency}. ` +
        `Veuillez contacter le support pour un changement de devise.`
      );
    }

    // Check 2: Interval must match for proration
    if (currentInterval !== newInterval) {
      logStep("❌ PRORATION BLOCKED: Interval mismatch", {
        current: currentInterval,
        target: newInterval
      });
      throw new Error(
        `Impossible de changer d'intervalle de facturation lors d'un upgrade. ` +
        `Votre abonnement actuel est ${currentInterval === 'month' ? 'mensuel' : 'annuel'}, ` +
        `le nouveau plan est ${newInterval === 'month' ? 'mensuel' : 'annuel'}. ` +
        `Veuillez d'abord terminer votre cycle actuel.`
      );
    }

    // Check 3: Must have at least one paid invoice for proration
    // Use customer from subscription to ensure they match
    const subscriptionCustomerId = typeof stripeSubscription.customer === 'string' 
      ? stripeSubscription.customer 
      : stripeSubscription.customer.id;
    
    const invoices = await stripe.invoices.list({
      customer: subscriptionCustomerId,
      subscription: subscriptionData.stripe_subscription_id,
      limit: 5,
    });

    const hasPaidInvoice = invoices.data.some((inv: any) => inv.status === 'paid');
    
    logStep("Invoice history check", {
      totalInvoices: invoices.data.length,
      hasPaidInvoice,
      invoiceStatuses: invoices.data.map((i: any) => ({ id: i.id, status: i.status }))
    });

    if (!hasPaidInvoice && stripeSubscription.status === 'trialing') {
      logStep("ℹ️ INFO: First paid invoice (trial)", {
        status: stripeSubscription.status,
        trialEnd: stripeSubscription.trial_end,
        note: "Stripe will create invoice with always_invoice, but payment may be deferred until trial ends"
      });
    }

    // Calculate days into billing cycle
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    
    // periodStart and periodEnd are now already set from above (either from Stripe or DB)
    // Final validation
    if (!periodStart || !periodEnd || periodStart <= 0 || periodEnd <= 0) {
      logStep("Invalid period dates after all attempts", { 
        periodStart, 
        periodEnd,
        status: stripeSubscription.status,
        trialEnd: stripeSubscription.trial_end 
      });
      throw new Error("Impossible de déterminer les dates de votre abonnement. Veuillez contacter le support.");
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

    // Update subscription WITH automatic proration and immediate billing cycle reset
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionData.stripe_subscription_id,
      {
        billing_cycle_anchor: 'now',           // ✅ Repart sur un cycle propre
        proration_behavior: 'always_invoice',   // ✅ Calcule le prorata complet
        payment_behavior: 'default_incomplete', // ✅ Génère facture payable immédiatement
        items: [
          {
            id: subscriptionItemId,
            price: new_price_id,
            quantity: 1,                        // ✅ Explicite pour remplacement correct
          },
        ],
      }
    );

    logStep("✅ Subscription updated with billing_cycle_anchor: now", {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      newBillingCycleAnchor: updatedSubscription.billing_cycle_anchor,
      prorationBehavior: 'always_invoice',
      paymentBehavior: 'default_incomplete',
      latestInvoice: updatedSubscription.latest_invoice,
    });

    // Update profile with new plan AND subscription status
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ 
        current_plan_id: new_plan_id,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.user.id);

    if (updateError) {
      logStep("❌ CRITICAL: Failed to update profile", { error: updateError });
      throw new Error(`Failed to update profile: ${updateError.message}`);
    } else {
      logStep("✅ Profile updated with new plan", { planId: new_plan_id, status: 'active' });
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

    // Retrieve the automatically generated proration invoice from Stripe
    let prorationDetails: any = null;

    // Always retrieve invoice for the new billing cycle
    const latestInvoiceId = updatedSubscription.latest_invoice;
    
    if (latestInvoiceId) {
      try {
        const invoiceId = typeof latestInvoiceId === 'string' 
          ? latestInvoiceId 
          : latestInvoiceId.id;
        
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const daysRemaining = totalCycleDays - daysIntoCycle;
        
        prorationDetails = {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          status: invoice.status,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          currency: invoice.currency?.toUpperCase() || 'USD',
          newCycleStart: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
          newCycleEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          daysRemaining,
          totalCycleDays,
          daysIntoCycle,
        };
        
        logStep("Proration invoice details", prorationDetails);
      } catch (error: any) {
        logStep("⚠️ Could not retrieve proration invoice", { 
          error: error.message,
          latestInvoiceId 
        });
        
        prorationDetails = {
          info: "Proration applied but invoice details unavailable",
          explanation: "L'upgrade a été appliqué avec prorata automatique par Stripe."
        };
      }
    } else {
      logStep("⚠️ No latest_invoice in updatedSubscription", {
        latestInvoice: latestInvoiceId,
        subscriptionStatus: updatedSubscription.status
      });
      
      prorationDetails = {
        info: "Mid-cycle upgrade applied",
        explanation: "L'upgrade a été appliqué. Le prorata sera calculé par Stripe au prochain cycle."
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          planId: new_plan_id,
        },
        upgrade: {
          type: 'immediate',
          newCycleStart: prorationDetails?.newCycleStart,
          newCycleEnd: prorationDetails?.newCycleEnd,
          daysIntoCycle,
          totalCycleDays,
        },
        payment: {
          required: prorationDetails ? prorationDetails.amountDue > 0 : false,
          amount: prorationDetails?.amountDue,
          currency: prorationDetails?.currency,
          status: prorationDetails?.status,
          invoiceUrl: prorationDetails?.hostedInvoiceUrl,
          invoiceId: prorationDetails?.invoiceId,
        },
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
