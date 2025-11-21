import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[TRIAL-EXPIRING] Checking for expiring trials...");

    // Get trials expiring in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Get trials expiring in 1 day
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const { data: expiringTrials, error } = await supabaseClient
      .from("profiles")
      .select("id, email, trial_ends_at, current_plan_id")
      .eq("subscription_status", "trialing")
      .not("trial_ends_at", "is", null);

    if (error) throw error;

    console.log(`[TRIAL-EXPIRING] Found ${expiringTrials?.length || 0} active trials`);

    let sent3Days = 0;
    let sent1Day = 0;

    for (const profile of expiringTrials || []) {
      const trialEnd = new Date(profile.trial_ends_at);
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      let templateCode = null;
      
      if (daysLeft === 3) {
        templateCode = "trial_expiring_3days";
        sent3Days++;
      } else if (daysLeft === 1) {
        templateCode = "trial_expiring_1day";
        sent1Day++;
      }

      if (templateCode) {
        // Send notification using the send-notification function
        const { error: notifError } = await supabaseClient.functions.invoke("send-notification", {
          body: {
            user_id: profile.id,
            template_code: templateCode,
            metadata: {
              days_left: daysLeft,
              trial_ends_at: profile.trial_ends_at,
              current_plan: profile.current_plan_id,
            },
            send_email: true,
            send_browser: true,
          },
        });

        if (notifError) {
          console.error(`[TRIAL-EXPIRING] Error sending notification to ${profile.email}:`, notifError);
        } else {
          console.log(`[TRIAL-EXPIRING] Sent ${templateCode} to ${profile.email}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trial expiring notifications sent`,
        details: {
          total_checked: expiringTrials?.length || 0,
          sent_3days: sent3Days,
          sent_1day: sent1Day,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[TRIAL-EXPIRING] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
