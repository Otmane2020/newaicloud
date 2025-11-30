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

// 🔐 Fonction pour créer les webhooks GDPR obligatoires (conformité Shopify 2025)
async function createGDPRWebhooks(shop: string, accessToken: string): Promise<void> {
  // ✅ Construct base URL - use direct Supabase URL format
  const supabaseProjectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const GDPR_WEBHOOK_URL = supabaseProjectId 
    ? `https://${supabaseProjectId}.supabase.co/functions/v1/shopify-gdpr-webhook`
    : `${SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')}/functions/v1/shopify-gdpr-webhook`;
  
  console.log("[SHOPIFY-OAUTH] 🔐 GDPR Webhook URL:", GDPR_WEBHOOK_URL);
  
  const gdprTopics = [
    "customers/data_request",
    "customers/redact", 
    "shop/redact"
  ];
  
  console.log("[SHOPIFY-OAUTH] 🔐 Création des webhooks GDPR obligatoires...");
  
  // First, list existing webhooks to check what we have
  try {
    const listResponse = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });
    
    if (listResponse.ok) {
      const existingWebhooks = await listResponse.json();
      const existingTopics = (existingWebhooks.webhooks || []).map((w: any) => w.topic);
      console.log("[SHOPIFY-OAUTH] 📋 Existing webhooks:", existingTopics);
      
      // Only create webhooks that don't exist
      for (const topic of gdprTopics) {
        if (existingTopics.includes(topic)) {
          console.log(`[SHOPIFY-OAUTH] ℹ️ Webhook GDPR déjà existant: ${topic}`);
          continue;
        }
        
        await createSingleWebhook(shop, accessToken, topic, GDPR_WEBHOOK_URL);
      }
    } else {
      // If we can't list, try to create all
      for (const topic of gdprTopics) {
        await createSingleWebhook(shop, accessToken, topic, GDPR_WEBHOOK_URL);
      }
    }
  } catch (err) {
    console.error("[SHOPIFY-OAUTH] ❌ Error listing webhooks:", err);
    // Fallback: try to create all
    for (const topic of gdprTopics) {
      await createSingleWebhook(shop, accessToken, topic, GDPR_WEBHOOK_URL);
    }
  }
  
  console.log("[SHOPIFY-OAUTH] 🔐 Webhooks GDPR traités");
}

