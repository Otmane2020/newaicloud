import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to calculate next import date
function calculateNextImport(
  frequency: string,
  scheduleHour: number,
  scheduleDay: number,
  currentTime: Date
): Date {
  const next = new Date(currentTime);
  
  switch (frequency) {
    case 'hourly':
      next.setTime(next.getTime() + 60 * 60 * 1000);
      break;
    
    case 'daily':
      next.setUTCHours(scheduleHour, 0, 0, 0);
      if (next <= currentTime) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
    
    case 'weekly':
      next.setUTCHours(scheduleHour, 0, 0, 0);
      const daysUntilTarget = ((scheduleDay - next.getUTCDay() + 7) % 7) || 7;
      next.setUTCDate(next.getUTCDate() + daysUntilTarget);
      break;
    
    case 'monthly':
      next.setUTCDate(scheduleDay);
      next.setUTCHours(scheduleHour, 0, 0, 0);
      if (next <= currentTime) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      break;
  }
  
  return next;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SCHEDULED-SYNC] ========================================');
    console.log('[SCHEDULED-SYNC] Execution started at:', new Date().toISOString());
    console.log('[SCHEDULED-SYNC] ========================================');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[SCHEDULED-SYNC] Current time: ${now.toISOString()}`);

    // Get all users with non-manual sync settings
    const { data: settings, error: settingsError } = await supabase
      .from('shopify_sync_settings')
      .select('*, profiles!inner(id, email)')
      .neq('import_frequency', 'manual');

    if (settingsError) {
      throw settingsError;
    }

    console.log(`[SCHEDULED-SYNC] Processing ${settings?.length || 0} users with auto-sync enabled`);
    settings?.forEach(s => {
      console.log(`  - User ${s.user_id}: ${s.import_frequency}, next: ${s.next_import_at}`);
    });

    for (const setting of settings || []) {
      const userId = setting.user_id;
      const lastImport = setting.last_import_at ? new Date(setting.last_import_at) : null;
      
      // Récupérer les credentials Shopify
      const { data: shopifyConnection } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token, id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!shopifyConnection) {
        console.error(`[SCHEDULED-SYNC] No active Shopify connection for user ${userId}`);
        continue;
      }

      // Extract shop name from store_url (e.g., "myshop.myshopify.com" -> "myshop")
      const shopName = shopifyConnection.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');
      const authToken = shopifyConnection.access_token;
      const storeId = shopifyConnection.id;
      const syncMode = setting.sync_mode || 'smart';
      
      let shouldSync = false;
      let reason = '';

      console.log(`[SCHEDULED-SYNC] User ${userId}:`);
      console.log(`  Frequency: ${setting.import_frequency}`);
      console.log(`  Last import: ${setting.last_import_at}`);
      console.log(`  Next import: ${setting.next_import_at}`);

      // Simple check: sync if next_import_at is in the past or null
      if (!setting.next_import_at) {
        shouldSync = true;
        reason = 'first sync (no next_import_at)';
      } else {
        const nextImport = new Date(setting.next_import_at);
        if (nextImport <= now) {
          shouldSync = true;
          reason = `scheduled time reached (${nextImport.toISOString()})`;
        }
      }

      console.log(`  Should sync: ${shouldSync} (${reason})`);

      if (shouldSync) {
        console.log(`[SCHEDULED-SYNC] Starting sync for user ${userId} (${reason})`);

        // Create sync history entry
        const { data: historyEntry, error: historyError } = await supabase
          .from('sync_history')
          .insert({
            user_id: userId,
            sync_type: 'import',
            content_types: setting.import_types || [],
            status: 'running',
          })
          .select()
          .single();

        if (historyError) {
          console.error(`[SCHEDULED-SYNC] Error creating history entry for user ${userId}:`, historyError);
          continue;
        }

        const startTime = Date.now();
        let totalImported = 0;
        let hasError = false;
        let errorMessage = '';

        // Use service role key for sync operations
        const userClient = supabase;

        // Import based on selected types
        for (const type of setting.import_types || []) {
          try {
            let result;
            switch (type) {
              case 'products':
                result = await userClient.functions.invoke('import-products', {
                  body: { shopName, authToken, storeId, syncMode }
                });
                break;
              case 'collections':
                result = await userClient.functions.invoke('import-shopify-collections', {
                  body: { shopName, authToken, storeId }
                });
                break;
              case 'pages':
                result = await userClient.functions.invoke('import-shopify-pages', {
                  body: { shopName, authToken, storeId }
                });
                break;
              case 'articles':
                result = await userClient.functions.invoke('import-shopify-articles', {
                  body: { shopName, authToken, storeId }
                });
                break;
              case 'images':
                result = await userClient.functions.invoke('import-content-images', {
                  body: { types: ['collections', 'pages', 'articles', 'homepage'] }
                });
                break;
            }

            if (result?.error) {
              throw new Error(result.error.message);
            }

            if (result?.data?.totalImported) {
              totalImported += result.data.totalImported;
            }

            console.log(`[SCHEDULED-SYNC] Imported ${type} for user ${userId}: ${result?.data?.totalImported || 0} items`);
          } catch (error) {
            console.error(`[SCHEDULED-SYNC] Error importing ${type} for user ${userId}:`, error);
            hasError = true;
            const message = error instanceof Error ? error.message : String(error);
            errorMessage += `${type}: ${message}; `;
          }
        }

        const duration = Date.now() - startTime;

        // Update history
        await supabase
          .from('sync_history')
          .update({
            status: hasError ? 'failed' : 'success',
            items_synced: totalImported,
            duration_ms: duration,
            error_message: hasError ? errorMessage : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', historyEntry.id);

        // Calculate next import time
        const nextImportDate = calculateNextImport(
          setting.import_frequency,
          setting.import_schedule_hour || 9,
          setting.import_schedule_day || 1,
          now
        );

        // Update last import AND next import timestamps
        await supabase
          .from('shopify_sync_settings')
          .update({ 
            last_import_at: new Date().toISOString(),
            next_import_at: nextImportDate.toISOString()
          })
          .eq('user_id', userId);

        console.log(`[SCHEDULED-SYNC] ✅ Completed sync for user ${userId}: ${totalImported} items, ${duration}ms`);
        console.log(`[SCHEDULED-SYNC] Next sync scheduled for: ${nextImportDate.toISOString()}`);

        // Phase 6: Send notifications
        if (totalImported > 0) {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: userId,
              type: 'sync_complete',
              title: 'Synchronisation automatique terminée',
              message: `${totalImported} éléments synchronisés avec succès.`,
              priority: 'low'
            }
          });
        }

        if (hasError) {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: userId,
              type: 'sync_error',
              title: 'Erreur de synchronisation automatique',
              message: errorMessage,
              priority: 'high'
            }
          });
        }
      } else {
        console.log(`[SCHEDULED-SYNC] Skipping sync for user ${userId} (not scheduled)`);
      }
    }

    console.log('[SCHEDULED-SYNC] ✅ Scheduled sync check complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled sync check complete',
        processedUsers: settings?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SCHEDULED-SYNC] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
