import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop, user_id } = await req.json();
    
    console.log("[SHOPIFY-QUICK-LOGIN] Request received:", { shop, user_id });

    if (!shop || !user_id) {
      console.error("[SHOPIFY-QUICK-LOGIN] Missing shop or user_id");
      return new Response(
        JSON.stringify({ error: "Missing shop or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Générer un nouveau mot de passe temporaire
    const password = crypto.randomUUID();
    
    // 2. Récupérer l'email de l'utilisateur
    const shopHandle = shop.replace(".myshopify.com", "");
    const email = `${shopHandle}@shopify.newai.sale`;
    
    console.log("[SHOPIFY-QUICK-LOGIN] Updating password for:", email);

    // 3. Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      password
    });

    if (updateError) {
      console.error("[SHOPIFY-QUICK-LOGIN] Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update credentials", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Créer une session avec les nouvelles credentials
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      console.error("[SHOPIFY-QUICK-LOGIN] Error creating session:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create session", details: authError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SHOPIFY-QUICK-LOGIN] ✅ Session created successfully for user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SHOPIFY-QUICK-LOGIN] Exception:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
