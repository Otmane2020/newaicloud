import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-CHECK-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");
    
    const { shopDomain } = await req.json();
    
    if (!shopDomain) {
      return new Response(
        JSON.stringify({ error: "Missing shopDomain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedShop = shopDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    log("Checking subscription", { shopDomain: normalizedShop });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("ai_images_shopify_connections")
      .select("*")
      .eq("shop_domain", normalizedShop)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      log("No connection found", { error: connError });
      return new Response(
        JSON.stringify({ status: "NOT_CONNECTED", credits: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credits balance
    let creditsBalance = 0;
    if (connection.user_id) {
      const { data: credits } = await supabase
        .from("ai_images_credits")
        .select("credits_balance")
        .eq("user_id", connection.user_id)
        .single();
      
      creditsBalance = credits?.credits_balance || 0;
    }

    // Check Shopify for active subscriptions
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
          }
        }
      }
    `;

    const shopifyResponse = await fetch(
      `https://${normalizedShop}/admin/api/2025-01/graphql.json`,
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
      log("Shopify API error", { status: shopifyResponse.status });
      return new Response(
        JSON.stringify({ status: "ERROR", credits: creditsBalance, error: "Shopify API error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    const activeSubscriptions = shopifyData.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSub = activeSubscriptions.find((s: { status: string }) => s.status === "ACTIVE");

    log("Subscription check complete", { 
      hasActiveSubscription: !!activeSub, 
      credits: creditsBalance 
    });

    return new Response(
      JSON.stringify({
        status: activeSub ? "ACTIVE" : "NONE",
        subscription: activeSub || null,
        credits: creditsBalance,
        shopDomain: normalizedShop,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ status: "ERROR", error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
