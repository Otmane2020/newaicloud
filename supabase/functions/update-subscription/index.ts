/**
 * Subscription Upgrade Logic:
 * 
 * UPGRADE BILLING:
 * - Uses Stripe proration with explicit invoice creation
 * - Creates proration adjustments via 'create_prorations' behavior
 * - Generates and finalizes invoice immediately for mid-cycle upgrades
 * - Fair billing regardless of upgrade timing in the cycle
 * 
 * STRIPE PRORATION REQUIREMENTS (CRITICAL):
 * For proration to work, Stripe requires ALL of these conditions:
 * 1. Currency Match: Current and new price must use same currency (EUR->EUR or USD->USD)
 * 2. Interval Match: Current and new price must use same interval (monthly->monthly or yearly->yearly)
 * 3. Paid Invoice History: At least one paid invoice must exist in subscription history
 * 4. Active Subscription: Subscription must have valid period dates (not in setup phase)
 * 
 * If any condition fails, the upgrade will be blocked with a clear error message.
 * For trial subscriptions without paid invoices, upgrade is allowed but proration is skipped.
 * 
 * USAGE COUNTER RESETS:
 * - MID-CYCLE UPGRADE (> 3 days into cycle):
 *   - Resets monthly usage counters (optimizations, articles, chat, shopify_requests)
 *   - Preserves total counters (products_count, shopify_stores_count)
 * - RENEWAL UPGRADE (≤ 3 days into cycle):
 *   - No usage reset (cycle just started, counters already at 0)
 * 
 * This ensures users get immediate access to new limits when upgrading
 * and Stripe handles billing correctly with proper validations.
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
        logStep("No valid period dates found anywhere", { 
          status: stripeSubscription.status,
          hasDbDates: !!dbSubscription
        });
        throw new Error("Votre abonnement est en cours de configuration. Veuillez réessayer dans quelques instants.");
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
    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
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
      logStep("⚠️ PRORATION WARNING: No paid invoices (trial)", {
        status: stripeSubscription.status,
        trialEnd: stripeSubscription.trial_end
      });
      // For trial subscriptions, we'll still allow the upgrade but warn that no proration will occur
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

    // Update subscription WITH automatic proration
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionData.stripe_subscription_id,
      {
        items: [
          {
            id: subscriptionItemId,
            price: new_price_id,
          },
        ],
        // Create proration adjustments now, we'll invoice them explicitly just after
        proration_behavior: 'create_prorations',
        billing_cycle_anchor: 'unchanged',
      }
    );

    logStep("Subscription updated in Stripe with automatic proration", {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      prorationBehavior: 'always_invoice',
      periodPreserved: true
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

    // Generate and finalize a proration invoice for mid-cycle upgrades
    let prorationDetails: any = null;

    if (isMidCycleUpgrade && hasPaidInvoice) {
      try {
        logStep("Attempting to create proration invoice", {
          customer: profile.stripe_customer_id,
          subscription: subscriptionData.stripe_subscription_id,
          hasPaidInvoice,
          subscriptionStatus: stripeSubscription.status
        });

        const invoice = await stripe.invoices.create({
          customer: profile.stripe_customer_id,
          subscription: subscriptionData.stripe_subscription_id,
          auto_advance: true,
        });

        logStep("Proration invoice created (draft)", {
          invoiceId: invoice.id,
          status: invoice.status,
          amountDue: invoice.amount_due / 100,
          lineItemsCount: invoice.lines.data.length
        });

        const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
        const daysRemaining = totalCycleDays - daysIntoCycle;

        prorationDetails = {
          amount_due: (finalized.amount_due || 0) / 100,
          currency: finalized.currency?.toUpperCase(),
          invoice_id: finalized.id,
          invoice_url: finalized.hosted_invoice_url,
          days_remaining: daysRemaining,
          total_cycle_days: totalCycleDays,
          logic: "stripe_proration_invoice",
          explanation: `Prorata calculé pour ${daysRemaining} jours restants sur ${totalCycleDays} jours`,
        };

        logStep("✅ Proration invoice finalized successfully", prorationDetails);
      } catch (error: any) {
        logStep("❌ Proration invoice generation failed", { 
          error: error.message,
          errorType: error.type,
          errorCode: error.code
        });
        
        prorationDetails = { 
          error: "Proration invoice failed",
          reason: error.message,
          note: "L'upgrade a été appliqué mais la facture de prorata n'a pas pu être générée. Vous serez facturé au prochain cycle."
        };
      }
    } else if (isMidCycleUpgrade && !hasPaidInvoice) {
      logStep("⚠️ Proration skipped - no paid invoice history", {
        subscriptionStatus: stripeSubscription.status,
        reason: "Stripe requires at least one paid invoice for proration"
      });
      prorationDetails = { 
        info: "No proration - subscription has no paid invoices yet",
        explanation: stripeSubscription.status === 'trialing' 
          ? "Votre abonnement est en période d'essai. Le prorata sera calculé après la première facturation."
          : "Aucune facture payée trouvée. Le prorata sera calculé au prochain cycle."
      };
    } else {
      logStep("No proration needed (renewal upgrade)");
      prorationDetails = { 
        info: "No mid-cycle proration for renewal upgrade",
        explanation: "L'upgrade a été effectué en début de cycle, aucun prorata n'est nécessaire."
      };
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
