import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

// Shopify Usage-based billing - cost per image generated
const USAGE_PRICING = {
  starter: {
    id: "starter",
    name: "AI Images Starter",
    pricePerImage: 0.15, // $0.15 per image generated
    cappedAmount: 50.00, // Monthly cap at $50
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { action, shop_domain, amount, description } = await req.json();
    log("Request received", { action, shop_domain, amount });

    // Get the Shopify connection (either AI Images specific or regular)
    let connection = null;
    let accessToken = null;
    let userId = null;

    // First try AI Images specific connection
    const { data: aiConnection } = await supabaseAdmin
      .from("ai_images_shopify_connections")
      .select("*")
      .eq("shop_domain", shop_domain)
      .eq("is_active", true)
      .single();

    if (aiConnection) {
      connection = aiConnection;
      accessToken = aiConnection.access_token;
      userId = aiConnection.user_id;
    } else {
      // Fall back to regular shopify connection
      const { data: regularConnection } = await supabaseAdmin
        .from("shopify_connections")
        .select("*")
        .eq("store_url", shop_domain)
        .eq("is_active", true)
        .single();

      if (regularConnection) {
        connection = regularConnection;
        accessToken = (regularConnection as any).access_token;
        userId = regularConnection.user_id;
      }
    }

    if (!connection) {
      log("Connection not found");
      return new Response(JSON.stringify({ error: "Store not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "setup_usage_charge") {
      // Create a recurring application charge with usage-based billing
      const plan = USAGE_PRICING.starter;
      log("Setting up usage charge", { plan });

      const chargeResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            recurring_application_charge: {
              name: plan.name,
              price: 0, // Base price is $0, we charge per usage
              capped_amount: plan.cappedAmount,
              terms: `$${plan.pricePerImage.toFixed(2)} per AI image generated, capped at $${plan.cappedAmount}/month`,
              return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-images-checkout?action=confirm_usage&shop=${encodeURIComponent(shop_domain)}`,
              test: false,
            },
          }),
        }
      );

      if (!chargeResponse.ok) {
        const errorText = await chargeResponse.text();
        log("Usage charge creation failed", { status: chargeResponse.status, error: errorText });
        return new Response(JSON.stringify({ error: "Failed to create usage charge", details: errorText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chargeData = await chargeResponse.json();
      const charge = chargeData.recurring_application_charge;
      log("Usage charge created", { chargeId: charge.id, confirmationUrl: charge.confirmation_url });

      return new Response(JSON.stringify({
        success: true,
        confirmation_url: charge.confirmation_url,
        charge_id: charge.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "confirm_usage" || req.method === "GET") {
      // Handle confirmation callback from Shopify
      const url = new URL(req.url);
      const shopFromUrl = url.searchParams.get("shop");
      const chargeIdFromUrl = url.searchParams.get("charge_id");

      if (!shopFromUrl) {
        return new Response("Missing shop parameter", { status: 400 });
      }

      log("Confirming usage charge", { shop: shopFromUrl, chargeId: chargeIdFromUrl });

      // Get connection for this shop
      let conn = null;
      let token = null;

      const { data: aiConn } = await supabaseAdmin
        .from("ai_images_shopify_connections")
        .select("*")
        .eq("shop_domain", shopFromUrl)
        .single();

      if (aiConn) {
        conn = aiConn;
        token = aiConn.access_token;
      } else {
        const { data: regularConn } = await supabaseAdmin
          .from("shopify_connections")
          .select("*")
          .eq("store_url", shopFromUrl)
          .single();

        if (regularConn) {
          conn = regularConn;
          token = (regularConn as any).access_token;
        }
      }

      if (!conn || !token) {
        return new Response("Store not found", { status: 400 });
      }

      // Get active recurring charge
      const chargesResponse = await fetch(
        `https://${shopFromUrl}/admin/api/2024-01/recurring_application_charges.json`,
        {
          headers: {
            "X-Shopify-Access-Token": token,
          },
        }
      );

      if (!chargesResponse.ok) {
        log("Failed to fetch charges");
        return Response.redirect("https://newai.sale/ai-images/billing-error", 302);
      }

      const chargesData = await chargesResponse.json();
      const activeCharge = chargesData.recurring_application_charges?.find(
        (c: any) => c.status === "accepted" || c.status === "pending"
      );

      if (activeCharge && activeCharge.status === "accepted") {
        // Activate the charge
        await fetch(
          `https://${shopFromUrl}/admin/api/2024-01/recurring_application_charges/${activeCharge.id}/activate.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": token,
            },
          }
        );

        log("Usage charge activated", { chargeId: activeCharge.id });
        return Response.redirect("https://newai.sale/ai-images/billing-success", 302);
      }

      return Response.redirect("https://newai.sale/ai-images/billing-pending", 302);

    } else if (action === "record_usage") {
      // Record usage for pay-as-you-go billing
      const imagesGenerated = amount || 1;
      const plan = USAGE_PRICING.starter;
      const usagePrice = plan.pricePerImage * imagesGenerated;

      log("Recording usage", { imagesGenerated, usagePrice });

      // Get active recurring charge
      const chargesResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      if (!chargesResponse.ok) {
        // No active billing, allow limited free usage
        log("No active billing, allowing free usage");
        return new Response(JSON.stringify({
          success: true,
          billed: false,
          message: "Free usage - set up billing for unlimited access",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chargesData = await chargesResponse.json();
      const activeCharge = chargesData.recurring_application_charges?.find(
        (c: any) => c.status === "active"
      );

      if (!activeCharge) {
        log("No active charge found");
        return new Response(JSON.stringify({
          success: true,
          billed: false,
          message: "No active billing plan",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record the usage charge
      const usageResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/recurring_application_charges/${activeCharge.id}/usage_charges.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            usage_charge: {
              description: description || `AI Image Generation (${imagesGenerated} image${imagesGenerated > 1 ? 's' : ''})`,
              price: usagePrice.toFixed(2),
            },
          }),
        }
      );

      if (!usageResponse.ok) {
        const errorText = await usageResponse.text();
        log("Usage charge failed", { error: errorText });
        // Still allow the operation but log the billing failure
        return new Response(JSON.stringify({
          success: true,
          billed: false,
          error: "Failed to record usage charge",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const usageData = await usageResponse.json();
      log("Usage recorded", { usageCharge: usageData.usage_charge });

      // Track in database
      if (userId) {
        await supabaseAdmin.from("ai_images_credit_transactions").insert({
          user_id: userId,
          credits_amount: -imagesGenerated,
          transaction_type: "usage",
          description: description || `AI Image Generation`,
          metadata: { shopify_usage_charge: usageData.usage_charge },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        billed: true,
        amount: usagePrice,
        usage_charge: usageData.usage_charge,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "get_billing_status") {
      // Check if user has active billing
      const chargesResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      if (!chargesResponse.ok) {
        return new Response(JSON.stringify({
          active: false,
          plan: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chargesData = await chargesResponse.json();
      const activeCharge = chargesData.recurring_application_charges?.find(
        (c: any) => c.status === "active"
      );

      return new Response(JSON.stringify({
        active: !!activeCharge,
        plan: activeCharge ? {
          id: activeCharge.id,
          name: activeCharge.name,
          cappedAmount: activeCharge.capped_amount,
          balanceUsed: activeCharge.balance_used,
          balanceRemaining: parseFloat(activeCharge.capped_amount) - parseFloat(activeCharge.balance_used || 0),
        } : null,
        pricing: USAGE_PRICING.starter,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "deduct") {
      // Legacy support - now just record usage
      const imagesCount = amount || 1;
      
      // Record in Shopify if active billing exists
      const chargesResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/recurring_application_charges.json`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      let billed = false;
      if (chargesResponse.ok) {
        const chargesData = await chargesResponse.json();
        const activeCharge = chargesData.recurring_application_charges?.find(
          (c: any) => c.status === "active"
        );

        if (activeCharge) {
          const usagePrice = USAGE_PRICING.starter.pricePerImage * imagesCount;
          await fetch(
            `https://${shop_domain}/admin/api/2024-01/recurring_application_charges/${activeCharge.id}/usage_charges.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
              },
              body: JSON.stringify({
                usage_charge: {
                  description: description || `AI Image Generation (${imagesCount} image${imagesCount > 1 ? 's' : ''})`,
                  price: usagePrice.toFixed(2),
                },
              }),
            }
          );
          billed = true;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        billed,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
