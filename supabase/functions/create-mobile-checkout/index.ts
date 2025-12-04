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

  try {
    const { 
      priceId, 
      email, 
      password,
      fullName,
      billingAddress,
      couponCode,
      checkEmailOnly,
      mode 
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if email already exists in Supabase
    if (checkEmailOnly && email) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      );
      
      return new Response(
        JSON.stringify({ exists: emailExists }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://newai.sale";

    // Create or get Stripe customer
    let customerId: string;
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      if (billingAddress || fullName) {
        await stripe.customers.update(customerId, {
          name: fullName,
          address: billingAddress
        });
      }
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        name: fullName,
        address: billingAddress,
        metadata: {
          pending_signup: "true",
          source: "mobile_ads"
        }
      });
      customerId = newCustomer.id;
    }

    // Mode: payment_intent - Create subscription with payment intent for Elements
    if (mode === "payment_intent") {
      // Get the price to determine the amount
      const price = await stripe.prices.retrieve(priceId);
      
      // Create subscription with payment intent
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_email: email,
          user_fullname: fullName || "",
          create_account: "true"
        }
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      console.log("Payment intent created for subscription:", subscription.id);

      return new Response(
        JSON.stringify({ 
          clientSecret: paymentIntent.client_secret,
          subscriptionId: subscription.id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Embedded checkout mode
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: "embedded",
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&new_account=true`,
      automatic_tax: { enabled: false },
      metadata: {
        user_email: email,
        user_fullname: fullName || "",
        create_account: "true"
      }
    };

    // Apply coupon if provided
    if (couponCode) {
      try {
        const coupons = await stripe.coupons.list({ limit: 100 });
        const coupon = coupons.data.find((c: { name?: string; id: string }) => 
          c.name?.toUpperCase() === couponCode.toUpperCase() || c.id.toUpperCase() === couponCode.toUpperCase()
        );
        if (coupon) {
          sessionParams.discounts = [{ coupon: coupon.id }];
        }
      } catch (e) {
        console.log("Coupon lookup error:", e);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Embedded checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        clientSecret: session.client_secret,
        sessionId: session.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Checkout failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
