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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    
    // Récupérer tous les utilisateurs avec la synchronisation automatique activée et dont le prochain sync est dû
    const { data: settings, error: fetchError } = await supabaseClient
      .from("google_merchant_sync_settings")
      .select("*")
      .eq("auto_sync_enabled", true)
      .or(`next_sync_at.is.null,next_sync_at.lt.${now.toISOString()}`);

    if (fetchError) {
      console.error("Error fetching sync settings:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${settings?.length || 0} users needing sync`);

    const results = [];

    for (const setting of settings || []) {
      let syncHistoryId: string | null = null;
      
      try {
        console.log(`Processing sync for user ${setting.user_id}`);

        // Créer un enregistrement d'historique
        const { data: syncHistory, error: historyError } = await supabaseClient
          .from("google_merchant_sync_history")
          .insert({
            user_id: setting.user_id,
            sync_type: "automatic",
            status: "running",
            started_at: now.toISOString(),
          })
          .select()
          .single();

        if (historyError) {
          console.error("Error creating sync history:", historyError);
        } else {
          syncHistoryId = syncHistory.id;
        }

        // Vérifier que l'utilisateur a un token Google Merchant valide
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("google_merchant_oauth_token, google_merchant_token_expires_at")
          .eq("id", setting.user_id)
          .single();

        if (!profile?.google_merchant_oauth_token) {
          console.log(`User ${setting.user_id} has no Google Merchant token`);
          
          // Mettre à jour l'historique
          if (syncHistoryId) {
            await supabaseClient
              .from("google_merchant_sync_history")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_message: "No Google Merchant token",
              })
              .eq("id", syncHistoryId);
          }
          
          // Créer une notification
          await supabaseClient.from("app_notifications").insert({
            user_id: setting.user_id,
            title: "Synchronisation Google Merchant impossible",
            message: "Veuillez vous connecter à Google Merchant Center pour activer la synchronisation automatique.",
            type: "warning",
            category: "integration",
            priority: "medium",
            action_url: "/merchant?tab=integration",
            action_label: "Se connecter",
          });
          
          results.push({
            user_id: setting.user_id,
            success: false,
            error: "No Google Merchant token",
          });
          continue;
        }

        // Vérifier si le token est encore valide
        const tokenExpiresAt = new Date(profile.google_merchant_token_expires_at);
        if (tokenExpiresAt < now) {
          console.log(`Token expired for user ${setting.user_id}`);
          
          // Mettre à jour l'historique
          if (syncHistoryId) {
            await supabaseClient
              .from("google_merchant_sync_history")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_message: "Token expired",
              })
              .eq("id", syncHistoryId);
          }
          
          await supabaseClient.from("app_notifications").insert({
            user_id: setting.user_id,
            title: "Token Google Merchant expiré",
            message: "Votre connexion à Google Merchant Center a expiré. Veuillez vous reconnecter.",
            type: "error",
            category: "integration",
            priority: "high",
            action_url: "/merchant?tab=integration",
            action_label: "Reconnecter",
          });
          
          results.push({
            user_id: setting.user_id,
            success: false,
            error: "Token expired",
          });
          continue;
        }

        // Appeler la fonction de création de flux
        const { data: feedResult, error: feedError } = await supabaseClient.functions.invoke(
          "create-google-merchant-feed",
          {
            body: { userId: setting.user_id },
          }
        );

        if (feedError || !feedResult?.success) {
          console.error(`Feed creation failed for user ${setting.user_id}:`, feedError);
          
          const errorMessage = feedError?.message || "Feed creation failed";
          const syncEndTime = new Date();
          
          // Mettre à jour l'historique
          if (syncHistoryId) {
            await supabaseClient
              .from("google_merchant_sync_history")
              .update({
                status: "failed",
                completed_at: syncEndTime.toISOString(),
                duration_ms: syncEndTime.getTime() - now.getTime(),
                error_message: errorMessage,
              })
              .eq("id", syncHistoryId);
          }
          
          // Incrémenter le compteur d'erreurs
          const newErrorCount = (setting.sync_errors_count || 0) + 1;
          await supabaseClient
            .from("google_merchant_sync_settings")
            .update({
              sync_errors_count: newErrorCount,
              last_error: errorMessage,
            })
            .eq("id", setting.id);

          // Créer une notification d'erreur
          await supabaseClient.from("app_notifications").insert({
            user_id: setting.user_id,
            title: "Erreur de synchronisation Google Merchant",
            message: `La synchronisation automatique a échoué. Erreur: ${errorMessage}`,
            type: "error",
            category: "integration",
            priority: "medium",
            action_url: "/merchant?tab=monitoring",
            action_label: "Voir les détails",
          });
          
          results.push({
            user_id: setting.user_id,
            success: false,
            error: errorMessage,
          });
          continue;
        }

        // Calculer la prochaine date de synchronisation
        let nextSyncAt: Date;
        switch (setting.sync_frequency) {
          case "daily":
            nextSyncAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case "weekly":
            nextSyncAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case "monthly":
            nextSyncAt = new Date(now);
            nextSyncAt.setMonth(nextSyncAt.getMonth() + 1);
            break;
          default:
            nextSyncAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }

        const syncEndTime = new Date();
        const productsSynced = feedResult?.products_count || 0;
        
        // Mettre à jour l'historique
        if (syncHistoryId) {
          await supabaseClient
            .from("google_merchant_sync_history")
            .update({
              status: "completed",
              completed_at: syncEndTime.toISOString(),
              duration_ms: syncEndTime.getTime() - now.getTime(),
              products_synced: productsSynced,
              feed_url: feedResult?.feed_url,
            })
            .eq("id", syncHistoryId);
        }
        
        // Mettre à jour les paramètres de synchronisation
        await supabaseClient
          .from("google_merchant_sync_settings")
          .update({
            last_sync_at: now.toISOString(),
            next_sync_at: nextSyncAt.toISOString(),
            sync_errors_count: 0,
            last_error: null,
          })
          .eq("id", setting.id);

        // Créer une notification de succès
        await supabaseClient.from("app_notifications").insert({
          user_id: setting.user_id,
          title: "Synchronisation Google Merchant réussie",
          message: `${productsSynced} produits synchronisés avec succès. Prochaine synchronisation: ${nextSyncAt.toLocaleDateString()}`,
          type: "success",
          category: "integration",
          priority: "low",
          action_url: "/merchant?tab=monitoring",
          action_label: "Voir les stats",
        });

        console.log(`✅ Sync completed for user ${setting.user_id}`);
        
        results.push({
          user_id: setting.user_id,
          success: true,
          next_sync_at: nextSyncAt.toISOString(),
        });
      } catch (error) {
        console.error(`Error processing user ${setting.user_id}:`, error);
        results.push({
          user_id: setting.user_id,
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
    console.error("Error in scheduled-merchant-sync:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
