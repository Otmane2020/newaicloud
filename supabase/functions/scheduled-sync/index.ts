import "../_shared/strict-ai-generation.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateNextImport(
  frequency: string,
  scheduleHour: number,
  scheduleDay: number,
  currentTime: Date
): Date {
  const next = new Date(currentTime);

  console.log(`[CALC-NEXT] Input: frequency=${frequency}, hour=${scheduleHour}, day=${scheduleDay}, current=${currentTime.toISOString()}`);

  switch (frequency) {
    case 'hourly':
      next.setTime(next.getTime() + 60 * 60 * 1000);
      break;
    case 'daily':
      next.setUTCHours(scheduleHour, 0, 0, 0);
      if (next <= currentTime) next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly': {
      next.setUTCHours(scheduleHour, 0, 0, 0);
      const currentDay = next.getUTCDay();
      let daysUntilTarget = scheduleDay - currentDay;
      if (daysUntilTarget === 0 && next <= currentTime) daysUntilTarget = 7;
      else if (daysUntilTarget < 0) daysUntilTarget += 7;
      next.setUTCDate(next.getUTCDate() + daysUntilTarget);
      break;
    }
    case 'monthly': {
      const targetDay = Math.min(scheduleDay, 28);
      next.setUTCDate(targetDay);
      next.setUTCHours(scheduleHour, 0, 0, 0);
      if (next <= currentTime) next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    }
    default:
      console.warn(`[CALC-NEXT] Unknown frequency: ${frequency}, defaulting to daily`);
      next.setUTCHours(scheduleHour, 0, 0, 0);
      if (next <= currentTime) next.setUTCDate(next.getUTCDate() + 1);
  }

  console.log(`[CALC-NEXT] Output: ${next.toISOString()}`);
  return next;
}

function stringifyPayloadError(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (value instanceof Error) return value.message;
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => stringifyPayloadError(item))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join('; ') : null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return stringifyPayloadError(record.message) || stringifyPayloadError(record.error) || JSON.stringify(record);
  }
  return String(value);
}

function extractInvocationError(result: any): string | null {
  if (!result) return 'No response returned by synchronization function';

  const invokeError = stringifyPayloadError(result.error);
  if (invokeError) return invokeError;

  const data = result.data;
  if (!data || typeof data !== 'object') return null;

  if (data.success === false) {
    return stringifyPayloadError(data.error)
      || stringifyPayloadError(data.errors)
      || stringifyPayloadError(data.message)
      || 'Synchronization function returned success=false';
  }

  // Some legacy Edge Functions return HTTP 200 with an `error` field instead of success=false.
  return stringifyPayloadError(data.error);
}

