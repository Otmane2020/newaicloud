import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-SYNC-SUB-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain, userId, forceSync } = await req.json();
    logStep("Function started", { shopDomain, userId, forceSync });

    if (!shopDomain) {
      return new Response(
        JSON.stringify({ error: "shopDomain required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1️⃣ Get Shopify connection
    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("store_url", shopDomain)
      .eq("is_active", true)
      .maybeSingle();

    if (connError || !connection) {
      logStep("No active connection found", { error: connError });
      return new Response(
        JSON.stringify({ synced: false, error: "No connection found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Connection found", { userId: connection.user_id });

    // 2️⃣ Query Shopify for current subscription status (source of truth)
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
      `https://${shopDomain}/admin/api/2025-01/graphql.json`,
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
      logStep("Shopify API error", { status: shopifyResponse.status });
      return new Response(
        JSON.stringify({ synced: false, error: "Shopify API error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];
    
    logStep("Shopify subscriptions", { count: activeSubscriptions.length, data: activeSubscriptions });

    // 3️⃣ Get current profile state
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, current_plan_id, billing_provider")
      .eq("id", connection.user_id)
      .single();

    logStep("Current profile state", profile);

    // 4️⃣ Determine correct state
    const hasActiveShopifySub = activeSubscriptions.some(
      (s: { status: string }) => s.status === "ACTIVE"
    );
    const activeSub = activeSubscriptions.find(
      (s: { status: string }) => s.status === "ACTIVE"
    );

    const hasTrialDays = activeSub?.trialDays > 0;
    const correctStatus = hasActiveShopifySub 
      ? (hasTrialDays ? "trialing" : "active") 
      : "inactive";

    // 5️⃣ Get pending subscription to determine plan
    const { data: pendingSub } = await supabase
      .from("shopify_pending_subscriptions")
      .select("plan_id, billing_cycle, shopify_subscription_id")
      .eq("shop_domain", shopDomain)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const correctPlanId = pendingSub?.plan_id || profile?.current_plan_id || "starter";

    logStep("Sync decision", {
      hasActiveShopifySub,
      correctStatus,
      correctPlanId,
      currentStatus: profile?.subscription_status,
      currentPlanId: profile?.current_plan_id,
      needsUpdate: profile?.subscription_status !== correctStatus || profile?.current_plan_id !== correctPlanId
    });

    // 6️⃣ Update if out of sync
    if (
      forceSync || 
      profile?.subscription_status !== correctStatus || 
      (hasActiveShopifySub && profile?.current_plan_id !== correctPlanId)
    ) {
      logStep("Updating profile to sync with Shopify");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_status: correctStatus,
          current_plan_id: correctPlanId,
          billing_provider: "shopify",
          shopify_subscription_id: activeSub?.id || pendingSub?.shopify_subscription_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.user_id);

      if (updateError) {
        logStep("Profile update error", { error: updateError });
        return new Response(
          JSON.stringify({ synced: false, error: "Profile update failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also update pending subscription if needed
      if (pendingSub && hasActiveShopifySub && pendingSub.shopify_subscription_id !== activeSub?.id) {
        await supabase
          .from("shopify_pending_subscriptions")
          .update({
            status: "active",
            shopify_subscription_id: activeSub?.id,
            activated_at: new Date().toISOString(),
          })
          .eq("shop_domain", shopDomain)
          .eq("status", "pending");
      }

      logStep("Profile synced successfully", {
        status: correctStatus,
        planId: correctPlanId,
      });

      return new Response(
        JSON.stringify({
          synced: true,
          updated: true,
          status: correctStatus,
          planId: correctPlanId,
          shopifySubscriptionId: activeSub?.id || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Profile already in sync");
    return new Response(
      JSON.stringify({
        synced: true,
        updated: false,
        status: profile?.subscription_status,
        planId: profile?.current_plan_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ synced: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
