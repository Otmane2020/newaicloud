import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Valide le HMAC envoyé par Shopify lors de l'installation
 */
async function validateHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, ...rest } = params;
  
  if (!hmac) {
    console.error('[HMAC] No HMAC provided');
    return false;
  }

  // Créer la chaîne de requête sans le HMAC
  const sortedParams = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  console.log('[HMAC] Params to verify:', sortedParams);

  // Calculer le HMAC avec Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(sortedParams);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = hash === hmac;
  console.log('[HMAC] Validation result:', isValid);
  
  return isValid;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SHOPIFY-INSTALL] Request received');

    const { hmac, host, shop, timestamp, allParams } = await req.json();

    console.log('[SHOPIFY-INSTALL] Parameters:', {
      hasHmac: !!hmac,
      hasHost: !!host,
      hasShop: !!shop,
      hasTimestamp: !!timestamp,
      shop,
    });

    if (!shop || !hmac || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");
    const apiKey = Deno.env.get("SHOPIFY_API_KEY");

    if (!apiSecret || !apiKey) {
      console.error('[SHOPIFY-INSTALL] Missing API credentials');
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Valider le HMAC
    const isValidHmac = await validateHmac(allParams, apiSecret);
    
    if (!isValidHmac) {
      console.error('[SHOPIFY-INSTALL] Invalid HMAC');
      return new Response(
        JSON.stringify({ error: "Invalid HMAC signature" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Vérifier que le timestamp n'est pas trop vieux (max 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (now - requestTime > 300) {
      console.error('[SHOPIFY-INSTALL] Timestamp too old');
      return new Response(
        JSON.stringify({ error: "Request expired" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Créer un state token pour la session OAuth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stateToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Stocker le state (sans user_id car c'est une installation publique)
    const { error: stateError } = await supabaseClient
      .from("oauth_states")
      .insert({
        state_token: stateToken,
        user_id: null, // Pas d'utilisateur à ce stade
        shop_name: shop.replace('.myshopify.com', ''),
        expires_at: expiresAt.toISOString(),
      });

    if (stateError) {
      console.error('[SHOPIFY-INSTALL] Failed to create state:', stateError);
      return new Response(
        JSON.stringify({ error: "Failed to initialize OAuth" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Construire l'URL OAuth avec tous les scopes requis
    const scopes = [
      "write_checkout_branding_settings",
      "write_checkouts",
      "read_files",
      "write_files",
      "write_inventory",
      "read_inventory",
      "write_inventory_shipments",
      "read_inventory_shipments",
      "write_inventory_shipments_received_items",
      "read_inventory_shipments_received_items",
      "write_inventory_transfers",
      "read_inventory_transfers",
      "read_online_store_pages",
      "write_online_store_pages",
      "read_product_feeds",
      "write_product_feeds",
      "read_product_listings",
      "write_product_listings",
      "read_products",
      "write_products",
      "read_shipping",
      "write_shipping",
      "unauthenticated_read_product_pickup_locations",
      "unauthenticated_read_product_inventory",
      "unauthenticated_read_product_listings",
      "unauthenticated_read_product_tags",
      "read_orders",
      "read_content",
      "write_content"
    ];

    const redirectUri = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth`;
    const cleanShopName = shop.replace('.myshopify.com', '');

    const authUrl = `https://${cleanShopName}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${encodeURIComponent(scopes.join(','))}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${stateToken}`;

    console.log('[SHOPIFY-INSTALL] OAuth URL generated successfully');

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
    console.error("[SHOPIFY-INSTALL] Error:", error);
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
