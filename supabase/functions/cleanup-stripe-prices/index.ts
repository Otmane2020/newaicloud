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
    console.log("🧹 Starting Stripe cleanup process...");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get protected price IDs from subscription_plans
    console.log("📋 Fetching protected price IDs from database...");
    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select("stripe_price_id_monthly, stripe_price_id_monthly_eur, stripe_price_id_yearly, stripe_price_id_yearly_eur")
      .neq("id", "trial");

    if (plansError) {
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    const protectedPrices = new Set<string>();
    plans?.forEach((plan) => {
      if (plan.stripe_price_id_monthly) protectedPrices.add(plan.stripe_price_id_monthly);
      if (plan.stripe_price_id_monthly_eur) protectedPrices.add(plan.stripe_price_id_monthly_eur);
      if (plan.stripe_price_id_yearly) protectedPrices.add(plan.stripe_price_id_yearly);
      if (plan.stripe_price_id_yearly_eur) protectedPrices.add(plan.stripe_price_id_yearly_eur);
    });

    console.log(`✅ Found ${protectedPrices.size} protected price IDs`);

    // Step 2: Archive all non-protected prices
    console.log("🗑️  Archiving non-protected prices...");
    let archivedPricesCount = 0;
    let keptPricesCount = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const pricesResponse = await stripe.prices.list({
        active: true,
        limit: 100,
        starting_after: startingAfter,
      });

      for (const price of pricesResponse.data) {
        if (protectedPrices.has(price.id)) {
          keptPricesCount++;
          console.log(`✓ Keeping protected price: ${price.id}`);
        } else {
          await stripe.prices.update(price.id, { active: false });
          archivedPricesCount++;
          console.log(`✗ Archived price: ${price.id}`);
        }
      }

      hasMore = pricesResponse.has_more;
      if (hasMore && pricesResponse.data.length > 0) {
        startingAfter = pricesResponse.data[pricesResponse.data.length - 1].id;
      }
    }

    console.log(`📊 Archived ${archivedPricesCount} prices, kept ${keptPricesCount} prices`);

    // Step 3: Archive products with no active prices
    console.log("🗑️  Archiving products with no active prices...");
    let archivedProductsCount = 0;
    let keptProductsCount = 0;
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const productsResponse: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
        active: true,
        limit: 100,
        starting_after: startingAfter,
      });

      for (const product of productsResponse.data) {
        const activePrices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 1,
        });

        if (activePrices.data.length === 0) {
          await stripe.products.update(product.id, { active: false });
          archivedProductsCount++;
          console.log(`✗ Archived product: ${product.id} (${product.name})`);
        } else {
          keptProductsCount++;
          console.log(`✓ Keeping product: ${product.id} (${product.name})`);
        }
      }

      hasMore = productsResponse.has_more;
      if (hasMore && productsResponse.data.length > 0) {
        startingAfter = productsResponse.data[productsResponse.data.length - 1].id;
      }
    }

    console.log(`📊 Archived ${archivedProductsCount} products, kept ${keptProductsCount} products`);

    // Step 4: Cancel all active subscriptions
    console.log("❌ Canceling all active subscriptions...");
    let canceledSubscriptionsCount = 0;
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const subscriptionsResponse: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      });

      for (const subscription of subscriptionsResponse.data) {
        await stripe.subscriptions.cancel(subscription.id);
        canceledSubscriptionsCount++;
        console.log(`✗ Canceled subscription: ${subscription.id} (customer: ${subscription.customer})`);
      }

      hasMore = subscriptionsResponse.has_more;
      if (hasMore && subscriptionsResponse.data.length > 0) {
        startingAfter = subscriptionsResponse.data[subscriptionsResponse.data.length - 1].id;
      }
    }

    console.log(`📊 Canceled ${canceledSubscriptionsCount} subscriptions`);

    // Final report
    const report = {
      success: true,
      archived_prices: archivedPricesCount,
      kept_prices: keptPricesCount,
      archived_products: archivedProductsCount,
      kept_products: keptProductsCount,
      canceled_subscriptions: canceledSubscriptionsCount,
      protected_price_ids: Array.from(protectedPrices),
    };

    console.log("✅ Cleanup completed successfully!");
    console.log(JSON.stringify(report, null, 2));

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
