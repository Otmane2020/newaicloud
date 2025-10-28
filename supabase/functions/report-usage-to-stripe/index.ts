import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REPORT-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all users with pay-as-you-go plan
    const { data: payAsYouGoUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("current_plan_id", "pay-as-you-go");

    if (usersError) throw usersError;
    logStep("Found pay-as-you-go users", { count: payAsYouGoUsers?.length || 0 });

    if (!payAsYouGoUsers || payAsYouGoUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No pay-as-you-go users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = [];

    for (const user of payAsYouGoUsers) {
      try {
        logStep("Processing user", { userId: user.id, email: user.email });

        // Get or find Stripe customer
        let customerId = user.stripe_customer_id;
        if (!customerId) {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length === 0) {
            logStep("No Stripe customer found, skipping", { email: user.email });
            continue;
          }
          customerId = customers.data[0].id;
        }

        // Get active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          logStep("No active subscription found, skipping", { customerId });
          continue;
        }

        const subscription = subscriptions.data[0];
        logStep("Found subscription", { subscriptionId: subscription.id });

        // Get usage data for the current month
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const { data: usageData, error: usageError } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("seller_id", user.id)
          .eq("month", currentMonth.toISOString().split("T")[0])
          .single();

        if (usageError || !usageData) {
          logStep("No usage data found", { userId: user.id });
          continue;
        }

        logStep("Usage data", {
          optimizations: usageData.optimizations_count,
          articles: usageData.articles_count,
          chat: usageData.chat_responses_count,
          shopify: usageData.shopify_requests_count,
        });

        // Report usage to Stripe for each metric
        // Note: You need to create subscription items for each price in Stripe first
        // This is a placeholder - you'll need to map subscription items to metrics
        
        const usageRecords = [];
        
        // Get subscription items
        const subscriptionItems = subscription.items.data;
        logStep("Subscription items", { count: subscriptionItems.length });

        // Report usage for each metric if the subscription has the corresponding item
        for (const item of subscriptionItems) {
          const priceId = item.price.id;
          let quantity = 0;
          let metricName = "";

          // Map price IDs to metrics (you'll need to configure these)
          // For now, we'll use metadata or lookup_key to identify which metric this is
          const price = await stripe.prices.retrieve(priceId);
          
          if (price.lookup_key === "optimizations" || price.metadata?.metric === "optimizations") {
            quantity = usageData.optimizations_count || 0;
            metricName = "optimizations";
          } else if (price.lookup_key === "articles" || price.metadata?.metric === "articles") {
            quantity = usageData.articles_count || 0;
            metricName = "articles";
          } else if (price.lookup_key === "chat_responses" || price.metadata?.metric === "chat_responses") {
            quantity = usageData.chat_responses_count || 0;
            metricName = "chat_responses";
          } else if (price.lookup_key === "shopify_requests" || price.metadata?.metric === "shopify_requests") {
            quantity = usageData.shopify_requests_count || 0;
            metricName = "shopify_requests";
          }

          if (quantity > 0 && metricName) {
            const usageRecord = await stripe.subscriptionItems.createUsageRecord(
              item.id,
              {
                quantity: quantity,
                timestamp: Math.floor(Date.now() / 1000),
                action: "set", // Use "set" to replace the current usage
              }
            );
            logStep("Usage record created", { metric: metricName, quantity, recordId: usageRecord.id });
            usageRecords.push({ metric: metricName, quantity, recordId: usageRecord.id });
          }
        }

        results.push({
          userId: user.id,
          email: user.email,
          customerId,
          subscriptionId: subscription.id,
          usageRecords,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("ERROR processing user", { userId: user.id, error: errorMessage });
        results.push({
          userId: user.id,
          error: errorMessage,
        });
      }
    }

    logStep("Reporting completed", { processedUsers: results.length });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in report-usage-to-stripe", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
