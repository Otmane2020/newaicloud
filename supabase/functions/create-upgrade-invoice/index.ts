import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => console.log(`[UPGRADE] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("START");

    // Env
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw userErr;
    if (!userData?.user) throw new Error("User not found");

    const userId = userData.user.id;

    // Body
    const { new_price_id } = await req.json();
    if (!new_price_id) throw new Error("new_price_id is required");

    // Get subscription
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("seller_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    if (subErr || !sub?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil",
    });

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    const currentItem = stripeSub.items.data[0];
    const currentPrice = currentItem.price.unit_amount ?? 0;

    // Fetch new price
    const newPrice = await stripe.prices.retrieve(new_price_id);
    const newAmount = newPrice.unit_amount ?? 0;

    const isUpgrade = newAmount > currentPrice;

    log("Detected", { isUpgrade, currentPrice, newAmount });

    // Build update payload
    const updatePayload: any = {
      items: [
        {
          id: currentItem.id,
          price: new_price_id,
        },
      ],
    };

    if (isUpgrade) {
      // ⬆️ UPGRADE → PRORATA
      updatePayload.proration_behavior = "always_invoice";
      updatePayload.payment_behavior = "default_incomplete";
    } else {
      // ⬇️ DOWNGRADE → PAS DE PRORATA
      updatePayload.proration_behavior = "none";
      updatePayload.billing_cycle_anchor = "unchanged";
      updatePayload.payment_behavior = "default_incomplete";
    }

    log("Updating subscription", updatePayload);

    const updatedSub = await stripe.subscriptions.update(sub.stripe_subscription_id, updatePayload);

    // Retrieve invoice
    const invoiceId =
      typeof updatedSub.latest_invoice === "string" ? updatedSub.latest_invoice : updatedSub.latest_invoice?.id;

    if (!invoiceId) throw new Error("Invoice not created");

    const invoice = await stripe.invoices.retrieve(invoiceId);

    log("Invoice", {
      invoiceId: invoice.id,
      amount_due: invoice.amount_due,
    });

    // If nothing to pay
    if (invoice.amount_due === 0 || invoice.status === "paid") {
      return new Response(
        JSON.stringify({
          success: true,
          payment_required: false,
          message: "Plan updated successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Payment URL
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const paymentUrl = invoice.hosted_invoice_url + `?return_url=${encodeURIComponent(origin + "/upgrade-success")}`;

    return new Response(
      JSON.stringify({
        success: true,
        payment_required: true,
        payment_url: paymentUrl,
        amount_due: invoice.amount_due / 100,
        currency: invoice.currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    log("ERROR", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
