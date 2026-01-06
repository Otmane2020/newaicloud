import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const AI_IMAGES_APP_URL = "https://ai-images.newai.sale";
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
    // CRITICAL: Create or find Supabase user
    // ============================================
    let userId: string | null = null;
    let sessionToken: string | null = null;

    // Check existing connection first
    const { data: existingConnection } = await supabase
      .from("ai_images_shopify_connections")
      .select("id, user_id")
      .eq("shop_domain", shop)
      .single();

    if (existingConnection?.user_id) {
      userId = existingConnection.user_id;
      log("Found existing user from connection", { userId });
    }

    // If no user found, try to find by email or create new user
    if (!userId && shopEmail) {
      // Check if user already exists with this email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === shopEmail);

      if (existingUser) {
        userId = existingUser.id;
        log("Found existing Supabase user by email", { userId, email: shopEmail });
      } else {
        // Create new user with Shopify email
        const tempPassword = crypto.randomUUID();
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: shopEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            shop_domain: shop,
            shop_name: shopName,
            source: "ai_images_shopify",
          },
        });

        if (createError) {
          log("Error creating user", { error: createError });
        } else if (newUser?.user) {
          userId = newUser.user.id;
          log("Created new Supabase user", { userId, email: shopEmail });

          // Create profile for the new user
          await supabase.from("profiles").upsert({
            id: userId,
            email: shopEmail,
            full_name: shopName,
            billing_provider: "shopify",
            subscription_status: "trial",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          log("Created user profile", { userId });
        }
      }
    }

    // If still no user (no email from shop), create anonymous-style user
    if (!userId) {
      const anonymousEmail = `${shop.replace('.myshopify.com', '')}@ai-images.shopify.local`;
      const tempPassword = crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: anonymousEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          shop_domain: shop,
          shop_name: shopName,
          source: "ai_images_shopify",
          is_shopify_merchant: true,
        },
      });

      if (!createError && newUser?.user) {
        userId = newUser.user.id;
        log("Created anonymous Supabase user for shop", { userId, email: anonymousEmail });

        // Create profile
        await supabase.from("profiles").upsert({
          id: userId,
          email: anonymousEmail,
          full_name: shopName,
          billing_provider: "shopify",
          subscription_status: "trial",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }
    }

    // ============================================
    // Store connection in ai_images_shopify_connections
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
    
    if (userId) {
      connectionData.user_id = userId;
    }

    const { data: upsertedConnection, error: upsertError } = await supabase
      .from("ai_images_shopify_connections")
      .upsert(connectionData, { onConflict: "shop_domain" })
      .select("id")
      .single();

    if (upsertError) {
      log("Error storing AI Images connection", { error: upsertError });
    } else {
      log("AI Images connection stored successfully", { connectionId: upsertedConnection?.id });
    }

    // ============================================
    // ALSO create entry in shopify_connections for StoreContext compatibility
    // ============================================
    if (userId) {
      const storeUrl = `https://${shop}`;
      
      const { data: existingShopifyConn } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("store_url", storeUrl)
        .single();

      if (!existingShopifyConn) {
        const { data: newShopifyConn, error: shopifyConnError } = await supabase
          .from("shopify_connections")
          .insert({
            user_id: userId,
            store_url: storeUrl,
            store_name: shopName,
            access_token: accessToken,
            is_active: true,
            currency: shopCurrency,
            timezone: shopTimezone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (shopifyConnError) {
          log("Error creating shopify_connections entry", { error: shopifyConnError });
        } else {
          log("Created shopify_connections entry for StoreContext", { storeId: newShopifyConn?.id });
          
          // Trigger initial product sync
          if (newShopifyConn?.id) {
            try {
              const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-images-sync-products`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  shopDomain: shop,
                  storeId: newShopifyConn.id,
                  userId: userId,
                }),
              });
              log("Triggered product sync", { status: syncResponse.status });
            } catch (syncError) {
              log("Error triggering product sync (non-blocking)", { error: syncError });
            }
          }
        }
      } else {
        // Update existing connection
        await supabase
          .from("shopify_connections")
          .update({
            access_token: accessToken,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingShopifyConn.id);
        log("Updated existing shopify_connections entry");
      }
    }

    // ============================================
    // Initialize credits for new user
    // ============================================
    if (userId) {
      const { data: existingCredits } = await supabase
        .from("ai_images_credits")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingCredits) {
        // Give 5 free credits for new users
        await supabase.from("ai_images_credits").insert({
          user_id: userId,
          credits_balance: 5,
          total_credits_purchased: 0,
          total_credits_used: 0,
        });
        log("Initialized 5 free credits for new user", { userId });
      }
    }

    // Clean up oauth_states
    if (oauthState) {
      await supabase.from("oauth_states").delete().eq("state_token", state);
    }

    // ============================================
    // Build redirect URL - Redirect to setup wizard for pricing (like NewAI)
    // ============================================
    const redirectUrl = `${AI_IMAGES_APP_URL}/setup?shop=${encodeURIComponent(shop)}&installed=true`;
    
    log("Final redirect to setup wizard", { redirectUrl });
    
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
