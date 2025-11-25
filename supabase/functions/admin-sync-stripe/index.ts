import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const syncResults = {
      synced: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Get all profiles with Stripe customer IDs
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, stripe_customer_id, subscription_status")
      .not("stripe_customer_id", "is", null);

    if (profilesError) throw profilesError;

    for (const profile of profiles || []) {
      try {
        // Fetch subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          limit: 10,
        });

        if (subscriptions.data.length > 0) {
          const activeSub = subscriptions.data.find((s: any) => s.status === "active");

          if (activeSub) {
            // Update local subscription table
            const { error: subError } = await supabaseClient.from("subscriptions").upsert({
              user_id: profile.id,
              stripe_customer_id: profile.stripe_customer_id,
              stripe_subscription_id: activeSub.id,
              status: activeSub.status,
              plan_id: activeSub.items.data[0]?.price.id || null,
              current_period_start: new Date(activeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(activeSub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: activeSub.cancel_at_period_end,
            });

            if (subError) throw subError;

            // Update profile status if needed
            if (profile.subscription_status !== "active") {
              const { error: profileError } = await supabaseClient
                .from("profiles")
                .update({ subscription_status: "active" })
                .eq("id", profile.id);

              if (!profileError) syncResults.updated++;
            }

            syncResults.synced++;

            // Log the sync
            await supabaseClient.from("system_logs").insert({
              type: "info",
              function_name: "admin-sync-stripe",
              message: `Synced Stripe subscription for user ${profile.id}`,
              metadata: { user_id: profile.id, subscription_id: activeSub.id },
            });
          }
        }
      } catch (error: any) {
        console.error(`Error syncing user ${profile.id}:`, error);
        syncResults.errors.push(`${profile.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        syncResults,
        message: `Synced ${syncResults.synced} subscriptions, updated ${syncResults.updated} profiles`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error in admin-sync-stripe:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
