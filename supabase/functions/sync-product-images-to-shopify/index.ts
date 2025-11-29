import { createClient } from "npm:@supabase/supabase-js@2";
import { checkTrialLimits } from "../_shared/trial-limits.ts";
import { shopifyGraphQL, restIdToGid, handleUserErrors, extractNodes } from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// GraphQL mutation to update product media
const PRODUCT_UPDATE_MEDIA_MUTATION = `
  mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
    productUpdateMedia(productId: $productId, media: $media) {
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

// GraphQL mutation to delete product media
const PRODUCT_DELETE_MEDIA_MUTATION = `
  mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      deletedProductImageIds
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to reorder product media
const PRODUCT_REORDER_MEDIA_MUTATION = `
  mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job {
        id
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

// GraphQL query to get product media with positions
const PRODUCT_MEDIA_QUERY = `
  query getProductMedia($id: ID!) {
    product(id: $id) {
      id
      media(first: 250) {
        edges {
          node {
            ... on MediaImage {
              id
              alt
              image {
                url
              }
            }
          }
        }
      }
    }
  }
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // 🆕 Vérifier les limites trial
    const trialCheck = await checkTrialLimits(supabaseClient, user.id);

    if (!trialCheck.canUpdateShopify) {
      console.log('[SYNC-IMAGES] 🚫 Trial user attempting Shopify update - blocked');
      return new Response(
        JSON.stringify({
          error: 'upgrade_required',
          message: 'Les mises à jour Shopify ne sont pas disponibles sur le plan trial. Veuillez upgrader pour synchroniser vos modifications.',
          isTrialActive: trialCheck.isTrialActive,
          trialEndsAt: trialCheck.trialEndsAt,
          requiresUpgrade: true,
          upgradeUrl: '/subscription',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('[SYNC-IMAGES] ✅ User authorized for Shopify updates');

    const { productId, images: requestImages, isReorderOnly } = await req.json();

    if (!productId) {
      throw new Error("Product ID is required");
    }

    console.log(`🔄 Syncing images for product: ${productId}`);
    console.log(`👤 User ID: ${user.id}`);
    console.log(`📦 Request images provided: ${requestImages ? requestImages.length : 'none'}`);
    console.log(`📦 Request images details:`, JSON.stringify(requestImages?.slice(0, 3)));
    console.log(`🔄 Is reorder only: ${isReorderOnly}`);
    
    // If request includes images with positions, this is a reorder request
    const isReorderRequest = (requestImages && Array.isArray(requestImages) && requestImages.length > 0) || isReorderOnly;

    // Get product with images and store info
    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select(`
        *,
        images:product_images(id, src, alt_text, position, shopify_image_id)
      `)
      .eq("id", productId)
      .single();

    console.log(`📦 Product query result:`, {
      found: !!product,
      error: productError?.message,
      errorDetails: productError,
      productId: product?.id,
      productTitle: product?.title,
      sellerId: product?.seller_id,
      storeId: product?.store_id
    });

    if (productError || !product) {
      console.error(`❌ Product ${productId} not found in database`, productError);
      
      // Try to check if product exists at all
      const { data: anyProduct, error: checkError } = await supabaseClient
        .from("shopify_products")
        .select("id, title, seller_id, store_id")
        .eq("id", productId)
        .maybeSingle();
      
      if (anyProduct) {
        console.log(`⚠️ Product exists but query failed:`, anyProduct);
      } else {
        console.log(`⚠️ Product truly does not exist. Check error:`, checkError);
      }
      
      throw new Error(`Product not found or has been deleted`);
    }

    // Verify access: user must either own the product OR have access to the product's store
    let hasAccess = product.seller_id === user.id;
    
    if (!hasAccess && product.store_id) {
      // Check if user has access to this store
      const { data: storeAccess } = await supabaseClient
        .from("shopify_connections")
        .select("id")
        .eq("id", product.store_id)
        .eq("user_id", user.id)
        .single();
      
      hasAccess = !!storeAccess;
    }

    if (!hasAccess) {
      console.error(`❌ User ${user.id} does not have access to product ${productId}`);
      throw new Error(`Product access denied`);
    }

    console.log(`✅ Access verified for product ${productId}`);

    // Récupérer les variantes pour mapper les images
    const { data: variants, error: variantsError } = await supabaseClient
      .from('product_variants')
      .select('id, shopify_variant_id, image_url')
      .eq('product_id', productId);

    if (variantsError) {
      console.error('⚠️ Error fetching variants:', variantsError);
    }

    // Créer un map: image URL -> shopify_variant_ids[]
    const imageToVariantMap = new Map<string, number[]>();
    if (variants && variants.length > 0) {
      console.log(`📦 Found ${variants.length} variants for product`);
      for (const variant of variants) {
        if (variant.image_url && variant.shopify_variant_id) {
          const existing = imageToVariantMap.get(variant.image_url) || [];
          existing.push(Number(variant.shopify_variant_id));
          imageToVariantMap.set(variant.image_url, existing);
        }
      }
      console.log(`🔗 Image to variant mapping:`, Array.from(imageToVariantMap.entries()).length, 'mappings');
    }

    // If product not synced to Shopify, just return success without syncing
    if (!product.shopify_id) {
      console.log(`⏭️ Product ${productId} not synced to Shopify yet - skipping image sync`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Images updated locally. Product will sync to Shopify when product is synced.",
          imageCount: product.images?.length || 0,
          skipped: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Shopify connection - try by store_id first, then get active connection
    let connection = null;
    let connError = null;

    if (product.store_id) {
      const result = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("is_active", true)
        .single();
      
      connection = result.data;
      connError = result.error;
    }

    // If no connection found by store_id, get the user's active connection
    if (!connection) {
      console.log("No store_id on product or connection not found, fetching user's active connection");
      const result = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      connection = result.data;
      connError = result.error;
    }

    if (connError || !connection) {
      throw new Error("Shopify connection not found");
    }

    console.log('Using direct access token, length:', connection.access_token?.length);

    // Get existing images from Shopify using GraphQL
    console.log(`🔍 Fetching existing media from Shopify product ${product.shopify_id} using GraphQL`);
    const productGid = restIdToGid(product.shopify_id, 'Product');
    
    let existingMedia: any[] = [];
    try {
      const mediaResult = await shopifyGraphQL(
        connection.store_url,
        connection.access_token,
        PRODUCT_MEDIA_QUERY,
        { id: productGid }
      );
      
      existingMedia = extractNodes(mediaResult.product?.media || { edges: [] });
      console.log(`📸 Found ${existingMedia.length} existing media items in Shopify`);
    } catch (error: any) {
      console.error("❌ Failed to fetch existing media:", error);
      throw new Error(`Failed to fetch Shopify product media: ${error?.message || String(error)}`);
    }


    // Helper to detect if URL is from Supabase Storage (generated image)
    const isGeneratedImage = (url: string): boolean => {
      if (!url) return false;
      return url.includes('supabase.co/storage/') || 
             url.includes('generated-images') ||
             url.includes('/storage/v1/object/public/');
    };

    // Helper to check if URL is base64
    const isBase64Image = (url: string): boolean => {
      return url?.startsWith('data:image/') || false;
    };

    // Separate images into categories:
    // 1. New images (no shopify_image_id AND no corresponding Shopify image)
    // 2. Images to replace (have corresponding Shopify image but URL changed - generated or base64)
    // 3. Truly new images (no shopify_image_id and no position match)
    
    const localImages = product.images || [];
    const imagesToReplace: any[] = [];
    const newImagesToAdd: any[] = [];

    console.log(`📊 Analyzing ${localImages.length} local images vs ${existingMedia.length} Shopify images`);

    for (const img of localImages) {
      const localUrl = img.src || '';
      const hasShopifyId = !!img.shopify_image_id;
      const isGenerated = isGeneratedImage(localUrl);
      const isBase64 = isBase64Image(localUrl);
      
      console.log(`📸 Image ${img.id}: shopify_image_id=${img.shopify_image_id}, position=${img.position}, isGenerated=${isGenerated}, isBase64=${isBase64}`);

      if (hasShopifyId) {
        // Has Shopify ID - check if URL changed
        const imgGid = restIdToGid(img.shopify_image_id, 'MediaImage');
        const existingImg = existingMedia.find((m: any) => m.id === imgGid);
        
        if (existingImg) {
          const existingUrl = existingImg.image?.url || '';
          const urlChanged = existingUrl !== localUrl && !localUrl.includes(existingUrl.split('?')[0]);
          
          if (isBase64 || isGenerated || urlChanged) {
            console.log(`🔄 Image ${img.id} marked for REPLACE: existingUrl differs from localUrl (generated: ${isGenerated})`);
            imagesToReplace.push(img);
          }
        } else {
          // Shopify image ID exists but image not found in Shopify - treat as new
          console.log(`⚠️ Image ${img.id} has shopify_image_id but not found in Shopify - will add as new`);
          newImagesToAdd.push(img);
        }
      } else {
        // No Shopify ID - check if it's a generated image that should replace by position
        if (isGenerated || isBase64) {
          // Find matching Shopify image by position
          const position = img.position || 1;
          const matchingShopifyImage = existingMedia[position - 1]; // 0-indexed array, 1-indexed position
          
          if (matchingShopifyImage) {
            // This generated image should REPLACE the Shopify image at this position
            console.log(`🔄 Generated image ${img.id} at position ${position} will REPLACE existing Shopify image`);
            // Temporarily assign the Shopify image ID for replacement
            img._replaceShopifyGid = matchingShopifyImage.id;
            imagesToReplace.push(img);
          } else {
            // No matching Shopify image - add as new
            console.log(`➕ Generated image ${img.id} at position ${position} will be ADDED (no matching Shopify image)`);
            newImagesToAdd.push(img);
          }
        } else {
          // Regular new image without Shopify ID
          console.log(`➕ Image ${img.id} marked as NEW (no shopify_image_id)`);
          newImagesToAdd.push(img);
        }
      }
    }

    // Process images to add - upload base64/check URLs
    const newImages = await Promise.all(
      newImagesToAdd.map(async (img: any) => {
          let imageSrc = img.src;
          
          // If image is base64, upload to Supabase Storage first
          if (imageSrc.startsWith('data:image/')) {
            console.log(`📤 Uploading base64 image to Storage for image ${img.id}`);
            try {
              // Extract base64 data
              const base64Data = imageSrc.split(',')[1];
              const mimeType = imageSrc.split(';')[0].split(':')[1];
              const extension = mimeType.split('/')[1];
              
              // Convert base64 to binary
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              // Upload to Storage
              const fileName = `${productId}_${img.id}_${Date.now()}.${extension}`;
              const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('generated-images')
                .upload(fileName, binaryData, {
                  contentType: mimeType,
                  upsert: true
                });
              
              if (uploadError) {
                console.error(`❌ Failed to upload image to Storage:`, uploadError);
                throw uploadError;
              }
              
              // Get public URL
              const { data: { publicUrl } } = supabaseClient.storage
                .from('generated-images')
                .getPublicUrl(fileName);
              
              console.log(`✅ Image uploaded to Storage: ${publicUrl}`);
              imageSrc = publicUrl;
              
              // Update image src in database
              await supabaseClient
                .from('product_images')
                .update({ src: publicUrl })
                .eq('id', img.id);
              
              console.log(`✅ Updated image ${img.id} with public URL`);
            } catch (error) {
              console.error(`❌ Error uploading base64 image:`, error);
              // Continue with original base64 URL (will likely fail in Shopify but won't crash)
            }
          }
          
          const variantIds = imageToVariantMap.get(imageSrc);
          const imageData: any = {
            src: imageSrc,
            alt: img.alt_text || "",
            localImageId: img.id, // Track local ID for linking later
          };
          // Ajouter variant_ids seulement s'il y en a
          if (variantIds && variantIds.length > 0) {
            imageData.variant_ids = variantIds;
            console.log(`🔗 Assigning variants ${variantIds} to new image: ${imageSrc}`);
          }
          return imageData;
        })
    );

    console.log(`➕ Adding ${newImages.length} new images to Shopify`);
    console.log(`🔄 Replacing ${imagesToReplace.length} existing images in Shopify`);

    // Replace existing images: delete old + add new with uploaded URL
    let updatedCount = 0;
    for (const imgToReplace of imagesToReplace) {
      try {
        // Use _replaceShopifyGid if set (for generated images without shopify_image_id)
        // Otherwise convert the existing shopify_image_id to GID format
        let mediaGid: string;
        
        if (imgToReplace._replaceShopifyGid) {
          mediaGid = imgToReplace._replaceShopifyGid;
          console.log(`🔄 Replacing Shopify image by position (GID: ${mediaGid}) via GraphQL`);
        } else if (imgToReplace.shopify_image_id) {
          mediaGid = restIdToGid(imgToReplace.shopify_image_id, 'MediaImage');
          console.log(`🔄 Replacing Shopify image ${imgToReplace.shopify_image_id} (GID: ${mediaGid}) via GraphQL`);
        } else {
          console.warn(`⚠️ Image ${imgToReplace.id} has no shopify_image_id or _replaceShopifyGid, skipping`);
          continue;
        }
        
        // Step 1: Upload base64 to storage if needed
        let newImageSrc = imgToReplace.src;
        if (newImageSrc.startsWith('data:image/')) {
          console.log(`📤 Uploading base64 replacement image to Storage`);
          try {
            const base64Data = newImageSrc.split(',')[1];
            const mimeType = newImageSrc.split(';')[0].split(':')[1];
            const extension = mimeType.split('/')[1];
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `${productId}_${imgToReplace.id}_replaced_${Date.now()}.${extension}`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
              .from('generated-images')
              .upload(fileName, binaryData, { contentType: mimeType, upsert: true });
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabaseClient.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            
            newImageSrc = publicUrl;
            console.log(`✅ Replacement image uploaded: ${publicUrl}`);
            
            // Update database with public URL
            await supabaseClient
              .from('product_images')
              .update({ src: publicUrl })
              .eq('id', imgToReplace.id);
          } catch (uploadErr) {
            console.error(`❌ Failed to upload replacement base64:`, uploadErr);
            continue; // Skip this image if upload fails
          }
        }
        
        // Step 2: Delete old image from Shopify
        console.log(`🗑️ Deleting old image ${mediaGid} from Shopify`);
        const deleteResult = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_DELETE_MEDIA_MUTATION,
          { productId: productGid, mediaIds: [mediaGid] }
        );
        
        if (deleteResult.productDeleteMedia?.mediaUserErrors?.length > 0) {
          console.error(`❌ Error deleting old image:`, deleteResult.productDeleteMedia.mediaUserErrors);
        }
        
        // Step 3: Add new image to Shopify
        console.log(`➕ Adding replacement image: ${newImageSrc.substring(0, 60)}...`);
        const createResult = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_CREATE_MEDIA_MUTATION,
          {
            productId: productGid,
            media: [{
              originalSource: newImageSrc,
              alt: imgToReplace.alt_text || "",
              mediaContentType: "IMAGE"
            }]
          }
        );
        
        if (createResult.productCreateMedia?.media?.length > 0) {
          const newMedia = createResult.productCreateMedia.media[0];
          const newLegacyId = newMedia.id?.replace('gid://shopify/MediaImage/', '');
          
          // Update shopify_image_id in database
          if (newLegacyId) {
            await supabaseClient
              .from('product_images')
              .update({ shopify_image_id: parseInt(newLegacyId) })
              .eq('id', imgToReplace.id);
          }
          
          updatedCount++;
          console.log(`✅ Replaced image successfully, new ID: ${newLegacyId}`);
        } else if (createResult.productCreateMedia?.mediaUserErrors?.length > 0) {
          console.error(`❌ Error creating replacement image:`, createResult.productCreateMedia.mediaUserErrors);
        }
      } catch (updateError) {
        console.error(`Error replacing image ${imgToReplace.id}:`, updateError);
      }
    }

    // Add new images using GraphQL productCreateMedia mutation
    const addedImages: any[] = [];
    for (const newImage of newImages) {
      try {
        console.log(`➕ Adding new image via GraphQL: ${newImage.src.substring(0, 50)}...`);
        
        const createResult = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_CREATE_MEDIA_MUTATION,
          {
            productId: productGid,
            media: [{
              originalSource: newImage.src,
              alt: newImage.alt || "",
              mediaContentType: "IMAGE"
            }]
          }
        );

        if (createResult.productCreateMedia?.mediaUserErrors?.length > 0) {
          const errors = createResult.productCreateMedia.mediaUserErrors;
          console.error(`❌ GraphQL errors creating image:`, errors);
          
          // Check for auth errors
          const authError = errors.find((e: any) => e.message?.includes('access') || e.message?.includes('permission'));
          if (authError) {
            throw new Error('Token Shopify invalide ou expiré. Veuillez reconnecter votre boutique Shopify.');
          }
        } else if (createResult.productCreateMedia?.media?.length > 0) {
          const createdMedia = createResult.productCreateMedia.media[0];
          // Extract legacy ID from GID for database storage
          const legacyId = createdMedia.id?.replace('gid://shopify/MediaImage/', '');
          addedImages.push({
            id: legacyId ? parseInt(legacyId) : null,
            src: newImage.src,
            alt: newImage.alt,
            localImageId: newImage.localImageId, // Keep track of local ID
          });
          console.log(`✅ Added image via GraphQL: ${legacyId}`);
        }
      } catch (createError: any) {
        console.error(`Failed to add image ${newImage.src}:`, createError?.message || createError);
        
        if (createError?.message?.includes('invalide') || createError?.message?.includes('expiré')) {
          throw createError;
        }
      }
    }

    // Update shopify_image_id for newly added images
    for (const addedImage of addedImages) {
      // Use localImageId if available (more reliable), otherwise fallback to URL matching
      let localImgId = addedImage.localImageId;
      
      if (!localImgId) {
        // Fallback: Find the local image by matching the src URL
        const localImg = product.images.find((img: any) => 
          !img.shopify_image_id && img.src === addedImage.src
        );
        localImgId = localImg?.id;
      }
      
      if (localImgId) {
        await supabaseClient
          .from("product_images")
          .update({ shopify_image_id: addedImage.id })
          .eq("id", localImgId);
        
        console.log(`🔗 Linked local image ${localImgId} to Shopify image ${addedImage.id}`);
      } else {
        console.warn(`⚠️ Could not find local image to link for Shopify image ${addedImage.id}`);
      }
    }

    console.log(`✅ Successfully synced images: ${updatedCount} updated, ${addedImages.length} added`);

    // 🆕 Reorder images if positions have changed
    let reorderedCount = 0;
    
    // Use request images if provided (from gallery reorder), otherwise use database images
    let imagesToReorder: Array<{ shopify_image_id: number | null; position: number }> = [];
    
    if (isReorderRequest && requestImages && requestImages.length > 0) {
      // Use images from request body (with positions already set correctly)
      // Support both 'id' and 'shopify_image_id' fields
      imagesToReorder = requestImages
        .filter((img: any) => img.id || img.shopify_image_id) // Accept either field
        .map((img: any, idx: number) => {
          const shopifyId = img.shopify_image_id || img.id;
          return {
            shopify_image_id: typeof shopifyId === 'string' ? parseInt(shopifyId) : shopifyId,
            position: img.position || idx + 1
          };
        });
      console.log(`📋 Using ${imagesToReorder.length} images from request for reorder`);
      console.log(`📋 First images to reorder:`, JSON.stringify(imagesToReorder.slice(0, 3)));
    } else {
      // Fallback to database images
      const localImages = (product.images || []).sort((a: any, b: any) => a.position - b.position);
      imagesToReorder = localImages
        .filter((img: any) => img.shopify_image_id)
        .map((img: any) => ({
          shopify_image_id: img.shopify_image_id,
          position: img.position
        }));
      console.log(`📋 Using ${imagesToReorder.length} images from database for reorder`);
    }
    
    // Build moves array for reordering - map local positions to Shopify media IDs
    const moves: Array<{ id: string; newPosition: string }> = [];
    
    for (let i = 0; i < imagesToReorder.length; i++) {
      const img = imagesToReorder[i];
      if (img.shopify_image_id) {
        const mediaGid = restIdToGid(img.shopify_image_id, 'MediaImage');
        // Position in Shopify is 0-indexed for moves
        moves.push({
          id: mediaGid,
          newPosition: String(i)
        });
      }
    }

    if (moves.length > 1) {
      try {
        console.log(`🔄 Reordering ${moves.length} images...`);
        const reorderResult = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_REORDER_MEDIA_MUTATION,
          {
            id: productGid,
            moves: moves
          }
        );

        if (reorderResult.productReorderMedia?.mediaUserErrors?.length > 0) {
          console.error(`❌ Reorder errors:`, reorderResult.productReorderMedia.mediaUserErrors);
        } else {
          reorderedCount = moves.length;
          console.log(`✅ Reordered ${reorderedCount} images successfully`);
        }
      } catch (reorderError) {
        console.error(`⚠️ Failed to reorder images:`, reorderError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation terminée: ${addedImages.length} images ajoutées, ${updatedCount} images mises à jour, ${reorderedCount} images réordonnées`,
        addedCount: addedImages.length,
        updatedCount,
        reorderedCount,
        totalProcessed: addedImages.length + updatedCount + reorderedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing images to Shopify:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
