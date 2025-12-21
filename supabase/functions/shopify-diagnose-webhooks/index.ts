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
    const { storeId, action } = body;

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: "storeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store connection
    const { data: connection, error: connError } = await supabase
      .from("shopify_connections")
      .select("store_url, access_token, is_active")
      .eq("id", storeId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Store connection not found", details: connError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { store_url, access_token, is_active } = connection;
    const shop_domain = store_url;

    // Get recent webhook logs from system_logs
    const { data: recentLogs } = await supabase
      .from("system_logs")
      .select("*")
      .eq("function_name", "shopify-webhook")
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter logs related to this store
    const storeLogs = recentLogs?.filter((log: any) => 
      log.metadata?.shopDomain?.includes(shop_domain) ||
      log.metadata?.shop?.includes(shop_domain) ||
      log.message?.includes(shop_domain)
    ) || [];

    // List all webhooks from Shopify
    const webhooksUrl = `https://${shop_domain}/admin/api/2025-01/webhooks.json`;
    console.log(`Fetching webhooks from: ${webhooksUrl}`);

    let webhooks: any[] = [];
    let webhookError: string | null = null;

    try {
      const response = await fetch(webhooksUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": access_token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        webhookError = `Shopify API error: ${response.status} - ${await response.text()}`;
      } else {
        const data = await response.json();
        webhooks = data.webhooks || [];
      }
    } catch (e) {
      webhookError = `Failed to fetch webhooks: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Expected webhook URL
    const expectedUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;

    // Required webhook topics for proper app functioning
    const requiredTopics = [
      "products/create",
      "products/update",
      "products/delete",
      "collections/create",
      "collections/update",
      "collections/delete",
      "app/uninstalled",
      "app_subscriptions/update",
    ];

    const gdprTopics = [
      "customers/data_request",
      "customers/redact",
      "shop/redact"
    ];

    // Analyze webhooks
    const registeredWebhooks = webhooks.map((w: any) => ({
      id: w.id,
      topic: w.topic,
      address: w.address,
      format: w.format,
      created_at: w.created_at,
      isCorrectUrl: w.address === expectedUrl,
      isGdpr: gdprTopics.includes(w.topic),
    }));

    const missingWebhooks = requiredTopics.filter(topic => 
      !webhooks.some((w: any) => w.topic === topic)
    );

    const misconfiguredWebhooks = webhooks.filter((w: any) => 
      w.address !== expectedUrl && 
      requiredTopics.includes(w.topic)
    );

    // Summarize log types
    const logSummary = {
      total: storeLogs.length,
      byType: storeLogs.reduce((acc: any, log: any) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {}),
    };

    // Check for common issues
    const issues: string[] = [];
    
    if (!is_active) {
      issues.push("Store connection is marked as inactive");
    }
    
    if (webhookError) {
      issues.push(`Cannot fetch webhooks from Shopify: ${webhookError}`);
    }
    
    if (missingWebhooks.length > 0) {
      issues.push(`Missing required webhooks: ${missingWebhooks.join(", ")}`);
    }
    
    if (misconfiguredWebhooks.length > 0) {
      issues.push(`${misconfiguredWebhooks.length} webhook(s) have incorrect URL`);
    }

    const hmacErrors = storeLogs.filter((log: any) => 
      log.type === 'webhook_hmac_mismatch' || 
      log.type === 'webhook_hmac_error'
    );
    
    if (hmacErrors.length > 0) {
      issues.push(`${hmacErrors.length} HMAC verification error(s) in recent logs - check SHOPIFY_API_SECRET`);
    }

    const storeNotFoundErrors = storeLogs.filter((log: any) => 
      log.type === 'webhook_store_not_found'
    );
    
    if (storeNotFoundErrors.length > 0) {
      issues.push(`${storeNotFoundErrors.length} store lookup error(s) - check store_url format`);
    }

    // Recommendations
    const recommendations: string[] = [];
    
    if (missingWebhooks.length > 0) {
      recommendations.push("Register missing webhooks using the Shopify Admin API or dashboard");
    }
    
    if (hmacErrors.length > 0) {
      recommendations.push("Verify SHOPIFY_API_SECRET matches your Shopify app's API secret");
    }
    
    if (storeNotFoundErrors.length > 0) {
      recommendations.push("Ensure store_url in shopify_connections matches the webhook x-shopify-shop-domain header");
    }

    return new Response(
      JSON.stringify({
        success: true,
        shop_domain,
        is_active,
        expectedWebhookUrl: expectedUrl,
        webhooks: {
          total: webhooks.length,
          registered: registeredWebhooks,
          missing: missingWebhooks,
          misconfigured: misconfiguredWebhooks.length,
          error: webhookError,
        },
        recentLogs: {
          summary: logSummary,
          samples: storeLogs.slice(0, 10),
        },
        diagnosis: {
          issues,
          recommendations,
          isHealthy: issues.length === 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error diagnosing webhooks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
