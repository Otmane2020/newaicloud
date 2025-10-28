import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("🚀 Force payment started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");

    const user = userData.user;
    console.log("👤 User:", user.email);

    // Get user's current plan
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("current_plan_id, subscription_status")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.current_plan_id) throw new Error("No plan selected");

    console.log("📋 Current plan:", profile.current_plan_id);

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("stripe_price_id_monthly, stripe_price_id_yearly")
      .eq("id", profile.current_plan_id)
      .single();

    if (planError || !plan) throw new Error("Plan not found");

    const { success_url, cancel_url } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // If customer exists, cancel any active trial subscriptions
    if (customerId) {
      console.log("🔍 Checking for active subscriptions...");
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 10,
      });

      for (const sub of subscriptions.data) {
        console.log(`❌ Cancelling trial subscription: ${sub.id}`);
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    // Create immediate payment checkout session (no trial)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: plan.stripe_price_id_monthly,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: success_url || `${req.headers.get("origin")}/dashboard?payment=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/dashboard?payment=cancelled`,
      subscription_data: {
        trial_period_days: undefined, // No trial
      },
    });

    console.log("✅ Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
