import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const AI_IMAGES_APP_URL = "https://newai.sale"; // Base URL for AI Images app
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-OAUTH] ${step}`, details ? JSON.stringify(details) : "");
};

async function validateHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, signature, ...rest } = params;
  const hmacToValidate = hmac || signature;
  if (!hmacToValidate) return false;

  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(sortedParams));
  const computedHmac = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHmac === hmacToValidate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const hmac = url.searchParams.get("hmac");
    const hostFromQuery = url.searchParams.get("host");

    log("OAuth callback received", { shop, hasCode: !!code, hasState: !!state, hostFromQuery });

    if (!shop || !code || !state) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const apiKey = Deno.env.get("AI_IMAGES_SHOPIFY_API_KEY");
    const apiSecret = Deno.env.get("AI_IMAGES_SHOPIFY_API_SECRET");

    if (!apiKey || !apiSecret) {
      log("ERROR: Missing API credentials");
      return new Response("Server configuration error", { status: 500 });
    }

    // Validate HMAC
    if (hmac) {
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const isValid = await validateHmac(params, apiSecret);
      if (!isValid) {
        log("HMAC validation failed");
        return new Response("Invalid HMAC signature", { status: 401 });
      }
      log("HMAC validation passed");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify state token from oauth_states table (with app_id check)
    const { data: oauthState, error: stateError } = await supabase
      .from("oauth_states")
      .select("user_id, expires_at, shop_name, is_pre_auth, host, app_id")
      .eq("state_token", state)
      .single();

    if (stateError || !oauthState) {
      log("Invalid state token", { error: stateError });
      
      // Fallback: check shopify_pending_connections (old method)
      const { data: pendingConnection, error: pendingError } = await supabase
        .from("shopify_pending_connections")
        .select("*")
        .eq("pending_token", state)
        .single();

      if (pendingError || !pendingConnection) {
        log("State token not found in any table");
        return new Response("Invalid or expired state token", { status: 400 });
      }

      log("Found state in pending_connections (legacy flow)");
    }

    // Check expiration
    if (oauthState && new Date(oauthState.expires_at) < new Date()) {
      log("State token expired");
      return new Response("State token expired", { status: 400 });
    }

    // Use host from query or stored state
    const host = hostFromQuery || oauthState?.host;
    
    log("State token verified", { shop: oauthState?.shop_name || shop, host });

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log("Token exchange failed", { status: tokenResponse.status, error: errorText });
      return new Response("Failed to exchange code for token", { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const scope = tokenData.scope;

    log("Access token obtained", { scope });

    // Get shop info using 2025-01 API version
    const shopResponse = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    let shopName = shop;
    let shopEmail = null;
    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      shopName = shopData.shop?.name || shop;
      shopEmail = shopData.shop?.email;
      log("Shop info retrieved", { shopName, shopEmail });
    }

    // Create a user profile for AI Images app if needed
    // For now, we use shop_domain as the primary identifier
    
    // Store connection in ai_images_shopify_connections
    const { data: existingConnection } = await supabase
      .from("ai_images_shopify_connections")
      .select("id, user_id")
      .eq("shop_domain", shop)
      .single();

    let userId = existingConnection?.user_id;
    
    // If no existing connection, we need to handle user creation
    // For embedded apps, the user might not have a Supabase account yet
    if (!userId) {
      // Check if there's a matching profile by email
      if (shopEmail) {
        const { data: profileByEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", shopEmail)
          .single();
        
        if (profileByEmail) {
          userId = profileByEmail.id;
          log("Found existing profile by email", { userId });
        }
      }
    }

    // Upsert the connection
    const connectionData: Record<string, unknown> = {
      shop_domain: shop,
      shop_name: shopName,
      access_token: accessToken,
      scope: scope,
      is_active: true,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    if (userId) {
      connectionData.user_id = userId;
    }

    const { error: upsertError } = await supabase
      .from("ai_images_shopify_connections")
      .upsert(connectionData, { onConflict: "shop_domain" });

    if (upsertError) {
      log("Error storing connection", { error: upsertError });
    } else {
      log("Connection stored successfully");
    }

    // If user exists, update their profile
    if (userId) {
      await supabase
        .from("profiles")
        .update({
          billing_provider: "shopify",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      log("Updated profile billing_provider to shopify", { userId });
    }

    // Clean up oauth_states
    if (oauthState) {
      await supabase.from("oauth_states").delete().eq("state_token", state);
    }

    // Build redirect URL
    const shopSlug = shop.replace('.myshopify.com', '');
    let embeddedUrl: string;
    
    if (host) {
      try {
        // Host is base64 encoded "admin.shopify.com/store/{shop-name}"
        const decodedHost = atob(host);
        embeddedUrl = `https://${decodedHost}/apps/ai-product-shot`;
        log("Using decoded host", { decodedHost, embeddedUrl });
      } catch (e) {
        log("Failed to decode host, using fallback", { error: e });
        embeddedUrl = `https://admin.shopify.com/store/${shopSlug}/apps/ai-product-shot`;
      }
    } else {
      // Fallback: construct from shop domain
      embeddedUrl = `https://admin.shopify.com/store/${shopSlug}/apps/ai-product-shot`;
      log("No host stored, using fallback", { embeddedUrl });
    }
    
    log("Final redirect", { embeddedUrl });
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: embeddedUrl,
      },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
