import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check handler
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { storeId } = body;

    if (!storeId) {
      throw new Error('storeId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`🗑️ Starting COMPLETE deletion for store ${storeId} by user ${user.id}`);

    // Step 1: Mark connection as inactive immediately
    const { error: deactivateError } = await supabaseClient
      .from('shopify_connections')
      .update({ is_active: false })
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (deactivateError) {
      console.error('Error deactivating store:', deactivateError);
      throw deactivateError;
    }

    console.log('✅ Store marked as inactive');

    // Step 2: Get all product IDs for this store
    const { data: products, error: productsError } = await supabaseClient
      .from('shopify_products')
      .select('id')
      .eq('store_id', storeId);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    const productIds = products?.map(p => p.id) || [];
    console.log(`📦 Found ${productIds.length} products to delete`);

    const batchSize = 100;
    const stats: Record<string, number> = {
      products: productIds.length,
      variants: 0,
      images: 0,
      landingPages: 0,
    };
    
    // Step 3: Delete product-related data in batches
    if (productIds.length > 0) {
      // Delete product variants
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError, count } = await supabaseClient
          .from('product_variants')
          .delete()
          .in('product_id', batch);

        if (deleteError) {
          console.error('Error deleting variants batch:', deleteError);
        } else {
          stats.variants += count || 0;
        }
      }
      console.log(`✅ Deleted ${stats.variants} product variants`);

      // Delete product images
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError, count } = await supabaseClient
          .from('product_images')
          .delete()
          .in('product_id', batch);

        if (deleteError) {
          console.error('Error deleting images batch:', deleteError);
        } else {
          stats.images += count || 0;
        }
      }
      console.log(`✅ Deleted ${stats.images} product images`);

      // Delete product landing pages (uses product_id, NOT store_id)
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError, count } = await supabaseClient
          .from('product_landing_pages')
          .delete()
          .in('product_id', batch);

        if (deleteError) {
          console.error('Error deleting landing pages batch:', deleteError);
        } else {
          stats.landingPages += count || 0;
        }
      }
      console.log(`✅ Deleted ${stats.landingPages} product landing pages`);

      // Delete landing page history
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        await supabaseClient
          .from('landing_page_history')
          .delete()
          .in('product_id', batch);
      }
      console.log('✅ Deleted landing page history');

      // Delete product image history
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        await supabaseClient
          .from('product_image_history')
          .delete()
          .in('product_id', batch);
      }
      console.log('✅ Deleted product image history');

      // Delete variant pricing analyses
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        await supabaseClient
          .from('variant_pricing_analyses')
          .delete()
          .in('product_id', batch);
      }
      console.log('✅ Deleted variant pricing analyses');

      // Delete products
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabaseClient
          .from('shopify_products')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error('Error deleting products batch:', deleteError);
        }
      }
      console.log(`✅ Deleted ${productIds.length} products`);
    }

    // Step 4: Delete all store-related data from tables with store_id
    // COMPLETE list of ALL tables that have store_id column
    const tablesToCleanByStoreId = [
      'shopify_collections',
      'shopify_pages',
      'blog_articles',
      'blog_netlinking',
      'blog_opportunities',
      'blog_campaigns',
      'content_images',
      'import_jobs',
      'sync_logs',
      'sync_history',
      'homepage_images',
      'homepage_seo',
      'seo_audit_reports',
      'seo_audit_history',
      'shopify_sync_settings',
      'price_scan_results',
      'landing_page_preferences',
      'chat_order_tracking',
      'collection_image_history',
      'article_image_history',
    ];

    for (const table of tablesToCleanByStoreId) {
      try {
        const { error, count } = await supabaseClient
          .from(table)
          .delete()
          .eq('store_id', storeId);

        if (error) {
          console.error(`❌ Error deleting from ${table}:`, error.message);
        } else {
          console.log(`✅ Cleaned ${table} (${count || 0} rows)`);
          stats[table] = count || 0;
        }
      } catch (e) {
        console.error(`❌ Error cleaning ${table}:`, e);
      }
    }

    // Step 5: Delete user_activity related to this store
    try {
      const { error } = await supabaseClient
        .from('user_activity')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);
      
      if (!error) {
        console.log('✅ Cleaned user_activity');
      }
    } catch (e) {
      console.log('ℹ️ user_activity table may not exist or has different structure');
    }

    // Step 6: Finally delete the connection itself
    const { error: deleteConnectionError } = await supabaseClient
      .from('shopify_connections')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (deleteConnectionError) {
      console.error('Error deleting connection:', deleteConnectionError);
      throw deleteConnectionError;
    }

    console.log('🎉 Store connection and ALL related data deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Store and all related data deleted successfully',
        stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in delete-shopify-connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
