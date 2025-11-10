import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[CLAIM-SHOPIFY] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pendingToken } = await req.json();

    if (!pendingToken) {
      return new Response(
        JSON.stringify({ error: "Missing pendingToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CLAIM-SHOPIFY] Claiming connection for user:", user.id, "with token:", pendingToken);

    // Récupérer la connexion en attente
    const { data: pending, error: fetchError } = await supabase
      .from("shopify_pending_connections")
      .select("*")
      .eq("pending_token", pendingToken)
      .eq("is_claimed", false)
      .single();

    if (fetchError || !pending) {
      console.error("[CLAIM-SHOPIFY] Pending connection not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier l'expiration
    if (new Date(pending.expires_at) < new Date()) {
      console.error("[CLAIM-SHOPIFY] Token expired");
      return new Response(
        JSON.stringify({ error: "Token expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la connexion Shopify pour l'utilisateur
    const { error: insertError } = await supabase
      .from("shopify_connections")
      .upsert({
        user_id: user.id,
        store_url: pending.shop_url,
        shop_domain: pending.shop_url,
        store_name: pending.commercial_name,
        access_token: pending.access_token,
        scope: pending.scope,
        connected_at: new Date().toISOString(),
        is_active: true,
        connection_type: "oauth",
      });

    if (insertError) {
      console.error("[CLAIM-SHOPIFY] Error creating connection:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create connection", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Marquer la connexion en attente comme réclamée
    await supabase
      .from("shopify_pending_connections")
      .update({ is_claimed: true })
      .eq("pending_token", pendingToken);

    console.log("[CLAIM-SHOPIFY] Connection successfully claimed for", pending.shop_url);

    return new Response(
      JSON.stringify({
        success: true,
        shop: pending.shop_url,
        message: "Shopify connection successfully linked to your account",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CLAIM-SHOPIFY] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});