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
    const { user_id, invoice_id, amount, currency, reason } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log("[PAYMENT-FAILED] Processing payment failure notification for user:", user_id);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, current_plan_id")
      .eq("id", user_id)
      .single();

    if (profileError) throw profileError;

    // Send notification
    const { error: notifError } = await supabaseClient.functions.invoke("send-notification", {
      body: {
        user_id,
        template_code: "payment_failed",
        metadata: {
          invoice_id,
          amount,
          currency: currency || "EUR",
          reason: reason || "Carte refusée",
          plan_name: profile.current_plan_id,
        },
        send_email: true,
        send_browser: true,
        priority: "urgent",
      },
    });

    if (notifError) throw notifError;

    console.log("[PAYMENT-FAILED] Notification sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment failed notification sent",
        user_email: profile.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[PAYMENT-FAILED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
