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

    // Step 1: Define protected product IDs (68 derniers produits créés le 25/11 à 23:10)
    console.log("📋 Setting up protected product IDs...");
    const protectedProducts = new Set<string>([
      "prod_TUUMAAENGevDTb", "prod_TUUMQJb25IK2oM", "prod_TUUMjnrZhJ8vao", "prod_TUUMyBDPJVUqnj",
      "prod_TUUMmnuAD0GbRY", "prod_TUUMWwYtatsvAP", "prod_TUUMJ3IoKgn03a", "prod_TUUMFXB8eZF6Ky",
      "prod_TUUMPcbz03Sj6o", "prod_TUUMsJZOomGoeV", "prod_TUUMQ7Yrr4biFu", "prod_TUUMA4DGCMtStm",
      "prod_TUUMXyWndyGnXG", "prod_TUUMxQA0TEe5pm", "prod_TUUMkSq1Arnxxi", "prod_TUUMarGWgpy2kE",
      "prod_TUUMViMPoAJa0x", "prod_TUUMwxsauAdGnD", "prod_TUUMgLWbtWtiyu", "prod_TUUMPh7jpMQntB",
      "prod_TUUMsIAU1gjMCu", "prod_TUUMDSpyzutqMG", "prod_TUUMTwlHyERiyR", "prod_TUUMQXD4Z2EKgr",
      "prod_TUUMgBu6kVLbbr", "prod_TUUMKZWn0CY1JS", "prod_TUUMqFTyQi0SX3", "prod_TUUMlOoZHLybhH",
      "prod_TUUMqQvAQf8GmI", "prod_TUUMQ1AvAmK8jA", "prod_TUUM1Axalr1K29", "prod_TUUMgzRuokYZ5V",
      "prod_TUUMqPV1rfYUPN", "prod_TUUMppHlE4P8FR", "prod_TUUMys41Amafa5", "prod_TUUMhq9X1NNWi5",
      "prod_TUUMuotFiL0AS9", "prod_TUUMnrDoufOWjB", "prod_TUUMfi75Y8ThSx", "prod_TUUMhepQVQXVyE",
      "prod_TUUMn7TBOpXmUR", "prod_TUUMiNuFNTaC0h", "prod_TUUM42SmXqPlqw", "prod_TUUMvSx7sAV1wL",
      "prod_TUULANVIWxkAPg", "prod_TUULsbufSlQd39", "prod_TUULQDjsmFrFOz", "prod_TUULwljgPqD4Td",
      "prod_TUUL93OnY66snF", "prod_TUULAYteRhWFtW", "prod_TUUL3XCvaWqyG2", "prod_TUULDEFkonwjbC",
      "prod_TUULx6efLr5s7D", "prod_TUULKnVpybMG2w", "prod_TUULPGr1bjqgJS", "prod_TUULmR76kGiIVG",
      "prod_TUUL3rjElAOk1M", "prod_TUULCo1vIXi0ar", "prod_TUULPVUCtCvYy6", "prod_TUULYdVeTxyDO8",
      "prod_TUULuN5VSRTjOK", "prod_TUULK66OrsP6MQ", "prod_TUULeBPcZ4P3QD", "prod_TUULbL7qw4Twlu",
      "prod_TUULb2yHMeCWao", "prod_TUULmiP9qClnfG", "prod_TUULxfnYOMpqed", "prod_TUULnbAPCVZCGK",
    ]);

    console.log(`✅ Protecting ${protectedProducts.size} product IDs`);

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
