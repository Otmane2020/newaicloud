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
    if (!stripeSecret) throw new Error("Stripe is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid session" }, 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, credits")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return json({ ok: true, recovered: 0, balance: Number(profile?.credits ?? 0) });
    }

    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 30,
    });

    let recovered = 0;
    let balance = Number(profile?.credits ?? 0);

    // Process oldest first so the ledger keeps a sensible balance progression.
    const paidTopups = sessions.data
      .filter((session) =>
        session.payment_status === "paid" &&
        session.metadata?.type === "credit_topup" &&
        (session.client_reference_id || session.metadata?.user_id) === user.id
      )
      .sort((a, b) => a.created - b.created);

    for (const session of paidTopups) {
      const credits = Number.parseInt(session.metadata?.credits || "0", 10);
      if (!Number.isFinite(credits) || credits <= 0) continue;

      const referenceId = `stripe_checkout:${session.id}`;
      const { data: existing } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("reference_id", referenceId)
        .maybeSingle();

      if (existing) continue;

      const { data: newBalance, error: creditError } = await supabase.rpc("apply_credit_transaction", {
        p_user_id: user.id,
        p_amount: credits,
        p_type: "stripe_topup",
        p_reference_id: referenceId,
        p_metadata: {
          recovered: true,
          stripe_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          package_id: session.metadata?.package_id || null,
        },
      });

      if (creditError) throw creditError;
      balance = Number(newBalance);
      recovered += credits;
    }

    return json({ ok: true, recovered, balance });
  } catch (error) {
    console.error("sync-credit-topups failed", error);
    return json({ error: error instanceof Error ? error.message : "Top-up sync failed" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
