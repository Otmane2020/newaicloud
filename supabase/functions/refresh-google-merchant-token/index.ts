import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Récupérer tous les utilisateurs avec un token Google Merchant qui expire bientôt (dans moins de 7 jours)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: profiles, error: fetchError } = await supabaseClient
      .from("profiles")
      .select("id, google_merchant_refresh_token, google_merchant_token_expires_at, google_merchant_email")
      .not("google_merchant_refresh_token", "is", null)
      .lt("google_merchant_token_expires_at", sevenDaysFromNow);

    if (fetchError) {
      console.error("Error fetching profiles:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${profiles?.length || 0} profiles needing token refresh`);

    const results = [];
    
    for (const profile of profiles || []) {
      try {
        console.log(`Refreshing token for user ${profile.id}`);
        
        // Rafraîchir le token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: profile.google_merchant_refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`Token refresh failed for user ${profile.id}:`, errorText);
          
          // Créer une notification d'erreur
          await supabaseClient.from("app_notifications").insert({
            user_id: profile.id,
            title: "Erreur d'authentification Google Merchant",
            message: "Votre connexion à Google Merchant Center a expiré. Veuillez vous reconnecter.",
            type: "error",
            category: "integration",
            priority: "high",
            action_url: "/merchant?tab=integration",
            action_label: "Reconnecter",
            template_code: "GOOGLE_MERCHANT_TOKEN_EXPIRED",
          });
          
          results.push({
            user_id: profile.id,
            success: false,
            error: "Token refresh failed",
          });
          continue;
        }

        const tokens = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Mettre à jour le token
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            google_merchant_oauth_token: tokens.access_token,
            google_merchant_token_expires_at: expiresAt,
          })
          .eq("id", profile.id);

        if (updateError) {
          console.error(`Error updating token for user ${profile.id}:`, updateError);
          throw updateError;
        }

        console.log(`✅ Token refreshed successfully for user ${profile.id}`);
        
        results.push({
          user_id: profile.id,
          success: true,
          expires_at: expiresAt,
        });
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        results.push({
          user_id: profile.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in refresh-google-merchant-token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
