import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, storeId, dryRun = true } = await req.json();

    console.log(`[CLEANUP] Starting duplicate image cleanup for user ${userId}, store ${storeId}, dryRun: ${dryRun}`);

    // STEP 1: Find all duplicate images by shopify_image_id
    // Keep only the oldest image per (product_id, shopify_image_id) combination
    const { data: duplicates, error: findError } = await supabaseClient.rpc('find_duplicate_images', {
      p_user_id: userId,
      p_store_id: storeId
    });

    if (findError) {
      // If RPC doesn't exist, use fallback query
      console.log("[CLEANUP] RPC not found, using manual query...");
      
      // Get all product IDs for this user/store
      let productsQuery = supabaseClient
        .from('shopify_products')
        .select('id')
        .eq('seller_id', userId);
      
      if (storeId) {
        productsQuery = productsQuery.eq('store_id', storeId);
      }
      
      const { data: products, error: productsError } = await productsQuery;
      
      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }
      
      const productIds = products?.map(p => p.id) || [];
      console.log(`[CLEANUP] Found ${productIds.length} products to check`);
      
      if (productIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No products found", deletedCount: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Find duplicates: images with same shopify_image_id on same product
      const { data: allImages, error: imagesError } = await supabaseClient
        .from('product_images')
        .select('id, product_id, shopify_image_id, src, created_at, is_ai_generated')
        .in('product_id', productIds)
        .not('shopify_image_id', 'is', null)
        .order('created_at', { ascending: true });
      
      if (imagesError) {
        throw new Error(`Failed to fetch images: ${imagesError.message}`);
      }
      
      console.log(`[CLEANUP] Found ${allImages?.length || 0} images with shopify_image_id`);
      
      // Group by product_id + shopify_image_id and find duplicates
      const imageGroups = new Map<string, typeof allImages>();
      
      for (const img of allImages || []) {
        const key = `${img.product_id}-${img.shopify_image_id}`;
        if (!imageGroups.has(key)) {
          imageGroups.set(key, []);
        }
        imageGroups.get(key)!.push(img);
      }
      
      // Collect IDs to delete (keep the first/oldest one)
      const idsToDelete: string[] = [];
      let duplicateGroups = 0;
      
      for (const [key, images] of imageGroups) {
        if (images.length > 1) {
          duplicateGroups++;
          // Keep the first (oldest), mark others for deletion
          for (let i = 1; i < images.length; i++) {
            idsToDelete.push(images[i].id);
          }
        }
      }
      
      console.log(`[CLEANUP] Found ${duplicateGroups} groups with duplicates, ${idsToDelete.length} images to delete`);
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            success: true,
            dryRun: true,
            duplicateGroups,
            imagesToDelete: idsToDelete.length,
            sampleIds: idsToDelete.slice(0, 10)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Actually delete the duplicates
      if (idsToDelete.length > 0) {
        const BATCH_SIZE = 100;
        let deletedCount = 0;
        
        for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
          const batch = idsToDelete.slice(i, i + BATCH_SIZE);
          const { error: deleteError } = await supabaseClient
            .from('product_images')
            .delete()
            .in('id', batch);
          
          if (deleteError) {
            console.error(`[CLEANUP] Error deleting batch: ${deleteError.message}`);
          } else {
            deletedCount += batch.length;
            console.log(`[CLEANUP] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${deletedCount}`);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            dryRun: false,
            duplicateGroups,
            deletedCount
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "No duplicates found", deletedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, duplicates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CLEANUP] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
