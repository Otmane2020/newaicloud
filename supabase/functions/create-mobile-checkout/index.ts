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
      mode,
      // For confirming payment and creating account
      confirmPayment,
      paymentIntentId,
      subscriptionId,
      customerId: receivedCustomerId
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

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

    // STEP 2: After payment succeeds on frontend, create the account
    if (confirmPayment && email) {
      console.log("[create-mobile-checkout] Confirming payment and creating account for:", email);
      
      // For free coupon, skip payment verification
      if (paymentIntentId !== "coupon_free") {
        // Verify payment succeeded
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== "succeeded") {
          return new Response(
            JSON.stringify({ error: "Payment not confirmed yet", status: paymentIntent.status }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("[create-mobile-checkout] Payment verified as succeeded");
      } else {
        console.log("[create-mobile-checkout] Free coupon - skipping payment verification");
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        console.log("[create-mobile-checkout] User already exists:", existingUser.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: existingUser.id,
            message: "User already exists"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use the password provided by user, or generate one as fallback
      const userPassword = password || (crypto.randomUUID().slice(0, 16) + "Aa1!");
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "",
          source: "mobile_ads_checkout"
        }
      });

      if (createError) {
        console.error("[create-mobile-checkout] Error creating user:", createError);
        
        // Handle race condition: user might have been created by another concurrent request
        if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
          console.log("[create-mobile-checkout] User already exists (race condition), fetching existing user");
          const { data: usersAfterError } = await supabase.auth.admin.listUsers();
          const existingUserAfterError = usersAfterError?.users?.find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          );
          
          if (existingUserAfterError) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                userId: existingUserAfterError.id,
                message: "User already exists"
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[create-mobile-checkout] User created:", newUser.user?.id);

      // Create profile with active subscription and stripe_customer_id
      if (newUser?.user) {
        await supabase.from("profiles").upsert({
          id: newUser.user.id,
          email: email,
          full_name: fullName || "",
          subscription_status: "active",
          stripe_customer_id: receivedCustomerId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Update subscription if we have the ID
        if (subscriptionId) {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: {
              user_id: newUser.user.id,
              user_email: email
            }
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          userId: newUser.user?.id,
          email: email
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 1: Create payment intent (NO account creation yet)
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
    console.log("[create-mobile-checkout] Checking if email exists:", email);
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    console.log("[create-mobile-checkout] Total users found:", existingUsers?.users?.length);
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (existingUser) {
      console.log("[create-mobile-checkout] Email already exists:", email, "User ID:", existingUser.id);
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[create-mobile-checkout] Email is available:", email);

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
      console.log("[create-mobile-checkout] Creating subscription for:", email);
      
      // Check if coupon should be applied
      let couponId: string | undefined;
      if (couponCode) {
        try {
          // Try to retrieve by ID first
          try {
            const coupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
            if (coupon && coupon.valid) {
              couponId = coupon.id;
            }
          } catch (e) {
            // Not found by ID, search list
            const coupons = await stripe.coupons.list({ limit: 100 });
            const foundCoupon = coupons.data.find((c: Stripe.Coupon) => 
              c.valid && (
                c.name?.toUpperCase() === couponCode.toUpperCase() || 
                c.id.toUpperCase() === couponCode.toUpperCase()
              )
            );
            if (foundCoupon) {
              couponId = foundCoupon.id;
            }
          }
          console.log("[create-mobile-checkout] Coupon found:", couponId);
        } catch (e) {
          console.log("[create-mobile-checkout] Coupon lookup error:", e);
        }
      }

      // Create subscription with payment intent (NO USER CREATED YET)
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_email: email,
          user_fullname: fullName || "",
          pending_account: "true"
        }
      };

      // Apply coupon if found
      if (couponId) {
        subscriptionParams.coupon = couponId;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;

      // If 100% coupon applied, no payment needed - subscription is already active
      if (!paymentIntent) {
        console.log("[create-mobile-checkout] No payment required (100% coupon), subscription active:", subscription.id, "customerId:", customerId);
        
        return new Response(
          JSON.stringify({ 
            noPaymentRequired: true,
            subscriptionId: subscription.id,
            userEmail: email,
            customerId: customerId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[create-mobile-checkout] Payment intent created:", paymentIntent.id, "for subscription:", subscription.id);

      return new Response(
        JSON.stringify({ 
          clientSecret: paymentIntent.client_secret,
          subscriptionId: subscription.id,
          paymentIntentId: paymentIntent.id,
          userEmail: email
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Redirect to Stripe Checkout
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&new_account=true`,
      cancel_url: `${origin}/mobileads`,
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

    console.log("[create-mobile-checkout] Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[create-mobile-checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Checkout failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
