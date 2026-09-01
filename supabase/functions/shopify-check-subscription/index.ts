import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SHOPIFY-CHECK-SUB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { shopDomain } = await req.json();

    if (!shopDomain) {
      logStep("Missing shopDomain");
      return new Response(
        JSON.stringify({ error: "shopDomain required", status: "NONE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Checking subscription", { shopDomain });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ LOAD SHOP TOKEN (shop_domain OR store_url)
    const { data: connection, error } = await supabase
      .from("shopify_connections")
      .select("access_token, store_url")
      .or(`store_url.eq.${shopDomain},store_url.ilike.%${shopDomain}%`)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !connection?.access_token) {
      logStep("No active connection found", { error });
      return new Response(
        JSON.stringify({ status: "NONE", subscription: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Connection found", { storeUrl: connection.store_url });

    // Normalize shop domain for API call
    const normalizedShop = connection.store_url
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    // 2️⃣ QUERY SHOPIFY BILLING (SOURCE OF TRUTH)
    const shopifyRes = await fetch(
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
                  trialDays
                }
              }
            }
          `,
        }),
      }
    );

    if (!shopifyRes.ok) {
      logStep("Shopify API error", { status: shopifyRes.status });
      return new Response(
        JSON.stringify({ status: "ERROR", subscription: null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await shopifyRes.json();
    logStep("Shopify response", json);

    const subs = json?.data?.currentAppInstallation?.activeSubscriptions || [];
    const active = subs.find((s: { status: string }) => s.status === "ACTIVE");

    logStep("Subscription check complete", { 
      hasActive: !!active, 
      subsCount: subs.length 
    });

    // 3️⃣ RETURN NORMALIZED STATUS
    return new Response(
      JSON.stringify({
        status: active ? "ACTIVE" : "NONE",
        subscription: active || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ status: "ERROR", error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
