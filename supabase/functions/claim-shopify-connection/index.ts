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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[CLAIM-SHOPIFY] ❌ Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("[CLAIM-SHOPIFY] ❌ Invalid JSON body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pendingToken } = requestBody;

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

    if (fetchError) {
      console.error("[CLAIM-SHOPIFY] ❌ Database error:", {
        error: fetchError,
        code: fetchError.code,
        details: fetchError.details
      });
      
      // Erreur PGRST116 = pas de résultat trouvé
      if (fetchError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ 
            error: "Invalid or expired token",
            message: "This installation link is invalid or has already been used."
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Database error", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pending) {
      console.error("[CLAIM-SHOPIFY] ❌ Pending connection not found");
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired token",
          message: "This installation link is invalid or has already been used."
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  console.log("[CLAIM-SHOPIFY] ✅ Found pending connection:", {
    shopUrl: pending.shop_url,
    commercialName: pending.commercial_name,
    expiresAt: pending.expires_at
  });

  // ❗ Vérifier l'existence et la validité du shop_url
  if (!pending.shop_url || !pending.shop_url.endsWith(".myshopify.com")) {
    console.error("[CLAIM-SHOPIFY] ❌ Invalid Shopify shop_url:", pending.shop_url);

    return new Response(
      JSON.stringify({
        error: "invalid_shop_url",
        message: "L'URL de la boutique est invalide. Vérifiez que vous utilisez bien une URL du type : nom-boutique.myshopify.com",
        shop_url: pending.shop_url
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

    // Vérifier si l'utilisateur a déjà une connexion pour cette boutique
    const { data: existingConnection } = await supabase
      .from("shopify_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("store_url", pending.shop_url)
      .single();

    if (existingConnection) {
      console.log("[CLAIM-SHOPIFY] ⚠️ Connection already exists, updating...");
      
    const { error: updateError } = await supabase
      .from("shopify_connections")
      .update({
        access_token: pending.access_token,
        connected_at: new Date().toISOString(),
        is_active: true,
        connection_type: "oauth"
      })
      .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[CLAIM-SHOPIFY] ❌ Error updating connection:", updateError);
        return new Response(
          JSON.stringify({ 
            error: "database_update_failed",
            message: "Impossible de mettre à jour votre connexion Shopify existante.",
            details: updateError.message,
            shop_url: pending.shop_url
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("[CLAIM-SHOPIFY] ➕ Creating new connection...");
    const { error: insertError } = await supabase
      .from("shopify_connections")
      .insert({
        user_id: user.id,
        store_url: pending.shop_url,
        store_name: pending.commercial_name,
        access_token: pending.access_token,
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
        
        // Vérifier si c'est une erreur de contrainte unique
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ 
              error: "connection_already_exists",
              message: "Cette boutique est déjà connectée à votre compte.",
              shop_url: pending.shop_url
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: "database_insert_failed",
            message: "Impossible de créer votre connexion Shopify.",
            details: insertError.message,
            shop_url: pending.shop_url
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[CLAIM-SHOPIFY] ✅ Connection created in database");

    // Marquer la connexion en attente comme réclamée
    const { error: updatePendingError } = await supabase
      .from("shopify_pending_connections")
      .update({ 
        is_claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by: user.id
      })
      .eq("pending_token", pendingToken);

    if (updatePendingError) {
      console.error("[CLAIM-SHOPIFY] ⚠️ Error updating pending connection:", updatePendingError);
      // Ne pas faire échouer la requête principale
    }

    console.log("[CLAIM-SHOPIFY] ✅ Connection successfully claimed", {
      shopUrl: pending.shop_url,
      userId: user.id
    });

    // 🆕 Déclencher la synchronisation automatique complète via trigger-auto-sync
    console.log("[CLAIM-SHOPIFY] 🚀 Triggering automatic sync for user", {
      userId: user.id,
      shopUrl: pending.shop_url
    });

    try {
      // Appeler trigger-auto-sync qui gère toute la logique d'import
      const functionUrl = `${supabaseUrl}/functions/v1/trigger-auto-sync`;
      const syncResponse = await fetch(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
          }),
        }
      );

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        console.error("[CLAIM-SHOPIFY] ❌ Auto-sync trigger failed:", errorText);
      } else {
        const syncData = await syncResponse.json();
        console.log("[CLAIM-SHOPIFY] ✅ Auto-sync triggered successfully:", syncData);
      }
    } catch (syncError) {
      console.error("[CLAIM-SHOPIFY] ⚠️ Error triggering auto-sync:", syncError);
      // Ne pas faire échouer la connexion si la sync échoue
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