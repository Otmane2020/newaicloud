import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restIdToGid, shopifyGraphQL, handleUserErrors } from "./shopify-graphql.ts";

/**
 * Auto-sync generated image to Shopify after generation
 * This function is called after successful image generation to push the image directly to Shopify
 */

// GraphQL mutation to create product media
const PRODUCT_CREATE_MEDIA_MUTATION = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage {
          id
          alt
          image {
            url
          }
        }
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

export interface AutoSyncResult {
  success: boolean;
  shopifyImageId?: string;
  shopifyImageUrl?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface AutoSyncOptions {
  productId: string;        // Local Supabase product ID
  imageUrl: string;         // Public URL of the generated image
  imageId?: string;         // Local Supabase image ID (if exists)
  altText?: string;         // Alt text for the image
  userId: string;           // User ID for authorization
  autoSyncEnabled?: boolean; // Whether to auto-sync (default: true)
}

/**
 * Automatically syncs a generated image to Shopify
 * 
 * @param options - Sync options including product and image details
 * @returns Result of the sync operation
 */
export async function autoSyncImageToShopify(options: AutoSyncOptions): Promise<AutoSyncResult> {
  const {
    productId,
    imageUrl,
    imageId,
    altText = "",
    userId,
    autoSyncEnabled = true
  } = options;

  // Skip if auto-sync is disabled
  if (!autoSyncEnabled) {
    console.log(`[AUTO-SYNC] ⏭️ Auto-sync disabled, skipping`);
    return { success: true, skipped: true, skipReason: "auto_sync_disabled" };
  }

  // Skip if no valid image URL
  if (!imageUrl || imageUrl.startsWith('data:')) {
    console.log(`[AUTO-SYNC] ⏭️ No valid public URL, skipping (base64 images not supported for auto-sync)`);
    return { success: true, skipped: true, skipReason: "no_public_url" };
  }

  try {
    console.log(`[AUTO-SYNC] 🚀 Starting auto-sync for product ${productId}`);
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 🚨 Check if image was already synced to Shopify (prevent duplicate exports)
    if (imageId) {
      const { data: existingImage } = await supabaseAdmin
        .from("product_images")
        .select("shopify_sync_count, shopify_image_id, shopify_media_id, exported_to_shopify")
        .eq("id", imageId)
        .single();
      
      // Skip if already exported (check all possible indicators)
      if (existingImage?.exported_to_shopify || 
          existingImage?.shopify_media_id || 
          existingImage?.shopify_sync_count >= 1 || 
          existingImage?.shopify_image_id) {
        console.log(`[AUTO-SYNC] ⏭️ Image already synced to Shopify (exported: ${existingImage?.exported_to_shopify}, media_id: ${existingImage?.shopify_media_id}, sync_count: ${existingImage?.shopify_sync_count})`);
        return { success: true, skipped: true, skipReason: "already_synced" };
      }
    }

    // Get product with Shopify ID
    const { data: product, error: productError } = await supabaseAdmin
      .from("shopify_products")
      .select("id, shopify_id, title, store_id, seller_id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.log(`[AUTO-SYNC] ⏭️ Product not found: ${productId}`);
      return { success: true, skipped: true, skipReason: "product_not_found" };
    }

    // Verify user has access
    if (product.seller_id !== userId) {
      console.log(`[AUTO-SYNC] ⏭️ User ${userId} does not own product ${productId}`);
      return { success: true, skipped: true, skipReason: "access_denied" };
    }

    // Skip if product not synced to Shopify
    if (!product.shopify_id) {
      console.log(`[AUTO-SYNC] ⏭️ Product ${productId} not synced to Shopify yet`);
      return { success: true, skipped: true, skipReason: "not_synced_to_shopify" };
    }

    // Get Shopify connection
    let connection = null;
    
    if (product.store_id) {
      const { data } = await supabaseAdmin
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("is_active", true)
        .single();
      connection = data;
    }
    
    if (!connection) {
      const { data } = await supabaseAdmin
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      connection = data;
    }

    if (!connection) {
      console.log(`[AUTO-SYNC] ⏭️ No active Shopify connection found`);
      return { success: true, skipped: true, skipReason: "no_shopify_connection" };
    }

    // Check trial limits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_status, current_plan_id")
      .eq("id", userId)
      .single();

    if (profile?.subscription_status === "trialing") {
      console.log(`[AUTO-SYNC] ⏭️ Trial users cannot sync to Shopify`);
      return { success: true, skipped: true, skipReason: "trial_user" };
    }

    // Upload image to Shopify
    const productGid = restIdToGid(product.shopify_id, "Product");
    console.log(`[AUTO-SYNC] 📤 Uploading image to Shopify product ${productGid}`);

    const mediaInput = [{
      mediaContentType: "IMAGE",
      originalSource: imageUrl,
      alt: altText || product.title || "Product image"
    }];

    const result = await shopifyGraphQL(
      connection.store_url,
      connection.access_token,
      PRODUCT_CREATE_MEDIA_MUTATION,
      { productId: productGid, media: mediaInput }
    );

    // Handle user errors
    if (result.productCreateMedia?.mediaUserErrors?.length > 0) {
      const errors = result.productCreateMedia.mediaUserErrors;
      console.error(`[AUTO-SYNC] ❌ Shopify error:`, errors);
      return { 
        success: false, 
        error: errors.map((e: any) => e.message).join(", ") 
      };
    }

    const createdMedia = result.productCreateMedia?.media?.[0];
    if (!createdMedia) {
      console.error(`[AUTO-SYNC] ❌ No media returned from Shopify`);
      return { success: false, error: "No media created" };
    }

    console.log(`[AUTO-SYNC] ✅ Image uploaded to Shopify: ${createdMedia.id}`);

    // Update local database if we have an imageId
    if (imageId) {
      // Get current sync_count to increment
      const { data: currentImage } = await supabaseAdmin
        .from("product_images")
        .select("shopify_sync_count")
        .eq("id", imageId)
        .single();
      
      const newSyncCount = (currentImage?.shopify_sync_count || 0) + 1;
      
      await supabaseAdmin
        .from("product_images")
        .update({
          shopify_synced: true,
          exported_to_shopify: true,
          exported_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          shopify_image_id: createdMedia.id.replace("gid://shopify/MediaImage/", ""),
          shopify_media_id: createdMedia.id,  // Store full GID for tracking
          shopify_sync_count: newSyncCount
        })
        .eq("id", imageId);
      
      console.log(`[AUTO-SYNC] ✅ Updated product_images record ${imageId} with sync_count=${newSyncCount}, shopify_media_id=${createdMedia.id}`);
    }

    return {
      success: true,
      shopifyImageId: createdMedia.id,
      shopifyImageUrl: createdMedia.image?.url
    };

  } catch (error) {
    console.error(`[AUTO-SYNC] ❌ Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Batch sync multiple images to Shopify
 */
export async function autoSyncMultipleImagesToShopify(
  images: Array<{ imageUrl: string; imageId?: string; altText?: string }>,
  productId: string,
  userId: string,
  autoSyncEnabled = true
): Promise<AutoSyncResult[]> {
  const results: AutoSyncResult[] = [];
  
  for (const image of images) {
    const result = await autoSyncImageToShopify({
      productId,
      imageUrl: image.imageUrl,
      imageId: image.imageId,
      altText: image.altText,
      userId,
      autoSyncEnabled
    });
    results.push(result);
    
    // Small delay between uploads to avoid rate limiting
    if (images.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
