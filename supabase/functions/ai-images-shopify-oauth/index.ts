import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    log("OAuth callback received", { shop, hasCode: !!code, hasState: !!state });

    if (!shop || !code || !state) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const apiKey = Deno.env.get("AI_IMAGES_SHOPIFY_API_KEY");
    const apiSecret = Deno.env.get("AI_IMAGES_SHOPIFY_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const appUrl = "https://newai.sale";

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

    // Initialize Supabase
    const supabaseAdmin = createClient(
      supabaseUrl!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify state token
    const { data: pendingConnection, error: stateError } = await supabaseAdmin
      .from("shopify_pending_connections")
      .select("*")
      .eq("pending_token", state)
      .single();

    if (stateError || !pendingConnection) {
      log("Invalid state token", { error: stateError });
      return new Response("Invalid or expired state token", { status: 400 });
    }

    // Check if expired
    if (new Date(pendingConnection.expires_at) < new Date()) {
      log("State token expired");
      return new Response("State token expired", { status: 400 });
    }

    log("State token verified", { shop: pendingConnection.shop_url });

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

    // Get shop info
    const shopResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    let shopName = shop;
    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      shopName = shopData.shop?.name || shop;
      log("Shop info retrieved", { shopName });
    }

    // Mark pending connection as claimed
    await supabaseAdmin
      .from("shopify_pending_connections")
      .update({ is_claimed: true })
      .eq("pending_token", state);

    // Store connection in ai_images_shopify_connections
    const { error: insertError } = await supabaseAdmin
      .from("ai_images_shopify_connections")
      .upsert({
        shop_domain: shop,
        shop_name: shopName,
        access_token: accessToken,
        scope: scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "shop_domain",
      });

    if (insertError) {
      log("Error storing connection", { error: insertError });
    } else {
      log("Connection stored successfully");
    }

    // Get host from pending connection metadata for embedded redirect
    const storedHost = pendingConnection.metadata?.host;
    const shopSlug = shop.replace('.myshopify.com', '');
    
    log("Building redirect URL", { storedHost, shopSlug });
    
    // Construct embedded app URL
    let embeddedUrl: string;
    
    if (storedHost) {
      try {
        // Host is base64 encoded "admin.shopify.com/store/{shop-name}"
        const decodedHost = atob(storedHost);
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
