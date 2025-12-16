import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { shopDomain } = await req.json();

    if (!shopDomain) {
      return new Response(
        JSON.stringify({ ready: false, error: "shopDomain required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if shop connection exists and is active with access token
    const { data: connection, error } = await supabase
      .from("shopify_connections")
      .select("id, access_token, is_active")
      .or(`shop_domain.eq.${shopDomain},store_url.eq.${shopDomain}`)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[installation-status] Error:", error);
      return new Response(
        JSON.stringify({ ready: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ready if connection exists with valid access token
    const isReady = !!(connection?.id && connection?.access_token);

    console.log(`[installation-status] Shop ${shopDomain}: ready=${isReady}`);

    return new Response(
      JSON.stringify({ ready: isReady }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[installation-status] Exception:", e);
    return new Response(
      JSON.stringify({ ready: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
