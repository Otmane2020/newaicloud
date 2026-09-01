import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid session" }, 401);

    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (plansError) throw plansError;

    const results: Array<Record<string, unknown>> = [];

    for (const plan of plans || []) {
      try {
        let productId = typeof plan.stripe_product_id === "string" && plan.stripe_product_id.startsWith("prod_")
          ? plan.stripe_product_id
          : null;

        if (!productId) {
          const product = await stripe.products.create({
            name: `Nexora AI — ${plan.name}`,
            description: plan.description || `Nexora AI ${plan.name} subscription`,
            metadata: {
              billing_type: "subscription",
              plan_id: String(plan.id),
              plan_name: String(plan.name || ""),
            },
          }, {
            idempotencyKey: `nexora-plan-product-${plan.id}`,
          });
          productId = product.id;
        }

        const monthlyAmount = Number(plan.price_monthly_eur ?? plan.price_monthly);
        const yearlyAmount = Number(plan.price_yearly_eur ?? plan.price_yearly);
        let monthlyId = typeof plan.stripe_price_id_monthly === "string" && plan.stripe_price_id_monthly.startsWith("price_")
          ? plan.stripe_price_id_monthly
          : null;
        let yearlyId = typeof plan.stripe_price_id_yearly === "string" && plan.stripe_price_id_yearly.startsWith("price_")
          ? plan.stripe_price_id_yearly
          : null;

        if (!monthlyId && Number.isFinite(monthlyAmount) && monthlyAmount > 0) {
          const amountCents = Math.round(monthlyAmount * 100);
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: amountCents,
            currency: "eur",
            recurring: { interval: "month" },
            metadata: { billing_type: "subscription", plan_id: String(plan.id), billing_period: "monthly" },
          }, {
            idempotencyKey: `nexora-plan-${plan.id}-monthly-${amountCents}`,
          });
          monthlyId = price.id;
        }

        if (!yearlyId && Number.isFinite(yearlyAmount) && yearlyAmount > 0) {
          const amountCents = Math.round(yearlyAmount * 100);
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: amountCents,
            currency: "eur",
            recurring: { interval: "year" },
            metadata: { billing_type: "subscription", plan_id: String(plan.id), billing_period: "yearly" },
          }, {
            idempotencyKey: `nexora-plan-${plan.id}-yearly-${amountCents}`,
          });
          yearlyId = price.id;
        }

        const { error: saveError } = await supabase
          .from("subscription_plans")
          .update({
            stripe_product_id: productId,
            stripe_price_id_monthly: monthlyId,
            stripe_price_id_yearly: yearlyId,
          })
          .eq("id", plan.id);
        if (saveError) throw saveError;

        results.push({
          plan_id: plan.id,
          ok: true,
          stripe_product_id: productId,
          stripe_price_id_monthly: monthlyId,
          stripe_price_id_yearly: yearlyId,
        });
      } catch (error) {
        console.error("Stripe plan sync failed", plan.id, error);
        results.push({
          plan_id: plan.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const failed = results.filter((result) => result.ok === false).length;
    return json({ ok: failed === 0, synced: results.length - failed, failed, results }, failed ? 207 : 200);
  } catch (error) {
    console.error("ensure-stripe-plans failed", error);
    return json({ error: error instanceof Error ? error.message : "Stripe plan sync failed" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
