import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyShopifySessionToken, extractSessionToken } from "../_shared/verify-shopify-session-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_IMAGES_APP_URL = "https://ai-images.newai.sale";
const AI_IMAGES_CLIENT_ID = "47fe9e78f7a16bb0ffe6f31929c7a44e";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-IMAGES-CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Hybrid pricing model: $2.99/month base + $0.15/image usage-based, $2000 cap
const HYBRID_PLAN = {
  name: "AI Product Image Shot",
  basePrice: 2.99,
  usagePrice: 0.15,
  cappedAmount: 2000, // $2000/month cap
  usageTerms: "$0.15 per AI-generated image",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("Function started");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Try to verify Shopify session token (for embedded apps)
    const authHeader = req.headers.get("Authorization");
    const sessionToken = extractSessionToken(authHeader);
    let verifiedShop: string | null = null;
    
    if (sessionToken) {
      const apiSecret = Deno.env.get("AI_IMAGES_SHOPIFY_API_SECRET");
      if (apiSecret) {
        const result = await verifyShopifySessionToken(sessionToken, apiSecret, AI_IMAGES_CLIENT_ID);
        if (result.valid && result.shop) {
          log("✅ Shopify session token verified", { shop: result.shop, userId: result.userId });
          verifiedShop = result.shop;
        } else {
          log("⚠️ Session token verification failed", { error: result.error });
          // Continue anyway - will use shopDomain from body
        }
      }
    }
    
    const { planId, shopDomain } = await req.json();
    
    // Use verified shop from session token if available, otherwise use body param
    const effectiveShop = verifiedShop || shopDomain;
    
    log("Request received", { planId, shopDomain, verifiedShop, effectiveShop });
    
    if (!effectiveShop) {
      return new Response(
        JSON.stringify({ error: "Missing shopDomain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize shop domain
    const normalizedShop = effectiveShop
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    log("Hybrid plan selected", { plan: HYBRID_PLAN });

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
                  lineItems {
                    id
                    plan {
                      pricingDetails {
                        __typename
                        ... on AppRecurringPricing {
                          price { amount currencyCode }
                          interval
                        }
                        ... on AppUsagePricing {
                          terms
                          cappedAmount { amount currencyCode }
                        }
                      }
                    }
                  }
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
      const activeSubscription = subs.find((s: { status: string; name: string }) => 
        ["ACTIVE", "ACCEPTED"].includes(s.status) && 
        s.name?.includes("AI Product Image Shot")
      );

      if (activeSubscription) {
        log("Active subscription already exists", activeSubscription);
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

    // Build return URL for billing callback
    const returnUrl = `${SUPABASE_URL}/functions/v1/ai-images-billing-callback?shop=${encodeURIComponent(normalizedShop)}&plan=hybrid`;

    // Create hybrid subscription with 2 lineItems: recurring base + usage-based
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
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
            lineItems {
              id
              plan {
                pricingDetails {
                  __typename
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      name: HYBRID_PLAN.name,
      returnUrl,
      test: testMode,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: HYBRID_PLAN.basePrice, currencyCode: "USD" },
              interval: "EVERY_30_DAYS"
            }
          }
        },
        {
          plan: {
            appUsagePricingDetails: {
              terms: HYBRID_PLAN.usageTerms,
              cappedAmount: { amount: HYBRID_PLAN.cappedAmount, currencyCode: "USD" }
            }
          }
        }
      ]
    };

    log("Creating hybrid Shopify subscription", { variables });

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

    const result = shopifyData.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      log("Shopify subscription errors", result.userErrors);
      return new Response(
        JSON.stringify({ error: "Shopify subscription error", details: result.userErrors }),
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

    // Store pending subscription info
    const subscriptionData = result.appSubscription;
    
    // Find the usage lineItem ID for future usage recording
    const usageLineItem = subscriptionData?.lineItems?.find(
      (item: { plan: { pricingDetails: { __typename: string } } }) => 
        item.plan?.pricingDetails?.__typename === "AppUsagePricing"
    );

    await supabase.from("ai_images_credit_transactions").insert({
      user_id: connection.user_id || "pending",
      transaction_type: "pending_subscription",
      credits_amount: 0, // No upfront credits with usage-based
      description: `Pending: ${HYBRID_PLAN.name} (Hybrid)`,
      shopify_charge_id: subscriptionData?.id,
      metadata: {
        plan_type: "hybrid",
        shop_domain: normalizedShop,
        base_price: HYBRID_PLAN.basePrice,
        usage_price: HYBRID_PLAN.usagePrice,
        capped_amount: HYBRID_PLAN.cappedAmount,
        usage_line_item_id: usageLineItem?.id,
      },
    });

    log("Subscription initiated successfully", { confirmationUrl: result.confirmationUrl });

    return new Response(
      JSON.stringify({ 
        status: "PENDING",
        success: true, 
        confirmationUrl: result.confirmationUrl,
        subscriptionId: subscriptionData?.id,
        usageLineItemId: usageLineItem?.id,
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