function normalizeShopifyError(message: string): string {
  if (/SHOPIFY_REAUTH_REQUIRED|unauthori[sz]ed|authorization expired|invalid.*access token|access token.*invalid|401/i.test(message)) {
    return 'Shopify authorization expired. Please reconnect your Shopify store. [SHOPIFY_REAUTH_REQUIRED]';
  }
  return message;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
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

    const { data: settings, error: settingsError } = await supabase
      .from('shopify_sync_settings')
      .select('*')
      .neq('import_frequency', 'manual');

    if (settingsError) throw settingsError;

    console.log(`[SCHEDULED-SYNC] Processing ${settings?.length || 0} users with auto-sync enabled`);
    settings?.forEach((setting) => {
      console.log(`  - User ${setting.user_id}: ${setting.import_frequency}, next: ${setting.next_import_at}`);
    });

    for (const setting of settings || []) {
      const userId = setting.user_id;
      const storeId = setting.store_id;

      if (!storeId) {
        console.error(`[SCHEDULED-SYNC] No store_id for user ${userId}, skipping`);
        continue;
      }

      const { data: shopifyConnection } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token, id')
        .eq('user_id', userId)
        .eq('id', storeId)
        .single();

      if (!shopifyConnection) {
        console.error(`[SCHEDULED-SYNC] No active Shopify connection for user ${userId}, store ${storeId}`);
        continue;
      }

      const shopName = shopifyConnection.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');
      const authToken = shopifyConnection.access_token;

      let shouldSync = false;
      let reason = '';

      console.log(`[SCHEDULED-SYNC] User ${userId}:`);
      console.log(`  Frequency: ${setting.import_frequency}`);
      console.log(`  Last import: ${setting.last_import_at}`);
      console.log(`  Next import: ${setting.next_import_at}`);

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

      if (!shouldSync) {
        console.log(`[SCHEDULED-SYNC] Skipping sync for user ${userId} (not scheduled)`);
        continue;
      }

      console.log(`[SCHEDULED-SYNC] Starting sync for user ${userId} (${reason})`);

      const { data: historyEntry, error: historyError } = await supabase
        .from('sync_history')
        .insert({
          user_id: userId,
          store_id: storeId,
          sync_type: 'full',
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
      let totalExported = 0;
      let hasError = false;
      const errorMessages: string[] = [];

      if (setting.export_auto_enabled !== false) {
        console.log('[SCHEDULED-SYNC] PHASE 1: Exporting products to Shopify...');
        try {
          const exportResult = await supabase.functions.invoke('batch-export-products', {
            body: {
              serviceMode: true,
              userId: setting.user_id,
              storeId,
              batchSize: 100,
              onlyNeedsExport: true,
            },
          });

          const exportFailure = extractInvocationError(exportResult);
          if (exportFailure) throw new Error(normalizeShopifyError(exportFailure));

          totalExported = Number(exportResult?.data?.exported || 0);
          console.log(`[SCHEDULED-SYNC] ✅ Exported ${totalExported} products to Shopify`);

          const exportErrorCount = Number(exportResult?.data?.errors || 0);
          if (exportErrorCount > 0) {
            hasError = true;
            errorMessages.push(`Export: ${exportErrorCount} product(s) failed`);
          }
        } catch (exportError) {
          hasError = true;
          const rawMessage = exportError instanceof Error ? exportError.message : String(exportError);
          const message = normalizeShopifyError(rawMessage);
          console.error('[SCHEDULED-SYNC] ⚠️ Export phase error:', message);
          errorMessages.push(`Export: ${message}`);
        }
      } else {
        console.log(`[SCHEDULED-SYNC] Export disabled for user ${userId}, skipping export phase`);
      }

      console.log('[SCHEDULED-SYNC] PHASE 2: Importing from Shopify...');

      for (const type of setting.import_types || []) {
        try {
          let result: any = null;

          switch (type) {
            case 'products':
              result = await supabase.functions.invoke('import-products', {
                body: {
                  serviceMode: true,
                  userId: setting.user_id,
                  shopName,
                  authToken,
                  storeId,
                },
              });
              break;
            case 'collections':
              result = await supabase.functions.invoke('import-shopify-collections', {
                body: {
                  serviceMode: true,
                  userId: setting.user_id,
                  shopName,
                  storeId,
                },
              });
              break;
            case 'pages':
              result = await supabase.functions.invoke('import-shopify-pages', {
                body: {
                  serviceMode: true,
                  userId: setting.user_id,
                  store_id: storeId,
                },
              });
              break;
            case 'articles':
              result = await supabase.functions.invoke('import-shopify-articles', {
                body: {
                  serviceMode: true,
                  userId: setting.user_id,
                  shopName,
                  authToken,
                  storeId,
                },
              });
              break;
            case 'images':
              result = await supabase.functions.invoke('import-content-images', {
                body: {
                  serviceMode: true,
                  userId: setting.user_id,
                  storeId,
                  types: ['collections', 'pages', 'articles', 'homepage'],
                },
              });
              break;
            default:
              console.warn(`[SCHEDULED-SYNC] Unknown import type "${type}", skipping`);
              continue;
          }

          const importFailure = extractInvocationError(result);
          if (importFailure) throw new Error(normalizeShopifyError(importFailure));

          totalImported += Number(result?.data?.totalImported || 0);
          console.log(`[SCHEDULED-SYNC] Imported ${type} for user ${userId}: ${result?.data?.totalImported || 0} items`);
        } catch (error) {
          hasError = true;
          const rawMessage = error instanceof Error ? error.message : String(error);
          const message = normalizeShopifyError(rawMessage);
          console.error(`[SCHEDULED-SYNC] Error importing ${type} for user ${userId}:`, message);
          errorMessages.push(`${type}: ${message}`);
        }
      }

      const duration = Date.now() - startTime;
      const errorMessage = errorMessages.join('; ') || null;

      await supabase
        .from('sync_history')
        .update({
          status: hasError ? 'failed' : 'success',
          items_synced: totalImported + totalExported,
          duration_ms: duration,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', historyEntry.id);

      const nextImportDate = calculateNextImport(
        setting.import_frequency,
        setting.import_schedule_hour || 9,
        setting.import_schedule_day || 1,
        now,
      );

      const syncTimestamp = new Date().toISOString();
      const syncSettingsUpdate: Record<string, string> = {
        next_import_at: nextImportDate.toISOString(),
      };

      // A failed attempt must never be displayed as the last successful import/export.
      if (!hasError) {
        syncSettingsUpdate.last_import_at = syncTimestamp;
        syncSettingsUpdate.last_export_at = syncTimestamp;
      }

      await supabase
        .from('shopify_sync_settings')
        .update(syncSettingsUpdate)
        .eq('user_id', userId)
        .eq('store_id', storeId);

      // last_sync_at is a success timestamp used by the UI, so do not advance it on failures.
      if (!hasError) {
        await supabase
          .from('shopify_connections')
          .update({ last_sync_at: syncTimestamp })
          .eq('id', storeId);
      }

      if (hasError) {
        console.error(`[SCHEDULED-SYNC] ❌ Sync failed for user ${userId}: ${errorMessage}`);
      } else {
        console.log(`[SCHEDULED-SYNC] ✅ Completed sync for user ${userId}: exported ${totalExported}, imported ${totalImported}, ${duration}ms`);
      }
      console.log(`[SCHEDULED-SYNC] Next sync scheduled for: ${nextImportDate.toISOString()}`);
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
      },
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
      },
    );
  }
});
