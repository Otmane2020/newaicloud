import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-INSTALL] ${step}`, details ? JSON.stringify(details) : "");
};

async function validateHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, ...rest } = params;
  if (!hmac) return false;

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

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(sortedParams));
  const computedHmac = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHmac === hmac;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shop = url.searchParams.get("shop");
    const hmac = url.searchParams.get("hmac");
    const timestamp = url.searchParams.get("timestamp");
    const host = url.searchParams.get("host");

    log("Install request received", { shop, hasHmac: !!hmac, timestamp });

    if (!shop) {
      return new Response("Missing shop parameter", { status: 400 });
    }

    // Validate shop domain format
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      log("Invalid shop domain", { shop });
      return new Response("Invalid shop domain", { status: 400 });
    }

    const apiKey = Deno.env.get("AI_IMAGES_SHOPIFY_API_KEY");
    const apiSecret = Deno.env.get("AI_IMAGES_SHOPIFY_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!apiKey || !apiSecret) {
      log("ERROR: Missing API credentials");
      return new Response("Server configuration error", { status: 500 });
    }

    // Validate HMAC if provided
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

    // Generate state token
    const stateToken = crypto.randomUUID();

    // Store state in Supabase
    const supabaseAdmin = createClient(
      supabaseUrl!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseAdmin.from("shopify_pending_connections").insert({
      pending_token: stateToken,
      shop_url: shop,
      access_token: "pending", // Placeholder until OAuth completes
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      is_claimed: false,
      metadata: { 
        app_id: "ai-images", 
        host: host || null,
        installed_at: new Date().toISOString()
      }
    });

    if (insertError) {
      log("Error storing pending connection", { error: insertError });
      return new Response("Failed to initiate OAuth", { status: 500 });
    }

    log("State token stored", { stateToken: stateToken.substring(0, 8) + "..." });

    // Scopes needed for AI Images app (minimal)
    const scopes = "read_products,write_products,read_files,write_files";

    // Construct redirect URI
    const redirectUri = `${supabaseUrl}/functions/v1/ai-images-shopify-oauth`;

    // Build authorization URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set("client_id", apiKey);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", stateToken);

    log("Redirecting to Shopify OAuth", { authUrl: authUrl.toString() });

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: authUrl.toString(),
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
