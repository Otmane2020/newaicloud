import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_IMAGES_APP_URL = "https://ai-images.newai.sale";
const AI_IMAGES_APP_HANDLE = "ai-product-image-shot"; // App handle from Shopify Partner Dashboard
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-IMAGES-BILLING-CALLBACK] ${step}${detailsStr}`);
};

// AI Images credit packages
const AI_IMAGES_PLANS: Record<string, { name: string; credits: number; price: number }> = {
  "starter": { name: "Starter Pack", credits: 50, price: 9.99 },
  "pro": { name: "Pro Pack", credits: 200, price: 29.99 },
  "business": { name: "Business Pack", credits: 500, price: 59.99 },
  "enterprise": { name: "Enterprise Pack", credits: 1500, price: 149.99 },
};

// STANDALONE MODE: Build app URL (not Shopify Admin embedded)
const buildDashboardUrl = (shop: string, params?: URLSearchParams) => {
  const queryString = params ? `?${params.toString()}` : '';
  return `${AI_IMAGES_APP_URL}/app/dashboard${queryString}`;
};

// Helper to return error - JSON for POST, redirect for GET
const returnError = (req: Request, shop: string | null, errorCode: string, message: string) => {
  if (req.method === "POST") {
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
  // STANDALONE: Redirect to app setup with error param
  if (shop) {
    return Response.redirect(`${AI_IMAGES_APP_URL}/app/setup-wizard?shop=${encodeURIComponent(shop)}&error=${errorCode}`, 302);
  }
  return Response.redirect(`${AI_IMAGES_APP_URL}/app/setup-wizard?error=${errorCode}`, 302);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started", { method: req.method });
    
    const url = new URL(req.url);
    let shop: string | null = null;
    let planId: string | null = null;
    let chargeId: string | null = null;

    // Support both GET (redirect from Shopify) and POST (from frontend)
    if (req.method === "POST") {
      try {
        const body = await req.json();
        shop = body.shopDomain || body.shop;
        planId = body.planId || body.plan;
        chargeId = body.chargeId || body.charge_id;
        log("Params from POST body", { shop, planId, chargeId });
      } catch (e) {
        log("Failed to parse body, falling back to query params");
      }
    }
    
    // Fallback to query params (for GET redirects from Shopify)
    if (!shop) shop = url.searchParams.get("shop");
    if (!planId) planId = url.searchParams.get("plan");
    if (!chargeId) chargeId = url.searchParams.get("charge_id");
    
    log("Final callback params", { shop, planId, chargeId });

    if (!shop) {
      log("Missing shop parameter");
      return returnError(req, null, "missing_shop", "Missing shop parameter");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the connection
    const { data: connection, error: connError } = await supabase
      .from("ai_images_shopify_connections")
      .select("*")
      .eq("shop_domain", shop)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      log("No AI Images Shopify connection found", { error: connError });
      return returnError(req, shop, "no_connection", "No Shopify connection found");
    }

    log("Connection found", { shopDomain: connection.shop_domain, userId: connection.user_id });

    // Verify the purchase status with Shopify
    // Check for both one-time purchases and subscriptions
    const query = `
      query {
        currentAppInstallation {
          oneTimePurchases(first: 10, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                status
                createdAt
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
            trialDays
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
      log("Shopify API error", { status: shopifyResponse.status, error: errorText });
      return returnError(req, shop, "shopify_api_error", "Shopify API error");
    }

    const shopifyData = await shopifyResponse.json();
    log("Shopify purchase data", shopifyData);

    // Check one-time purchases first
    const oneTimePurchases = shopifyData.data?.currentAppInstallation?.oneTimePurchases?.edges || [];
    const activePurchase = oneTimePurchases.find(
      (edge: { node: { status: string } }) => edge.node.status === "ACTIVE"
    );

    // Then check subscriptions
    const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSubscription = activeSubscriptions.find(
      (sub: { status: string }) => ["ACTIVE", "ACCEPTED"].includes(sub.status)
    );

    const purchase = activePurchase?.node || activeSubscription;
    
    if (!purchase) {
      log("No active purchase or subscription found - user cancelled or declined");
      
      if (req.method === "POST") {
        return new Response(JSON.stringify({ success: false, error: "No active purchase - user cancelled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      // STANDALONE: Redirect to setup wizard with cancelled param
      return Response.redirect(`${AI_IMAGES_APP_URL}/app/setup-wizard?shop=${encodeURIComponent(shop)}&cancelled=true`, 302);
    }

    log("Active purchase found", purchase);

    // Get plan from purchase name or from query param
    let creditsToAdd = 0;
    let purchasedPlan = planId || "unknown";
    
    if (planId && AI_IMAGES_PLANS[planId]) {
      creditsToAdd = AI_IMAGES_PLANS[planId].credits;
    } else {
      // Try to determine from purchase name
      const purchaseName = purchase.name?.toLowerCase() || "";
      for (const [key, value] of Object.entries(AI_IMAGES_PLANS)) {
        if (purchaseName.includes(value.name.toLowerCase()) || purchaseName.includes(key)) {
          creditsToAdd = value.credits;
          purchasedPlan = key;
          break;
        }
      }
    }

    if (creditsToAdd === 0) {
      log("Could not determine credits from plan", { planId, purchaseName: purchase.name });
      creditsToAdd = 50; // Default to starter pack
      purchasedPlan = "starter";
    }

    log("Credits to add", { creditsToAdd, purchasedPlan });

    // Get or create user credits record
    const userId = connection.user_id;

    // For recurring subscriptions, de-duplicate and track grants per billing cycle
    const isSubscription = !!activeSubscription && purchase?.id === activeSubscription.id;
    const grantId = isSubscription
      ? `${purchase.id}:${purchase.currentPeriodEnd || "unknown"}`
      : purchase.id;

    if (userId) {
      // Check if credits already added for this purchase/cycle
      const { data: existingTransaction } = await supabase
        .from("ai_images_credit_transactions")
        .select("id")
        .eq("shopify_charge_id", grantId)
        .eq("transaction_type", "purchase")
        .single();

      if (existingTransaction) {
        log("Credits already added for this purchase", { chargeId: grantId });

        if (req.method === "POST") {
          return new Response(JSON.stringify({
            success: true,
            message: "Credits already added for this purchase",
            credits: creditsToAdd
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        // STANDALONE: Redirect to dashboard
        return Response.redirect(buildDashboardUrl(shop, new URLSearchParams({ shop, installed: 'true', credits: String(creditsToAdd) })), 302);
      }

      // Add credits using the database function
      const { data: creditResult, error: creditError } = await supabase
        .rpc("add_ai_image_credits", {
          p_user_id: userId,
          p_amount: creditsToAdd,
          p_shopify_charge_id: grantId,
        });

      if (creditError) {
        log("Error adding credits", { error: creditError });
        
        // Fallback: manual insert
        await supabase
          .from("ai_images_credits")
          .upsert({
            user_id: userId,
            credits_balance: creditsToAdd,
            total_credits_purchased: creditsToAdd,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        await supabase
          .from("ai_images_credit_transactions")
          .insert({
            user_id: userId,
            transaction_type: "purchase",
            credits_amount: creditsToAdd,
            description: `Purchased ${AI_IMAGES_PLANS[purchasedPlan]?.name || purchasedPlan}`,
            shopify_charge_id: purchase.id,
          });
      }

      log("Credits added successfully", { userId, credits: creditsToAdd });

      // Update any pending transactions
      await supabase
        .from("ai_images_credit_transactions")
        .update({ transaction_type: "purchase" })
        .eq("shopify_charge_id", grantId)
        .eq("transaction_type", "pending_purchase");

    } else {
      log("No user_id found, credits will be added when user links account");
      
      // Store pending credit grant
      await supabase
        .from("ai_images_credit_transactions")
        .insert({
          user_id: "pending_" + shop,
          transaction_type: "pending_grant",
          credits_amount: creditsToAdd,
          description: `Pending credit grant for ${shop}`,
          shopify_charge_id: purchase.id,
          metadata: {
            shop_domain: shop,
            plan_id: purchasedPlan,
          },
        });
    }

    // For POST requests, return JSON response
    if (req.method === "POST") {
      log("Returning JSON success response");
      return new Response(JSON.stringify({ 
        success: true, 
        credits: creditsToAdd,
        plan: purchasedPlan,
        chargeId: purchase.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // STANDALONE: Redirect to dashboard
    const redirectUrl = buildDashboardUrl(shop, new URLSearchParams({ shop, installed: 'true', credits: String(creditsToAdd) }));
    log("Redirecting to standalone dashboard", { url: redirectUrl });
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    
    if (req.method === "POST") {
      return new Response(JSON.stringify({ success: false, error: errorMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    return Response.redirect(`${AI_IMAGES_APP_URL}/setup?error=unexpected_error`, 302); // Fallback without shop
  }
});
