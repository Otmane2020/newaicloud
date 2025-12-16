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
  console.log(`[SHOPIFY-UPGRADE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Auth error", { error: authError });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { newPlanId, billingCycle = "monthly" } = await req.json();
    logStep("Upgrade request", { userId: user.id, newPlanId, billingCycle });

    if (!newPlanId) {
      return new Response(
        JSON.stringify({ error: "Plan ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get plan details from database - this is the FIX: use DB instead of hardcoded prices
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", newPlanId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { error: planError, planId: newPlanId });
      return new Response(
        JSON.stringify({ error: "Plan not found or inactive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Shopify connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("connection_type", "oauth")
      .single();

    if (connError || !connection) {
      logStep("No Shopify connection found", { error: connError });
      return new Response(
        JSON.stringify({ error: "No active Shopify connection found", code: "NO_SHOPIFY_CONNECTION" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current profile to check billing provider
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("billing_provider, current_plan_id, shopify_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logStep("Profile not found", { error: profileError });
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.billing_provider !== "shopify") {
      logStep("Not a Shopify billing user", { billingProvider: profile.billing_provider });
      return new Response(
        JSON.stringify({ error: "User is not using Shopify billing", code: "NOT_SHOPIFY_BILLING" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate price from database
    const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    const interval = billingCycle === "yearly" ? "ANNUAL" : "EVERY_30_DAYS";

    logStep("Plan pricing from DB", { planId: newPlanId, price, interval, planName: plan.name });

    // Create callback URL
    const callbackUrl = `${SUPABASE_URL}/functions/v1/shopify-billing-callback?shop=${connection.store_url}&plan=${newPlanId}&cycle=${billingCycle}`;

    // Create new subscription with Shopify Billing API
    // Using replacementBehavior: APPLY_IMMEDIATELY for instant upgrade
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          replacementBehavior: APPLY_IMMEDIATELY
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      name: `NewAI ${plan.name} - ${billingCycle === "yearly" ? "Annual" : "Monthly"}`,
      returnUrl: callbackUrl,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: price,
                currencyCode: "USD",
              },
              interval,
            },
          },
        },
      ],
    };

    logStep("Creating Shopify subscription", { planName: plan.name, price, interval });

    const shopifyResponse = await fetch(
      `https://${connection.store_url}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": connection.access_token,
        },
        body: JSON.stringify({ query: mutation, variables }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      logStep("Shopify API error", { status: shopifyResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "Failed to create subscription with Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    logStep("Shopify response", shopifyData);

    if (shopifyData.data?.appSubscriptionCreate?.userErrors?.length > 0) {
      const errors = shopifyData.data.appSubscriptionCreate.userErrors;
      logStep("Shopify user errors", errors);
      return new Response(
        JSON.stringify({ error: errors[0].message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmationUrl = shopifyData.data?.appSubscriptionCreate?.confirmationUrl;
    if (!confirmationUrl) {
      logStep("No confirmation URL received");
      return new Response(
        JSON.stringify({ error: "No confirmation URL received from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending subscription record
    await supabaseAdmin.from("shopify_pending_subscriptions").upsert({
      user_id: user.id,
      shop_domain: connection.store_url,
      plan_id: newPlanId,
      billing_cycle: billingCycle,
      status: "pending",
      created_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,shop_domain",
    });

    logStep("Upgrade initiated successfully", { confirmationUrl });

    return new Response(
      JSON.stringify({ 
        success: true, 
        confirmationUrl,
        message: "Redirect user to confirmationUrl to complete upgrade"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
