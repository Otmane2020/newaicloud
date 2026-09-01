import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Verify if the shop has an active Shopify subscription for our app
 * Returns: { hasSubscription: boolean, apiError: boolean, errorMessage?: string }
 */
async function verifyShopifySubscription(shop: string, accessToken: string): Promise<{ hasSubscription: boolean; apiError: boolean; errorMessage?: string }> {
  try {
    console.log("[VERIFY-SUBSCRIPTION] Checking Shopify subscription for:", shop);
    
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
          }
        }
      }
    `;
    
    const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      // 🔧 FIX: Distinguish API error from "no subscription"
      // Token expired (401/403) or other API error - don't assume no subscription
      const errorStatus = response.status;
      console.error("[VERIFY-SUBSCRIPTION] API error - token may be expired:", errorStatus);
      return { hasSubscription: false, apiError: true, errorMessage: `Shopify API error: ${errorStatus}` };
    }
    
    const data = await response.json();
    const subscriptions = data?.data?.currentAppInstallation?.activeSubscriptions || [];
    
    console.log("[VERIFY-SUBSCRIPTION] Active subscriptions found:", subscriptions.length);
    
    // Check if any subscription is active
    const hasActive = subscriptions.some((sub: any) => 
      sub.status === "ACTIVE" || sub.status === "ACCEPTED"
    );
    
    console.log("[VERIFY-SUBSCRIPTION] Has active subscription:", hasActive);
    return { hasSubscription: hasActive, apiError: false };
  } catch (error) {
    console.error("[VERIFY-SUBSCRIPTION] Error:", error);
    return { hasSubscription: false, apiError: true, errorMessage: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop, pending_token, reauth } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // MODE REAUTH: Réauthentifier un utilisateur existant sans pending_token
    if (reauth && shop) {
      console.log("[SHOPIFY-AUTO-AUTH] Mode REAUTH pour:", shop);
      
      // Trouver la connexion active pour ce shop
      const { data: connection, error: connError } = await supabase
        .from("shopify_connections")
        .select("user_id")
        .eq("store_url", shop)
        .eq("is_active", true)
        .single();
      
      if (connError || !connection) {
        console.error("[SHOPIFY-AUTO-AUTH] No active connection for shop:", shop);
        return new Response(
          JSON.stringify({ error: "No active connection found for this shop" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const userId = connection.user_id;
      const shopHandle = shop.replace(".myshopify.com", "");
      const email = `${shopHandle}@shopify.newai.sale`;
      const password = crypto.randomUUID();
      
      // Mettre à jour le mot de passe pour permettre la connexion
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password
      });
      
      if (updateError) {
        console.error("[SHOPIFY-AUTO-AUTH] Error updating password for reauth:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update credentials" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Créer une session
      const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
      if (!SUPABASE_ANON_KEY) {
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.session) {
        console.error("[SHOPIFY-AUTO-AUTH] Error creating session for reauth:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("[SHOPIFY-AUTO-AUTH] ✅ REAUTH successful for user:", userId);
      
      return new Response(
        JSON.stringify({
          success: true,
          user_id: userId,
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          shop: shop,
          is_returning_user: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE NORMAL: Avec pending_token
    if (!shop || !pending_token) {
      return new Response(
        JSON.stringify({ error: "Missing shop or pending_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SHOPIFY-AUTO-AUTH] Auto-authentication pour:", shop);

    // Helper function for delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. Vérifier que le pending_token est valide - WITH RETRY for replication lag
    let pendingConnection = null;
    let pendingError = null;
    const MAX_TOKEN_RETRIES = 3;
    const TOKEN_RETRY_DELAYS = [500, 1000, 2000]; // Exponential backoff
    
    for (let attempt = 0; attempt < MAX_TOKEN_RETRIES; attempt++) {
      // Small delay before first attempt to allow replication
      if (attempt === 0) {
        await delay(300);
      }
      
      console.log(`[SHOPIFY-AUTO-AUTH] Token lookup attempt ${attempt + 1}/${MAX_TOKEN_RETRIES}`);
      
      const { data, error } = await supabase
        .from("shopify_pending_connections")
        .select("*")
        .eq("pending_token", pending_token)
        .eq("shop_url", shop)
        .eq("is_claimed", false)
        .maybeSingle();
      
      if (data) {
        pendingConnection = data;
        pendingError = null;
        console.log(`[SHOPIFY-AUTO-AUTH] ✅ Token found on attempt ${attempt + 1}`);
        break;
      }
      
      pendingError = error;
      
      // If not last attempt, wait before retry
      if (attempt < MAX_TOKEN_RETRIES - 1) {
        const delayMs = TOKEN_RETRY_DELAYS[attempt] || 2000;
        console.log(`[SHOPIFY-AUTO-AUTH] Token not found, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }

    if (!pendingConnection) {
      console.error("[SHOPIFY-AUTO-AUTH] Token invalide après tous les retries:", pendingError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired pending token", details: "Token not found after retries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier expiration
    if (new Date(pendingConnection.expires_at) < new Date()) {
      console.error("[SHOPIFY-AUTO-AUTH] Token expiré");
      return new Response(
        JSON.stringify({ error: "Token has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Créer l'email unique basé sur le shop handle
    const shopHandle = shop.replace(".myshopify.com", "");
    const email = `${shopHandle}@shopify.newai.sale`;
    const password = crypto.randomUUID(); // Mot de passe aléatoire (ne sera jamais utilisé)

    console.log("[SHOPIFY-AUTO-AUTH] Email généré:", email);

    // 3. Vérifier si l'utilisateur existe déjà via RPC (plus fiable que listUsers qui pagine)
    const { data: emailExists, error: rpcError } = await supabase.rpc('check_user_email_exists', { p_email: email });
    
    if (rpcError) {
      console.error("[SHOPIFY-AUTO-AUTH] Erreur RPC check_user_email_exists:", rpcError);
    }

    let userId: string;
    let existingUser = null;

    if (emailExists) {
      // Récupérer l'utilisateur existant via listUsers filtré par email
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      
      // Chercher l'utilisateur par email dans tous les résultats
      const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const foundUser = allUsers?.users.find(u => u.email === email);
      
      if (!foundUser) {
        console.error("[SHOPIFY-AUTO-AUTH] Utilisateur existe dans RPC mais introuvable dans listUsers");
        return new Response(
          JSON.stringify({ error: "User exists but could not be retrieved" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      existingUser = foundUser;
      userId = existingUser.id;
      console.log("[SHOPIFY-AUTO-AUTH] Utilisateur existant trouvé via RPC:", userId);
      
      // Mettre à jour le mot de passe pour permettre la connexion
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password
      });
      
      if (updateError) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur mise à jour password:", updateError);
      }
    } else {
      // 4. Créer le nouvel utilisateur Supabase
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirmer l'email
        user_metadata: {
          shop_url: shop,
          commercial_name: pendingConnection.commercial_name || shop,
          created_via: "shopify_install"
        }
      });

      if (createError || !newUser.user) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur création utilisateur:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user", details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("[SHOPIFY-AUTO-AUTH] Nouvel utilisateur créé:", userId);

      // 5. Créer le profil SANS abonnement actif - l'utilisateur doit choisir un plan
      // Plus de trial automatique - Shopify exige que le billing passe par leur API
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: email,
        has_used_trial: false, // Pas encore utilisé - sera activé via Shopify Billing
        subscription_status: "inactive", // Pas d'abonnement actif - doit choisir un plan
        current_plan_id: null, // Sera défini après le choix du plan
        billing_provider: "shopify", // OAuth users use Shopify Billing only
      });

      if (profileError) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur création profil:", profileError);
      } else {
        console.log("[SHOPIFY-AUTO-AUTH] ✅ Profil créé - en attente de choix de plan");
      }
    }

    // 6. Claim la connexion Shopify - IDEMPOTENT: chercher par store_url d'abord
    // L'index unique idx_unique_active_store est sur (store_url) WHERE is_active = true
    // Donc on doit chercher par store_url pour éviter les conflits
    
    // D'abord chercher une connexion existante pour ce store_url (quelque soit le user_id)
    const { data: existingByStore } = await supabase
      .from("shopify_connections")
      .select("id, user_id, connected_at, is_active")
      .eq("store_url", shop)
      .maybeSingle();

    // Ensuite chercher par user_id + store_url
    const { data: existingByUser } = await supabase
      .from("shopify_connections")
      .select("id, connected_at, is_active")
      .eq("user_id", userId)
      .eq("store_url", shop)
      .maybeSingle();

    console.log("[SHOPIFY-AUTO-AUTH] 🔍 Existing connections check:", {
      byStore: existingByStore ? { id: existingByStore.id, user_id: existingByStore.user_id, is_active: existingByStore.is_active } : null,
      byUser: existingByUser ? { id: existingByUser.id, is_active: existingByUser.is_active } : null
    });

    // Déterminer quelle connexion mettre à jour
    let existingConnection = existingByUser || existingByStore;
    const isReinstallation = existingConnection && !existingConnection.is_active;
    const isExistingActiveForDifferentUser = existingByStore && existingByStore.is_active && existingByStore.user_id !== userId;
    
    if (isExistingActiveForDifferentUser) {
      console.log("[SHOPIFY-AUTO-AUTH] ⚠️ Store already connected to different user, transferring ownership...");
      // Désactiver l'ancienne connexion et en créer une nouvelle pour ce user
      await supabase
        .from("shopify_connections")
        .update({ is_active: false })
        .eq("id", existingByStore.id);
      
      existingConnection = null; // Force création nouvelle connexion
    }
    
    if (isReinstallation) {
      console.log("[SHOPIFY-AUTO-AUTH] 🔄 REINSTALLATION détectée - vérification abonnement Shopify...");
      
      // Vérifier l'abonnement avec l'API Shopify
      const subscriptionResult = await verifyShopifySubscription(
        shop, 
        pendingConnection.access_token
      );
      
      if (subscriptionResult.apiError) {
        // 🔧 FIX: API error (token expired, network issue) - DON'T reset subscription
        // Trust the database status, user may still have active subscription
        console.log("[SHOPIFY-AUTO-AUTH] ⚠️ API error checking subscription - keeping existing status:", subscriptionResult.errorMessage);
        // Just log and continue - don't reset profile
      } else if (!subscriptionResult.hasSubscription) {
        // API responded successfully but no active subscription found
        console.log("[SHOPIFY-AUTO-AUTH] ❌ Pas d'abonnement actif confirmé par Shopify - l'utilisateur doit repayer");
        
        // S'assurer que le profil reflète l'absence d'abonnement
        await supabase.from("profiles").update({
          subscription_status: "inactive",
          current_plan_id: null,
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
      } else {
        console.log("[SHOPIFY-AUTO-AUTH] ✅ Abonnement Shopify actif confirmé");
      }
    }

    // Effectuer l'UPDATE ou INSERT selon le cas
    if (existingConnection) {
      // UPDATE existing connection
      console.log("[SHOPIFY-AUTO-AUTH] 🔄 Updating existing connection:", existingConnection.id);
      
      const { error: updateError } = await supabase
        .from("shopify_connections")
        .update({
          user_id: userId,
          store_name: pendingConnection.commercial_name || shop,
          access_token: pendingConnection.access_token,
          is_active: true,
          connection_type: "oauth",
        })
        .eq("id", existingConnection.id);

      if (updateError) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur update connexion:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update connection", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("[SHOPIFY-AUTO-AUTH] ✅ Connexion mise à jour");
    } else {
      // INSERT new connection
      console.log("[SHOPIFY-AUTO-AUTH] ➕ Creating new connection");
      
      const { error: insertError } = await supabase
        .from("shopify_connections")
        .insert({
          user_id: userId,
          store_url: shop,
          store_name: pendingConnection.commercial_name || shop,
          access_token: pendingConnection.access_token,
          is_active: true,
          connection_type: "oauth",
          connected_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur insert connexion:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create connection", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("[SHOPIFY-AUTO-AUTH] ✅ Nouvelle connexion créée");
    }

    // 7. Marquer la pending_connection comme claimed
    await supabase
      .from("shopify_pending_connections")
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq("pending_token", pending_token);

    console.log("[SHOPIFY-AUTO-AUTH] ✅ Connexion Shopify claimed");

    // ⚠️ IMPORTANT: Ne PAS déclencher l'import ici!
    // L'import sera fait APRÈS que l'utilisateur ait choisi et payé un abonnement
    // dans shopify-billing-callback pour éviter d'importer des données pour des utilisateurs
    // qui partent sans s'abonner
    console.log("[SHOPIFY-AUTO-AUTH] ⏭️ Import différé - sera déclenché après paiement Shopify");

    // 8. Créer un client Supabase pour générer une session utilisateur
    // Utiliser signInWithPassword avec les credentials créés
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_ANON_KEY) {
      console.error("[SHOPIFY-AUTO-AUTH] SUPABASE_ANON_KEY manquant");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      console.error("[SHOPIFY-AUTO-AUTH] Erreur sign in:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create session", details: authError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SHOPIFY-AUTO-AUTH] ✅ Session générée");

    // Retourner les tokens pour auto-login côté frontend
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        shop: shop,
        import_triggered: false, // Import différé après paiement Shopify
        is_returning_user: !!existingUser, // Indique si c'est un utilisateur existant
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SHOPIFY-AUTO-AUTH] Exception:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
