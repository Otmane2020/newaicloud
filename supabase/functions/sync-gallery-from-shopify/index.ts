import "../_shared/strict-ai-generation.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

// GraphQL query to fetch ALL images for a product
const GET_PRODUCT_IMAGES = `
  query GetProductImages($id: ID!) {
    product(id: $id) {
      id
      title
      media(first: 250) {
        edges {
          node {
            ... on MediaImage {
              id
              image {
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
  }
`;

async function fetchShopifyProductImages(
  storeUrl: string,
  accessToken: string,
  shopifyProductId: string | number
): Promise<{ shopifyMediaId: string; url: string; altText: string | null; position: number }[]> {
  const endpoint = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query: GET_PRODUCT_IMAGES,
      variables: {
        id: `gid://shopify/Product/${shopifyProductId}`,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  const media = result.data?.product?.media?.edges || [];
  
  return media
    .filter((edge: any) => edge.node.image?.url)
    .map((edge: any, index: number) => {
      // Extract numeric ID from gid://shopify/MediaImage/123456
      const gidMatch = edge.node.id?.match(/\/(\d+)$/);
      const numericId = gidMatch ? gidMatch[1] : null;
      
      return {
        shopifyMediaId: numericId,
        url: edge.node.image.url,
        altText: edge.node.image.altText,
        position: index + 1,
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { userId, productId, storeId, dryRun = false } = body;

    if (!userId) {
      throw new Error('userId is required');
    }

    if (!productId) {
      throw new Error('productId is required');
    }

    console.log(`[SYNC-GALLERY] Starting gallery sync for product ${productId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('shopify_products')
      .select('id, shopify_id, title, store_id')
      .eq('id', productId)
      .eq('seller_id', userId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message}`);
    }

    const effectiveStoreId = storeId || product.store_id;

    // Get Shopify connection
    const { data: connection, error: connError } = await supabase
      .from('shopify_connections')
      .select('id, store_url, access_token')
      .eq('id', effectiveStoreId)
      .single();

    if (connError || !connection?.access_token) {
      throw new Error(`Shopify connection not found: ${connError?.message}`);
    }

    // Fetch ALL images from Shopify
    console.log(`[SYNC-GALLERY] Fetching images from Shopify for product ${product.shopify_id}...`);
    const shopifyImages = await fetchShopifyProductImages(
      connection.store_url,
      connection.access_token,
      product.shopify_id
    );
    console.log(`[SYNC-GALLERY] Found ${shopifyImages.length} images on Shopify`);

    // Get current NewAI images
    const { data: currentImages, error: currentError } = await supabase
      .from('product_images')
      .select('id, src, shopify_image_id, is_ai_generated, position, alt_text')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (currentError) {
      throw new Error(`Failed to fetch current images: ${currentError.message}`);
    }

    console.log(`[SYNC-GALLERY] Current NewAI images: ${currentImages?.length || 0}`);

    // Separate AI-generated images from Shopify-imported images
    const aiGeneratedImages = currentImages?.filter(img => img.is_ai_generated === true) || [];
    const shopifyImportedImages = currentImages?.filter(img => img.is_ai_generated !== true) || [];

    console.log(`[SYNC-GALLERY] AI-generated images: ${aiGeneratedImages.length}`);
    console.log(`[SYNC-GALLERY] Shopify-imported images: ${shopifyImportedImages.length}`);

    // Filter Shopify images - exclude AI-generated ones that were synced back
    const shopifyImagesToImport = shopifyImages.filter(img => {
      const url = img.url || '';
      const isAIImage = url.includes('ai_generated_') || 
                        url.includes('ai-generated-') ||
                        url.includes('/generated-images/');
      if (isAIImage) {
        console.log(`[SYNC-GALLERY] Skipping AI-reimport: ${url.substring(0, 60)}...`);
      }
      return !isAIImage;
    });

    console.log(`[SYNC-GALLERY] Shopify images to sync (excluding AI): ${shopifyImagesToImport.length}`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          shopifyTotal: shopifyImages.length,
          shopifyToSync: shopifyImagesToImport.length,
          currentTotal: currentImages?.length || 0,
          aiGenerated: aiGeneratedImages.length,
          shopifyImported: shopifyImportedImages.length,
          shopifyImages: shopifyImagesToImport.map(img => ({
            id: img.shopifyMediaId,
            position: img.position,
            url: img.url.substring(0, 80) + '...',
          })),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of existing images by shopify_image_id for quick lookup
    const existingByShopifyId = new Map(
      shopifyImportedImages
        .filter(img => img.shopify_image_id)
        .map(img => [String(img.shopify_image_id), img])
    );

    // Create a map of existing images by src for fallback matching
    const existingBySrc = new Map(
      shopifyImportedImages.map(img => [img.src, img])
    );

    const imagesToInsert: any[] = [];
    const imagesToUpdate: any[] = [];
    const shopifyIdsInGallery = new Set<string>();

    for (const shopifyImg of shopifyImagesToImport) {
      const shopifyId = shopifyImg.shopifyMediaId;
      if (shopifyId) {
        shopifyIdsInGallery.add(shopifyId);
      }

      // Check if image already exists
      let existingImage = shopifyId ? existingByShopifyId.get(shopifyId) : null;
      
      // Fallback: check by URL if no ID match
      if (!existingImage) {
        existingImage = existingBySrc.get(shopifyImg.url);
      }

      if (existingImage) {
        // Update position and alt text if changed
        if (existingImage.position !== shopifyImg.position || existingImage.alt_text !== shopifyImg.altText) {
          imagesToUpdate.push({
            id: existingImage.id,
            position: shopifyImg.position,
            alt_text: shopifyImg.altText || existingImage.alt_text,
            shopify_image_id: shopifyId ? Number(shopifyId) : existingImage.shopify_image_id,
          });
        }
      } else {
        // New image to insert
        imagesToInsert.push({
          product_id: productId,
          user_id: userId,
          src: shopifyImg.url,
          alt_text: shopifyImg.altText || '',
          position: shopifyImg.position,
          shopify_image_id: shopifyId ? Number(shopifyId) : null,
          is_ai_generated: false,
        });
      }
    }

    // Find Shopify-imported images that are no longer in Shopify gallery
    const imagesToDelete = shopifyImportedImages.filter(img => {
      // Don't delete if no shopify_image_id - we can't confirm it's from Shopify
      if (!img.shopify_image_id) return false;
      return !shopifyIdsInGallery.has(String(img.shopify_image_id));
    });

    console.log(`[SYNC-GALLERY] To insert: ${imagesToInsert.length}`);
    console.log(`[SYNC-GALLERY] To update: ${imagesToUpdate.length}`);
    console.log(`[SYNC-GALLERY] To delete (removed from Shopify): ${imagesToDelete.length}`);

    // Execute database operations
    let insertedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    if (imagesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('product_images')
        .insert(imagesToInsert);

      if (insertError) {
        console.error(`[SYNC-GALLERY] Insert error:`, insertError);
      } else {
        insertedCount = imagesToInsert.length;
      }
    }

    for (const update of imagesToUpdate) {
      const { id, ...updateData } = update;
      const { error: updateError } = await supabase
        .from('product_images')
        .update(updateData)
        .eq('id', id);

      if (!updateError) {
        updatedCount++;
      }
    }

    if (imagesToDelete.length > 0) {
      const idsToDelete = imagesToDelete.map(img => img.id);
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .in('id', idsToDelete);

      if (!deleteError) {
        deletedCount = imagesToDelete.length;
      }
    }

    console.log(`[SYNC-GALLERY] ✅ Completed: ${insertedCount} inserted, ${updatedCount} updated, ${deletedCount} deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        product: product.title,
        shopifyTotal: shopifyImages.length,
        aiGenerated: aiGeneratedImages.length,
        inserted: insertedCount,
        updated: updatedCount,
        deleted: deletedCount,
        finalCount: (currentImages?.length || 0) + insertedCount - deletedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SYNC-GALLERY] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
