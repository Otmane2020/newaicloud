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
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { shopName } = await req.json();
    if (!shopName) {
      throw new Error("Shop name is required");
    }

    const apiKey = Deno.env.get("SHOPIFY_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "http://localhost:5173";
    
    if (!apiKey) {
      throw new Error("SHOPIFY_API_KEY not configured");
    }

    // Generate random state token
    const stateToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in database
    const { error: stateError } = await supabaseClient
      .from("oauth_states")
      .insert({
        state_token: stateToken,
        user_id: user.id,
        shop_name: shopName,
        expires_at: expiresAt.toISOString(),
      });

    if (stateError) {
      throw new Error(`Failed to create OAuth state: ${stateError.message}`);
    }

    // Clean shop name
    const cleanShopName = shopName.replace(".myshopify.com", "");
    
    // Build OAuth URL
    const scopes = "read_products,write_products,read_orders,read_content,write_content";
    const redirectUri = `${appUrl}/integration?oauth=callback`;
    
    const authUrl = `https://${cleanShopName}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${stateToken}`;

    return new Response(
      JSON.stringify({ 
        authUrl,
        state: stateToken
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("OAuth start error:", error);
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
