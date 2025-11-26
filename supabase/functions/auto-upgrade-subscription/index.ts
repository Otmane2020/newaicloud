import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AUTO-UPGRADE] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-upgrade flow");

    // Initialize clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Parse request body
    const { new_price_id, new_plan_id, billing_period } = await req.json();
    if (!new_price_id || !new_plan_id) {
      throw new Error("new_price_id and new_plan_id are required");
    }

    logStep("Request params", { new_price_id, new_plan_id, billing_period });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, current_plan_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error("User profile or Stripe customer not found");
    }

    logStep("Profile retrieved", { 
      customerId: profile.stripe_customer_id,
      currentPlanId: profile.current_plan_id 
    });

    // Step 1: Check local subscriptions table
    const { data: localSub } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("seller_id", userId)
      .maybeSingle();

    let stripeSubscriptionId = localSub?.stripe_subscription_id;

    // Step 2: If no local subscription, fetch from Stripe and sync
    if (!stripeSubscriptionId) {
      logStep("No local subscription found, fetching from Stripe");

      const stripeSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (stripeSubs.data.length === 0) {
        throw new Error("No active Stripe subscription found");
      }

      const stripeSub = stripeSubs.data[0];
      stripeSubscriptionId = stripeSub.id;

      logStep("Found Stripe subscription, syncing to local DB", { 
        subscriptionId: stripeSubscriptionId 
      });

      // Sync to local DB
      const interval = stripeSub.items.data[0].price.recurring?.interval || "month";
      await supabaseAdmin.from("subscriptions").upsert({
        seller_id: userId,
        stripe_subscription_id: stripeSub.id,
        status: stripeSub.status,
        plan_id: profile.current_plan_id,
        billing_period: interval === "year" ? "yearly" : "monthly",
        current_period_start: stripeSub.current_period_start 
          ? new Date(stripeSub.current_period_start * 1000).toISOString() 
          : null,
        current_period_end: stripeSub.current_period_end 
          ? new Date(stripeSub.current_period_end * 1000).toISOString() 
          : null,
      }, { onConflict: "seller_id" });

      logStep("Local DB synced successfully");
    }

    // Step 3: Get full Stripe subscription details
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["items.data.price"],
    });

    logStep("Stripe subscription retrieved", { 
      status: stripeSub.status,
      itemsCount: stripeSub.items.data.length 
    });

    if (stripeSub.items.data.length === 0) {
      throw new Error("Subscription has no items");
    }

    const currentItem = stripeSub.items.data[0];
    const currentPrice = currentItem.price;
    const currentCurrency = currentPrice.currency;
    const currentInterval = currentPrice.recurring?.interval || "month";

    // Step 4: Get new price details
    const newPrice = await stripe.prices.retrieve(new_price_id);
    const newCurrency = newPrice.currency;
    const newInterval = newPrice.recurring?.interval || "month";

    logStep("Price comparison", {
      current: { currency: currentCurrency, interval: currentInterval },
      new: { currency: newCurrency, interval: newInterval },
    });

    // Step 5: Validate proration conditions
    const canProrate = 
      stripeSub.status === "active" &&
      currentCurrency === newCurrency &&
      currentInterval === newInterval;

    logStep("Proration validation", { canProrate, status: stripeSub.status });

    // Step 6: Update subscription with appropriate proration behavior
    const updatePayload: Stripe.SubscriptionUpdateParams = {
      items: [{
        id: currentItem.id,
        price: new_price_id,
      }],
      proration_behavior: canProrate ? "create_prorations" : "none",
      billing_cycle_anchor: canProrate ? "unchanged" : "now",
      payment_behavior: "pending_if_incomplete",
    };

    if (canProrate) {
      updatePayload.expand = ["latest_invoice.payment_intent"];
    }

    logStep("Updating Stripe subscription", { 
      subscriptionId: stripeSubscriptionId,
      proration_behavior: updatePayload.proration_behavior 
    });

    const updatedSub = await stripe.subscriptions.update(
      stripeSubscriptionId,
      updatePayload
    );

    logStep("Subscription updated", { newStatus: updatedSub.status });

    // Step 7: Update local profile and subscriptions table
    await supabaseAdmin
      .from("profiles")
      .update({
        current_plan_id: new_plan_id,
        subscription_status: updatedSub.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_id: new_plan_id,
        status: updatedSub.status,
        billing_period: billing_period || (newInterval === "year" ? "yearly" : "monthly"),
        current_period_start: updatedSub.current_period_start
          ? new Date(updatedSub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: updatedSub.current_period_end
          ? new Date(updatedSub.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("seller_id", userId);

    logStep("Local DB updated with new plan");

    // Step 8: Check if payment is required
    let paymentUrl = null;
    let amountDue = 0;

    if (canProrate && updatedSub.latest_invoice) {
      const invoice = typeof updatedSub.latest_invoice === "string"
        ? await stripe.invoices.retrieve(updatedSub.latest_invoice, {
            expand: ["payment_intent"]
          })
        : updatedSub.latest_invoice;

      amountDue = invoice.amount_due || 0;

      logStep("Invoice details", { 
        invoiceId: invoice.id,
        amountDue,
        status: invoice.status,
        paid: invoice.paid 
      });

      if (amountDue > 0 && invoice.hosted_invoice_url) {
        paymentUrl = invoice.hosted_invoice_url;
        logStep("Payment required", { amountDue, paymentUrl });
      } else {
        logStep("No payment required", { 
          reason: amountDue === 0 ? "zero_amount" : "no_url",
          invoiceStatus: invoice.status 
        });
      }
    } else {
      logStep("No proration invoice", { 
        canProrate,
        hasInvoice: !!updatedSub.latest_invoice 
      });
    }

    const responseData = {
      success: true,
      subscription_id: updatedSub.id,
      status: updatedSub.status,
      proration_applied: canProrate,
      payment_url: paymentUrl,
      amount_due: amountDue,
      currency: newCurrency,
      upgrade_type: canProrate ? "immediate_with_proration" : "next_cycle",
    };

    logStep("Auto-upgrade completed successfully", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
