import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('🧹 Starting EURODESIGN cleanup for user:', user.id);

    // Step 1: Find all EURODESIGN products for this user across all stores
    const { data: eurodesignProducts, error: findError } = await supabase
      .from('shopify_products')
      .select('id, title, vendor, store_id, seller_id')
      .eq('seller_id', user.id)
      .eq('vendor', 'EURODESIGN');

    if (findError) {
      console.error('❌ Error finding EURODESIGN products:', findError);
      throw findError;
    }

    if (!eurodesignProducts || eurodesignProducts.length === 0) {
      console.log('✅ No EURODESIGN products found');
      return new Response(
        JSON.stringify({
          success: true,
          productsDeleted: 0,
          message: 'Aucun produit EURODESIGN trouvé'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📦 Found ${eurodesignProducts.length} EURODESIGN products to delete`);

    const productIds = eurodesignProducts.map(p => p.id);
    const BATCH_SIZE = 20; // Reduced batch size for safety
    
    console.log(`📊 Total batches: ${Math.ceil(productIds.length / BATCH_SIZE)}`);

    // Step 2: Backup to decora_home_backup_products (in batches)
    for (let i = 0; i < eurodesignProducts.length; i += BATCH_SIZE) {
      const batch = eurodesignProducts.slice(i, i + BATCH_SIZE);
      const { error: backupProductsError } = await supabase
        .from('decora_home_backup_products')
        .insert(
          batch.map(p => ({
            original_product_id: p.id,
            backup_reason: 'Vendor EURODESIGN - Manual cleanup',
            store_id: p.store_id,
            seller_id: p.seller_id,
            vendor: p.vendor,
            title: p.title,
          }))
        );

      if (backupProductsError) {
        console.error('❌ Error backing up products batch:', backupProductsError);
        throw backupProductsError;
      }
    }

    console.log('✅ Products backed up successfully');

    // Step 3: Delete related data in batches
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      const batchNum = i / BATCH_SIZE + 1;
      const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
      
      console.log(`🗑️ Processing deletion batch ${batchNum}/${totalBatches} (${batch.length} products)`);

      // Delete product_variants
      try {
        console.log(`  ⏳ Deleting variants for batch ${batchNum}...`);
        const { error: variantsError, count } = await supabase
          .from('product_variants')
          .delete()
          .in('product_id', batch);

        if (variantsError) {
          console.error(`❌ Error deleting variants in batch ${batchNum}:`, JSON.stringify(variantsError));
          throw new Error(`Variants deletion failed: ${variantsError.message || JSON.stringify(variantsError)}`);
        }
        console.log(`  ✅ Variants deleted for batch ${batchNum}`);
      } catch (err) {
        console.error(`❌ Exception deleting variants in batch ${batchNum}:`, err);
        throw err;
      }

      // Delete product_images
      try {
        console.log(`  ⏳ Deleting images for batch ${batchNum}...`);
        const { error: imagesError } = await supabase
          .from('product_images')
          .delete()
          .in('product_id', batch);

        if (imagesError) {
          console.error(`❌ Error deleting images in batch ${batchNum}:`, JSON.stringify(imagesError));
          throw new Error(`Images deletion failed: ${imagesError.message || JSON.stringify(imagesError)}`);
        }
        console.log(`  ✅ Images deleted for batch ${batchNum}`);
      } catch (err) {
        console.error(`❌ Exception deleting images in batch ${batchNum}:`, err);
        throw err;
      }

      // Delete landing_page_history (non-critical)
      console.log(`  ⏳ Deleting landing page history for batch ${batchNum}...`);
      await supabase.from('landing_page_history').delete().in('product_id', batch);

      // Delete product_image_history (non-critical)
      console.log(`  ⏳ Deleting image history for batch ${batchNum}...`);
      await supabase.from('product_image_history').delete().in('product_id', batch);

      // Delete product_landing_pages (non-critical)
      console.log(`  ⏳ Deleting landing pages for batch ${batchNum}...`);
      await supabase.from('product_landing_pages').delete().in('product_id', batch);
      
      console.log(`✅ Batch ${batchNum}/${totalBatches} completed`);
    }

    console.log('✅ All related data deleted');

    // Step 4: Delete the products themselves (in batches)
    console.log('🗑️ Starting product deletion...');
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      const batchNum = i / BATCH_SIZE + 1;
      const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
      
      try {
        console.log(`  ⏳ Deleting products batch ${batchNum}/${totalBatches}...`);
        const { error: deleteError } = await supabase
          .from('shopify_products')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`❌ Error deleting products in batch ${batchNum}:`, JSON.stringify(deleteError));
          throw new Error(`Products deletion failed: ${deleteError.message || JSON.stringify(deleteError)}`);
        }
        console.log(`  ✅ Products deleted for batch ${batchNum}/${totalBatches}`);
      } catch (err) {
        console.error(`❌ Exception deleting products in batch ${batchNum}:`, err);
        throw err;
      }
    }

    console.log('✅ All products deleted successfully');

    // Step 9: Update usage tracking
    const { data: currentUsage } = await supabase
      .from('usage_tracking')
      .select('products_count')
      .eq('seller_id', user.id)
      .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .single();

    if (currentUsage) {
      const newCount = Math.max(0, currentUsage.products_count - eurodesignProducts.length);
      
      await supabase
        .from('usage_tracking')
        .update({ 
          products_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id)
        .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      console.log(`✅ Usage tracking updated: ${currentUsage.products_count} → ${newCount}`);
    }

    // Step 10: Log the operation
    await supabase
      .from('decora_home_backup_metadata')
      .insert({
        operation_type: 'delete_eurodesign_manual',
        store_id: eurodesignProducts[0]?.store_id || null,
        store_name: 'Decora Home',
        products_backed_up: eurodesignProducts.length,
        products_deleted: eurodesignProducts.length,
        operation_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          deleted_product_ids: productIds,
          user_id: user.id
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        productsDeleted: eurodesignProducts.length,
        productIds: productIds,
        message: `${eurodesignProducts.length} produits EURODESIGN supprimés avec succès`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in cleanup-eurodesign-products function:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      };
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
      errorDetails = error;
    } else {
      errorMessage = String(error);
    }
    
    console.error('📋 Error details:', JSON.stringify(errorDetails, null, 2));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
