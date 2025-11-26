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

    // Step 1: Get all price IDs from subscription_plans table
    console.log("📋 Fetching protected prices from subscription_plans...");
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('stripe_price_id, stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_monthly_eur, stripe_price_id_yearly_eur')
      .eq('is_active', true);

    if (plansError) {
      throw new Error(`Failed to fetch subscription plans: ${plansError.message}`);
    }

    // Collect all price IDs
    const protectedPriceIds = new Set<string>();
    for (const plan of plans || []) {
      if (plan.stripe_price_id) protectedPriceIds.add(plan.stripe_price_id);
      if (plan.stripe_price_id_monthly) protectedPriceIds.add(plan.stripe_price_id_monthly);
      if (plan.stripe_price_id_yearly) protectedPriceIds.add(plan.stripe_price_id_yearly);
      if (plan.stripe_price_id_monthly_eur) protectedPriceIds.add(plan.stripe_price_id_monthly_eur);
      if (plan.stripe_price_id_yearly_eur) protectedPriceIds.add(plan.stripe_price_id_yearly_eur);
    }

    console.log(`✅ Found ${protectedPriceIds.size} protected price IDs`);

    // Step 2: Get product IDs for these prices from Stripe
    console.log("🔍 Fetching product IDs from Stripe prices...");
    const protectedProducts = new Set<string>();
    
    for (const priceId of protectedPriceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (typeof price.product === 'string') {
          protectedProducts.add(price.product);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  Could not retrieve price ${priceId}: ${errorMessage}`);
      }
    }

    console.log(`✅ Protecting ${protectedProducts.size} product IDs linked to subscription plans`);

    // Step 2: Archive all products NOT in the protected list
    console.log("🗑️  Archiving non-protected products and their prices...");
    let archivedProductsCount = 0;
    let keptProductsCount = 0;
    let archivedPricesCount = 0;
    let keptPricesCount = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const productsResponse: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
        active: true,
        limit: 100,
        starting_after: startingAfter,
      });

      for (const product of productsResponse.data) {
        if (protectedProducts.has(product.id)) {
          keptProductsCount++;
          console.log(`✓ Keeping protected product: ${product.id} (${product.name})`);
          
          // Count active prices for this product
          const activePrices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 100,
          });
          keptPricesCount += activePrices.data.length;
        } else {
          // Archive all prices for this product first
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 100,
          });
          
          for (const price of prices.data) {
            await stripe.prices.update(price.id, { active: false });
            archivedPricesCount++;
            console.log(`✗ Archived price: ${price.id}`);
          }
          
          // Then archive the product
          await stripe.products.update(product.id, { active: false });
          archivedProductsCount++;
          console.log(`✗ Archived product: ${product.id} (${product.name})`);
        }
      }

      hasMore = productsResponse.has_more;
      if (hasMore && productsResponse.data.length > 0) {
        startingAfter = productsResponse.data[productsResponse.data.length - 1].id;
      }
    }

    console.log(`📊 Archived ${archivedProductsCount} products, kept ${keptProductsCount} products`);
    console.log(`📊 Archived ${archivedPricesCount} prices, kept ${keptPricesCount} prices`);

    // Step 3: Cancel all active subscriptions
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
      protected_product_ids: Array.from(protectedProducts),
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
