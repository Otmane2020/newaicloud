import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

// Credit packages available for purchase
const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, price: 5.00, name: "10 Credits" },
  { id: "pack_50", credits: 50, price: 20.00, name: "50 Credits" },
  { id: "pack_100", credits: 100, price: 35.00, name: "100 Credits" },
  { id: "pack_500", credits: 500, price: 150.00, name: "500 Credits" },
];

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

    const { action, package_id, shop_domain, charge_id } = await req.json();
    log("Request received", { action, package_id, shop_domain });

    // Get the AI Images Shopify connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("ai_images_shopify_connections")
      .select("*")
      .eq("shop_domain", shop_domain)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      log("Connection not found", { error: connError });
      return new Response(JSON.stringify({ error: "Store not connected to AI Images" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_charge") {
      // Find the selected package
      const selectedPackage = CREDIT_PACKAGES.find(p => p.id === package_id);
      if (!selectedPackage) {
        return new Response(JSON.stringify({ error: "Invalid package selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Creating Shopify charge", { package: selectedPackage });

      // Create Application Charge in Shopify
      const chargeResponse = await fetch(
        `https://${shop_domain}/admin/api/2024-01/application_charges.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": connection.access_token,
          },
          body: JSON.stringify({
            application_charge: {
              name: `AI Images - ${selectedPackage.name}`,
              price: selectedPackage.price.toFixed(2),
              return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-images-checkout?action=confirm&shop=${encodeURIComponent(shop_domain)}&package=${package_id}`,
              test: false, // Set to true for testing
            },
          }),
        }
      );

      if (!chargeResponse.ok) {
        const errorText = await chargeResponse.text();
        log("Charge creation failed", { status: chargeResponse.status, error: errorText });
        return new Response(JSON.stringify({ error: "Failed to create Shopify charge" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chargeData = await chargeResponse.json();
      const charge = chargeData.application_charge;
      log("Charge created", { chargeId: charge.id, confirmationUrl: charge.confirmation_url });

      return new Response(JSON.stringify({
        success: true,
        confirmation_url: charge.confirmation_url,
        charge_id: charge.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "confirm" || req.method === "GET") {
      // Handle confirmation callback from Shopify
      const url = new URL(req.url);
      const shopFromUrl = url.searchParams.get("shop");
      const packageFromUrl = url.searchParams.get("package");
      const chargeIdFromUrl = url.searchParams.get("charge_id");

      if (!shopFromUrl || !chargeIdFromUrl) {
        return new Response("Missing parameters", { status: 400 });
      }

      log("Confirming charge", { shop: shopFromUrl, chargeId: chargeIdFromUrl });

      // Get connection for this shop
      const { data: conn } = await supabaseAdmin
        .from("ai_images_shopify_connections")
        .select("*")
        .eq("shop_domain", shopFromUrl)
        .single();

      if (!conn) {
        return new Response("Store not found", { status: 400 });
      }

      // Verify charge status with Shopify
      const verifyResponse = await fetch(
        `https://${shopFromUrl}/admin/api/2024-01/application_charges/${chargeIdFromUrl}.json`,
        {
          headers: {
            "X-Shopify-Access-Token": conn.access_token,
          },
        }
      );

      if (!verifyResponse.ok) {
        log("Charge verification failed");
        return Response.redirect("https://newai.sale/ai-images/checkout-failed", 302);
      }

      const verifyData = await verifyResponse.json();
      const chargeStatus = verifyData.application_charge.status;

      log("Charge status", { status: chargeStatus });

      if (chargeStatus === "accepted") {
        // Activate the charge
        await fetch(
          `https://${shopFromUrl}/admin/api/2024-01/application_charges/${chargeIdFromUrl}/activate.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": conn.access_token,
            },
          }
        );

        // Find package and add credits
        const pkg = CREDIT_PACKAGES.find(p => p.id === packageFromUrl);
        if (pkg && conn.user_id) {
          const { data: result } = await supabaseAdmin.rpc("add_ai_image_credits", {
            p_user_id: conn.user_id,
            p_amount: pkg.credits,
            p_shopify_charge_id: chargeIdFromUrl,
          });
          log("Credits added", { result });
        }

        return Response.redirect("https://newai.sale/ai-images/checkout-success", 302);
      } else if (chargeStatus === "declined") {
        return Response.redirect("https://newai.sale/ai-images/checkout-declined", 302);
      } else {
        return Response.redirect("https://newai.sale/ai-images/checkout-pending", 302);
      }

    } else if (action === "get_balance") {
      // Get user's current credit balance
      if (!connection.user_id) {
        return new Response(JSON.stringify({ balance: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: credits } = await supabaseAdmin
        .from("ai_images_credits")
        .select("credits_balance")
        .eq("user_id", connection.user_id)
        .single();

      return new Response(JSON.stringify({
        balance: credits?.credits_balance || 0,
        packages: CREDIT_PACKAGES,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "deduct") {
      // Deduct credits for image generation
      const { amount, description } = await req.json();
      
      if (!connection.user_id) {
        return new Response(JSON.stringify({ error: "User not linked" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: result } = await supabaseAdmin.rpc("deduct_ai_image_credits", {
        p_user_id: connection.user_id,
        p_amount: amount || 1,
        p_description: description || "Image generation",
      });

      return new Response(JSON.stringify(result), {
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
