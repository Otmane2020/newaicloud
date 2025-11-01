import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log("Processing referral reward for user:", user_id);

    // Check if this user was referred
    const { data: referral, error: referralError } = await supabaseClient
      .from("referrals")
      .select("*, referrer_id")
      .eq("referred_user_id", user_id)
      .eq("status", "signed_up")
      .single();

    if (referralError || !referral) {
      console.log("No pending referral found for user:", user_id);
      return new Response(
        JSON.stringify({ success: false, message: "No pending referral" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update referral status to rewarded
    const { error: updateError } = await supabaseClient
      .from("referrals")
      .update({
        status: "rewarded",
        credits_earned: 100,
        activated_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    if (updateError) {
      throw updateError;
    }

    // Award 100 credits to the referrer
    const { error: creditsError } = await supabaseClient
      .from("profiles")
      .update({
        credits: supabaseClient.rpc("increment", { x: 100 }),
      })
      .eq("id", referral.referrer_id);

    if (creditsError) {
      console.error("Error awarding credits:", creditsError);
    }

    console.log("Referral reward processed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Referral reward processed",
        credits_awarded: 100,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in track-referral-reward:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
