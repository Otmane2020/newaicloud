import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize URL: remove query params and Shopify UUID suffixes
const normalizeUrl = (url?: string | null): string => {
  if (!url) return "";
  const base = url.split("?")[0];
  // Remove UUID suffix that Shopify adds: file_123e4567-e89b-12d3-a456-426614174000.jpg -> file.jpg
  return base.replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$)/i, "");
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

    const { userId, storeId, productId, dryRun = true } = await req.json();

    console.log(`[CLEANUP] Starting cleanup for user ${userId}, store ${storeId}, product ${productId || 'ALL'}, dryRun: ${dryRun}`);

    // Get all products to check
    let productsQuery = supabaseClient
      .from('shopify_products')
      .select('id, title')
      .eq('seller_id', userId);
    
    if (storeId) {
      productsQuery = productsQuery.eq('store_id', storeId);
    }
    
    if (productId) {
      productsQuery = productsQuery.eq('id', productId);
    }
    
    const { data: products, error: productsError } = await productsQuery;
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }
    
    const productIds = products?.map(p => p.id) || [];
    console.log(`[CLEANUP] Found ${productIds.length} products to check`);
    
    if (productIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No products found", stats: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all images for these products
    const { data: allImages, error: imagesError } = await supabaseClient
      .from('product_images')
      .select('id, product_id, shopify_image_id, src, created_at, is_ai_generated, shopify_sync_count')
      .in('product_id', productIds)
      .order('created_at', { ascending: true });
    
    if (imagesError) {
      throw new Error(`Failed to fetch images: ${imagesError.message}`);
    }

    console.log(`[CLEANUP] Found ${allImages?.length || 0} total images`);

    // Group images by product
    const imagesByProduct = new Map<string, typeof allImages>();
    for (const img of allImages || []) {
      if (!imagesByProduct.has(img.product_id)) {
        imagesByProduct.set(img.product_id, []);
      }
      imagesByProduct.get(img.product_id)!.push(img);
    }

    const idsToDelete: string[] = [];
    const stats = {
      productsAnalyzed: 0,
      aiReimportedDeleted: 0,
      duplicateShopifyDeleted: 0,
      duplicateNormalizedUrlDeleted: 0,
      duplicateAiImagesDeleted: 0,
      aiImagesKept: 0,
      shopifyImagesKept: 0
    };

    for (const [prodId, images] of imagesByProduct) {
      stats.productsAnalyzed++;
      
      // Separate AI images from Shopify images
      const aiImages = images.filter(img => img.is_ai_generated === true);
      const shopifyImages = images.filter(img => img.is_ai_generated === false || img.is_ai_generated === null);
      
      console.log(`[CLEANUP] Product ${prodId}: ${aiImages.length} AI images, ${shopifyImages.length} Shopify images`);

      // RULE 1: Delete Shopify images that are re-imported AI images
      // These have "ai_generated_" in the URL and a shopify_image_id
      for (const shopifyImg of shopifyImages) {
        const isReimportedAI = shopifyImg.src && (
          shopifyImg.src.includes('ai_generated_') || 
          shopifyImg.src.includes('ai-generated-') ||
          shopifyImg.src.includes('/generated-images/')
        );
        
        if (isReimportedAI && shopifyImg.shopify_image_id) {
          console.log(`[CLEANUP] Marking for deletion (re-imported AI): ${shopifyImg.id}`);
          idsToDelete.push(shopifyImg.id);
          stats.aiReimportedDeleted++;
        }
      }

      // RULE 2: Delete duplicate Shopify images (same shopify_image_id)
      const shopifyIdGroups = new Map<number, typeof shopifyImages>();
      for (const img of shopifyImages) {
        if (img.shopify_image_id && !idsToDelete.includes(img.id)) {
          if (!shopifyIdGroups.has(img.shopify_image_id)) {
            shopifyIdGroups.set(img.shopify_image_id, []);
          }
          shopifyIdGroups.get(img.shopify_image_id)!.push(img);
        }
      }
      
      for (const [shopifyId, dupes] of shopifyIdGroups) {
        if (dupes.length > 1) {
          // Keep the oldest, delete the rest
          for (let i = 1; i < dupes.length; i++) {
            console.log(`[CLEANUP] Marking for deletion (duplicate shopify_id ${shopifyId}): ${dupes[i].id}`);
            idsToDelete.push(dupes[i].id);
            stats.duplicateShopifyDeleted++;
          }
        }
      }

      // RULE 3: Delete duplicates based on normalized URL (removes ?v= and UUID suffixes)
      // This catches images that look identical but have slightly different URLs
      const normalizedUrlGroups = new Map<string, typeof shopifyImages>();
      for (const img of shopifyImages) {
        if (!idsToDelete.includes(img.id) && img.src) {
          const normalizedSrc = normalizeUrl(img.src);
          if (!normalizedUrlGroups.has(normalizedSrc)) {
            normalizedUrlGroups.set(normalizedSrc, []);
          }
          normalizedUrlGroups.get(normalizedSrc)!.push(img);
        }
      }

      for (const [normalizedSrc, dupes] of normalizedUrlGroups) {
        if (dupes.length > 1) {
          // Keep the one with shopify_image_id if possible, or the oldest
          dupes.sort((a, b) => {
            // Prefer entries with shopify_image_id
            if (a.shopify_image_id && !b.shopify_image_id) return -1;
            if (!a.shopify_image_id && b.shopify_image_id) return 1;
            // Otherwise keep oldest
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          for (let i = 1; i < dupes.length; i++) {
            console.log(`[CLEANUP] Marking for deletion (duplicate normalized URL): ${dupes[i].id} - ${normalizedSrc}`);
            idsToDelete.push(dupes[i].id);
            stats.duplicateNormalizedUrlDeleted++;
          }
        }
      }

      // RULE 4: Delete duplicate AI images based on normalized URL
      // AI images can also have duplicates with slightly different URLs
      const aiNormalizedUrlGroups = new Map<string, typeof aiImages>();
      for (const img of aiImages) {
        if (!idsToDelete.includes(img.id) && img.src) {
          const normalizedSrc = normalizeUrl(img.src);
          if (!aiNormalizedUrlGroups.has(normalizedSrc)) {
            aiNormalizedUrlGroups.set(normalizedSrc, []);
          }
          aiNormalizedUrlGroups.get(normalizedSrc)!.push(img);
        }
      }

      for (const [normalizedSrc, dupes] of aiNormalizedUrlGroups) {
        if (dupes.length > 1) {
          // Keep the oldest AI image, delete the rest
          dupes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          for (let i = 1; i < dupes.length; i++) {
            console.log(`[CLEANUP] Marking for deletion (duplicate AI image): ${dupes[i].id} - ${normalizedSrc}`);
            idsToDelete.push(dupes[i].id);
            stats.duplicateAiImagesDeleted++;
          }
        }
      }

      // Count what we're keeping
      stats.aiImagesKept += aiImages.filter(img => !idsToDelete.includes(img.id)).length;
      stats.shopifyImagesKept += shopifyImages.filter(img => !idsToDelete.includes(img.id)).length;
    }

    console.log(`[CLEANUP] Total to delete: ${idsToDelete.length}`);
    console.log(`[CLEANUP] Stats:`, stats);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          imagesToDelete: idsToDelete.length,
          stats,
          sampleIdsToDelete: idsToDelete.slice(0, 20)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actually delete the duplicates
    let deletedCount = 0;
    if (idsToDelete.length > 0) {
      const BATCH_SIZE = 100;
      
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        deletedCount,
        stats
      }),
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