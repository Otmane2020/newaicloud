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

// GraphQL query to get product media
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

    const { productId } = await req.json();

    if (!productId) {
      throw new Error("Product ID is required");
    }

    console.log(`🔄 Syncing images for product: ${productId}`);
    console.log(`👤 User ID: ${user.id}`);

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


    // Prepare new images to add (only those without shopify_image_id)
    const newImages = await Promise.all(
      (product.images || [])
        .filter((img: any) => !img.shopify_image_id) // Only new images
        .map(async (img: any) => {
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
          };
          // Ajouter variant_ids seulement s'il y en a
          if (variantIds && variantIds.length > 0) {
            imageData.variant_ids = variantIds;
            console.log(`🔗 Assigning variants ${variantIds} to new image: ${imageSrc}`);
          }
          return imageData;
        })
    );

    // Prepare images to update (those with shopify_image_id but src/alt changed)
    // Note: GraphQL Media IDs are GIDs, REST image IDs are numeric - need conversion
    const imagesToUpdate = (product.images || [])
      .filter((img: any) => {
        if (!img.shopify_image_id) return false;
        // Convert numeric shopify_image_id to GID for comparison
        const imgGid = restIdToGid(img.shopify_image_id, 'MediaImage');
        const existingImg = existingMedia.find((m: any) => m.id === imgGid);
        return existingImg && existingImg.image?.url !== img.src;
      });

    console.log(`➕ Adding ${newImages.length} new images to Shopify`);
    console.log(`🔄 Updating ${imagesToUpdate.length} existing images in Shopify`);

    // Update existing images using GraphQL
    let updatedCount = 0;
    for (const imgToUpdate of imagesToUpdate) {
      try {
        console.log(`🔄 Updating Shopify image ${imgToUpdate.shopify_image_id} via GraphQL`);
        
        // Convert to GID format
        const mediaGid = restIdToGid(imgToUpdate.shopify_image_id, 'MediaImage');
        
        const updateResult = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_UPDATE_MEDIA_MUTATION,
          {
            productId: productGid,
            media: [{
              id: mediaGid,
              alt: imgToUpdate.alt_text || ""
            }]
          }
        );

        if (updateResult.productUpdateMedia?.mediaUserErrors?.length > 0) {
          const errors = updateResult.productUpdateMedia.mediaUserErrors;
          console.error(`❌ GraphQL errors updating image:`, errors);
        } else {
          updatedCount++;
          console.log(`✅ Updated image ${imgToUpdate.shopify_image_id} via GraphQL`);
        }
      } catch (updateError) {
        console.error(`Error updating image ${imgToUpdate.shopify_image_id}:`, updateError);
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
            alt: newImage.alt
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
      // Find the local image by matching the src URL
      const localImg = product.images.find((img: any) => 
        !img.shopify_image_id && img.src === addedImage.src
      );
      
      if (localImg) {
        await supabaseClient
          .from("product_images")
          .update({ shopify_image_id: addedImage.id })
          .eq("id", localImg.id);
        
        console.log(`🔗 Linked local image ${localImg.id} to Shopify image ${addedImage.id}`);
      }
    }

    console.log(`✅ Successfully synced images: ${updatedCount} updated, ${addedImages.length} added`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation terminée: ${addedImages.length} images ajoutées, ${updatedCount} images mises à jour`,
        addedCount: addedImages.length,
        updatedCount,
        totalProcessed: addedImages.length + updatedCount,
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
