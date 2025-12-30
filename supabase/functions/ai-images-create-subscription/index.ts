import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_IMAGES_APP_URL = "https://newai.sale";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-IMAGES-CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// AI Images credit packages
const AI_IMAGES_PLANS: Record<string, { name: string; credits: number; price: number }> = {
  "starter": { name: "Starter Pack", credits: 50, price: 9.99 },
  "pro": { name: "Pro Pack", credits: 200, price: 29.99 },
  "business": { name: "Business Pack", credits: 500, price: 59.99 },
  "enterprise": { name: "Enterprise Pack", credits: 1500, price: 149.99 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("Function started");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { planId, shopDomain, isRecurring } = await req.json();
    
    log("Request received", { planId, shopDomain, isRecurring });
    
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

    // Get plan details
    const plan = AI_IMAGES_PLANS[planId];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${planId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Plan selected", { planId, plan });

    // Get shop connection
    const { data: connection, error: connError } = await supabase
      .from("ai_images_shopify_connections")
      .select("*")
      .eq("shop_domain", normalizedShop)
      .eq("is_active", true)
      .single();

    if (connError || !connection?.access_token) {
      log("No active AI Images Shopify connection found", { error: connError, shopDomain: normalizedShop });
      return new Response(
        JSON.stringify({ error: "Shop not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Connection found", { shopDomain: connection.shop_domain, userId: connection.user_id });

    // Check existing subscription to prevent double payment
    log("Checking existing subscription on Shopify...");
    
    const checkRes = await fetch(
      `https://${normalizedShop}/admin/api/2025-01/graphql.json`,
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
      const activeSubscription = subs.find((s: { status: string }) => ["ACTIVE", "ACCEPTED"].includes(s.status));

      if (activeSubscription) {
        // Check if same plan
        if (activeSubscription.name?.toLowerCase().includes(plan.name.toLowerCase())) {
          log("Same plan already active", activeSubscription);
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
    }

    // Detect dev store for test mode
    const isDevStore = 
      normalizedShop.includes("-dev") || 
      normalizedShop.includes("dev-") || 
      normalizedShop.includes("test-") ||
      normalizedShop.includes("-test") ||
      normalizedShop.includes("demo") ||
      normalizedShop.includes("sandbox");
    
    const testMode = isDevStore || Deno.env.get("SHOPIFY_TEST_MODE") === "true";
    
    log("Test mode detection", { isDevStore, testMode });

    // Create app purchase (one-time) or subscription (recurring)
    const returnUrl = `${SUPABASE_URL}/functions/v1/ai-images-billing-callback?shop=${encodeURIComponent(normalizedShop)}&plan=${encodeURIComponent(planId)}`;

    let mutation: string;
    let variables: Record<string, unknown>;

    if (isRecurring) {
      // Recurring subscription for credit packs
      mutation = `
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
      
      variables = {
        name: `AI Product Shot - ${plan.name}`,
        returnUrl,
        test: testMode,
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.price, currencyCode: "USD" },
              interval: "EVERY_30_DAYS"
            }
          }
        }]
      };

      // Starter includes a free trial period
      if (planId === "starter") {
        variables.trialDays = 7;
      }
    } else {
      // One-time purchase for credits
      mutation = `
        mutation AppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean) {
          appPurchaseOneTimeCreate(
            name: $name
            price: $price
            returnUrl: $returnUrl
            test: $test
          ) {
            userErrors {
              field
              message
            }
            confirmationUrl
            appPurchaseOneTime {
              id
              status
            }
          }
        }
      `;
      
      variables = {
        name: `AI Product Shot - ${plan.name} (${plan.credits} credits)`,
        price: { amount: plan.price, currencyCode: "USD" },
        returnUrl,
        test: testMode,
      };
    }

    log("Creating Shopify purchase", { mutation: isRecurring ? "subscription" : "one-time", variables });

    const shopifyResponse = await fetch(
      `https://${normalizedShop}/admin/api/2025-01/graphql.json`,
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
      log("Shopify API error", { status: shopifyResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "Shopify API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    log("Shopify API response", shopifyData);

    const result = isRecurring 
      ? shopifyData.data?.appSubscriptionCreate 
      : shopifyData.data?.appPurchaseOneTimeCreate;

    if (result?.userErrors?.length > 0) {
      log("Shopify purchase errors", result.userErrors);
      return new Response(
        JSON.stringify({ error: "Shopify purchase error", details: result.userErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result?.confirmationUrl) {
      log("No confirmation URL received");
      return new Response(
        JSON.stringify({ error: "No confirmation URL received from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store pending purchase info
    const purchaseData = isRecurring ? result.appSubscription : result.appPurchaseOneTime;
    
    await supabase.from("ai_images_credit_transactions").insert({
      user_id: connection.user_id || "pending",
      transaction_type: "pending_purchase",
      credits_amount: plan.credits,
      description: `Pending: ${plan.name}`,
      shopify_charge_id: purchaseData?.id,
      metadata: {
        plan_id: planId,
        shop_domain: normalizedShop,
        is_recurring: isRecurring,
        price: plan.price,
      },
    });

    log("Purchase initiated successfully", { confirmationUrl: result.confirmationUrl });

    return new Response(
      JSON.stringify({ 
        status: "PENDING",
        success: true, 
        confirmationUrl: result.confirmationUrl,
        purchaseId: purchaseData?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
