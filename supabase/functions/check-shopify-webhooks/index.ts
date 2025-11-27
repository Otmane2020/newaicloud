import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Health check
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId } = body;

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: "storeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get store connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("store_url, access_token")
      .eq("id", storeId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Store connection not found", details: connError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { store_url, access_token } = connection;
    const shop_domain = store_url;

    // List all webhooks from Shopify
    const webhooksUrl = `https://${shop_domain}/admin/api/2025-01/webhooks.json`;
    console.log(`Fetching webhooks from: ${webhooksUrl}`);

    const response = await fetch(webhooksUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Shopify API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch webhooks from Shopify", 
          status: response.status,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const webhooks = data.webhooks || [];

    // Check for GDPR webhooks
    const gdprTopics = [
      "customers/data_request",
      "customers/redact", 
      "shop/redact"
    ];

    const expectedUrl = `${supabaseUrl}/functions/v1/shopify-gdpr-webhook`;

    const gdprWebhooksStatus = gdprTopics.map(topic => {
      const found = webhooks.find((w: any) => w.topic === topic);
      return {
        topic,
        exists: !!found,
        id: found?.id || null,
        address: found?.address || null,
        correctUrl: found?.address === expectedUrl,
        format: found?.format || null,
        created_at: found?.created_at || null,
      };
    });

    const allGdprWebhooksOk = gdprWebhooksStatus.every(w => w.exists && w.correctUrl);

    console.log(`GDPR webhooks status for ${shop_domain}:`, gdprWebhooksStatus);

    return new Response(
      JSON.stringify({
        success: true,
        shop_domain,
        expectedUrl,
        allGdprWebhooksOk,
        gdprWebhooks: gdprWebhooksStatus,
        totalWebhooks: webhooks.length,
        allWebhooks: webhooks.map((w: any) => ({
          id: w.id,
          topic: w.topic,
          address: w.address,
          format: w.format,
          created_at: w.created_at,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking webhooks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
