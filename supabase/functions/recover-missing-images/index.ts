import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Extract numeric ID from Shopify GID
function extractNumericId(gid: string | null): number | null {
  if (!gid) return null;
  const match = gid.match(/(ProductImage|Image|MediaImage|Product|ProductVariant)\/(\d+)/);
  return match ? parseInt(match[2]) : null;
}

interface RecoveryResult {
  success: boolean;
  productsProcessed: number;
  imagesRecovered: number;
  errors: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  
  // Health check
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get parameters
    const { userId, storeId, productIds, batchSize = 20, dryRun = false } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 [RECOVER-IMAGES] Starting recovery for user ${userId}, store ${storeId || 'all'}`);
    console.log(`   - Dry run: ${dryRun}`);
    console.log(`   - Batch size: ${batchSize}`);
    console.log(`   - Specific products: ${productIds?.length || 'all missing'}`);

    // Step 1: Get store connection details
    let storeQuery = supabaseAdmin
      .from('shopify_connections')
      .select('id, store_url, access_token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (storeId) {
      storeQuery = storeQuery.eq('id', storeId);
    }

    const { data: stores, error: storeError } = await storeQuery;

    if (storeError || !stores?.length) {
      console.error('❌ No active store found:', storeError);
      return new Response(
        JSON.stringify({ error: "No active Shopify connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: RecoveryResult = {
      success: true,
      productsProcessed: 0,
      imagesRecovered: 0,
      errors: []
    };

    // Process each store
    for (const store of stores) {
      console.log(`\n📦 Processing store: ${store.store_url}`);
      
      const cleanShopName = store.store_url.replace('.myshopify.com', '');
      const accessToken = store.access_token;

      // Step 2: Find products with missing images
      let productsQuery = supabaseAdmin
        .from('shopify_products')
        .select('id, shopify_id, title, image_url')
        .eq('store_id', store.id)
        .not('shopify_id', 'is', null);

      if (productIds?.length) {
        productsQuery = productsQuery.in('id', productIds);
      }

      const { data: allProducts, error: productsError } = await productsQuery;

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        result.errors.push(`Error fetching products: ${productsError.message}`);
        continue;
      }

      if (!allProducts?.length) {
        console.log('ℹ️ No products found for this store');
        continue;
      }

      console.log(`   Found ${allProducts.length} products in store`);

      // Get existing images to identify missing ones
      const productIdList = allProducts.map(p => p.id);
      
      // Batch check for existing images
      const existingImagesMap = new Map<string, number>();
      const QUERY_BATCH = 100;
      
      for (let i = 0; i < productIdList.length; i += QUERY_BATCH) {
        const batchIds = productIdList.slice(i, i + QUERY_BATCH);
        const { data: imgCounts } = await supabaseAdmin
          .from('product_images')
          .select('product_id')
          .in('product_id', batchIds);
        
        if (imgCounts) {
          for (const img of imgCounts) {
            const count = existingImagesMap.get(img.product_id) || 0;
            existingImagesMap.set(img.product_id, count + 1);
          }
        }
      }

      // Filter to products with 0 images
      const productsWithNoImages = allProducts.filter(p => !existingImagesMap.has(p.id));
      
      console.log(`   🖼️ ${productsWithNoImages.length} products have 0 images in database`);

      if (productsWithNoImages.length === 0) {
        console.log('   ✅ All products have images');
        continue;
      }

      if (dryRun) {
        console.log('   📋 DRY RUN - Would recover images for these products:');
        productsWithNoImages.slice(0, 10).forEach(p => {
          console.log(`      - ${p.title} (shopify_id: ${p.shopify_id})`);
        });
        if (productsWithNoImages.length > 10) {
          console.log(`      ... and ${productsWithNoImages.length - 10} more`);
        }
        result.productsProcessed += productsWithNoImages.length;
        continue;
      }

      // Step 3: Fetch images from Shopify in batches
      const allImagesToInsert: any[] = [];
      const FETCH_BATCH = batchSize;

      for (let i = 0; i < productsWithNoImages.length; i += FETCH_BATCH) {
        const batch = productsWithNoImages.slice(i, i + FETCH_BATCH);
        const batchNum = Math.floor(i / FETCH_BATCH) + 1;
        const totalBatches = Math.ceil(productsWithNoImages.length / FETCH_BATCH);
        
        console.log(`   📸 Batch ${batchNum}/${totalBatches}: Fetching images for ${batch.length} products...`);

        const shopifyIds = batch.map(p => `gid://shopify/Product/${p.shopify_id}`);

