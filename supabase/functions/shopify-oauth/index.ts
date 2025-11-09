import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const APP_URL = Deno.env.get("APP_URL") || "https://newai.sale";
const SHOPIFY_API_KEY = Deno.env.get("SHOPIFY_API_KEY")!;
const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 🔐 Liste complète de scopes Shopify
const SCOPES = [
  "read_analytics",
  "read_assigned_fulfillment_orders",
  "write_assigned_fulfillment_orders",
  "write_checkout_branding_settings",
  "write_checkouts",
  "write_draft_orders",
  "read_draft_orders",
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
  "read_legal_policies",
  "write_legal_policies",
  "write_locations",
  "read_locations",
  "read_online_store_pages",
  "write_online_store_pages",
  "write_order_edits",
  "read_orders",
  "write_orders",
  "read_privacy_settings",
  "write_privacy_settings",
  "read_product_feeds",
  "write_product_feeds",
  "read_product_listings",
  "write_product_listings",
  "read_products",
  "write_products",
  "read_publications",
  "write_publications",
  "read_shipping",
  "write_shipping",
  "read_content",
  "write_content",
  "write_theme_code",
  "read_themes",
  "write_themes",
  "customer_read_orders",
  "customer_write_orders",
  "unauthenticated_read_product_pickup_locations",
  "unauthenticated_read_product_inventory",
  "unauthenticated_read_product_listings",
  "unauthenticated_read_product_tags",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop");
    const state = url.searchParams.get("state");

    // 🟢 1️⃣ CALLBACK PUBLIC – Shopify redirige ici après installation
    if (req.method === "GET" && code && shop && state) {
      console.log("[SHOPIFY-OAUTH] Callback public reçu de Shopify", { shop, state });

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Récupérer le user_id depuis oauth_states
      const { data: oauthState, error: stateError } = await supabase
        .from("oauth_states")
        .select("user_id, expires_at, shop_name")
        .eq("state_token", state)
        .single();

      if (stateError || !oauthState) {
        console.error("[SHOPIFY-OAUTH] State token invalide:", stateError);
        return new Response(JSON.stringify({ error: "Invalid state token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier que le state n'a pas expiré
      if (new Date(oauthState.expires_at) < new Date()) {
        console.error("[SHOPIFY-OAUTH] State token expiré");
        return new Response(JSON.stringify({ error: "State token expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[SHOPIFY-OAUTH] State validé pour user_id:", oauthState.user_id);

      // Échanger le code contre le token
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error("❌ Token exchange failed:", err);
        return new Response(JSON.stringify({ error: "Token request failed", details: err }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Sauvegarde du token dans Supabase avec user_id
      try {
        await supabase.from("shopify_connections").upsert({
          user_id: oauthState.user_id,
          store_url: shop,
          commercial_name: oauthState.shop_name,
          access_token: accessToken,
          scope: tokenData.scope,
          connected_at: new Date().toISOString(),
          is_active: true,
          connection_type: "oauth",
        });
        console.log("✅ Token enregistré pour", shop, "user:", oauthState.user_id);

        // Nettoyer le state token après utilisation
        await supabase.from("oauth_states").delete().eq("state_token", state);
        console.log("✅ State token nettoyé");
      } catch (dbErr) {
        console.error("⚠️ Erreur Supabase save:", dbErr);
        const errorMessage = dbErr instanceof Error ? dbErr.message : "Unknown database error";
        return new Response(JSON.stringify({ error: "Database error", details: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Redirection vers le front après succès
      const redirectUrl = `${APP_URL}/shopify/success?shop=${encodeURIComponent(shop)}&status=success`;
      return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });
    }

    // 🟠 2️⃣ INITIATION OAUTH (POST) – depuis ton app (auth requise)
    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized - Missing Authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("[SHOPIFY-OAUTH] Invalid token", authError);
        return new Response(JSON.stringify({ error: "Invalid Supabase token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { shopName, commercialName } = await req.json();
      if (!shopName) {
        return new Response(JSON.stringify({ error: "Missing shopName" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stateToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from("oauth_states").insert({
        state_token: stateToken,
        user_id: user.id,
        shop_name: commercialName || shopName,
        expires_at: expiresAt.toISOString(),
      });

      const redirectUri = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth`;
      const cleanShop = shopName.replace(".myshopify.com", "");

      const authUrl =
        `https://${cleanShop}.myshopify.com/admin/oauth/authorize?` +
        `client_id=${SHOPIFY_API_KEY}` +
        `&scope=${encodeURIComponent(SCOPES.join(","))}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${stateToken}`;

      console.log("[SHOPIFY-OAUTH] OAuth URL générée:", authUrl);

      return new Response(JSON.stringify({ success: true, authUrl, state: stateToken }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🚫 3️⃣ Requête invalide
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("💥 [SHOPIFY-OAUTH] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
