import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://newai.sale";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapping des plans vers Shopify Billing
const SHOPIFY_PLANS: Record<string, { name: string; price: number; interval: "EVERY_30_DAYS" | "ANNUAL"; trialDays?: number }> = {
  "trial": { name: "14-Day Free Trial", price: 0.01, interval: "EVERY_30_DAYS", trialDays: 14 },
  "starter-monthly": { name: "Starter (100 optimizations)", price: 9.99, interval: "EVERY_30_DAYS", trialDays: 7 },
  "starter-yearly": { name: "Starter Annual (100 optimizations)", price: 95.88, interval: "ANNUAL", trialDays: 7 },
  "pro-500-monthly": { name: "Pro (500 optimizations)", price: 49.00, interval: "EVERY_30_DAYS" },
  "pro-500-yearly": { name: "Pro Annual (500 optimizations)", price: 468.00, interval: "ANNUAL" },
  "pro-1000-monthly": { name: "Enterprise (2,000 optimizations)", price: 199.00, interval: "EVERY_30_DAYS" },
  "pro-1000-yearly": { name: "Enterprise Annual (2,000 optimizations)", price: 1908.00, interval: "ANNUAL" },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-BILLING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { planId, billingCycle, shopDomain, forceUpgrade } = await req.json();
    
    logStep("Request received", { planId, billingCycle, shopDomain, forceUpgrade });
    
    if (!planId || !shopDomain) {
      return new Response(
        JSON.stringify({ error: "Missing planId or shopDomain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize shop domain
    const normalizedShop = shopDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    // 1️⃣ LOAD SHOP TOKEN (shop-centric, not user-centric)
    // Use exact match first, then order by created_at DESC and limit 1 to handle duplicates gracefully
    const { data: connections, error: connError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("store_url", normalizedShop)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const connection = connections?.[0];

    if (connError || !connection?.access_token) {
      logStep("No active Shopify connection found", { error: connError, shopDomain: normalizedShop });
      return new Response(
        JSON.stringify({ error: "Shop not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Shopify connection found", { storeUrl: connection.store_url });

    // Use the actual store_url from DB for API calls
    const apiShopDomain = connection.store_url
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    // 2️⃣ CHECK EXISTING SUBSCRIPTION (ANTI DOUBLE PAY - CRITICAL)
    logStep("Checking existing subscription on Shopify...");
    
    const checkRes = await fetch(
      `https://${apiShopDomain}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": connection.access_token,
        },
        body: JSON.stringify({
          query: `
            {
              currentAppInstallation {
                activeSubscriptions {
                  id
                  name
                  status
                  test
                  currentPeriodEnd
                }
              }
            }
          `,
        }),
      }
    );

    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      const subs = checkJson?.data?.currentAppInstallation?.activeSubscriptions || [];
      const activeSubscription = subs.find((s: { status: string }) => s.status === "ACTIVE");

      if (activeSubscription) {
        // If forceUpgrade is true, allow creating a new subscription (Shopify will replace the old one)
        if (forceUpgrade) {
          logStep("UPGRADE MODE: Active subscription exists, but forceUpgrade=true - proceeding to replace", activeSubscription);
        } else {
          // Check if the user is trying to select the same plan
          const currentPlanName = activeSubscription.name?.toLowerCase() || "";
          const requestedPlanKey = planId === "trial" ? "trial" : `${planId}-${billingCycle}`;
          const requestedPlan = SHOPIFY_PLANS[requestedPlanKey];
          
          if (requestedPlan && currentPlanName.includes(requestedPlan.name.toLowerCase().split(" ")[0])) {
            logStep("Same plan already active - returning early (no double pay)", activeSubscription);
            return new Response(
              JSON.stringify({
                status: "ACTIVE",
                subscription: activeSubscription,
                message: "Subscription already active - no payment needed"
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Different plan requested - allow upgrade
          logStep("Different plan requested - proceeding to upgrade", { currentPlan: activeSubscription.name, requestedPlan: requestedPlan?.name });
        }
      } else {
        logStep("No active subscription found, proceeding to create one");
      }
    } else {
      logStep("Warning: Could not check existing subscription, proceeding cautiously");
    }

    // 3️⃣ DETERMINE PLAN
    const planKey = planId === "trial" ? "trial" : `${planId}-${billingCycle}`;
    const plan = SHOPIFY_PLANS[planKey];

    if (!plan) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${planKey}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Plan selected", { planKey, plan });

    // Detect dev store for test mode
    const shopNameLower = (connection.shop_name || apiShopDomain || "").toLowerCase();
    const isDevStore = 
      apiShopDomain.includes("-dev") || 
      apiShopDomain.includes("dev-") || 
      apiShopDomain.includes("test-") ||
      apiShopDomain.includes("-test") ||
      apiShopDomain.includes("demo") ||
      apiShopDomain.includes("sandbox") ||
      shopNameLower.includes("dev") ||
      shopNameLower.includes("test") ||
      shopNameLower.includes("partner") ||
      shopNameLower.includes("demo");
    
    const testMode = isDevStore || Deno.env.get("SHOPIFY_TEST_MODE") === "true";
    
    logStep("Test mode detection", { isDevStore, testMode, apiShopDomain });

    // 4️⃣ CREATE SUBSCRIPTION (ONLY NOW - AFTER CHECK)
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          lineItems: $lineItems
          test: $test
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

    const returnUrl = `${SUPABASE_URL}/functions/v1/shopify-billing-callback?shop=${encodeURIComponent(apiShopDomain)}&plan=${encodeURIComponent(planId)}&cycle=${billingCycle}`;

    const variables: Record<string, unknown> = {
      name: plan.name,
      returnUrl,
      test: testMode,
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { amount: plan.price, currencyCode: "USD" },
            interval: plan.interval
          }
        }
      }]
    };

    if (plan.trialDays) {
      variables.trialDays = plan.trialDays;
    }

    logStep("Creating Shopify subscription", { variables });

    const shopifyResponse = await fetch(
      `https://${apiShopDomain}/admin/api/2025-01/graphql.json`,
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

    // Store pending subscription info (shop-centric)
    await supabase.from("shopify_pending_subscriptions").upsert({
      user_id: connection.user_id,
      shop_domain: apiShopDomain,
      plan_id: planId,
      billing_cycle: billingCycle,
      shopify_subscription_id: result.appSubscription?.id,
      status: "pending",
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id,shop_domain" });

    logStep("Subscription initiated successfully", { confirmationUrl: result.confirmationUrl });

    return new Response(
      JSON.stringify({ 
        status: "PENDING",
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
