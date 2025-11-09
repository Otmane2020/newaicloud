import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    // Extraire les paramètres de l'URL
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const hmac = url.searchParams.get("hmac");
    const timestamp = url.searchParams.get("timestamp");
    const host = url.searchParams.get("host");

    // Construire allParams pour la validation HMAC
    const allParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });

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

    // Créer un state token pour l'OAuth
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const stateToken = crypto.randomUUID();
    
    // Sauvegarder le state token en mode pre-auth (expire dans 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    const { error: stateError } = await supabase
      .from("oauth_states")
      .insert({
        state_token: stateToken,
        shop_name: shop,
        user_id: null,
        is_pre_auth: true,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });

    if (stateError) {
      console.error('[SHOPIFY-INSTALL] Error saving state:', stateError);
      throw new Error("Failed to save OAuth state");
    }

    // Scopes requis
    const scopes = [
      "read_analytics",
      "read_assigned_fulfillment_orders", "write_assigned_fulfillment_orders",
      "write_checkout_branding_settings",
      "write_checkouts",
      "write_draft_orders", "read_draft_orders",
      "read_files", "write_files",
      "write_inventory", "read_inventory",
      "write_inventory_shipments", "read_inventory_shipments",
      "write_inventory_shipments_received_items", "read_inventory_shipments_received_items",
      "write_inventory_transfers", "read_inventory_transfers",
      "read_legal_policies", "write_legal_policies",
      "write_locations", "read_locations",
      "read_online_store_pages", "write_online_store_pages",
      "write_order_edits",
      "read_orders", "write_orders",
      "read_privacy_settings", "write_privacy_settings",
      "read_product_feeds", "write_product_feeds",
      "read_product_listings", "write_product_listings",
      "read_products", "write_products",
      "read_publications", "write_publications",
      "read_shipping", "write_shipping",
      "read_content", "write_content",
      "write_theme_code",
      "read_themes", "write_themes",
      "customer_read_orders", "customer_write_orders",
      "unauthenticated_read_product_pickup_locations",
      "unauthenticated_read_product_inventory",
      "unauthenticated_read_product_listings",
      "unauthenticated_read_product_tags",
    ].join(",");

    // Construire l'URL OAuth
    const redirectUri = `${supabaseUrl}/functions/v1/shopify-oauth`;
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${stateToken}`;

    console.log('[SHOPIFY-INSTALL] Redirecting to OAuth:', authUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": authUrl,
      },
    });
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
