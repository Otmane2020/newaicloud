import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanConfig {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  price_eur: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_campaigns: number;
  max_chat_responses_monthly: number;
  max_shopify_stores: number;
  display_order: number;
  popular?: boolean;
  best_value?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ CRITICAL: Check for health check to prevent creating new prices
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      console.log("Health check - skipping plan setup");
      return new Response(JSON.stringify({ ok: true, skipped: true }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Starting subscription plans setup...");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Define all plans
    const plans: PlanConfig[] = [
      // Trial
      {
        id: "trial",
        name: "Trial",
        description: "7-day free trial",
        price_usd: 0,
        price_eur: 0,
        max_products: 50,
        max_optimizations_monthly: 50,
        max_articles_monthly: 5,
        max_campaigns: 0,
        max_chat_responses_monthly: 50,
        max_shopify_stores: 1,
        display_order: 0,
      },
      // Starter
      {
        id: "starter",
        name: "Starter",
        description: "Perfect for getting started",
        price_usd: 9.99,
        price_eur: 9.99,
        max_products: 100,
        max_optimizations_monthly: 100,
        max_articles_monthly: 10,
        max_campaigns: 0,
        max_chat_responses_monthly: 100,
        max_shopify_stores: 1,
        display_order: 1,
      },
      // Pro plans (8 tiers) - progression x2
      {
        id: "pro-500",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 49,
        price_eur: 49,
        max_products: 1000,
        max_optimizations_monthly: 500,
        max_articles_monthly: 10,
        max_campaigns: 3,
        max_chat_responses_monthly: 500,
        max_shopify_stores: 1,
        display_order: 2,
        popular: true,
      },
      {
        id: "pro-1000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 98,
        price_eur: 98,
        max_products: 2000,
        max_optimizations_monthly: 1000,
        max_articles_monthly: 20,
        max_campaigns: 6,
        max_chat_responses_monthly: 1000,
        max_shopify_stores: 2,
        display_order: 3,
      },
      {
        id: "pro-2000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 196,
        price_eur: 196,
        max_products: 3000,
        max_optimizations_monthly: 2000,
        max_articles_monthly: 40,
        max_campaigns: 12,
        max_chat_responses_monthly: 2000,
        max_shopify_stores: 4,
        display_order: 4,
      },
      {
        id: "pro-4000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 392,
        price_eur: 392,
        max_products: 4000,
        max_optimizations_monthly: 4000,
        max_articles_monthly: 80,
        max_campaigns: 24,
        max_chat_responses_monthly: 4000,
        max_shopify_stores: 8,
        display_order: 5,
      },
      {
        id: "pro-8000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 784,
        price_eur: 784,
        max_products: 8000,
        max_optimizations_monthly: 8000,
        max_articles_monthly: 160,
        max_campaigns: 48,
        max_chat_responses_monthly: 8000,
        max_shopify_stores: 16,
        display_order: 6,
      },
      {
        id: "pro-16000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 1568,
        price_eur: 1592,
        max_products: 16000,
        max_optimizations_monthly: 16000,
        max_articles_monthly: 320,
        max_campaigns: 96,
        max_chat_responses_monthly: 16000,
        max_shopify_stores: 32,
        display_order: 7,
      },
      {
        id: "pro-32000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 3136,
        price_eur: 3184,
        max_products: 32000,
        max_optimizations_monthly: 32000,
        max_articles_monthly: 640,
        max_campaigns: 192,
        max_chat_responses_monthly: 32000,
        max_shopify_stores: 64,
        display_order: 8,
      },
      {
        id: "pro-50000",
        name: "Pro",
        description: "For growing businesses",
        price_usd: 4900,
        price_eur: 4900,
        max_products: 50000,
        max_optimizations_monthly: 50000,
        max_articles_monthly: 1000,
        max_campaigns: 300,
        max_chat_responses_monthly: 50000,
        max_shopify_stores: 100,
        display_order: 9,
      },
      // Enterprise plans (8 tiers) - progression x2
      {
        id: "enterprise-2000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 199,
        price_eur: 199,
        max_products: 999999,
        max_optimizations_monthly: 2000,
        max_articles_monthly: 100,
        max_campaigns: 10,
        max_chat_responses_monthly: 2000,
        max_shopify_stores: 5,
        display_order: 10,
        best_value: true,
      },
      {
        id: "enterprise-4000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 398,
        price_eur: 398,
        max_products: 999999,
        max_optimizations_monthly: 4000,
        max_articles_monthly: 200,
        max_campaigns: 20,
        max_chat_responses_monthly: 4000,
        max_shopify_stores: 10,
        display_order: 11,
      },
      {
        id: "enterprise-8000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 796,
        price_eur: 796,
        max_products: 999999,
        max_optimizations_monthly: 8000,
        max_articles_monthly: 400,
        max_campaigns: 40,
        max_chat_responses_monthly: 8000,
        max_shopify_stores: 20,
        display_order: 12,
      },
      {
        id: "enterprise-16000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 1592,
        price_eur: 1592,
        max_products: 999999,
        max_optimizations_monthly: 16000,
        max_articles_monthly: 800,
        max_campaigns: 80,
        max_chat_responses_monthly: 16000,
        max_shopify_stores: 40,
        display_order: 13,
      },
      {
        id: "enterprise-32000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 3184,
        price_eur: 3184,
        max_products: 999999,
        max_optimizations_monthly: 32000,
        max_articles_monthly: 1600,
        max_campaigns: 160,
        max_chat_responses_monthly: 32000,
        max_shopify_stores: 80,
        display_order: 14,
      },
      {
        id: "enterprise-64000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 6368,
        price_eur: 6368,
        max_products: 999999,
        max_optimizations_monthly: 64000,
        max_articles_monthly: 3200,
        max_campaigns: 320,
        max_chat_responses_monthly: 64000,
        max_shopify_stores: 160,
        display_order: 15,
      },
      {
        id: "enterprise-128000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 12736,
        price_eur: 12736,
        max_products: 999999,
        max_optimizations_monthly: 128000,
        max_articles_monthly: 6400,
        max_campaigns: 640,
        max_chat_responses_monthly: 128000,
        max_shopify_stores: 320,
        display_order: 16,
      },
      {
        id: "enterprise-200000",
        name: "Enterprise",
        description: "For large operations",
        price_usd: 19900,
        price_eur: 19900,
        max_products: 999999,
        max_optimizations_monthly: 200000,
        max_articles_monthly: 10000,
        max_campaigns: 1000,
        max_chat_responses_monthly: 200000,
        max_shopify_stores: 500,
        display_order: 17,
      },
    ];

    const results = [];

    for (const plan of plans) {
      console.log(`Creating plan: ${plan.id}`);

      let priceIds: any = {
        stripe_price_id_monthly: null,
        stripe_price_id_monthly_eur: null,
        stripe_price_id_yearly: null,
        stripe_price_id_yearly_eur: null,
      };

      // Skip creating Stripe products for trial (it's free)
      if (plan.id !== "trial") {
        // ✅ Check if existing product and prices exist to avoid creating duplicates
        const existingProducts = await stripe.products.search({
          query: `name:'${plan.name} ${plan.max_optimizations_monthly}'`,
          limit: 1
        });

        let productMonthlyUSD;
        let priceMonthlyUSD;

        if (existingProducts.data.length > 0) {
          productMonthlyUSD = existingProducts.data[0];
          console.log(`Reusing existing product: ${productMonthlyUSD.id} for ${plan.name}`);
          
          // Find existing USD monthly price
          const existingPrices = await stripe.prices.list({
            product: productMonthlyUSD.id,
            currency: "usd",
            recurring: { interval: "month" },
            limit: 1
          });
          
          if (existingPrices.data.length > 0) {
            priceMonthlyUSD = existingPrices.data[0];
            console.log(`Reusing existing price: ${priceMonthlyUSD.id}`);
          } else {
            // Create price for existing product
            priceMonthlyUSD = await stripe.prices.create({
              product: productMonthlyUSD.id,
              currency: "usd",
              unit_amount: Math.round(plan.price_usd * 100),
              recurring: { interval: "month" },
            });
          }
        } else {
          // Create new product and price
          productMonthlyUSD = await stripe.products.create({
            name: `${plan.name} ${plan.max_optimizations_monthly}`,
            description: `${plan.description} - ${plan.max_optimizations_monthly} optimizations/month`,
            type: "service",
          });

          priceMonthlyUSD = await stripe.prices.create({
            product: productMonthlyUSD.id,
            currency: "usd",
            unit_amount: Math.round(plan.price_usd * 100),
            recurring: { interval: "month" },
          });
        }

        priceIds.stripe_price_id_monthly = priceMonthlyUSD.id;

        // ✅ Check for existing EUR monthly product/price
        const existingProductsEUR = await stripe.products.search({
          query: `name:'${plan.name} ${plan.max_optimizations_monthly} EUR'`,
          limit: 1
        });

        let productMonthlyEUR;
        let priceMonthlyEUR;

        if (existingProductsEUR.data.length > 0) {
          productMonthlyEUR = existingProductsEUR.data[0];
          console.log(`Reusing existing EUR product: ${productMonthlyEUR.id}`);
          
          const existingPricesEUR = await stripe.prices.list({
            product: productMonthlyEUR.id,
            currency: "eur",
            recurring: { interval: "month" },
            limit: 1
          });
          
          if (existingPricesEUR.data.length > 0) {
            priceMonthlyEUR = existingPricesEUR.data[0];
            console.log(`Reusing existing EUR price: ${priceMonthlyEUR.id}`);
          } else {
            priceMonthlyEUR = await stripe.prices.create({
              product: productMonthlyEUR.id,
              currency: "eur",
              unit_amount: Math.round(plan.price_eur * 100),
              recurring: { interval: "month" },
            });
          }
        } else {
          productMonthlyEUR = await stripe.products.create({
            name: `${plan.name} ${plan.max_optimizations_monthly} EUR`,
            description: `${plan.description} - ${plan.max_optimizations_monthly} optimizations/month`,
            type: "service",
          });

          priceMonthlyEUR = await stripe.prices.create({
            product: productMonthlyEUR.id,
            currency: "eur",
            unit_amount: Math.round(plan.price_eur * 100),
            recurring: { interval: "month" },
          });
        }

        priceIds.stripe_price_id_monthly_eur = priceMonthlyEUR.id;

        // ✅ Check for existing yearly USD product/price
        const yearlyPriceUSD = plan.price_usd * 12 * 0.8;
        const existingProductsYearlyUSD = await stripe.products.search({
          query: `name:'${plan.name} ${plan.max_optimizations_monthly} Yearly'`,
          limit: 1
        });

        let productYearlyUSD;
        let priceYearlyUSD;

        if (existingProductsYearlyUSD.data.length > 0) {
          productYearlyUSD = existingProductsYearlyUSD.data[0];
          console.log(`Reusing existing yearly USD product: ${productYearlyUSD.id}`);
          
          const existingPricesYearlyUSD = await stripe.prices.list({
            product: productYearlyUSD.id,
            currency: "usd",
            recurring: { interval: "year" },
            limit: 1
          });
          
          if (existingPricesYearlyUSD.data.length > 0) {
            priceYearlyUSD = existingPricesYearlyUSD.data[0];
            console.log(`Reusing existing yearly USD price: ${priceYearlyUSD.id}`);
          } else {
            priceYearlyUSD = await stripe.prices.create({
              product: productYearlyUSD.id,
              currency: "usd",
              unit_amount: Math.round(yearlyPriceUSD * 100),
              recurring: { interval: "year" },
            });
          }
        } else {
          productYearlyUSD = await stripe.products.create({
            name: `${plan.name} ${plan.max_optimizations_monthly} Yearly`,
            description: `${plan.description} (yearly) - ${plan.max_optimizations_monthly} optimizations/month`,
            type: "service",
          });

          priceYearlyUSD = await stripe.prices.create({
            product: productYearlyUSD.id,
            currency: "usd",
            unit_amount: Math.round(yearlyPriceUSD * 100),
            recurring: { interval: "year" },
          });
        }

        priceIds.stripe_price_id_yearly = priceYearlyUSD.id;

        // ✅ Check for existing yearly EUR product/price
        const yearlyPriceEUR = plan.price_eur * 12 * 0.8;
        const existingProductsYearlyEUR = await stripe.products.search({
          query: `name:'${plan.name} ${plan.max_optimizations_monthly} Yearly EUR'`,
          limit: 1
        });

        let productYearlyEUR;
        let priceYearlyEUR;

        if (existingProductsYearlyEUR.data.length > 0) {
          productYearlyEUR = existingProductsYearlyEUR.data[0];
          console.log(`Reusing existing yearly EUR product: ${productYearlyEUR.id}`);
          
          const existingPricesYearlyEUR = await stripe.prices.list({
            product: productYearlyEUR.id,
            currency: "eur",
            recurring: { interval: "year" },
            limit: 1
          });
          
          if (existingPricesYearlyEUR.data.length > 0) {
            priceYearlyEUR = existingPricesYearlyEUR.data[0];
            console.log(`Reusing existing yearly EUR price: ${priceYearlyEUR.id}`);
          } else {
            priceYearlyEUR = await stripe.prices.create({
              product: productYearlyEUR.id,
              currency: "eur",
              unit_amount: Math.round(yearlyPriceEUR * 100),
              recurring: { interval: "year" },
            });
          }
        } else {
          productYearlyEUR = await stripe.products.create({
            name: `${plan.name} ${plan.max_optimizations_monthly} Yearly EUR`,
            description: `${plan.description} (yearly) - ${plan.max_optimizations_monthly} optimizations/month`,
            type: "service",
          });

          priceYearlyEUR = await stripe.prices.create({
            product: productYearlyEUR.id,
            currency: "eur",
            unit_amount: Math.round(yearlyPriceEUR * 100),
            recurring: { interval: "year" },
          });
        }

        priceIds.stripe_price_id_yearly_eur = priceYearlyEUR.id;
      }

      // Upsert plan in subscription_plans table
      const { error } = await supabaseAdmin
        .from("subscription_plans")
        .upsert({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price_monthly: plan.price_usd,
          price_monthly_eur: plan.price_eur,
          price_yearly: plan.price_usd * 12 * 0.8,
          price_yearly_eur: plan.price_eur * 12 * 0.8,
          max_products: plan.max_products,
          max_optimizations_monthly: plan.max_optimizations_monthly,
          max_articles_monthly: plan.max_articles_monthly,
          max_campaigns: plan.max_campaigns,
          max_chat_responses_monthly: plan.max_chat_responses_monthly,
          max_shopify_stores: plan.max_shopify_stores,
          max_shopify_requests_monthly: plan.max_optimizations_monthly,
          display_order: plan.display_order,
          popular: plan.popular || false,
          best_value: plan.best_value || false,
          is_active: true,
          trial_days: plan.id === "trial" ? 7 : (plan.id === "starter" ? 14 : 0),
          ...priceIds,
        });

      if (error) {
        console.error(`Error upserting plan ${plan.id}:`, error);
        throw error;
      }

      results.push({ plan_id: plan.id, status: "created", price_ids: priceIds });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${results.length} plans with ${results.length * 4} price IDs`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
