import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const shop = url.searchParams.get('shop');

    console.log('[SHOPIFY-OAUTH] Request received', {
      hasCode: !!code,
      hasShop: !!shop,
      hasState: !!state,
      method: req.method,
      url: url.toString()
    });

    // 🔄 ACTION 1: OAuth Callback (retour de Shopify)
    // Si code ET shop sont présents = callback OAuth
    if (code && shop) {
      console.log('[SHOPIFY-OAUTH] Handling OAuth callback');

      if (!state) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=missing_state`);
      }

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Vérifier le state token
      const { data: oauthState, error: stateError } = await supabaseClient
        .from("oauth_states")
        .select("*")
        .eq("state_token", state)
        .single();

      if (stateError || !oauthState) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=invalid_state`);
      }

      // Vérifier l'expiration
      if (new Date(oauthState.expires_at) < new Date()) {
        await supabaseClient.from("oauth_states").delete().eq("state_token", state);
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=expired_session`);
      }

      // Échanger le code contre le token
      const apiKey = Deno.env.get("SHOPIFY_API_KEY");
      const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");

      if (!apiKey || !apiSecret) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=config_error`);
      }

      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "NewAi-Sales/1.0",
        },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecret,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=auth_failed`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=no_token`);
      }

      // Vérifier que le token fonctionne
      const shopInfoResponse = await fetch(`https://${shop}/admin/api/2025-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!shopInfoResponse.ok) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=verify_failed`);
      }

      const shopInfo = await shopInfoResponse.json();
      const userId = oauthState.user_id;

      // ✅ 1. FIRST: Check usage limits
      const { data: usageLimits } = await supabaseClient.rpc('check_usage_limits', {
        p_user_id: userId
      });

      if (usageLimits && !usageLimits.can_add_shopify_store) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=store_limit_reached`);
      }

      // ✅ 2. SECOND: Check if this specific store already exists
      const { data: existingConnection } = await supabaseClient
        .from("shopify_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("store_url", shop)
        .single();

      if (existingConnection) {
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=store_already_connected`);
      }

      // Save connection - use commercial name from oauth_state if provided, otherwise try shopInfo
      const { error: connectionError } = await supabaseClient
        .from("shopify_connections")
        .insert({
          user_id: userId,
          store_url: shop,
          store_name: oauthState.shop_name || shopInfo.shop?.name || shop.replace('.myshopify.com', ''),
          access_token: accessToken,
          is_active: true,
          connection_type: "oauth",
          connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        });

      // Nettoyer le state
      await supabaseClient.from("oauth_states").delete().eq("state_token", state);

      if (connectionError) {
        console.error("Database connection error:", connectionError);
        const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
        return Response.redirect(`${appUrl}/integration?error=connection_failed`);
      }

      // ✅ Increment shopify_stores_count after successful connection
      await supabaseClient.rpc('increment_usage', {
        p_seller_id: userId,
        p_field: 'shopify_stores_count',
        p_increment: 1
      });

      // Redirect to success page
      const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";
      return Response.redirect(`${appUrl}/integration?success=true&shop=${encodeURIComponent(shopInfo.shop?.name || shop)}`);
    }

    // 🚀 ACTION 2: Démarrer l'OAuth (depuis votre app)
    console.log('[SHOPIFY-OAUTH] Handling OAuth initiation');
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[SHOPIFY-OAUTH] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('[SHOPIFY-OAUTH] Invalid token', authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log('[SHOPIFY-OAUTH] User authenticated', { userId: user.id });

    let shopName;
    let commercialName;
    try {
      const body = await req.json();
      shopName = body.shopName;
      commercialName = body.commercialName;
      console.log('[SHOPIFY-OAUTH] Request body parsed', { shopName, commercialName });
    } catch (e) {
      console.error('[SHOPIFY-OAUTH] Failed to parse request body', e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!shopName) {
      return new Response(
        JSON.stringify({ error: "Shop name is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const apiKey = Deno.env.get("SHOPIFY_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://newai.sale";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_API_KEY not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Générer le state token
    const stateToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Stocker le state avec le nom commercial s'il est fourni
    const { error: stateError } = await supabaseClient
      .from("oauth_states")
      .insert({
        state_token: stateToken,
        user_id: user.id,
        shop_name: commercialName || shopName,
        expires_at: expiresAt.toISOString(),
      });

    if (stateError) {
      return new Response(
        JSON.stringify({ error: `Failed to create OAuth state: ${stateError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Nettoyer le nom de la boutique
    const cleanShopName = shopName.replace(".myshopify.com", "");

    // Construire l'URL OAuth
    const scopes = "write_checkout_branding_settings,write_checkouts,read_files,write_files,write_inventory,read_inventory,write_inventory_shipments,read_inventory_shipments,write_inventory_shipments_received_items,read_inventory_shipments_received_items,write_inventory_transfers,read_inventory_transfers,read_online_store_pages,write_online_store_pages,read_product_feeds,write_product_feeds,read_product_listings,write_product_listings,read_products,write_products,read_shipping,write_shipping,unauthenticated_read_product_pickup_locations,unauthenticated_read_product_inventory,unauthenticated_read_product_listings,unauthenticated_read_product_tags,read_orders,read_content,write_content";
    const redirectUri = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth`;

    const authUrl = `https://${cleanShopName}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${stateToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        authUrl,
        state: stateToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Shopify OAuth error:", error);
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
