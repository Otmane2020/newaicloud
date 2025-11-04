import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SCHEDULED-SYNC] Starting scheduled sync check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();

    console.log(`[SCHEDULED-SYNC] Current time: ${now.toISOString()}, Hour: ${currentHour}, Day: ${currentDay}`);

    // Get all users with non-manual sync settings
    const { data: settings, error: settingsError } = await supabase
      .from('shopify_sync_settings')
      .select('*, profiles!inner(id, email)')
      .neq('import_frequency', 'manual');

    if (settingsError) {
      throw settingsError;
    }

    console.log(`[SCHEDULED-SYNC] Found ${settings?.length || 0} users with automatic sync enabled`);

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

      // Determine if sync should happen based on frequency
      switch (setting.import_frequency) {
        case 'hourly':
          // Sync if no previous import or more than 1 hour ago
          if (!lastImport || (now.getTime() - lastImport.getTime()) > 60 * 60 * 1000) {
            shouldSync = true;
            reason = 'hourly schedule';
          }
          break;

        case 'daily':
          // Sync if it's the scheduled hour and more than 23 hours since last import
          if (currentHour === setting.import_schedule_hour) {
            if (!lastImport || (now.getTime() - lastImport.getTime()) > 23 * 60 * 60 * 1000) {
              shouldSync = true;
              reason = `daily schedule (${setting.import_schedule_hour}:00)`;
            }
          }
          break;

        case 'weekly':
          // Sync if it's the scheduled day and hour and more than 6 days since last import
          if (currentDay === setting.import_schedule_day && currentHour === setting.import_schedule_hour) {
            if (!lastImport || (now.getTime() - lastImport.getTime()) > 6 * 24 * 60 * 60 * 1000) {
              shouldSync = true;
              reason = `weekly schedule (Day ${setting.import_schedule_day}, ${setting.import_schedule_hour}:00)`;
            }
          }
          break;

        case 'monthly':
          // Sync if it's the scheduled day and hour and more than 28 days since last import
          const currentDate = now.getUTCDate();
          if (currentDate === setting.import_schedule_day && currentHour === setting.import_schedule_hour) {
            if (!lastImport || (now.getTime() - lastImport.getTime()) > 28 * 24 * 60 * 60 * 1000) {
              shouldSync = true;
              reason = `monthly schedule (Day ${setting.import_schedule_day}, ${setting.import_schedule_hour}:00)`;
            }
          }
          break;
      }

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

        // Update last import timestamp
        await supabase
          .from('shopify_sync_settings')
          .update({ last_import_at: new Date().toISOString() })
          .eq('user_id', userId);

        console.log(`[SCHEDULED-SYNC] ✅ Completed sync for user ${userId}: ${totalImported} items, ${duration}ms`);
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