async function createSingleWebhook(shop: string, accessToken: string, topic: string, address: string): Promise<void> {
  try {
    const response = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic: topic,
          address: address,
          format: "json"
        }
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[SHOPIFY-OAUTH] ✅ Webhook GDPR créé: ${topic}, id: ${data.webhook?.id}`);
    } else {
      const errorText = await response.text();
      // Ignorer l'erreur si le webhook existe déjà (code 422)
      if (response.status === 422 && (errorText.includes("already exists") || errorText.includes("already_exists"))) {
        console.log(`[SHOPIFY-OAUTH] ℹ️ Webhook GDPR déjà existant: ${topic}`);
      } else {
        console.error(`[SHOPIFY-OAUTH] ⚠️ Erreur création webhook ${topic}: ${response.status}`, errorText);
      }
    }
  } catch (err) {
    console.error(`[SHOPIFY-OAUTH] ❌ Exception webhook ${topic}:`, err);
  }
}

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

      // Vérifier si c'est un flow avec user (ancien flow) ou sans user (nouveau flow pre-auth)
      const { data: oauthState, error: stateError } = await supabase
        .from("oauth_states")
        .select("user_id, expires_at, shop_name, is_pre_auth")
        .eq("state_token", state)
        .single();

      if (stateError || !oauthState) {
        console.error("[SHOPIFY-OAUTH] State token invalide:", stateError);
        const errorUrl = `${APP_URL}/shopify/success?shop=${encodeURIComponent(shop)}&status=error&reason=invalid_flow`;
        return new Response(null, { 
          status: 302, 
          headers: { Location: errorUrl, ...corsHeaders } 
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

      // 🔐 Créer les webhooks GDPR obligatoires (conformité Shopify 2025)
      await createGDPRWebhooks(shop, accessToken);

      // 🔍 Fetch real commercial name from Shopify API
      let realCommercialName = shop;
      try {
        const shopInfoResponse = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
          headers: { 'X-Shopify-Access-Token': accessToken }
        });
        if (shopInfoResponse.ok) {
          const shopInfo = await shopInfoResponse.json();
          realCommercialName = shopInfo?.shop?.name || shop;
          console.log('[SHOPIFY-OAUTH] ✅ Real commercial name fetched:', realCommercialName);
        } else {
          console.warn('[SHOPIFY-OAUTH] ⚠️ Could not fetch shop info, using shop URL as fallback');
        }
      } catch (err) {
        console.warn('[SHOPIFY-OAUTH] ⚠️ Error fetching shop info:', err);
      }

      // 🆕 NOUVEAU FLOW PRE-AUTH : stocker dans pending_connections
      if (oauthState.is_pre_auth) {
        console.log("[SHOPIFY-OAUTH] Flow pre-auth détecté, création pending connection");
        
        // Valider le shop_url AVANT insertion
        if (!shop || !shop.endsWith(".myshopify.com")) {
          console.error("[SHOPIFY-OAUTH] ❌ Invalid shop URL received:", shop);
          return new Response(
            JSON.stringify({ 
              error: "invalid_shop_url",
              message: "L'URL de la boutique Shopify reçue est invalide." 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const pendingToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours (Solution 3)

        const { error: insertError } = await supabase.from("shopify_pending_connections").insert({
          shop_url: shop,
          access_token: accessToken,
          scope: tokenData.scope,
          commercial_name: realCommercialName,
          pending_token: pendingToken,
          expires_at: expiresAt.toISOString(),
          is_claimed: false,
        });

        if (insertError) {
          console.error("[SHOPIFY-OAUTH] ❌ Failed to create pending connection:", insertError);
          return new Response(
            JSON.stringify({ 
              error: "database_error",
              message: "Impossible d'enregistrer la connexion en attente." 
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Nettoyer le state token
        await supabase.from("oauth_states").delete().eq("state_token", state);

        // ✅ NON-EMBEDDED APP: Rediriger vers l'app externe
        const redirectUrl = `${APP_URL}/app?shop=${shop}&pending_token=${pendingToken}`;
        
        console.log(JSON.stringify({
          event: 'oauth_callback_success',
          flow: 'pre-auth',
          shop: shop,
          redirect: redirectUrl,
          expires_in_days: 7,
          timestamp: new Date().toISOString()
        }));
        
        return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });
      }

      // ANCIEN FLOW : avec user_id (connexion depuis dashboard)
      console.log("[SHOPIFY-OAUTH] Flow classique avec user_id:", oauthState.user_id);

      try {
        await supabase.from("shopify_connections").upsert({
          user_id: oauthState.user_id,
          store_url: shop,
          store_name: realCommercialName,
          access_token: accessToken,
          connected_at: new Date().toISOString(),
          is_active: true,
          connection_type: "oauth",
        });
        
        console.log(JSON.stringify({
          event: 'oauth_callback_success',
          flow: 'classic',
          shop: shop,
          user_id: oauthState.user_id,
          timestamp: new Date().toISOString()
        }));

        await supabase.from("oauth_states").delete().eq("state_token", state);
      } catch (dbErr) {
        console.error("⚠️ Erreur Supabase save:", dbErr);
        const errorMessage = dbErr instanceof Error ? dbErr.message : "Unknown database error";
        return new Response(JSON.stringify({ error: "Database error", details: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ NON-EMBEDDED APP: Rediriger vers l'app externe
      const redirectUrl = `${APP_URL}/dashboard?shop=${shop}`;
      return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });
    }

    // 🟠 2️⃣ INITIATION OAUTH
    if (req.method === "POST") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const body = await req.json();
      const { shopName, commercialName, preAuth } = body;

      if (!shopName) {
        return new Response(JSON.stringify({ error: "Missing shopName" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let userId = null;

      // Si pas en mode pre-auth, vérifier l'authentification
      if (!preAuth) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized - Missing Authorization header" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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

        userId = user.id;
      }

      const stateToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from("oauth_states").insert({
        state_token: stateToken,
        user_id: userId,
        shop_name: commercialName || shopName,
        expires_at: expiresAt.toISOString(),
        is_pre_auth: preAuth === true,
      });

      const redirectUri = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/shopify-oauth`;
      const cleanShop = shopName.replace(".myshopify.com", "");

      const authUrl =
        `https://${cleanShop}.myshopify.com/admin/oauth/authorize?` +
        `client_id=${SHOPIFY_API_KEY}` +
        `&scope=${encodeURIComponent(SCOPES.join(","))}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${stateToken}`;

      console.log("[SHOPIFY-OAUTH] OAuth URL générée (preAuth:", preAuth, "):", authUrl);

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