        const imageQuery = `
          query getProductImages($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                legacyResourceId
                images(first: 50) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
              }
            }
          }
        `;

        try {
          const response = await fetch(
            `https://${cleanShopName}.myshopify.com/admin/api/2025-01/graphql.json`,
            {
              method: 'POST',
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: imageQuery,
                variables: { ids: shopifyIds }
              })
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`   ❌ Shopify API error: ${response.status}`, errorText);
            result.errors.push(`Batch ${batchNum}: Shopify API error ${response.status}`);
            continue;
          }

          const data: any = await response.json();

          if (data.errors) {
            console.error(`   ❌ GraphQL errors:`, data.errors);
            result.errors.push(`Batch ${batchNum}: ${data.errors.map((e: any) => e.message).join(', ')}`);
            continue;
          }

          if (data.data?.nodes) {
            for (const node of data.data.nodes) {
              if (!node || !node.images?.edges?.length) continue;

              const shopifyId = parseInt(node.legacyResourceId);
              const productRecord = batch.find(p => p.shopify_id === shopifyId);
              if (!productRecord) continue;

              const productImages = node.images.edges
                .filter((edge: any) => {
                  // Skip re-imported AI images
                  const url = edge.node.url || '';
                  return !url.includes('ai_generated_') && 
                         !url.includes('ai-generated-') &&
                         !url.includes('/generated-images/');
                })
                .map((edge: any, index: number) => {
                  const numericId = extractNumericId(edge.node.id) || 0;
                  return {
                    product_id: productRecord.id,
                    shopify_image_id: numericId,
                    src: edge.node.url,
                    position: index + 1,
                    alt_text: edge.node.altText || "",
                    width: edge.node.width || null,
                    height: edge.node.height || null,
                    is_ai_generated: false,
                  };
                });

              allImagesToInsert.push(...productImages);
              result.productsProcessed++;
            }
          }
        } catch (fetchError: any) {
          console.error(`   ❌ Fetch error batch ${batchNum}:`, fetchError.message);
          result.errors.push(`Batch ${batchNum}: ${fetchError.message}`);
        }

        // Rate limit protection
        if (i + FETCH_BATCH < productsWithNoImages.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`   📊 Collected ${allImagesToInsert.length} images to insert`);

      // Step 4: Insert images in database
      if (allImagesToInsert.length > 0) {
        const INSERT_BATCH = 50;
        
        for (let i = 0; i < allImagesToInsert.length; i += INSERT_BATCH) {
          const batch = allImagesToInsert.slice(i, i + INSERT_BATCH);
          const batchNum = Math.floor(i / INSERT_BATCH) + 1;
          const totalBatches = Math.ceil(allImagesToInsert.length / INSERT_BATCH);

          const { error: insertError } = await supabaseAdmin
            .from('product_images')
            .upsert(batch, {
              onConflict: 'product_id,shopify_image_id',
              ignoreDuplicates: true
            });

          if (insertError) {
            console.error(`   ❌ Insert error batch ${batchNum}:`, insertError);
            result.errors.push(`Insert batch ${batchNum}: ${insertError.message}`);
          } else {
            result.imagesRecovered += batch.length;
            console.log(`   ✅ Inserted batch ${batchNum}/${totalBatches} (${batch.length} images)`);
          }

          if (i + INSERT_BATCH < allImagesToInsert.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Step 5: Update product image_url for products that had none
      const productsNeedingUrlUpdate = productsWithNoImages.filter(p => !p.image_url);
      if (productsNeedingUrlUpdate.length > 0) {
        console.log(`   🔄 Updating image_url for ${productsNeedingUrlUpdate.length} products...`);
        
        for (const product of productsNeedingUrlUpdate) {
          // Get first image for this product
          const { data: firstImage } = await supabaseAdmin
            .from('product_images')
            .select('src')
            .eq('product_id', product.id)
            .order('position', { ascending: true })
            .limit(1)
            .single();

          if (firstImage?.src) {
            await supabaseAdmin
              .from('shopify_products')
              .update({ image_url: firstImage.src })
              .eq('id', product.id);
          }
        }
      }
    }

    console.log(`\n✅ [RECOVER-IMAGES] Recovery complete:`);
    console.log(`   - Products processed: ${result.productsProcessed}`);
    console.log(`   - Images recovered: ${result.imagesRecovered}`);
    console.log(`   - Errors: ${result.errors.length}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ [RECOVER-IMAGES] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        productsProcessed: 0,
        imagesRecovered: 0,
        errors: [error.message]
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
