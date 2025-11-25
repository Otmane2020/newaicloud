import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const repairs = {
      fixedProfiles: 0,
      fixedSubscriptions: 0,
      fixedTrials: 0,
      errors: [] as string[],
    };

    // 1. Fix profiles with missing trial_ends_at
    const { data: trialsWithoutEnd, error: trialError } = await supabaseClient
      .from("profiles")
      .select("id, created_at")
      .eq("subscription_status", "trialing")
      .is("trial_ends_at", null);

    if (!trialError && trialsWithoutEnd) {
      for (const profile of trialsWithoutEnd) {
        const trialEnd = new Date(profile.created_at);
        trialEnd.setDate(trialEnd.getDate() + 7);

        const { error } = await supabaseClient
          .from("profiles")
          .update({ trial_ends_at: trialEnd.toISOString() })
          .eq("id", profile.id);

        if (!error) {
          repairs.fixedTrials++;
          await supabaseClient.from("system_logs").insert({
            type: "info",
            function_name: "admin-repair-profiles",
            message: `Fixed missing trial_ends_at for user ${profile.id}`,
            metadata: { user_id: profile.id },
          });
        } else {
          repairs.errors.push(`Failed to fix trial for ${profile.id}: ${error.message}`);
        }
      }
    }

    // 2. Fix profiles with inactive status but active Stripe subscription
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, stripe_customer_id, subscription_status")
      .neq("subscription_status", "active");

    if (!profilesError && profiles) {
      for (const profile of profiles) {
        if (!profile.stripe_customer_id) continue;

        // Check Stripe for active subscription
        const { data: stripeSubs } = await supabaseClient
          .from("subscriptions")
          .select("status")
          .eq("user_id", profile.id)
          .eq("status", "active")
          .limit(1);

        if (stripeSubs && stripeSubs.length > 0) {
          const { error } = await supabaseClient
            .from("profiles")
            .update({ subscription_status: "active" })
            .eq("id", profile.id);

          if (!error) {
            repairs.fixedProfiles++;
            await supabaseClient.from("system_logs").insert({
              type: "info",
              function_name: "admin-repair-profiles",
              message: `Fixed subscription status for user ${profile.id}`,
              metadata: { user_id: profile.id, old_status: profile.subscription_status },
            });
          }
        }
      }
    }

    // 3. Fix subscriptions without user reference
    const { data: orphanedSubs, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("id, stripe_customer_id")
      .is("user_id", null);

    if (!subError && orphanedSubs) {
      for (const sub of orphanedSubs) {
        // Try to find the user by stripe_customer_id
        const { data: matchingProfile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", sub.stripe_customer_id)
          .limit(1)
          .single();

        if (matchingProfile) {
          const { error } = await supabaseClient
            .from("subscriptions")
            .update({ user_id: matchingProfile.id })
            .eq("id", sub.id);

          if (!error) {
            repairs.fixedSubscriptions++;
            await supabaseClient.from("system_logs").insert({
              type: "info",
              function_name: "admin-repair-profiles",
              message: `Fixed orphaned subscription ${sub.id}`,
              metadata: { subscription_id: sub.id, user_id: matchingProfile.id },
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        repairs,
        message: `Repaired ${repairs.fixedProfiles} profiles, ${repairs.fixedSubscriptions} subscriptions, ${repairs.fixedTrials} trials`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error in admin-repair-profiles:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
