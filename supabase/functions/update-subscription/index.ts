import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const { new_price_id, new_plan_id } = await req.json();
    if (!new_price_id) throw new Error("new_price_id is required");

    logStep("Request body parsed", { new_price_id, new_plan_id });

    // Get user profile with current subscription
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, current_plan_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    logStep("Profile loaded", { 
      subscriptionId: profile.stripe_subscription_id,
      customerId: profile.stripe_customer_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    logStep("Current subscription retrieved", { 
      status: subscription.status,
      itemsCount: subscription.items.data.length 
    });

    // Get the subscription item to update
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) throw new Error("No subscription item found");

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        items: [
          {
            id: subscriptionItemId,
            price: new_price_id,
          },
        ],
        proration_behavior: 'always_invoice', // Create invoice for proration
      }
    );

    logStep("Subscription updated in Stripe", { 
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status 
    });

    // Update profile with new plan
    if (new_plan_id) {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          current_plan_id: new_plan_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile", { error: updateError });
      } else {
        logStep("Profile updated with new plan", { planId: new_plan_id });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_period_end: updatedSubscription.current_period_end,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
