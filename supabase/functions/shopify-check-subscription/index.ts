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
  console.log(`[SHOPIFY-CHECK-SUB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User authenticated", { userId: user.id });

    // Get user profile to check billing provider
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("billing_provider, current_plan_id, subscription_status, subscription_end, shopify_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ subscribed: false, error: "Profile not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If not using Shopify billing, return current status
    if (profile.billing_provider !== "shopify") {
      logStep("User not on Shopify billing", { billingProvider: profile.billing_provider });
      return new Response(
        JSON.stringify({
          subscribed: profile.subscription_status === "active" || profile.subscription_status === "trialing",
          subscription_status: profile.subscription_status,
          plan_id: profile.current_plan_id,
          subscription_end: profile.subscription_end,
          billing_provider: profile.billing_provider || "stripe"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Shopify connection to verify with Shopify API
    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (connError || !connection) {
      logStep("No active Shopify connection", { error: connError });
      return new Response(
        JSON.stringify({
          subscribed: profile.subscription_status === "active" || profile.subscription_status === "trialing",
          subscription_status: profile.subscription_status,
          plan_id: profile.current_plan_id,
          subscription_end: profile.subscription_end,
          billing_provider: "shopify"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Shopify for current subscription status
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
      `https://${connection.store_url}/admin/api/2025-01/graphql.json`,
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
      logStep("Shopify API error, returning cached status");
      return new Response(
        JSON.stringify({
          subscribed: profile.subscription_status === "active" || profile.subscription_status === "trialing",
          subscription_status: profile.subscription_status,
          plan_id: profile.current_plan_id,
          subscription_end: profile.subscription_end,
          billing_provider: "shopify"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];

    logStep("Shopify subscriptions", { count: activeSubscriptions.length });

    if (activeSubscriptions.length === 0) {
      // No active subscription on Shopify - update profile
      await supabase
        .from("profiles")
        .update({
          subscription_status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_status: "inactive",
          plan_id: profile.current_plan_id,
          billing_provider: "shopify"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscription = activeSubscriptions[0];
    const isActive = subscription.status === "ACTIVE";
    const isTrial = subscription.trialDays > 0;

    // Update profile if status changed
    const newStatus = isTrial ? "trialing" : (isActive ? "active" : "inactive");
    if (newStatus !== profile.subscription_status) {
      await supabase
        .from("profiles")
        .update({
          subscription_status: newStatus,
          subscription_end: subscription.currentPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
    }

    logStep("Subscription check complete", { status: newStatus, isActive, isTrial });

    return new Response(
      JSON.stringify({
        subscribed: isActive || isTrial,
        subscription_status: newStatus,
        plan_id: profile.current_plan_id,
        subscription_end: subscription.currentPeriodEnd,
        billing_provider: "shopify",
        shopify_subscription_id: subscription.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
