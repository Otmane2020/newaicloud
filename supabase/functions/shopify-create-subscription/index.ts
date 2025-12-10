import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://newai.sale";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapping des plans vers Shopify Billing - All tiers from database
const SHOPIFY_PLANS: Record<string, { name: string; price: number; interval: "EVERY_30_DAYS" | "ANNUAL"; trialDays?: number; isFree?: boolean }> = {
  // Free Plan
  "free": { name: "Free Plan (20 optimizations)", price: 0, interval: "EVERY_30_DAYS", trialDays: 7, isFree: true },
  "free-monthly": { name: "Free Plan (20 optimizations)", price: 0, interval: "EVERY_30_DAYS", trialDays: 7, isFree: true },
  "free-yearly": { name: "Free Plan (20 optimizations)", price: 0, interval: "EVERY_30_DAYS", trialDays: 7, isFree: true },
  
  // Trial
  "trial": { name: "14-Day Free Trial", price: 0, interval: "EVERY_30_DAYS", trialDays: 14, isFree: true },
  
  // Starter - Monthly & Yearly (aligned with ShopifyPricingPlans.tsx)
  "starter-monthly": { name: "Starter (100 optimizations)", price: 9.99, interval: "EVERY_30_DAYS", trialDays: 7 },
  "starter-yearly": { name: "Starter Annual (100 optimizations)", price: 95.90, interval: "ANNUAL", trialDays: 7 },
  
  // Pro (pro-500) - Monthly & Yearly (aligned with ShopifyPricingPlans.tsx)
  "pro-500-monthly": { name: "Pro (500 optimizations)", price: 49.00, interval: "EVERY_30_DAYS" },
  "pro-500-yearly": { name: "Pro Annual (500 optimizations)", price: 468.00, interval: "ANNUAL" },
  
  // Enterprise (pro-1000) - Monthly & Yearly (aligned with ShopifyPricingPlans.tsx)
  "pro-1000-monthly": { name: "Enterprise (2,000 optimizations)", price: 199.00, interval: "EVERY_30_DAYS" },
  "pro-1000-yearly": { name: "Enterprise Annual (2,000 optimizations)", price: 1908.00, interval: "ANNUAL" },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-BILLING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    const { planId, billingCycle, shopDomain } = await req.json();
    
    logStep("Request received", { planId, billingCycle, shopDomain });
    
    if (!planId || !shopDomain) {
      return new Response(
        JSON.stringify({ error: "Missing planId or shopDomain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Get Shopify connection for this user
    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("store_url", shopDomain)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      logStep("No active Shopify connection found", { error: connError });
      return new Response(
        JSON.stringify({ error: "No active Shopify connection found for this store" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Shopify connection found", { storeUrl: connection.store_url });

    // Determine plan key
    const planKey = planId === "trial" ? "trial" : `${planId}-${billingCycle}`;
    const plan = SHOPIFY_PLANS[planKey];

    if (!plan) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${planKey}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Plan selected", { planKey, plan });

    // For FREE plans, skip Shopify Billing and activate directly
    if (plan.isFree) {
      logStep("Free plan detected - activating directly without Shopify Billing");
      
      // Update user profile with free plan
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          current_plan_id: 'free',
          subscription_status: 'active',
          billing_provider: 'shopify',
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        logStep("Error updating profile for free plan", { error: profileError });
        throw new Error(`Failed to activate free plan: ${profileError.message}`);
      }

      logStep("Free plan activated successfully");

      // Redirect to dashboard
      const dashboardUrl = `${APP_URL}/app/dashboard?shop=${encodeURIComponent(shopDomain)}&plan=free&activated=true`;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          confirmationUrl: dashboardUrl,
          isFree: true,
          message: "Free plan activated"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Shopify GraphQL mutation for subscription
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          lineItems: $lineItems
          test: false
        ) {
          userErrors {
            field
            message
          }
          confirmationUrl
          appSubscription {
            id
            status
          }
        }
      }
    `;

    // Return URL - Shopify will redirect here after payment confirmation
    // This must be the edge function URL, Shopify Admin allows redirects to app backend endpoints
    const returnUrl = `${SUPABASE_URL}/functions/v1/shopify-billing-callback?shop=${encodeURIComponent(shopDomain)}&plan=${encodeURIComponent(planId)}&cycle=${billingCycle}`;

    const variables: any = {
      name: plan.name,
      returnUrl,
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { 
              // Price is already the total annual amount for yearly plans
              amount: plan.price, 
              currencyCode: "USD" 
            },
            interval: plan.interval
          }
        }
      }]
    };

    // Add trial days if applicable
    if (plan.trialDays) {
      variables.trialDays = plan.trialDays;
    }

    logStep("Calling Shopify GraphQL API", { variables });

    // Call Shopify Admin API
    const shopifyResponse = await fetch(
      `https://${shopDomain}/admin/api/2025-01/graphql.json`,
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
        JSON.stringify({ error: "Shopify API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    logStep("Shopify API response", shopifyData);

    const result = shopifyData.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      logStep("Shopify subscription errors", result.userErrors);
      return new Response(
        JSON.stringify({ error: "Shopify subscription error", details: result.userErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result?.confirmationUrl) {
      logStep("No confirmation URL received");
      return new Response(
        JSON.stringify({ error: "No confirmation URL received from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store pending subscription info
    await supabase.from("shopify_pending_subscriptions").upsert({
      user_id: user.id,
      shop_domain: shopDomain,
      plan_id: planId,
      billing_cycle: billingCycle,
      shopify_subscription_id: result.appSubscription?.id,
      status: "pending",
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id,shop_domain" });

    logStep("Subscription initiated successfully", { confirmationUrl: result.confirmationUrl });

    return new Response(
      JSON.stringify({ 
        success: true, 
        confirmationUrl: result.confirmationUrl,
        subscriptionId: result.appSubscription?.id
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
