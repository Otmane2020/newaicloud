import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://newai.sale";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-BILLING] ${step}${detailsStr}`);
};

interface PlanData {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
}

interface ShopifyPlan {
  name: string;
  price: number;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  trialDays?: number;
  dbPlanId: string;
  optimizations: number;
}

// Helper to get plan details from database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPlanFromDatabase(
  supabase: any, 
  planId: string, 
  billingCycle: string
): Promise<ShopifyPlan | null> {
  // Normalize plan ID for database lookup
  let dbPlanId = planId;
  
  // Handle legacy plan IDs (starter-monthly -> starter, pro-500-monthly -> pro-500, etc.)
  if (planId.endsWith('-monthly') || planId.endsWith('-yearly')) {
    dbPlanId = planId.replace(/-monthly$/, '').replace(/-yearly$/, '');
  }
  
  // Special case for starter which might come as "starter-100"
  if (dbPlanId === 'starter-100') {
    dbPlanId = 'starter';
  }
  
  logStep("Looking up plan in database", { planId, dbPlanId, billingCycle });
  
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, price_monthly, price_yearly, max_optimizations_monthly, max_articles_monthly")
    .eq("id", dbPlanId)
    .single();
  
  if (error || !data) {
    logStep("Plan not found in database", { error, planId: dbPlanId });
    return null;
  }
  
  const plan = data as PlanData;
  logStep("Plan found in database", plan);
  
  // Build Shopify-compatible plan object
  const isYearly = billingCycle === 'yearly';
  const price = isYearly ? Number(plan.price_yearly) : Number(plan.price_monthly);
  const interval: "EVERY_30_DAYS" | "ANNUAL" = isYearly ? "ANNUAL" : "EVERY_30_DAYS";
  
  // Build plan name with optimization count
  const optimizations = plan.max_optimizations_monthly;
  const planName = `${plan.name} (${optimizations.toLocaleString()} optimizations${isYearly ? ' - Annual' : ''})`;
  
  // Determine trial days based on plan type
  let trialDays: number | undefined;
  if (planId === 'trial') {
    trialDays = 14;
  } else if (dbPlanId === 'starter') {
    trialDays = 7;
  }
  
  return {
    name: planName,
    price: price,
    interval: interval,
    trialDays,
    dbPlanId,
    optimizations: plan.max_optimizations_monthly
  };
}

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

    // Track if user ever had an active subscription (to skip trial on downgrades)
    let hadPriorSubscription = false;
    
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      const subs = checkJson?.data?.currentAppInstallation?.activeSubscriptions || [];
      const activeSubscription = subs.find((s: { status: string }) => s.status === "ACTIVE");

      if (activeSubscription) {
        // User has an active subscription - mark as having prior subscription
        hadPriorSubscription = true;
        
        // If forceUpgrade is true, allow creating a new subscription (Shopify will replace the old one)
        if (forceUpgrade) {
          logStep("UPGRADE MODE: Active subscription exists, but forceUpgrade=true - proceeding to replace", activeSubscription);
        } else {
          // Get plan from DB to compare
          const requestedPlan = await getPlanFromDatabase(supabase, planId, billingCycle || 'monthly');
          
          if (requestedPlan) {
            const currentPlanName = activeSubscription.name?.toLowerCase() || "";
            const requestedPlanNameLower = requestedPlan.name.toLowerCase();
            
            // Check if same plan by comparing optimization counts
            const currentOptMatch = currentPlanName.match(/(\d+,?\d*)\s*optimization/);
            const requestedOptMatch = requestedPlanNameLower.match(/(\d+,?\d*)\s*optimization/);
            
            if (currentOptMatch && requestedOptMatch && 
                currentOptMatch[1].replace(',', '') === requestedOptMatch[1].replace(',', '')) {
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
          }
          
          // Different plan requested - this is an upgrade/downgrade
          hadPriorSubscription = true;
          logStep("Different plan requested - proceeding to upgrade/downgrade", { currentPlan: activeSubscription.name });
        }
      } else {
        logStep("No active subscription found, proceeding to create one");
        
        // Also check profiles table to see if user ever had an active subscription
        const { data: profileData } = await supabase
          .from("profiles")
          .select("subscription_status, trial_ends_at, current_plan_id")
          .eq("id", connection.user_id)
          .single();
        
        if (profileData) {
          // If user had an active status before or used trial, they shouldn't get trial again
          const hadActiveStatus = profileData.subscription_status === 'active' || 
                                  profileData.subscription_status === 'past_due' ||
                                  profileData.subscription_status === 'cancelled';
          const usedTrial = profileData.trial_ends_at && new Date(profileData.trial_ends_at) < new Date();
          const hadPaidPlan = profileData.current_plan_id && 
                             profileData.current_plan_id !== 'trial' && 
                             profileData.current_plan_id !== 'free';
          
          if (hadActiveStatus || usedTrial || hadPaidPlan) {
            hadPriorSubscription = true;
            logStep("User previously had subscription/used trial - will skip trial days", { 
              hadActiveStatus, usedTrial, hadPaidPlan, profileData 
            });
          }
        }
      }
    } else {
      logStep("Warning: Could not check existing subscription, proceeding cautiously");
    }

    // 3️⃣ GET PLAN FROM DATABASE (instead of hardcoded mapping)
    const plan = await getPlanFromDatabase(supabase, planId, billingCycle || 'monthly');

    if (!plan) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${planId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Plan selected from database", { planId, plan });

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

    const returnUrl = `${SUPABASE_URL}/functions/v1/shopify-billing-callback?shop=${encodeURIComponent(apiShopDomain)}&plan=${encodeURIComponent(plan.dbPlanId)}&cycle=${billingCycle}`;

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

    // CRITICAL: Only give trial days if user NEVER had a prior subscription
    if (plan.trialDays && !hadPriorSubscription) {
      variables.trialDays = plan.trialDays;
      logStep("Adding trial days (first-time user)", { trialDays: plan.trialDays });
    } else if (plan.trialDays && hadPriorSubscription) {
      logStep("SKIPPING trial days - user had prior subscription", { trialDays: plan.trialDays, hadPriorSubscription });
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

    // Store pending subscription info (shop-centric) - use normalized DB plan ID
    await supabase.from("shopify_pending_subscriptions").upsert({
      user_id: connection.user_id,
      shop_domain: apiShopDomain,
      plan_id: plan.dbPlanId,
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
