import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GDPR_TOPICS = [
  "customers/data_request",
  "customers/redact",
  "shop/redact"
];

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

    const { storeId, deleteExisting = false } = body;

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
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-gdpr-webhook`;

    console.log(`Registering GDPR webhooks for ${shop_domain}`);
    console.log(`Webhook URL: ${webhookUrl}`);

    // First, list existing webhooks to avoid duplicates
    const listResponse = await fetch(
      `https://${shop_domain}/admin/api/2025-01/webhooks.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": access_token,
          "Content-Type": "application/json",
        },
      }
    );

    const existingData = await listResponse.json();
    const existingWebhooks = existingData.webhooks || [];

    const results: any[] = [];

    for (const topic of GDPR_TOPICS) {
      const existing = existingWebhooks.find((w: any) => w.topic === topic);
      
      // If exists and deleteExisting is true, delete it first
      if (existing && deleteExisting) {
        console.log(`Deleting existing webhook for ${topic}: ${existing.id}`);
        await fetch(
          `https://${shop_domain}/admin/api/2025-01/webhooks/${existing.id}.json`,
          {
            method: "DELETE",
            headers: {
              "X-Shopify-Access-Token": access_token,
            },
          }
        );
      }

      // If exists with correct URL and not deleting, skip
      if (existing && existing.address === webhookUrl && !deleteExisting) {
        console.log(`Webhook for ${topic} already exists with correct URL`);
        results.push({
          topic,
          status: "already_exists",
          id: existing.id,
          address: existing.address,
        });
        continue;
      }

      // If exists with wrong URL and not deleting, update it
      if (existing && existing.address !== webhookUrl && !deleteExisting) {
        console.log(`Updating webhook for ${topic} to correct URL`);
        const updateResponse = await fetch(
          `https://${shop_domain}/admin/api/2025-01/webhooks/${existing.id}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              webhook: {
                id: existing.id,
                address: webhookUrl,
              },
            }),
          }
        );

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          results.push({
            topic,
            status: "updated",
            id: updateData.webhook.id,
            address: updateData.webhook.address,
          });
        } else {
          const errorText = await updateResponse.text();
          results.push({
            topic,
            status: "update_failed",
            error: errorText,
          });
        }
        continue;
      }

      // Create new webhook
      console.log(`Creating webhook for ${topic}`);
      const createResponse = await fetch(
        `https://${shop_domain}/admin/api/2025-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log(`Created webhook for ${topic}: ${createData.webhook.id}`);
        results.push({
          topic,
          status: "created",
          id: createData.webhook.id,
          address: createData.webhook.address,
        });
      } else {
        const errorText = await createResponse.text();
        console.error(`Failed to create webhook for ${topic}: ${errorText}`);
        results.push({
          topic,
          status: "create_failed",
          error: errorText,
        });
      }
    }

    const allSuccess = results.every(r => 
      r.status === "created" || r.status === "already_exists" || r.status === "updated"
    );

    // Log to system_logs
    await supabase.from("system_logs").insert({
      type: allSuccess ? "info" : "error",
      function_name: "register-gdpr-webhooks",
      message: `GDPR webhooks registration for ${shop_domain}: ${allSuccess ? "success" : "partial failure"}`,
      metadata: { shop_domain, results },
    });

    return new Response(
      JSON.stringify({
        success: allSuccess,
        shop_domain,
        webhookUrl,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error registering webhooks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
