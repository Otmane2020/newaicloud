import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop, pending_token } = await req.json();

    if (!shop || !pending_token) {
      return new Response(
        JSON.stringify({ error: "Missing shop or pending_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SHOPIFY-AUTO-AUTH] Auto-authentication pour:", shop);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Vérifier que le pending_token est valide
    const { data: pendingConnection, error: pendingError } = await supabase
      .from("shopify_pending_connections")
      .select("*")
      .eq("pending_token", pending_token)
      .eq("shop_url", shop)
      .eq("is_claimed", false)
      .single();

    if (pendingError || !pendingConnection) {
      console.error("[SHOPIFY-AUTO-AUTH] Token invalide ou expiré:", pendingError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired pending token" }),
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

    // 6. Claim la connexion Shopify - vérifier d'abord si connexion existante
    const { data: existingConnection } = await supabase
      .from("shopify_connections")
      .select("id, connected_at")
      .eq("user_id", userId)
      .eq("store_url", shop)
      .maybeSingle();

    // Ne mettre à jour connected_at QUE pour les NOUVELLES connexions
    const connectionData: Record<string, any> = {
      user_id: userId,
      store_url: shop,
      store_name: pendingConnection.commercial_name || shop,
      access_token: pendingConnection.access_token,
      is_active: true,
      connection_type: "oauth",
    };
    
    // Seulement si c'est une nouvelle connexion, ajouter connected_at
    if (!existingConnection) {
      connectionData.connected_at = new Date().toISOString();
      console.log("[SHOPIFY-AUTO-AUTH] Nouvelle connexion - connected_at sera défini");
    } else {
      console.log("[SHOPIFY-AUTO-AUTH] Connexion existante - connected_at préservé");
    }

    const { error: claimError } = await supabase
      .from("shopify_connections")
      .upsert(connectionData, {
        onConflict: 'user_id,store_url'
      });

    if (claimError) {
      console.error("[SHOPIFY-AUTO-AUTH] Erreur claim connexion:", claimError);
      return new Response(
        JSON.stringify({ error: "Failed to claim connection", details: claimError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Marquer la pending_connection comme claimed
    await supabase
      .from("shopify_pending_connections")
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq("pending_token", pending_token);

    console.log("[SHOPIFY-AUTO-AUTH] ✅ Connexion Shopify claimed");

    // 7.5 Vérifier si l'utilisateur a des produits ET des collections
    const { count: existingProductsCount, error: countError } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId);

    // 🔥 CRITICAL FIX: Also check for collections
    const { count: existingCollectionsCount, error: collectionsCountError } = await supabase
      .from("shopify_collections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Log détaillé pour debug
    console.log("[SHOPIFY-AUTO-AUTH] 📊 Vérification données existantes:", {
      userId,
      existingProductsCount,
      existingCollectionsCount,
      countError: countError?.message || null,
      collectionsCountError: collectionsCountError?.message || null,
      isNewUser: !existingUser,
    });

    // Déclencher l'import si:
    // - Nouvel utilisateur
    // - OU pas de produits
    // - OU pas de collections (même si produits existent!)
    const isNewUser = !existingUser;
    const hasNoProducts = countError || existingProductsCount === null || existingProductsCount === 0;
    const hasNoCollections = collectionsCountError || existingCollectionsCount === null || existingCollectionsCount === 0;
    let importTriggered = false;

    if (isNewUser || hasNoProducts || hasNoCollections) {
      const reason = isNewUser 
        ? "nouvel utilisateur" 
        : hasNoProducts 
          ? "aucun produit existant"
          : "aucune collection existante";
          
      console.log("[SHOPIFY-AUTO-AUTH] 🚀 Déclenchement import automatique complet:", {
        reason,
        isNewUser,
        hasNoProducts,
        hasNoCollections,
        productCount: existingProductsCount,
        collectionCount: existingCollectionsCount,
      });
      
      // 🚀 FIRE-AND-FORGET: Ne pas attendre la réponse pour accélérer l'affichage des plans
      // L'import continuera en arrière-plan
      fetch(`${SUPABASE_URL}/functions/v1/trigger-auto-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      }).then(response => {
        if (response.ok) {
          console.log("[SHOPIFY-AUTO-AUTH] ✅ Import automatique déclenché avec succès (async)");
        } else {
          console.error("[SHOPIFY-AUTO-AUTH] ⚠️ Erreur déclenchement import (async):", response.status);
        }
      }).catch(err => {
        console.error("[SHOPIFY-AUTO-AUTH] ⚠️ Import automatique échoué (async):", err);
      });

      console.log("[SHOPIFY-AUTO-AUTH] 🚀 Import automatique déclenché (non-bloquant)");
      importTriggered = true;
    } else {
      console.log("[SHOPIFY-AUTO-AUTH] ⏭️ Utilisateur existant avec", existingProductsCount, "produits et", existingCollectionsCount, "collections - Skip import automatique");
    }

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
        import_triggered: importTriggered, // Indique si un import a été déclenché
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
