import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state, shop } = await req.json();

    // Validation des paramètres requis
    if (!code || !state || !shop) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing required parameters: code, state, and shop are required" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier le state token
    const { data: oauthState, error: stateError } = await supabaseClient
      .from("oauth_states")
      .select("*, users(email)")
      .eq("state_token", state)
      .single();

    if (stateError || !oauthState) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid or expired OAuth session. Please try again." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Vérifier l'expiration
    if (new Date(oauthState.expires_at) < new Date()) {
      // Supprimer le state expiré
      await supabaseClient
        .from("oauth_states")
        .delete()
        .eq("state_token", state);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "OAuth session has expired. Please start over." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const apiKey = Deno.env.get("SHOPIFY_API_KEY");
    const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Shopify credentials not properly configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Échanger le code contre le token d'accès
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NewAi-Sales/1.0"
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Shopify OAuth error:", errorText);
      throw new Error(`Failed to authenticate with Shopify: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from Shopify");
    }

    // Vérifier que le token fonctionne en récupérant les infos de la boutique
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2025-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });

    if (!shopInfoResponse.ok) {
      throw new Error("Failed to verify store access with the obtained token");
    }

    const shopInfo = await shopInfoResponse.json();

    // Sauvegarder la connexion
    const { data: connection, error: connectionError } = await supabaseClient
      .from("shopify_connections")
      .upsert({
        user_id: oauthState.user_id,
        store_url: shop,
        store_name: shopInfo.shop?.name || oauthState.shop_name,
        access_token: accessToken,
        is_active: true,
        connection_type: "oauth",
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,store_url",
      })
      .select()
      .single();

    if (connectionError) {
      console.error("Database connection error:", connectionError);
      throw new Error(`Failed to save connection: ${connectionError.message}`);
    }

    // Nettoyer le state token utilisé
    await supabaseClient
      .from("oauth_states")
      .delete()
      .eq("state_token", state);

    console.log(`Successfully connected shop: ${shop} for user: ${oauthState.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        connectionId: connection.id,
        shop: shop,
        storeName: shopInfo.shop?.name,
        message: "Successfully connected to Shopify store"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message.includes('Failed to authenticate') ? 401 : 500,
      }
    );
  }
});