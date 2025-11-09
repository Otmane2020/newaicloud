import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-UPGRADE-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    if (!userData.user) throw new Error("User not found");

    logStep("User authenticated", { userId: userData.user.id });

    const { new_price_id } = await req.json();
    if (!new_price_id) throw new Error("new_price_id is required");

    // Get active subscription
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("seller_id", userData.user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (subscriptionError) throw subscriptionError;
    if (!subscription?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    logStep("Updating subscription", { 
      subscriptionId: subscription.stripe_subscription_id,
      newPriceId: new_price_id 
    });

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const currentItemId = stripeSubscription.items.data[0].id;

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: currentItemId,
            price: new_price_id,
          },
        ],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
      }
    );

    logStep("Subscription updated", { 
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status 
    });

    // Get the latest invoice
    const latestInvoiceId = typeof updatedSubscription.latest_invoice === 'string' 
      ? updatedSubscription.latest_invoice 
      : updatedSubscription.latest_invoice?.id;

    if (!latestInvoiceId) {
      throw new Error("No invoice created");
    }

    const invoice = await stripe.invoices.retrieve(latestInvoiceId);
    
    logStep("Invoice retrieved", { 
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      status: invoice.status 
    });

    // If invoice is already paid or amount is 0, no payment needed
    if (invoice.status === "paid" || invoice.amount_due === 0) {
      logStep("No payment required");
      return new Response(
        JSON.stringify({ 
          success: true,
          payment_required: false,
          message: "Subscription upgraded successfully"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get origin for redirect
    const origin = req.headers.get("origin") || "https://yourdomain.com";
    
    // Create a payment URL that redirects back to our success page
    const paymentUrl = invoice.hosted_invoice_url 
      ? `${invoice.hosted_invoice_url}?return_url=${encodeURIComponent(origin + '/upgrade-success')}`
      : null;
    
    logStep("Payment URL generated", { url: paymentUrl });

    return new Response(
      JSON.stringify({
        success: true,
        payment_required: true,
        payment_url: paymentUrl,
        amount_due: invoice.amount_due / 100,
        currency: invoice.currency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
