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

    // 3. Vérifier si l'utilisateur existe déjà
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log("[SHOPIFY-AUTO-AUTH] Utilisateur existant trouvé:", existingUser.id);
      userId = existingUser.id;
      
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

      // 5. Activer le trial de 14 jours
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: email,
        has_used_trial: true,
        trial_ends_at: trialEndDate.toISOString(),
        subscription_status: "trialing",
        current_plan_id: "trial",
      });

      if (profileError) {
        console.error("[SHOPIFY-AUTO-AUTH] Erreur création profil:", profileError);
      } else {
        console.log("[SHOPIFY-AUTO-AUTH] ✅ Trial activé jusqu'au", trialEndDate.toISOString());
      }
    }

    // 6. Claim la connexion Shopify
    const { error: claimError } = await supabase
      .from("shopify_connections")
      .upsert({
        user_id: userId,
        store_url: shop,
        store_name: pendingConnection.commercial_name || shop,
        access_token: pendingConnection.access_token,
        connected_at: new Date().toISOString(),
        is_active: true,
        connection_type: "oauth",
      }, {
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

    // 7.5 Déclencher l'importation automatique des produits
    try {
      console.log("[SHOPIFY-AUTO-AUTH] 🚀 Déclenchement import produits automatique");
      
      // Récupérer le store_id de la connexion créée
      const { data: storeData } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("store_url", shop)
        .single();

      if (storeData?.id) {
        // Appeler import-products en mode service (sans JWT)
        const importResponse = await fetch(`${SUPABASE_URL}/functions/v1/import-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            serviceMode: true,
            userId: userId,
            storeId: storeData.id,
            autoImport: true,
          }),
        });

        if (importResponse.ok) {
          console.log("[SHOPIFY-AUTO-AUTH] ✅ Import produits déclenché avec succès");
        } else {
          console.error("[SHOPIFY-AUTO-AUTH] ⚠️ Erreur déclenchement import:", await importResponse.text());
        }
      }
    } catch (importError) {
      // Ne pas bloquer l'auth si l'import échoue
      console.error("[SHOPIFY-AUTO-AUTH] ⚠️ Import automatique échoué (non-bloquant):", importError);
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
