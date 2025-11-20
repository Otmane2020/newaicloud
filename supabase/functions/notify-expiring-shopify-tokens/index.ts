import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[NOTIFY-EXPIRING-TOKENS] Starting notification check");

    // Récupérer les tokens qui expirent bientôt
    const { data: expiringTokens, error } = await supabase
      .rpc('notify_expiring_shopify_tokens');

    if (error) {
      console.error("[NOTIFY-EXPIRING-TOKENS] Error fetching expiring tokens:", error);
      throw error;
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      console.log("[NOTIFY-EXPIRING-TOKENS] No expiring tokens found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expiring tokens found",
          count: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`[NOTIFY-EXPIRING-TOKENS] Found ${expiringTokens.length} expiring tokens`);

    // Envoyer des notifications pour chaque token expirant
    const notifications = [];
    for (const token of expiringTokens) {
      try {
        // Créer une notification dans app_notifications
        const { error: notifError } = await supabase
          .from('app_notifications')
          .insert({
            user_id: token.claimed_by,
            title: "🚨 Connexion Shopify expire bientôt",
            message: `Votre connexion Shopify pour la boutique "${token.shop_url}" expire dans ${Math.round(token.expires_in_hours)} heures. Veuillez finaliser la connexion avant expiration.`,
            type: "warning",
            category: "integration",
            priority: "high",
            action_label: "Finaliser maintenant",
            action_url: `/shopify/recover?token=${token.pending_token}`,
            metadata: {
              shop_url: token.shop_url,
              expires_at: token.expires_at,
              pending_token: token.pending_token
            }
          });

        if (notifError) {
          console.error(`[NOTIFY-EXPIRING-TOKENS] Error creating notification for ${token.shop_url}:`, notifError);
        } else {
          notifications.push({
            shop: token.shop_url,
            email: token.user_email,
            expires_in_hours: token.expires_in_hours
          });
          console.log(`[NOTIFY-EXPIRING-TOKENS] ✅ Notification created for ${token.shop_url}`);
        }
      } catch (notifError) {
        console.error(`[NOTIFY-EXPIRING-TOKENS] Exception for ${token.shop_url}:`, notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiringTokens.length} expiring tokens`,
        count: expiringTokens.length,
        notifications
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[NOTIFY-EXPIRING-TOKENS] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});