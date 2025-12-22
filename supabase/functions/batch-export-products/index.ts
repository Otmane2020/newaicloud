import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportResult {
  productId: string;
  shopifyId: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { 
      serviceMode, 
      userId, 
      storeId,
      batchSize = 50,
      onlyNeedsExport = true // Only export products with needs_export = true
    } = body;

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`[BATCH-EXPORT] Starting batch export for user ${userId}, store ${storeId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query for products to export
    let query = supabase
      .from('shopify_products')
      .select('id, shopify_id, title, regenerated_title, optimized_title, seo_title, seo_description, needs_export, last_exported_at, store_id')
      .eq('seller_id', userId);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (onlyNeedsExport) {
      query = query.eq('needs_export', true);
    }

    const { data: products, error: productsError } = await query.limit(batchSize);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      console.log('[BATCH-EXPORT] No products to export');
      return new Response(
        JSON.stringify({ success: true, exported: 0, message: 'No products to export' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BATCH-EXPORT] Found ${products.length} products to export`);

    const results: ExportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Export each product by calling sync-seo-to-shopify
    for (const product of products) {
      try {
        console.log(`[BATCH-EXPORT] Exporting product ${product.id} (${product.regenerated_title || product.title})`);

        const { data, error } = await supabase.functions.invoke('sync-seo-to-shopify', {
          body: {
            serviceMode: true,
            userId,
            productId: product.id,
            force: true // Bypass throttling
          }
        });

        if (error) {
          throw error;
        }

        // Mark product as exported
        await supabase
          .from('shopify_products')
          .update({
            needs_export: false,
            last_exported_at: new Date().toISOString(),
            seo_synced_to_shopify: true,
            last_seo_sync_at: new Date().toISOString()
          })
          .eq('id', product.id);

        results.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          success: true
        });
        successCount++;
        
        console.log(`[BATCH-EXPORT] ✅ Product ${product.id} exported successfully`);
      } catch (productError: any) {
        console.error(`[BATCH-EXPORT] ❌ Failed to export product ${product.id}:`, productError);
        results.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          success: false,
          error: productError.message || 'Unknown error'
        });
        errorCount++;
      }
    }

    // Update sync settings last_export_at
    if (storeId) {
      await supabase
        .from('shopify_sync_settings')
        .update({ last_export_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('store_id', storeId);
    }

    console.log(`[BATCH-EXPORT] ✅ Completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        exported: successCount,
        errors: errorCount,
        total: products.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BATCH-EXPORT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
