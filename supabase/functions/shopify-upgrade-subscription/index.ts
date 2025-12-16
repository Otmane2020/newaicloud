import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// IMPORTANT: use your public app URL for returnUrl/callback (not the supabase project URL)
// Example: https://app.newai.sale
const APP_BASE_URL =
  Deno.env.get("APP_BASE_URL") || Deno.env.get("PUBLIC_APP_URL") || "";

// IMPORTANT: keep currency consistent with how you created your Shopify billing in Partner Dashboard.
// If your billing is in USD, keep USD. If you use EUR, set EUR here (and in DB).
const BILLING_CURRENCY = Deno.env.get("BILLING_CURRENCY") || "USD";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SHOPIFY-UPGRADE] ${step}${detailsStr}`);
};

function normalizeShopDomain(storeUrl: string) {
  // Accept "foo.myshopify.com" or "https://foo.myshopify.com"
  let host = storeUrl.trim();
  host = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return host.toLowerCase();
}

function assertMyshopifyDomain(shop: string) {
  // Optionally relax if you store custom domain, but for Admin API + access token you usually want myshopify host.
  if (!shop.includes(".myshopify.com")) {
    throw new Error("Invalid shop domain");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");

    // Auth required (merchant logged in your app)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      logStep("Auth error", { error: authError });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const newPlanId = body?.newPlanId as string | undefined;
    const billingCycle = (body?.billingCycle as "monthly" | "yearly" | undefined) || "monthly";

    logStep("Upgrade request", { userId: user.id, newPlanId, billingCycle });

    if (!newPlanId) {
      return new Response(JSON.stringify({ error: "Plan ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!APP_BASE_URL) {
      return new Response(
        JSON.stringify({
          error: "Missing APP_BASE_URL env var (public app URL). Required for Shopify returnUrl.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Plan from DB
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", newPlanId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { error: planError, planId: newPlanId });
      return new Response(JSON.stringify({ error: "Plan not found or inactive" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceRaw = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    const price = Number(priceRaw);

    if (!Number.isFinite(price) || price <= 0) {
      logStep("Invalid plan pricing", { priceRaw, planId: newPlanId, billingCycle });
      return new Response(JSON.stringify({ error: "Invalid plan pricing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const interval = billingCycle === "yearly" ? "ANNUAL" : "EVERY_30_DAYS";

    // Active Shopify connection
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shopDomain = normalizeShopDomain(connection.store_url);
    assertMyshopifyDomain(shopDomain);

    // Verify user is Shopify-billed
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("billing_provider, current_plan_id, shopify_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logStep("Profile not found", { error: profileError });
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.billing_provider !== "shopify") {
      logStep("Not a Shopify billing user", { billingProvider: profile.billing_provider });
      return new Response(
        JSON.stringify({ error: "User is not using Shopify billing", code: "NOT_SHOPIFY_BILLING" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logStep("Plan pricing from DB", { planId: newPlanId, price, interval, planName: plan.name });

    // Return URL should land back in your APP, not in supabase functions.
    // Then your app can call your callback edge function server-to-server or handle finalize.
    // If you want Shopify to hit your edge function directly, make it a public URL you control (APP_BASE_URL).
    const returnUrl = `${APP_BASE_URL.replace(/\/+$/, "")}/app/billing/return?shop=${encodeURIComponent(
      shopDomain,
    )}&plan=${encodeURIComponent(newPlanId)}&cycle=${encodeURIComponent(billingCycle)}`;

    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          replacementBehavior: APPLY_IMMEDIATELY
        ) {
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }
    `;

    const variables = {
      name: `NewAI ${plan.name} - ${billingCycle === "yearly" ? "Annual" : "Monthly"}`,
      returnUrl,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: price,
                currencyCode: BILLING_CURRENCY,
              },
              interval,
            },
          },
        },
      ],
    };

    logStep("Creating Shopify subscription", { shopDomain, planName: plan.name, price, interval });

    const shopifyResponse = await fetch(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": connection.access_token,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const shopifyText = await shopifyResponse.text();
    if (!shopifyResponse.ok) {
      logStep("Shopify API error", { status: shopifyResponse.status, error: shopifyText });
      return new Response(JSON.stringify({ error: "Failed to create subscription with Shopify" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyData = JSON.parse(shopifyText);
    logStep("Shopify response", shopifyData);

    const userErrors = shopifyData?.data?.appSubscriptionCreate?.userErrors || [];
    if (userErrors.length > 0) {
      logStep("Shopify user errors", userErrors);
      return new Response(JSON.stringify({ error: userErrors[0].message, details: userErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmationUrl = shopifyData?.data?.appSubscriptionCreate?.confirmationUrl;
    const createdSubId = shopifyData?.data?.appSubscriptionCreate?.appSubscription?.id;

    if (!confirmationUrl || !createdSubId) {
      logStep("Missing confirmation URL or subscription id", {
        confirmationUrl: !!confirmationUrl,
        createdSubId: !!createdSubId,
      });
      return new Response(JSON.stringify({ error: "Invalid response from Shopify" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store pending upgrade so callback can validate it
    await supabaseAdmin.from("shopify_pending_subscriptions").upsert(
      {
        user_id: user.id,
        shop_domain: shopDomain,
        plan_id: newPlanId,
        billing_cycle: billingCycle,
        status: "pending",
        shopify_subscription_gid: createdSubId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,shop_domain" },
    );

    logStep("Upgrade initiated successfully", { confirmationUrl });

    return new Response(
      JSON.stringify({
        success: true,
        confirmationUrl,
        message: "Redirect user to confirmationUrl to complete upgrade",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
