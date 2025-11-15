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
    const BATCH_SIZE = 100;

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
      console.log(`🗑️ Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(productIds.length / BATCH_SIZE)}`);

      // Delete product_variants
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .in('product_id', batch);

      if (variantsError) {
        console.error('❌ Error deleting variants:', variantsError);
        throw variantsError;
      }

      // Delete product_images
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .in('product_id', batch);

      if (imagesError) {
        console.error('❌ Error deleting images:', imagesError);
        throw imagesError;
      }

      // Delete landing_page_history
      await supabase
        .from('landing_page_history')
        .delete()
        .in('product_id', batch);

      // Delete product_image_history
      await supabase
        .from('product_image_history')
        .delete()
        .in('product_id', batch);

      // Delete product_landing_pages
      await supabase
        .from('product_landing_pages')
        .delete()
        .in('product_id', batch);
    }

    console.log('✅ Related data deleted');

    // Step 4: Delete the products themselves (in batches)
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      
      const { error: deleteError } = await supabase
        .from('shopify_products')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('❌ Error deleting products:', deleteError);
        throw deleteError;
      }
    }

    console.log('✅ Products deleted successfully');

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
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
