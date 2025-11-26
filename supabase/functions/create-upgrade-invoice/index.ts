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

  const body = await req.json().catch(() => ({}));

  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    log("START");

    // Stripe ENV
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-12-18.acacia", // 🔥 FIX CRITIQUE
    });

    // Supabase ENV
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw userErr;
    if (!userData?.user) throw new Error("User not found");

    const userId = userData.user.id;

    // Body
    const { new_price_id } = body;
    if (!new_price_id) throw new Error("new_price_id is required");

    // ─────────────────────────────────────────────
    // Get user's active subscription
    // ─────────────────────────────────────────────

    let stripeSubscriptionId: string | null = null;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("seller_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      stripeSubscriptionId = sub.stripe_subscription_id;
    }

    if (!stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const currentItem = stripeSub.items.data[0];

    const currentPrice = currentItem.price.unit_amount ?? 0;
    const currentCurrency = currentItem.price.currency;
    const currentInterval = currentItem.price.recurring?.interval;

    // New price
    const newPrice = await stripe.prices.retrieve(new_price_id);
    const newAmount = newPrice.unit_amount ?? 0;
    const newCurrency = newPrice.currency;
    const newInterval = newPrice.recurring?.interval;

    const isUpgrade = newAmount > currentPrice;

    log("DETECTED_CHANGE", {
      isUpgrade,
      currentAmount: currentPrice,
      newAmount,
      currentCurrency,
      newCurrency,
      currentInterval,
      newInterval,
    });

    // ─────────────────────────────────────────────
    // Check if proration possible
    // ─────────────────────────────────────────────

    const canProrate =
      stripeSub.status === "active" && // not trialing
      currentCurrency === newCurrency &&
      currentInterval === newInterval;

    if (isUpgrade && !canProrate) {
      log("⚠ PRORATION BLOCKED", {
        status: stripeSub.status,
        currentCurrency,
        newCurrency,
        currentInterval,
        newInterval,
      });
    }

    // ─────────────────────────────────────────────
    // Build update payload
    // ─────────────────────────────────────────────

    const updatePayload: any = {
      items: [
        {
          id: currentItem.id,
          price: new_price_id,
        },
      ],
      billing_cycle_anchor: "unchanged",
      proration_behavior: isUpgrade && canProrate ? "create_prorations" : "none",
      payment_behavior: isUpgrade && canProrate ? "pending_if_incomplete" : "allow_incomplete",
      expand: ["latest_invoice.payment_intent"],
    };

    log("UPDATE_PAYLOAD", updatePayload);

    // Update subscription
    const updatedSub = await stripe.subscriptions.update(stripeSubscriptionId, updatePayload);

    // ─────────────────────────────────────────────
    // Retrieve invoice
    // ─────────────────────────────────────────────

    let invoiceId =
      typeof updatedSub.latest_invoice === "string" ? updatedSub.latest_invoice : updatedSub.latest_invoice?.id;

    if (!invoiceId) {
      const invoices = await stripe.invoices.list({
        subscription: stripeSubscriptionId,
        limit: 1,
      });

      if (!invoices.data?.length) {
        return new Response(
          JSON.stringify({
            success: true,
            payment_required: false,
            message: "Plan updated (no invoice needed)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      invoiceId = invoices.data[0].id;
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);

    log("INVOICE", {
      invoiceId: invoice.id,
      amount_due: invoice.amount_due,
      hosted_invoice_url: invoice.hosted_invoice_url,
    });

    // ─────────────────────────────────────────────
    // If no payment required
    // ─────────────────────────────────────────────

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
    const paymentUrl = invoice.hosted_invoice_url
      ? `${invoice.hosted_invoice_url}?return_url=${encodeURIComponent(origin + "/upgrade-success")}`
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        payment_required: true,
        payment_url: paymentUrl,
        amount_due: invoice.amount_due / 100,
        currency: invoice.currency,
        invoice_id: invoice.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    log("ERROR", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
