import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-INSTALL] ${step}`, details ? JSON.stringify(details) : "");
};

/**
 * Validate HMAC sent by Shopify during installation
 */
async function validateHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, ...rest } = params;
  
  if (!hmac) {
    log("HMAC: No HMAC provided");
    return false;
  }

  const sortedParams = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  log("HMAC: Params to verify", { sortedParams: sortedParams.substring(0, 100) });

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
  log("HMAC: Validation result", { isValid });
  
  return isValid;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Request received");

    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const hmac = url.searchParams.get("hmac");
    const timestamp = url.searchParams.get("timestamp");
    const host = url.searchParams.get("host");

    // Build params for HMAC validation
    const allParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });

    log("Parameters", {
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

    // Validate shop domain format
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      log("Invalid shop domain", { shop });
      return new Response("Invalid shop domain", { status: 400 });
    }

    const apiSecret = Deno.env.get("AI_IMAGES_SHOPIFY_API_SECRET");
    const apiKey = Deno.env.get("AI_IMAGES_SHOPIFY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiSecret || !apiKey) {
      log("Missing API credentials");
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      log("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Validate HMAC
    const isValidHmac = await validateHmac(allParams, apiSecret);
    
    if (!isValidHmac) {
      log("Invalid HMAC");
      return new Response(
        JSON.stringify({ error: "Invalid HMAC signature" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Verify timestamp not too old (max 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (now - requestTime > 300) {
      log("Timestamp too old");
      return new Response(
        JSON.stringify({ error: "Request expired" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate state token
    const stateToken = crypto.randomUUID();
    
    // Save state token in oauth_states table (pre-auth mode, expires in 15 minutes)
    // Include host for embedded app redirect after OAuth
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
        host: host || null,
        app_id: "ai-images", // Distinguish from NewAI
      });

    if (stateError) {
      log("Error saving state", { error: stateError });
      return new Response(
        JSON.stringify({ error: "Failed to save OAuth state" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    log("State token saved", { stateToken: stateToken.substring(0, 8) + "..." });

    // Scopes needed for AI Images app (minimal - just products and files for image generation)
    const scopes = [
      "read_products",
      "write_products",
      "read_files",
      "write_files",
    ].join(",");

    // Build OAuth URL - redirect to ai-images-shopify-oauth
    const redirectUri = `${supabaseUrl}/functions/v1/ai-images-shopify-oauth`;
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${stateToken}`;

    log("Redirecting to OAuth", { authUrl });

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": authUrl,
      },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
