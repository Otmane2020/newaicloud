import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  productId?: string;
  imageId?: string;
  collectionId?: string;
  syncTags?: boolean;
  syncAltText?: boolean;
  syncGoogleShopping?: boolean;
  syncBodyHtml?: boolean; // Sync landing page / body HTML
  syncImages?: boolean; // Sync AI-generated images to Shopify
  syncAllImages?: boolean; // Sync ALL gallery images (not just AI-generated)
  bodyHtml?: string; // Landing page HTML content to sync
  force?: boolean; // Bypass throttling check (for post-optimization sync)
  // Direct field updates (for inline editing)
  title?: string; // Product title update
  vendor?: string;
  sku?: string;
  price?: number;
  cost?: number;
  variant_id?: number; // Shopify variant ID for SKU/price/cost updates
  // Service mode for internal calls (from edge functions)
  serviceMode?: boolean;
  userId?: string;
  imageType?: 'product' | 'content';
}

// Helper function to make GraphQL requests to Shopify
async function shopifyGraphQL(storeUrl: string, accessToken: string, query: string, variables: any = {}) {
  const response = await fetch(
    `https://${storeUrl}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SYNC-SEO] ❌ Shopify GraphQL HTTP error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Shopify GraphQL error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Log the full response for debugging
  console.log(`[SYNC-SEO] 📋 GraphQL Response:`, JSON.stringify(data, null, 2));
  
  // Check for GraphQL errors
  if (data.errors) {
    console.error(`[SYNC-SEO] ❌ GraphQL errors:`, JSON.stringify(data.errors, null, 2));
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  // Check for user errors in the response
  if (data.data) {
    const operationName = Object.keys(data.data)[0];
    if (data.data[operationName]?.userErrors?.length > 0) {
      console.error(`[SYNC-SEO] ❌ User errors:`, JSON.stringify(data.data[operationName].userErrors, null, 2));
      throw new Error(`User errors: ${JSON.stringify(data.data[operationName].userErrors)}`);
    }
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Read body once and store it for reuse
    const rawBody = await req.text();
    let bodyCheck: any = {};
    
    try {
      bodyCheck = JSON.parse(rawBody);
    } catch (e) {
      console.error('[SYNC-SEO] Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Safe HealthCheck handler
    if (bodyCheck?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Check for service mode (internal calls from other edge functions)
    const { serviceMode, userId: serviceModeUserId, imageType: serviceModeImageType } = bodyCheck;
    
    let user: any;
    let supabaseClient: any;
    
    if (serviceMode && serviceModeUserId) {
      // Service mode: use service role key and provided userId
      console.log(`[SYNC] Service mode enabled for user: ${serviceModeUserId}`);
      user = { id: serviceModeUserId };
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
    } else {
      // Normal mode: authenticate user via JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Create admin client to verify user
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Verify the JWT token
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) {
        console.error('Authentication failed:', authError);
        throw new Error('User not authenticated');
      }
      
      user = userData.user;
      console.log(`[SYNC] User authenticated: ${user.id}`);

      // Create client with user context for RLS-protected queries
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

    const { productId, imageId, collectionId, syncTags, syncAltText, syncGoogleShopping, syncBodyHtml, syncImages, syncAllImages, bodyHtml, force, title, vendor, sku, price, cost, variant_id }: SyncRequest = bodyCheck;

    // Sync product SEO data
    if (productId) {
      // Get store connection for this user
      const { data: product, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, title, regenerated_title, optimized_title, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id, last_seo_sync_at, last_synced_data, landing_page, landing_page_html")
        .eq("id", productId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (productError || !product) {
        console.error('Product fetch error:', productError);
        throw new Error("Product not found or unauthorized");
      }

      // Get Shopify connection - handle NULL store_id
      let storeConnection = null;
      let storeError = null;

      if (product.store_id) {
        const result = await supabaseClient
          .from("shopify_connections")
          .select("store_url, access_token")
          .eq("id", product.store_id)
          .eq("user_id", user.id)
          .maybeSingle();
        
        storeConnection = result.data;
        storeError = result.error;
      }

      // Fallback: if no store_id or connection not found, use user's active connection
      if (!storeConnection) {
        console.log('[SYNC-SEO] No store_id or connection not found, using user\'s active connection');
        const result = await supabaseClient
          .from("shopify_connections")
          .select("store_url, access_token")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        storeConnection = result.data;
        storeError = result.error;
      }

      if (storeError || !storeConnection) {
        console.error('Store connection error:', storeError);
        throw new Error("Store connection not found");
      }

      // Check if sync was done less than 30 seconds ago (unless force is true)
      // This prevents accidental double-clicks, not intentional re-syncs
      if (!force && product.last_seo_sync_at) {
        const lastSync = new Date(product.last_seo_sync_at);
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        
        if (lastSync > thirtySecondsAgo) {
          console.log(`Product ${productId} was synced less than 30 seconds ago, skipping (already synced)`);
          // Return success with skipped flag - NOT an error (prevents UI showing as error)
          return new Response(
            JSON.stringify({
              success: true,
              skipped: true,
              message: "Produit déjà synchronisé / Product already synced",
              reason: "SYNC_TOO_RECENT"
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
      
      if (force) {
        console.log(`[SYNC] Force sync enabled - bypassing throttle check for product ${productId}`);
      }

      const shopUrl = storeConnection.store_url;
      const shopifyAccessToken = storeConnection.access_token;
      
      // PHASE 1: Update SEO title and description using GraphQL (proper native SEO)
      // Priority:
      // 1) request.body.title (explicit user action from UI)
      // 2) product.regenerated_title (AI regenerated - replaces Shopify title)
      // 3) product.optimized_title (Google Shopping optimized)
      // 4) product.seo_title
      // 5) product.title (original)
      const resolvedTitle = (title ?? product.regenerated_title ?? product.optimized_title ?? product.seo_title ?? product.title ?? "").toString();

      console.log(`[SYNC-SEO] Updating product ${product.shopify_id} SEO via GraphQL...`);
      console.log(`[SYNC-SEO] Resolved Title: "${resolvedTitle}"`);
      console.log(`[SYNC-SEO] SEO Description: "${(product.seo_description || "").substring(0, 100)}..."`);

      const productUpdateMutation = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              seo {
                title
                description
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const graphqlVariables = {
        input: {
          id: `gid://shopify/Product/${product.shopify_id}`,
          // ✅ Sync title as main product title
          title: resolvedTitle,
          seo: {
            title: resolvedTitle,
            description: product.seo_description || ""
          }
        }
      };

      try {
        const graphqlResponse = await shopifyGraphQL(shopUrl, shopifyAccessToken, productUpdateMutation, graphqlVariables);
        console.log("[SYNC-SEO] ✅ SEO updated successfully via GraphQL");
        console.log("[SYNC-SEO] Updated product SEO:", JSON.stringify(graphqlResponse.data?.productUpdate?.product?.seo, null, 2));
      } catch (error: any) {
        console.error("[SYNC-SEO] ❌ GraphQL SEO update failed:", error);
        throw new Error(`Failed to update SEO in Shopify: ${error.message}`);
      }

      // PHASE 1.5: Sync body HTML (landing page content)
      if (syncBodyHtml) {
        const contentToSync = bodyHtml || product.landing_page_html || product.landing_page;
        if (contentToSync) {
          console.log(`[SYNC-SEO] Updating product body HTML (${contentToSync.length} chars)...`);
          const bodyHtmlMutation = `
            mutation productUpdate($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id descriptionHtml }
                userErrors { field message }
              }
            }
          `;
          try {
            await shopifyGraphQL(shopUrl, shopifyAccessToken, bodyHtmlMutation, {
              input: {
                id: `gid://shopify/Product/${product.shopify_id}`,
                descriptionHtml: contentToSync
              }
            });
            console.log("[SYNC-SEO] ✅ Body HTML (landing page) updated successfully");
          } catch (bodyError: any) {
            console.error("[SYNC-SEO] ❌ Body HTML update failed:", bodyError.message);
          }
        }
      }

      // PHASE 1.6: Direct field updates (title, vendor, sku, price, cost) - for inline editing
      if (title !== undefined || vendor !== undefined) {
        console.log(`[SYNC-SEO] Updating product fields - title: "${title}", vendor: "${vendor}"...`);
        const productFieldsMutation = `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id title vendor }
              userErrors { field message }
            }
          }
        `;
        const productInput: any = { id: `gid://shopify/Product/${product.shopify_id}` };
        if (title !== undefined) productInput.title = title;
        if (vendor !== undefined) productInput.vendor = vendor;
        
        try {
          await shopifyGraphQL(shopUrl, shopifyAccessToken, productFieldsMutation, { input: productInput });
          console.log("[SYNC-SEO] ✅ Product title/vendor updated successfully");
        } catch (fieldError: any) {
          console.error("[SYNC-SEO] ❌ Product fields update failed:", fieldError.message);
        }
      }

      // Update variant fields (SKU, price, cost) if variant_id is provided
      if (variant_id && (sku !== undefined || price !== undefined || cost !== undefined)) {
        console.log(`[SYNC-SEO] Updating variant ${variant_id} fields - sku: ${sku}, price: ${price}, cost: ${cost}`);
        
        // Update SKU and price via productVariantsBulkUpdate (2025-07 API)
        if (sku !== undefined || price !== undefined) {
          const variantBulkMutation = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants { id sku price }
                userErrors { field message }
              }
            }
          `;
          const variantInput: any = { id: `gid://shopify/ProductVariant/${variant_id}` };
          if (sku !== undefined) variantInput.sku = sku;
          if (price !== undefined) variantInput.price = price.toString();
          
          try {
            const result = await shopifyGraphQL(shopUrl, shopifyAccessToken, variantBulkMutation, { 
              productId: `gid://shopify/Product/${product.shopify_id}`,
              variants: [variantInput]
            });
            console.log("[SYNC-SEO] ✅ Variant SKU/price updated successfully via bulk API", result);
          } catch (variantError: any) {
            console.error("[SYNC-SEO] ❌ Variant update failed:", variantError.message);
          }
        }

        // Update cost via inventoryItemUpdate (need to fetch inventory item ID first)
        if (cost !== undefined) {
          const fetchInventoryQuery = `
            query getVariantInventory($id: ID!) {
              productVariant(id: $id) {
                inventoryItem { id }
              }
            }
          `;
          try {
            const inventoryResult = await shopifyGraphQL(shopUrl, shopifyAccessToken, fetchInventoryQuery, {
              id: `gid://shopify/ProductVariant/${variant_id}`
            });
            const inventoryItemId = inventoryResult.data?.productVariant?.inventoryItem?.id;
            
            if (inventoryItemId) {
              const costMutation = `
                mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                  inventoryItemUpdate(id: $id, input: $input) {
                    inventoryItem { id unitCost { amount } }
                    userErrors { field message }
                  }
                }
              `;
              await shopifyGraphQL(shopUrl, shopifyAccessToken, costMutation, {
                id: inventoryItemId,
                input: { cost: cost }
              });
              console.log("[SYNC-SEO] ✅ Cost updated successfully");
            }
          } catch (costError: any) {
            console.error("[SYNC-SEO] ❌ Cost update failed:", costError.message);
          }
        }
      }

      // PHASE 1.7: Sync images to Shopify (SAFE REPLACE - only delete if we have local copies)
      if (syncImages) {
        console.log(`[SYNC-SEO] Syncing ${syncAllImages ? 'ALL gallery' : 'AI-generated'} images for product ${productId}...`);
        
        const shopifyProductGid = `gid://shopify/Product/${product.shopify_id}`;
        
        // STEP 1: First, fetch AI-GENERATED images from NewAI database
        // ✅ NEW: Only fetch images where is_ai_generated = true to avoid re-exporting Shopify images
        let imagesQuery = supabaseClient
          .from("product_images")
          .select("id, src, alt_text, position, shopify_image_id, optimization_count, shopify_sync_count, last_synced_at, is_ai_generated")
          .eq("product_id", productId)
          .eq("is_ai_generated", true); // ✅ CRITICAL: Only AI-generated images
        
        if (!syncAllImages) {
          imagesQuery = imagesQuery.gt("optimization_count", 0);
        }
        
        const { data: productImages, error: imagesError } = await imagesQuery
          .order("position", { ascending: true });
        
        if (imagesError) {
          console.error("[SYNC-SEO] ❌ Failed to fetch product images:", imagesError);
        } else if (productImages && productImages.length > 0) {
          console.log(`[SYNC-SEO] Found ${productImages.length} AI-generated images to check for sync`);
          
          // STEP 2: Filter images - Check which images can be uploaded
          // With the new storage system, images should be in Supabase Storage (not Shopify CDN)
          const uploadableImages = productImages.filter((img: any) => {
            const isShopifyCDN = img.src && (
              img.src.includes('cdn.shopify.com') ||
              img.src.includes('shopifycdn.com')
            );
            
            // Skip Shopify CDN images - these should not exist for AI-generated images
            if (isShopifyCDN) {
              console.log(`[SYNC-SEO] ⚠️ Skipping CDN image (should not happen for AI images): ${img.src.substring(0, 80)}...`);
              return false;
            }
            
            return true;
          });

          // 🔒 STRICT LOCK: Only upload images that have NEVER been synced (shopify_sync_count = 0)
          // This prevents duplicate exports even if syncAllImages is accidentally true
          const alreadySyncedCount = uploadableImages.filter((img: any) => (img.shopify_sync_count ?? 0) > 0).length;
          
          // 🚨 CRITICAL CHANGE: ALWAYS filter by shopify_sync_count = 0, regardless of syncAllImages flag
          // This ensures an image can ONLY be sent to Shopify ONCE
          const imagesToUpload = uploadableImages.filter((img: any) => {
            const syncCount = img.shopify_sync_count ?? 0;
            const hasShopifyId = img.shopify_image_id && img.shopify_image_id !== '';
            
            // Image already synced - NEVER re-export
            if (syncCount > 0) {
              console.log(`[SYNC-SEO] 🔒 LOCKED: Image ${img.id} already synced ${syncCount} times, skipping`);
              return false;
            }
            
            // Image already has a Shopify ID - NEVER re-export
            if (hasShopifyId) {
              console.log(`[SYNC-SEO] 🔒 LOCKED: Image ${img.id} already has Shopify ID ${img.shopify_image_id}, skipping`);
              return false;
            }
            
            return true;
          });
          
          console.log(`[SYNC-SEO] ${uploadableImages.length} AI images (${alreadySyncedCount} already synced/locked, ${imagesToUpload.length} new to export)`);
          
          if (imagesToUpload.length > 0) {
            const getMediaQuery = `
              query getProductMedia($productId: ID!) {
                product(id: $productId) {
                  media(first: 100) {
                    edges {
                      node {
                        id
                        ... on MediaImage {
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
            
            try {
              console.log(`[SYNC-SEO] Fetching existing media from Shopify...`);
              const existingMediaResult = await shopifyGraphQL(shopUrl, shopifyAccessToken, getMediaQuery, {
                productId: shopifyProductGid
              });
              
              const existingMedia = existingMediaResult.data?.product?.media?.edges || [];
              const existingMediaIds = existingMedia.map((edge: any) => edge.node.id);
              
              console.log(`[SYNC-SEO] Found ${existingMediaIds.length} existing media in Shopify`);
              
              // STEP 4: IMPORTANT
              // We do NOT delete existing Shopify media anymore.
              // Deleting breaks existing CDN URLs used in landing pages / descriptions and can corrupt content.
              if (existingMediaIds.length > 0) {
                console.log(`[SYNC-SEO] Keeping ${existingMediaIds.length} existing media items (no deletion). Will only ADD new images.`);
              }
            } catch (fetchError: any) {
              console.error(`[SYNC-SEO] ⚠️ Error fetching existing media:`, fetchError.message);
              // Continue anyway
            }
            
            // STEP 5: Upload new images (only non-Shopify CDN images)
            for (const image of imagesToUpload) {
              try {
                // Check if image URL is valid and accessible
                if (!image.src || !image.src.startsWith('http')) {
                  console.log(`[SYNC-SEO] Skipping image with invalid URL: ${image.src}`);
                  continue;
                }

                // Lightweight HEAD check for debugging (content-type/size)
                try {
                  const headRes = await fetch(image.src, { method: 'HEAD' });
                  console.log(`[SYNC-SEO] [MEDIA-HEAD] ${headRes.status} ${headRes.headers.get('content-type') || ''} ${headRes.headers.get('content-length') || ''} :: ${image.src.substring(0, 120)}...`);
                } catch (e) {
                  console.log(`[SYNC-SEO] [MEDIA-HEAD] failed :: ${image.src.substring(0, 120)}...`);
                }

                // Use productCreateMedia to add image
                const createMediaMutation = `
                  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                    productCreateMedia(productId: $productId, media: $media) {
                      media {
                        ... on MediaImage {
                          id
                          image {
                            url
                            altText
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

                const mediaInput = {
                  originalSource: image.src,
                  mediaContentType: "IMAGE",
                  alt: image.alt_text || product.title
                };

                const mediaResult = await shopifyGraphQL(shopUrl, shopifyAccessToken, createMediaMutation, {
                  productId: shopifyProductGid,
                  media: [mediaInput]
                });

                const createdMedia = mediaResult.data?.productCreateMedia?.media?.[0];
                const createdMediaId = createdMedia?.id as string | undefined;
                const createdImageUrl = createdMedia?.image?.url as string | undefined;
                const mediaUserErrors = mediaResult.data?.productCreateMedia?.mediaUserErrors || [];

                if (mediaUserErrors.length > 0) {
                  console.error(`[SYNC-SEO] ❌ productCreateMedia mediaUserErrors for image ${image.id}:`, JSON.stringify(mediaUserErrors));
                  throw new Error(`Shopify media upload error: ${JSON.stringify(mediaUserErrors)}`);
                }

                if (createdMediaId) {
                  if (createdImageUrl) {
                    console.log(`[SYNC-SEO] ✅ Image uploaded successfully: ${createdImageUrl.substring(0, 80)}...`);
                  } else {
                    // Shopify often returns image: null while processing is still pending.
                    console.log(`[SYNC-SEO] ⏳ Media created but still processing (image.url is null). mediaId=${createdMediaId} imageId=${image.id}`);
                  }

                  // Mark as synced attempt in DB (IMPORTANT: product_images has no 'shopify_synced' column)
                  const nextSyncCount = (image.shopify_sync_count ?? 0) + 1;
                  const { error: markError } = await supabaseClient
                    .from("product_images")
                    .update({
                      last_synced_at: new Date().toISOString(),
                      shopify_sync_count: nextSyncCount,
                    })
                    .eq("id", image.id);

                  if (markError) {
                    console.error(`[SYNC-SEO] ⚠️ Failed to update product_images sync fields for ${image.id}:`, markError);
                  }
                } else {
                  console.error(`[SYNC-SEO] ❌ productCreateMedia did not return a media id for image ${image.id}`);
                  console.error(`[SYNC-SEO] ❌ productCreateMedia returned:`, JSON.stringify(createdMedia));

                  // Try to log to system_logs for automatic detection
                  try {
                    const admin = createClient(
                      Deno.env.get("SUPABASE_URL") ?? "",
                      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
                    );
                    await admin.from('system_logs').insert({
                      type: 'error',
                      function_name: 'sync-seo-to-shopify',
                      message: 'Media upload failed (no media id returned from productCreateMedia)',
                      user_id: user?.id ?? null,
                      metadata: {
                        productId,
                        imageId: image.id,
                        src: image.src,
                        shopifyProductId: product.shopify_id,
                      }
                    });
                  } catch (_) {}
                }
              } catch (imageError: any) {
                console.error(`[SYNC-SEO] ❌ Failed to upload image ${image.id}:`, imageError.message);
              }
            }
          } else {
            console.log(`[SYNC-SEO] ✅ No new images to upload (already synced, or not uploadable).`);
          }
        } else {
          console.log(`[SYNC-SEO] No ${syncAllImages ? 'gallery' : 'AI-generated'} images found to sync`);
        }
      }
      
      // PHASE 2: Update tags, product_type, and Google Shopping metafields using REST API
      console.log("[SYNC-SEO] Updating tags, product_type, and Google Shopping data via REST...");
      
      // Build product update data for REST (tags + product_type + metafields)
      const updateData: any = {
        product: {
          id: product.shopify_id,
        }
      };

      // Collect all metafields to update (Google Shopping only - not SEO)
      const metafields: any[] = [];

      // Add Google Shopping data if enabled
      if (syncGoogleShopping) {
        if (product.category) {
          metafields.push({
            namespace: "google",
            key: "google_product_category",
            value: product.category,
            type: "single_line_text_field"
          });
        }
        
        if (product.sub_category) {
          metafields.push({
            namespace: "custom",
            key: "product_subcategory",
            value: product.sub_category,
            type: "single_line_text_field"
          });
        }
      }

      // Set metafields if we have any
      if (metafields.length > 0) {
        updateData.product.metafields = metafields;
      }

      console.log(`[SYNC-SEO] Update data for product ${product.shopify_id}:`, JSON.stringify(updateData, null, 2));

      // Sync tags if requested - Shopify expects comma-separated string
      if (syncTags && product.tags) {
        // Ensure tags is a string (it should already be from the database)
        updateData.product.tags = typeof product.tags === 'string' ? product.tags : '';
      }

      // Sync product type for Google Shopping
      if (syncGoogleShopping && product.category) {
        updateData.product.product_type = product.category;
      }

      // Update tags and product_type via GraphQL instead of REST (REST deprecated April 2025)
      if (updateData.product.tags || updateData.product.product_type || updateData.product.metafields) {
        const productUpdateTagsMutation = `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product {
                id
                tags
                productType
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const tagsInput: any = {
          id: `gid://shopify/Product/${product.shopify_id}`,
        };

        if (syncTags && product.tags) {
          // Convert comma-separated tags to array for GraphQL
          const tagsArray = typeof product.tags === 'string' 
            ? product.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];
          tagsInput.tags = tagsArray;
        }

        if (syncGoogleShopping && product.category) {
          tagsInput.productType = product.category;
        }

        try {
          const tagsResponse = await shopifyGraphQL(shopUrl, shopifyAccessToken, productUpdateTagsMutation, { input: tagsInput });
          console.log("[SYNC-SEO] ✅ Tags and product_type updated successfully via GraphQL");
        } catch (tagsError: any) {
          console.error("[SYNC-SEO] ⚠️ Failed to update tags via GraphQL:", tagsError.message);
          // Non-blocking - continue with sync
        }

        // Metafields need to be updated via separate GraphQL mutation
        if (metafields.length > 0) {
          const metafieldSetMutation = `
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  id
                  key
                  value
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          const metafieldsInput = metafields.map(mf => ({
            ownerId: `gid://shopify/Product/${product.shopify_id}`,
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            type: mf.type
          }));

          try {
            await shopifyGraphQL(shopUrl, shopifyAccessToken, metafieldSetMutation, { metafields: metafieldsInput });
            console.log("[SYNC-SEO] ✅ Metafields updated successfully via GraphQL");
          } catch (mfError: any) {
            console.error("[SYNC-SEO] ⚠️ Failed to update metafields via GraphQL:", mfError.message);
          }
        }
      } else {
        console.log("[SYNC-SEO] No tags, product_type, or metafields to update");
      }

      // Store snapshot of synced data
      const syncedData = {
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        tags: product.tags,
        category: product.category,
        sub_category: product.sub_category,
        synced_at: new Date().toISOString()
      };

      // Update sync status in database
      await supabaseClient
        .from("shopify_products")
        .update({
          seo_synced_to_shopify: true,
          last_seo_sync_at: new Date().toISOString(),
          last_synced_data: syncedData,
          seo_sync_error: null,
        })
        .eq("id", productId);

      console.log(`Product ${product.shopify_id} synced successfully`);
      
      // Extract store name from store_url
      const storeName = shopUrl.replace('.myshopify.com', '');
      const shopifyUrl = `https://admin.shopify.com/store/${storeName}/products/${product.shopify_id}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Product synced to Shopify successfully",
          shopifyUrl: shopifyUrl,
          resourceType: "product"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sync image ALT text
    if (imageId) {
      console.log(`[SYNC-IMAGE] Starting ALT text sync for image: ${imageId}, user: ${user.id}`);
      
      // Try to get the image from product_images first
      let imageData: any = null;
      let imageType: 'product' | 'content' = 'product';
      
      const { data: productImageData, error: productImageError } = await supabaseClient
        .from("product_images")
        .select("id, src, shopify_image_id, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();

      if (productImageData) {
        imageData = productImageData;
        imageType = 'product';
      } else {
        // If not found in product_images, try content_images
        const { data: contentImageData, error: contentImageError } = await supabaseClient
          .from("content_images")
          .select("id, src, shopify_image_id, alt_text, content_id, content_type")
          .eq("id", imageId)
          .maybeSingle();
        
        if (contentImageData) {
          imageData = contentImageData;
          imageType = 'content';
        }
      }

      console.log(`[SYNC-IMAGE] Image query result:`, { 
        found: !!imageData, 
        imageType,
        imageId: imageData?.id,
        shopifyImageId: imageData?.shopify_image_id,
        hasAltText: !!imageData?.alt_text,
      });

      if (!imageData) {
        console.warn('[SYNC-IMAGE] Image not found in database (may have been deleted):', { imageId });
        return new Response(
          JSON.stringify({
            success: false,
            message: "Cette image n'existe plus dans la base de données. Elle a peut-être été supprimée ou le lien est incorrect.",
            error: "IMAGE_NOT_FOUND",
            imageId: imageId
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!imageData.shopify_image_id) {
        console.error('[SYNC-IMAGE] Image has no Shopify ID:', { imageId, imageType: imageData.content_type });
        
        // Special message for homepage images
        if (imageData.content_type === 'homepage') {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Les images de la homepage ne peuvent pas être synchronisées car elles existent directement dans le HTML de votre boutique. L'optimisation du texte ALT a déjà été effectuée dans votre base de données.",
              error: "HOMEPAGE_IMAGE_NOT_SYNCABLE",
              imageId: imageId
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: "Cette image n'a pas d'ID Shopify et ne peut pas être synchronisée. Elle a peut-être été importée manuellement ou n'existe plus dans Shopify.",
            error: "NO_SHOPIFY_ID",
            imageId: imageId
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!imageData.alt_text) {
        console.error('[SYNC-IMAGE] Image has no ALT text to sync:', { imageId });
        throw new Error("Cette image n'a pas de texte ALT à synchroniser");
      }

      // Get content details and store info based on image type
      let shopifyId: number;
      let storeId: string;
      let contentOwnerId: string;
      let shopUrl: string;
      let shopifyAccessToken: string;

      if (imageType === 'product') {
        // Handle product image
        const { data: product, error: productError } = await supabaseClient
          .from("shopify_products")
          .select("shopify_id, store_id, seller_id")
          .eq("id", imageData.product_id)
          .maybeSingle();

        console.log(`[SYNC-IMAGE] Product query result:`, { 
          found: !!product, 
          productId: imageData.product_id,
          shopifyProductId: product?.shopify_id,
          sellerId: product?.seller_id,
          error: productError 
        });

        if (productError) {
          console.error('[SYNC-IMAGE] Product fetch error:', productError);
          throw new Error(`Database error fetching product: ${productError.message}`);
        }

        if (!product) {
          console.error('[SYNC-IMAGE] Product not found:', { productId: imageData.product_id });
          throw new Error("Le produit associé à cette image n'existe pas");
        }

        // Check if user owns the product
        if (product.seller_id !== user.id) {
          console.error('[SYNC-IMAGE] Unauthorized access attempt:', { 
            imageId, 
            userId: user.id, 
            productSellerId: product.seller_id 
          });
          throw new Error("Vous n'avez pas l'autorisation d'accéder à cette image");
        }

        shopifyId = product.shopify_id;
        storeId = product.store_id;
        contentOwnerId = product.seller_id;
      } else {
        // Handle content image (collection, page, article)
        const contentType = imageData.content_type;
        let contentTable: string;
        
        if (contentType === 'collection') {
          contentTable = 'shopify_collections';
        } else if (contentType === 'page') {
          contentTable = 'shopify_pages';
        } else if (contentType === 'article') {
          contentTable = 'blog_articles';
        } else if (contentType === 'homepage') {
          // Homepage images cannot be synced to Shopify
          return new Response(
            JSON.stringify({
              success: false,
              message: "Les images de la homepage ne peuvent pas être synchronisées vers Shopify car elles existent directement dans le HTML. L'optimisation ALT est déjà sauvegardée dans votre base de données.",
              error: "HOMEPAGE_NOT_SYNCABLE"
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          throw new Error(`Type de contenu non supporté: ${contentType}`);
        }

        const { data: contentData, error: contentError } = await supabaseClient
          .from(contentTable)
          .select("shopify_collection_id, shopify_page_id, shopify_article_id, store_id, user_id")
          .eq("id", imageData.content_id)
          .maybeSingle();

        console.log(`[SYNC-IMAGE] Content query result:`, { 
          found: !!contentData, 
          contentId: imageData.content_id,
          contentType,
          error: contentError 
        });

        if (contentError) {
          console.error('[SYNC-IMAGE] Content fetch error:', contentError);
          throw new Error(`Database error fetching ${contentType}: ${contentError.message}`);
        }

        if (!contentData) {
          console.error('[SYNC-IMAGE] Content not found:', { contentId: imageData.content_id, contentType });
          throw new Error(`Le ${contentType} associé à cette image n'existe pas`);
        }

        // Check if user owns the content
        if (contentData.user_id !== user.id) {
          console.error('[SYNC-IMAGE] Unauthorized access attempt:', { 
            imageId, 
            userId: user.id, 
            contentOwnerId: contentData.user_id 
          });
          throw new Error("Vous n'avez pas l'autorisation d'accéder à cette image");
        }

        // Get the appropriate Shopify ID based on content type
        if (contentType === 'collection') {
          shopifyId = contentData.shopify_collection_id;
        } else if (contentType === 'page') {
          shopifyId = contentData.shopify_page_id;
        } else {
          shopifyId = contentData.shopify_article_id;
        }

        storeId = contentData.store_id;
        contentOwnerId = contentData.user_id;
      }

      console.log(`[SYNC-IMAGE] Authorization successful - proceeding with sync`);

      // Get Shopify connection
      const { data: storeConnection, error: storeError } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", storeId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (storeError || !storeConnection) {
        console.error('Store connection error:', storeError);
        throw new Error("Store connection not found or inactive");
      }

      shopUrl = storeConnection.store_url;
      shopifyAccessToken = storeConnection.access_token;
      
      console.log(`[SYNC-IMAGE] Syncing ALT text to Shopify via GraphQL:`, {
        shopUrl,
        contentId: shopifyId,
        imageId: imageData.shopify_image_id,
        altText: imageData.alt_text?.substring(0, 50) + '...'
      });
      
      const graphqlUrl = `https://${shopUrl}/admin/api/2025-01/graphql.json`;
      
      try {
        // Step 1: Query product media to find the MediaImage GID by matching image URL
        const getMediaQuery = `
          query getProductMedia($productId: ID!) {
            product(id: $productId) {
              media(first: 50) {
                edges {
                  node {
                    ... on MediaImage {
                      id
                      alt
                      image {
                        id
                        url
                        originalSrc
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        
        const productGid = `gid://shopify/Product/${shopifyId}`;
        
        console.log(`[SYNC-IMAGE] Fetching product media for product: ${productGid}`);
        console.log(`[SYNC-IMAGE] Looking for image with shopify_image_id: ${imageData.shopify_image_id}`);
        console.log(`[SYNC-IMAGE] Image src for matching: ${imageData.src?.substring(0, 100)}...`);
        
        const mediaResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: getMediaQuery,
            variables: { productId: productGid }
          })
        });
        
        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text();
          console.error(`[SYNC-IMAGE] ❌ GraphQL query error: ${mediaResponse.status}`, errorText);
          throw new Error(`Shopify GraphQL error: ${mediaResponse.status} - ${errorText}`);
        }
        
        const mediaResult = await mediaResponse.json();
        
        if (mediaResult.errors) {
          console.error(`[SYNC-IMAGE] ❌ GraphQL errors:`, mediaResult.errors);
          throw new Error(`Shopify GraphQL errors: ${JSON.stringify(mediaResult.errors)}`);
        }
        
        // Find the MediaImage by matching image URL (most reliable method)
        const mediaEdges = mediaResult.data?.product?.media?.edges || [];
        let mediaImageGid: string | null = null;
        
        console.log(`[SYNC-IMAGE] Found ${mediaEdges.length} media items in product`);
        
        // Method 1: Try to match by URL (most reliable)
        const imageUrl = imageData.src;
        if (imageUrl) {
          // Extract the filename from the URL for comparison
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1]?.split('?')[0]?.split('_').slice(0, -1).join('_') || '';
          
          for (const edge of mediaEdges) {
            const node = edge.node;
            if (node && node.image) {
              const shopifyUrl = node.image.url || node.image.originalSrc || '';
              const shopifyFilename = shopifyUrl.split('/').pop()?.split('?')[0]?.split('_').slice(0, -1).join('_') || '';
              
              // Match by filename pattern (Shopify may add size suffixes)
              if (shopifyUrl.includes(filename) || filename.includes(shopifyFilename) || shopifyUrl === imageUrl) {
                mediaImageGid = node.id;
                console.log(`[SYNC-IMAGE] ✅ Found MediaImage by URL match: ${mediaImageGid}`);
                break;
              }
            }
          }
        }
        
        // Method 2: If URL match failed, try matching by position or ProductImage GID
        if (!mediaImageGid) {
          const targetImageGid = `gid://shopify/ProductImage/${imageData.shopify_image_id}`;
          
          for (const edge of mediaEdges) {
            const node = edge.node;
            if (node && node.image && node.image.id === targetImageGid) {
              mediaImageGid = node.id;
              console.log(`[SYNC-IMAGE] ✅ Found MediaImage by ProductImage GID match: ${mediaImageGid}`);
              break;
            }
          }
        }
        
        // Method 3: Use first media item as fallback (risky but better than nothing)
        if (!mediaImageGid && mediaEdges.length > 0) {
          const firstMedia = mediaEdges[0]?.node;
          if (firstMedia?.id) {
            mediaImageGid = firstMedia.id;
            console.log(`[SYNC-IMAGE] ⚠️ Using first media item as fallback: ${mediaImageGid}`);
          }
        }
        
        if (!mediaImageGid) {
          console.error(`[SYNC-IMAGE] ❌ Could not find MediaImage GID for image`);
          throw new Error(`Image non trouvée sur Shopify. L'image n'existe peut-être plus dans le produit.`);
        }
        
        // Step 2: Use mediaImageUpdate mutation (recommended) to update the alt text
        const updateMutation = `
          mutation mediaImageUpdate($id: ID!, $input: MediaImageInput!) {
            mediaImageUpdate(id: $id, input: $input) {
              media {
                ... on MediaImage {
                  id
                  alt
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        console.log(`[SYNC-IMAGE] Updating alt text via mediaImageUpdate for: ${mediaImageGid}`);
        console.log(`[SYNC-IMAGE] New alt text: "${imageData.alt_text}"`);

        const updateResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: updateMutation,
            variables: {
              id: mediaImageGid,
              input: {
                alt: imageData.alt_text,
              },
            },
          }),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`[SYNC-IMAGE] ❌ mediaImageUpdate HTTP error: ${updateResponse.status}`, errorText);
          throw new Error(`Shopify mediaImageUpdate error: ${updateResponse.status} - ${errorText}`);
        }

        const updateResult = await updateResponse.json();

        if (updateResult.errors) {
          console.error(`[SYNC-IMAGE] ❌ mediaImageUpdate GraphQL errors:`, updateResult.errors);
          throw new Error(`Shopify mediaImageUpdate errors: ${JSON.stringify(updateResult.errors)}`);
        }

        const userErrors = updateResult.data?.mediaImageUpdate?.userErrors || [];
        if (userErrors.length > 0) {
          console.error(`[SYNC-IMAGE] ❌ mediaImageUpdate user errors:`, userErrors);
          throw new Error(`Shopify mediaImageUpdate user errors: ${JSON.stringify(userErrors)}`);
        }

        console.log(`[SYNC-IMAGE] ✅ Successfully synced ALT text via GraphQL mediaImageUpdate`);
        console.log(`[SYNC-IMAGE] Updated media:`, JSON.stringify(updateResult.data?.mediaImageUpdate?.media));
      } catch (gqlError: any) {
        console.error(`[SYNC-IMAGE] ❌ GraphQL operation failed:`, gqlError.message);
        throw new Error(`Erreur synchronisation Shopify: ${gqlError.message}`);
      }

      // Update image last_synced_at timestamp in database
      const updateTable = imageType === 'product' ? 'product_images' : 'content_images';
      const { error: updateError } = await supabaseClient
        .from(updateTable)
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', imageId);

      if (updateError) {
        console.error('[SYNC-IMAGE] Failed to update last_synced_at:', updateError);
      }

      // Extract store name and build Shopify URL (to parent content)
      const storeName = shopUrl.replace('.myshopify.com', '');
      const shopifyUrl = `https://admin.shopify.com/store/${storeName}/products/${shopifyId}`;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Image ALT text synced to Shopify successfully",
          shopifyUrl: shopifyUrl,
          resourceType: "image"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sync collection SEO data
    if (collectionId) {
      console.log(`[SYNC-COLLECTION] Starting SEO sync for collection: ${collectionId}, user: ${user.id}`);
      
      const { data: collection, error: collectionError } = await supabaseClient
        .from("shopify_collections")
        .select("shopify_collection_id, seo_title, seo_description, body_html, image_url, image_alt, store_id, user_id")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (collectionError || !collection) {
        console.error('[SYNC-COLLECTION] Collection fetch error:', collectionError);
        throw new Error("Collection not found or unauthorized");
      }

      if (!collection.shopify_collection_id) {
        throw new Error("Cette collection n'a pas d'ID Shopify");
      }

      // Get Shopify connection
      const { data: storeConnection, error: storeError } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", collection.store_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (storeError || !storeConnection) {
        console.error('Store connection error:', storeError);
        throw new Error("Store connection not found or inactive");
      }

      const shopUrl = storeConnection.store_url;
      const shopifyAccessToken = storeConnection.access_token;

      console.log(`[SYNC-COLLECTION] Syncing to Shopify collection ${collection.shopify_collection_id}`);

      // Use GraphQL to update collection SEO + description
      const collectionUpdateMutation = `
        mutation collectionUpdate($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              title
              descriptionHtml
              seo {
                title
                description
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const collectionInput: Record<string, unknown> = {
        id: `gid://shopify/Collection/${collection.shopify_collection_id}`,
        seo: {
          title: collection.seo_title || "",
          description: collection.seo_description || ""
        }
      };

      // Add body_html (description) if present
      if (collection.body_html) {
        collectionInput.descriptionHtml = collection.body_html;
      }

      console.log(`[SYNC-COLLECTION] Updating via GraphQL:`, {
        collectionId: collection.shopify_collection_id,
        seoTitle: collection.seo_title?.substring(0, 50),
        seoDescLength: collection.seo_description?.length,
        bodyHtmlLength: collection.body_html?.length
      });

      try {
        const graphqlResponse = await shopifyGraphQL(shopUrl, shopifyAccessToken, collectionUpdateMutation, { input: collectionInput });
        console.log("[SYNC-COLLECTION] ✅ Collection SEO + description updated successfully via GraphQL");
        console.log("[SYNC-COLLECTION] Updated collection:", JSON.stringify(graphqlResponse.data?.collectionUpdate?.collection, null, 2));
      } catch (error: any) {
        console.error("[SYNC-COLLECTION] ❌ GraphQL update failed:", error);
        throw new Error(`Échec synchronisation collection: ${error.message}`);
      }

      // Sync image if present and not already on Shopify CDN
      if (collection.image_url && !collection.image_url.includes('cdn.shopify.com')) {
        console.log(`[SYNC-COLLECTION] 📸 Syncing collection image...`);
        try {
          // Download image and convert to base64
          const imageResponse = await fetch(collection.image_url);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = btoa(
              new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            // Try custom collection first
            let shopifyImageResponse = await fetch(
              `https://${shopUrl}/admin/api/2025-01/custom_collections/${collection.shopify_collection_id}.json`,
              {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': shopifyAccessToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  custom_collection: {
                    id: collection.shopify_collection_id,
                    image: {
                      attachment: base64Image,
                      alt: collection.image_alt || ''
                    }
                  }
                })
              }
            );

            // If 404, try smart collection
            if (shopifyImageResponse.status === 404) {
              shopifyImageResponse = await fetch(
                `https://${shopUrl}/admin/api/2025-01/smart_collections/${collection.shopify_collection_id}.json`,
                {
                  method: 'PUT',
                  headers: {
                    'X-Shopify-Access-Token': shopifyAccessToken,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    smart_collection: {
                      id: collection.shopify_collection_id,
                      image: {
                        attachment: base64Image,
                        alt: collection.image_alt || ''
                      }
                    }
                  })
                }
              );
            }

            if (shopifyImageResponse.ok) {
              console.log("[SYNC-COLLECTION] ✅ Collection image synced successfully");
            } else {
              console.error("[SYNC-COLLECTION] ⚠️ Image sync failed:", await shopifyImageResponse.text());
            }
          }
        } catch (imgError) {
          console.error("[SYNC-COLLECTION] ⚠️ Image sync error (non-blocking):", imgError);
        }
      }

      // Update last_synced_at timestamp
      await supabaseClient
        .from("shopify_collections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", collectionId);

      console.log(`[SYNC-COLLECTION] ✅ Successfully synced collection ${collection.shopify_collection_id}`);

      // Extract store name and build Shopify URL
      const storeName = shopUrl.replace('.myshopify.com', '');
      const shopifyUrl = `https://admin.shopify.com/store/${storeName}/collections/${collection.shopify_collection_id}`;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Collection SEO synced to Shopify successfully",
          shopifyUrl: shopifyUrl,
          resourceType: "collection"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Either productId, imageId, or collectionId must be provided");
  } catch (error) {
    console.error("Sync error:", error);

    // Auto-detect + persist errors for debugging
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await admin.from('system_logs').insert({
        type: 'error',
        function_name: 'sync-seo-to-shopify',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        user_id: null,
        metadata: {
          route: 'sync-seo-to-shopify',
        },
        stack_trace: error instanceof Error ? error.stack : null,
      });
    } catch (_) {
      // ignore logging failures
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
