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
    const { storeId } = await req.json();

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

    console.log(`🗑️ Starting deletion for store ${storeId} by user ${user.id}`);

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
    console.log(`Found ${productIds.length} products to delete`);

    // Step 3: Delete data in batches
    const batchSize = 100;
    
    // Delete product variants in batches
    if (productIds.length > 0) {
      let variantsDeleted = 0;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabaseClient
          .from('product_variants')
          .delete()
          .in('product_id', batch);

        if (deleteError) {
          console.error('Error deleting variants batch:', deleteError);
        } else {
          variantsDeleted += batch.length;
          console.log(`🗑️ Processed variants for ${variantsDeleted} products`);
        }
      }

      // Delete product images in batches
      let imagesDeleted = 0;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabaseClient
          .from('product_images')
          .delete()
          .in('product_id', batch);

        if (deleteError) {
          console.error('Error deleting images batch:', deleteError);
        } else {
          imagesDeleted += batch.length;
          console.log(`🗑️ Processed images for ${imagesDeleted} products`);
        }
      }

      // Delete products in batches
      let productsDeleted = 0;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabaseClient
          .from('shopify_products')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error('Error deleting products batch:', deleteError);
        } else {
          productsDeleted += batch.length;
          console.log(`🗑️ Deleted ${productsDeleted} products`);
        }
      }
    }

    // Delete other related data
    const tablesToClean = [
      'shopify_collections',
      'shopify_pages',
      'blog_articles',
      'blog_netlinking',
      'blog_opportunities',
      'content_images',
      'product_landing_pages',
      'import_jobs',
      'sync_logs',
      'sync_history'
    ];

    for (const table of tablesToClean) {
      try {
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq('store_id', storeId);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        } else {
          console.log(`✅ Cleaned ${table}`);
        }
      } catch (e) {
        console.error(`Error cleaning ${table}:`, e);
      }
    }

    // Step 4: Finally delete the connection itself
    const { error: deleteConnectionError } = await supabaseClient
      .from('shopify_connections')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (deleteConnectionError) {
      console.error('Error deleting connection:', deleteConnectionError);
      throw deleteConnectionError;
    }

    console.log('✅ Store connection deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Store deleted successfully',
        stats: {
          products: productIds.length
        }
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
