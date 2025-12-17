import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://newai.sale";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-BILLING-CALLBACK] ${step}${detailsStr}`);
};

// Extract shop handle from myshopify.com domain
const getShopHandle = (shopDomain: string): string => {
  // shop.myshopify.com -> shop
  return shopDomain.replace(".myshopify.com", "").replace("https://", "").replace("http://", "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const planId = url.searchParams.get("plan");
    const cycle = url.searchParams.get("cycle") || "monthly";
    const chargeId = url.searchParams.get("charge_id");
    
    logStep("Callback params", { shop, planId, cycle, chargeId });

    if (!shop) {
      logStep("Missing shop parameter");
      return Response.redirect(`${APP_URL}/app/setup-wizard?error=missing_shop`, 302);
    }

    const shopHandle = getShopHandle(shop);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the pending subscription
    const { data: pending, error: pendingError } = await supabase
      .from("shopify_pending_subscriptions")
      .select("*")
      .eq("shop_domain", shop)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pendingError || !pending) {
      logStep("No pending subscription found", { error: pendingError });
      return Response.redirect(`${APP_URL}/app/setup-wizard?error=no_pending_subscription`, 302);
    }

    logStep("Pending subscription found", { userId: pending.user_id, planId: pending.plan_id });

    // Get the Shopify connection
    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", pending.user_id)
      .eq("store_url", shop)
      .single();

    if (connError || !connection) {
      logStep("No Shopify connection found", { error: connError });
      return Response.redirect(`${APP_URL}/app/setup-wizard?error=no_connection`, 302);
    }

    // Verify the subscription status with Shopify
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
            trialDays
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;

    const shopifyResponse = await fetch(
      `https://${shop}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": connection.access_token,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      logStep("Shopify API error", { status: shopifyResponse.status, error: errorText });
      return Response.redirect(`${APP_URL}/app/setup-wizard?error=shopify_api_error`, 302);
    }

    const shopifyData = await shopifyResponse.json();
    logStep("Shopify subscription data", shopifyData);

    const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];
    
    if (activeSubscriptions.length === 0) {
      logStep("No active subscription found - user cancelled or declined");
      // Update pending status
      await supabase
        .from("shopify_pending_subscriptions")
        .update({ status: "cancelled" })
        .eq("id", pending.id);
      
      // Redirect back to plan selection without error - user just cancelled
      return Response.redirect(`${APP_URL}/app/setup-wizard`, 302);
    }

    const subscription = activeSubscriptions[0];
    logStep("Active subscription found", subscription);

    // Calculate subscription end date
    let subscriptionEnd = null;
    if (subscription.currentPeriodEnd) {
      subscriptionEnd = subscription.currentPeriodEnd;
    } else {
      // Default to 30 days from now for monthly, 365 for yearly
      const days = cycle === "yearly" ? 365 : 30;
      subscriptionEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Determine subscription status and trial end date
    // Starter plan has 7-day trial with reduced limits (30 optimizations)
    const hasTrialDays = subscription.trialDays > 0;
    const subscriptionStatus = hasTrialDays ? "trialing" : "active";
    
    // Calculate trial_ends_at for Starter plan (7 days)
    let trialEndsAt = null;
    if (hasTrialDays && pending.plan_id === "starter") {
      trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      logStep("Starter plan with 7-day trial", { trialEndsAt });
    }

    // Update user profile with subscription
    // Note: subscription_start/end are in subscriptions table, not profiles
    const profileUpdate: Record<string, any> = {
      subscription_status: subscriptionStatus,
      current_plan_id: pending.plan_id,
      billing_provider: "shopify",
      shopify_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    };
    
    // Add trial_ends_at only for Starter plan with trial
    if (trialEndsAt) {
      profileUpdate.trial_ends_at = trialEndsAt;
    }

    logStep("Updating profile", { profileUpdate });

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", pending.user_id);

    if (profileError) {
      logStep("Error updating profile", { error: profileError });
      return Response.redirect(`${APP_URL}/app/setup-wizard?error=profile_update_failed`, 302);
    }

    // 🔄 RESET MONTHLY USAGE COUNTERS in usage_tracking table when plan is activated
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthKey = currentMonth.toISOString().split('T')[0];
    
    const { error: usageError } = await supabase
      .from("usage_tracking")
      .upsert({
        seller_id: pending.user_id,
        month: monthKey,
        optimizations_count: 0,
        articles_count: 0,
        chat_responses_count: 0,
        campaigns_count: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "seller_id,month" });
    
    if (usageError) {
      logStep("Warning: Could not reset usage counters", { error: usageError });
    } else {
      logStep("Usage counters reset to 0 for new billing period");
    }

    // Update pending subscription status
    await supabase
      .from("shopify_pending_subscriptions")
      .update({ 
        status: "active",
        shopify_subscription_id: subscription.id,
        activated_at: new Date().toISOString()
      })
      .eq("id", pending.id);

    // Create/update subscription record
    await supabase.from("subscriptions").upsert({
      seller_id: pending.user_id,
      plan_id: pending.plan_id,
      status: subscriptionStatus,
      billing_cycle: pending.billing_cycle,
      current_period_start: new Date().toISOString(),
      current_period_end: subscriptionEnd,
      billing_provider: "shopify",
      shopify_subscription_id: subscription.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "seller_id" });

    logStep("Subscription activated successfully", { 
      userId: pending.user_id, 
      planId: pending.plan_id,
      status: subscriptionStatus,
      trialEndsAt 
    });

    // 🚀 DÉCLENCHER L'IMPORT APRÈS LE PAIEMENT CONFIRMÉ
    // Fire-and-forget pour ne pas bloquer la redirection
    try {
      logStep("Triggering auto-sync after payment confirmed");
      fetch(`${SUPABASE_URL}/functions/v1/trigger-auto-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: pending.user_id,
        }),
      }).then(response => {
        if (response.ok) {
          console.log("[SHOPIFY-BILLING-CALLBACK] ✅ Import automatique déclenché après paiement");
        } else {
          console.error("[SHOPIFY-BILLING-CALLBACK] ⚠️ Erreur import:", response.status);
        }
      }).catch(err => {
        console.error("[SHOPIFY-BILLING-CALLBACK] ⚠️ Import échoué:", err);
      });
    } catch (importError) {
      logStep("Import trigger error (non-blocking)", { error: String(importError) });
    }

    // Redirect to payment callback page which will handle session creation
    // Pass user_id and shop for quick-login authentication
    const callbackUrl = `${APP_URL}/shopify/payment-callback?shop=${encodeURIComponent(shop)}&user_id=${pending.user_id}&plan=${pending.plan_id}&subscription=active`;
    logStep("Redirecting to payment callback", { url: callbackUrl });
    return Response.redirect(callbackUrl, 302);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return Response.redirect(`${APP_URL}/app/setup-wizard?error=unexpected_error`, 302);
  }
});
