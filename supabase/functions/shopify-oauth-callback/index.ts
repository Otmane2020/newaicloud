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
    const { code, state, shop } = await req.json();

    if (!code || !state || !shop) {
      throw new Error("Missing required parameters");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify state token
    const { data: oauthState, error: stateError } = await supabaseClient
      .from("oauth_states")
      .select("*")
      .eq("state_token", state)
      .single();

    if (stateError || !oauthState) {
      throw new Error("Invalid or expired state token");
    }

    // Check if state is expired
    if (new Date(oauthState.expires_at) < new Date()) {
      throw new Error("State token has expired");
    }

    const apiKey = Deno.env.get("SHOPIFY_API_KEY");
    const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");

    if (!apiKey || !apiSecret) {
      throw new Error("Shopify credentials not configured");
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Save connection to database
    const { data: connection, error: connectionError } = await supabaseClient
      .from("shopify_connections")
      .upsert({
        user_id: oauthState.user_id,
        store_url: shop,
        access_token: accessToken,
        is_active: true,
        connection_type: "oauth",
      }, {
        onConflict: "user_id,store_url",
      })
      .select()
      .single();

    if (connectionError) {
      throw new Error(`Failed to save connection: ${connectionError.message}`);
    }

    // Delete used state token
    await supabaseClient
      .from("oauth_states")
      .delete()
      .eq("state_token", state);

    return new Response(
      JSON.stringify({ 
        success: true,
        connectionId: connection.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
