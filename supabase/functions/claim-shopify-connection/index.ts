import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[CLAIM-SHOPIFY] 🚀 Function invoked", {
    method: req.method,
    hasAuthHeader: !!req.headers.get("Authorization"),
    timestamp: new Date().toISOString()
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("[CLAIM-SHOPIFY] 🔐 Authorization check", {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + "..." : "none"
    });
    
    if (!authHeader) {
      console.error("[CLAIM-SHOPIFY] ❌ Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[CLAIM-SHOPIFY] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pendingToken } = await req.json();

    console.log("[CLAIM-SHOPIFY] 📦 Request payload", {
      hasPendingToken: !!pendingToken,
      pendingTokenPreview: pendingToken ? pendingToken.substring(0, 10) + "..." : "none",
      userId: user.id,
      userEmail: user.email
    });

    if (!pendingToken) {
      console.error("[CLAIM-SHOPIFY] ❌ Missing pendingToken in request");
      return new Response(
        JSON.stringify({ error: "Missing pendingToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CLAIM-SHOPIFY] 🔗 Starting claim process", {
      userId: user.id,
      userEmail: user.email,
      pendingToken,
      timestamp: new Date().toISOString()
    });

    // Récupérer la connexion en attente
    const { data: pending, error: fetchError } = await supabase
      .from("shopify_pending_connections")
      .select("*")
      .eq("pending_token", pendingToken)
      .eq("is_claimed", false)
      .single();

    if (fetchError || !pending) {
      console.error("[CLAIM-SHOPIFY] ❌ Pending connection not found:", {
        error: fetchError,
        pendingToken
      });
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CLAIM-SHOPIFY] ✅ Found pending connection:", {
      shopUrl: pending.shop_url,
      commercialName: pending.commercial_name,
      expiresAt: pending.expires_at
    });

    // Vérifier l'expiration
    const expiresAt = new Date(pending.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
    
    console.log("[CLAIM-SHOPIFY] ⏰ Token expiration check", {
      expiresAt: pending.expires_at,
      now: now.toISOString(),
      hoursUntilExpiry: hoursUntilExpiry.toFixed(2),
      isExpired: timeUntilExpiry < 0
    });

    if (timeUntilExpiry < 0) {
      console.error("[CLAIM-SHOPIFY] ❌ Token expired:", {
        expiresAt: pending.expires_at,
        now: now.toISOString(),
        expiredSinceHours: Math.abs(hoursUntilExpiry).toFixed(2)
      });
      return new Response(
        JSON.stringify({ 
          error: "Token expired",
          message: "The installation token has expired. Please reinstall the app from your Shopify Partner Dashboard.",
          expiredSince: Math.abs(hoursUntilExpiry).toFixed(2) + " hours ago"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la connexion Shopify pour l'utilisateur
    const { error: insertError } = await supabase
      .from("shopify_connections")
      .upsert({
        user_id: user.id,
        store_url: pending.shop_url,
        store_name: pending.commercial_name,
        access_token: pending.access_token,
        scope: pending.scope,
        connected_at: new Date().toISOString(),
        is_active: true,
        connection_type: "oauth",
      });

    if (insertError) {
      console.error("[CLAIM-SHOPIFY] ❌ Error creating connection:", {
        error: insertError,
        userId: user.id,
        shopUrl: pending.shop_url
      });
      return new Response(
        JSON.stringify({ error: "Failed to create connection", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CLAIM-SHOPIFY] ✅ Connection created in database");

    // Marquer la connexion en attente comme réclamée
    await supabase
      .from("shopify_pending_connections")
      .update({ is_claimed: true })
      .eq("pending_token", pendingToken);

    console.log("[CLAIM-SHOPIFY] ✅ Connection successfully claimed", {
      shopUrl: pending.shop_url,
      userId: user.id
    });

    // 🆕 Déclencher l'import automatique des 10 premiers produits
    console.log("[CLAIM-SHOPIFY] 🚀 Triggering auto-import of first 10 products", {
      shopUrl: pending.shop_url,
      accessToken: pending.access_token ? "***present***" : "missing"
    });

    try {
      const shopName = pending.shop_url.replace('.myshopify.com', '');
      
      // Appeler la fonction import-products de manière asynchrone
      const importResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/import-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopName: shopName,
            autoImport: true,
            maxProducts: 10,
          }),
        }
      );

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        console.error("[CLAIM-SHOPIFY] ❌ Auto-import failed:", errorText);
      } else {
        const importData = await importResponse.json();
        console.log("[CLAIM-SHOPIFY] ✅ Auto-import initiated successfully:", importData);
      }
    } catch (importError) {
      console.error("[CLAIM-SHOPIFY] ⚠️ Error triggering auto-import:", importError);
      // Ne pas faire échouer la connexion si l'import échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        shop: pending.shop_url,
        message: "Shopify connection successfully linked and products are being imported",
        autoImportTriggered: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CLAIM-SHOPIFY] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});