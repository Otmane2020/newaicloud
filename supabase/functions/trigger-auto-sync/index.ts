import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log('🚀 Starting auto-sync for user:', user_id);

    // Get active Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (connectionError || !connection) {
      console.log('⚠️ No active Shopify connection found for user:', user_id);
      return new Response(
        JSON.stringify({ success: true, message: 'No Shopify connection to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get sync settings
    const { data: settings } = await supabase
      .from('shopify_sync_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const importTypes = settings?.import_types || ['products', 'collections', 'pages', 'articles', 'images'];

    // Clean the shop name
    let cleanShopName = (connection.store_url || '')
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com.*$/, '')
      .replace(/\/$/, '');

    // Create sync history entry
    const { data: historyEntry } = await supabase
      .from('sync_history')
      .insert({
        user_id: user_id,
        sync_type: 'import',
        content_types: importTypes,
        status: 'running',
      })
      .select()
      .single();

    console.log('📝 Created sync history entry:', historyEntry?.id);

    // Launch sync in background
    const startTime = Date.now();
    let totalImported = 0;
    let hasErrors = false;
    let collectionsImported = false;
    let productsImported = false;

    // Import based on selected types
    for (const type of importTypes) {
      try {
        console.log(`📥 Importing ${type}...`);
        let result;
        switch (type) {
          case 'products':
            result = await supabase.functions.invoke('import-products', {
              body: {
                storeId: connection.id,
                shopName: cleanShopName,
                apiSecret: connection.access_token,
              }
            });
            productsImported = true;
            break;
          case 'collections':
            result = await supabase.functions.invoke('import-shopify-collections');
            collectionsImported = true;
            break;
          case 'pages':
            result = await supabase.functions.invoke('import-shopify-pages');
            break;
          case 'articles':
            result = await supabase.functions.invoke('import-shopify-articles', {
              body: {
                storeId: connection.id,
                shopName: cleanShopName,
                authToken: connection.access_token,
              }
            });
            break;
          case 'images':
            result = await supabase.functions.invoke('import-content-images', {
              body: {
                storeId: connection.id,
                types: ['collections', 'pages', 'articles', 'homepage']
              }
            });
            break;
        }

        if (result?.error) {
          console.error(`❌ Error importing ${type}:`, result.error);
          hasErrors = true;
        } else if (result?.data?.totalImported) {
          totalImported += result.data.totalImported;
        } else if (result?.data?.imported) {
          totalImported += result.data.imported;
        } else if (result?.data?.count) {
          totalImported += result.data.count;
        }
        
        console.log(`✅ ${type} import completed`);
      } catch (error) {
        console.error(`❌ Error importing ${type}:`, error);
        hasErrors = true;
      }
    }

    // CRITICAL: Synchronize product-collection relationships if both were imported
    if (collectionsImported && productsImported) {
      try {
        console.log('🔄 Synchronizing product-collection relationships...');
        const syncResult = await supabase.functions.invoke('sync-product-collections');
        
        if (syncResult?.error) {
          console.error('❌ Error syncing product-collections:', syncResult.error);
          hasErrors = true;
        } else {
          console.log('✅ Product-collection relationships synchronized');
          if (syncResult?.data?.updated_count) {
            totalImported += syncResult.data.updated_count;
          }
        }
      } catch (error) {
        console.error('❌ Error in product-collection sync:', error);
        hasErrors = true;
      }
    }

    const duration = Date.now() - startTime;

    // Update history
    if (historyEntry) {
      await supabase
        .from('sync_history')
        .update({
          status: hasErrors ? 'failed' : 'success',
          items_synced: totalImported,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
          error_message: hasErrors ? 'Some imports failed - check logs' : null
        })
        .eq('id', historyEntry.id);
    }

    // Update last import timestamp
    await supabase
      .from('shopify_sync_settings')
      .update({ last_import_at: new Date().toISOString() })
      .eq('user_id', user_id);

    console.log(`✅ Auto-sync completed: ${totalImported} items imported in ${Math.round(duration / 1000)}s`);

    return new Response(
      JSON.stringify({
        success: true,
        items_synced: totalImported,
        duration_ms: duration,
        has_errors: hasErrors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Auto-sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
