import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const AI_IMAGES_APP_URL = "https://ai-images.newai.sale";
const AI_IMAGES_APP_HANDLE = "ai-product-shot"; // App handle from Shopify Partner Dashboard
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

    // Verify state token from oauth_states table
    const { data: oauthState, error: stateError } = await supabase
      .from("oauth_states")
      .select("user_id, expires_at, shop_name, is_pre_auth, host, app_id")
      .eq("state_token", state)
      .single();

    if (stateError || !oauthState) {
      log("Invalid state token", { error: stateError });
      return new Response("Invalid or expired state token", { status: 400 });
    }

    // Check expiration
    if (new Date(oauthState.expires_at) < new Date()) {
      log("State token expired");
      return new Response("State token expired", { status: 400 });
    }

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
    let shopEmail: string | null = null;
    let shopCurrency = "USD";
    let shopTimezone = "UTC";
    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      shopName = shopData.shop?.name || shop;
      shopEmail = shopData.shop?.email;
      shopCurrency = shopData.shop?.currency || "USD";
      shopTimezone = shopData.shop?.iana_timezone || "UTC";
      log("Shop info retrieved", { shopName, shopEmail, shopCurrency });
    }

    // ============================================
    // CRITICAL: Create pending_token (like NewAI)
    // ============================================
    const pendingToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: insertError } = await supabase.from("shopify_pending_connections").insert({
      shop_url: shop,
      access_token: accessToken,
      scope: scope,
      commercial_name: shopName,
      pending_token: pendingToken,
      expires_at: expiresAt.toISOString(),
      is_claimed: false,
    });

    if (insertError) {
      log("Error creating pending connection", { error: insertError });
      // Continue anyway - we'll try to store in ai_images table
    } else {
      log("Pending connection created", { pendingToken });
    }

    // ============================================
    // Also store in ai_images_shopify_connections (for quick lookup)
    // ============================================
    const connectionData: Record<string, unknown> = {
      shop_domain: shop,
      shop_name: shopName,
      access_token: accessToken,
      scope: scope,
      is_active: true,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("ai_images_shopify_connections")
      .upsert(connectionData, { onConflict: "shop_domain" });

    if (upsertError) {
      log("Error storing AI Images connection", { error: upsertError });
    } else {
      log("AI Images connection stored successfully");
    }

    // Clean up oauth_states
    await supabase.from("oauth_states").delete().eq("state_token", state);

    // ============================================
    // Build redirect URL - STAY IN SHOPIFY ADMIN (embedded app)
    // ============================================
    // Redirect to Shopify Admin ROOT - no sub-routes allowed!
    // Shopify Admin does NOT support sub-routes like /setup or /dashboard
    // Use query params to control routing in the app
    const redirectUrl = `https://${shop}/admin/apps/${AI_IMAGES_APP_HANDLE}?pending_token=${pendingToken}`;
    
    log("Final redirect to Shopify Admin ROOT (embedded)", { redirectUrl, shop });
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
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
