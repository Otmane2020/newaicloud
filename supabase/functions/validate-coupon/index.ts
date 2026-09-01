import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { couponCode } = await req.json();

    if (!couponCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Coupon code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("[validate-coupon] Validating coupon:", couponCode);

    // Try to find the coupon by ID or name
    try {
      // First try by ID
      const coupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
      
      if (coupon && coupon.valid) {
        console.log("[validate-coupon] Found valid coupon:", coupon.id);
        return new Response(
          JSON.stringify({ 
            valid: true, 
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            currency: coupon.currency
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      // Coupon not found by ID, try listing
      console.log("[validate-coupon] Coupon not found by ID, searching list...");
    }

    // List all coupons and search by name
    const coupons = await stripe.coupons.list({ limit: 100 });
    const foundCoupon = coupons.data.find((c: Stripe.Coupon) => 
      c.valid && (
        c.name?.toUpperCase() === couponCode.toUpperCase() || 
        c.id.toUpperCase() === couponCode.toUpperCase()
      )
    );

    if (foundCoupon) {
      console.log("[validate-coupon] Found coupon in list:", foundCoupon.id);
      return new Response(
        JSON.stringify({ 
          valid: true, 
          couponId: foundCoupon.id,
          percentOff: foundCoupon.percent_off,
          amountOff: foundCoupon.amount_off,
          currency: foundCoupon.currency
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[validate-coupon] Coupon not found");
    return new Response(
      JSON.stringify({ valid: false, error: "Invalid coupon code" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[validate-coupon] Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error?.message || "Validation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
