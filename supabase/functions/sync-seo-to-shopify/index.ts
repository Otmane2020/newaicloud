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
  force?: boolean; // Bypass throttling check (for post-optimization sync)
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

  // Safe HealthCheck handler
  const bodyCheck = await req.json().catch(() => ({}));
  if (bodyCheck?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Authenticate user
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('User not authenticated');
    }

    console.log(`[SYNC] User authenticated: ${user.id}`);

    // Create client with user context for RLS-protected queries
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { productId, imageId, collectionId, syncTags, syncAltText, syncGoogleShopping, force }: SyncRequest = bodyCheck;

    // Sync product SEO data
    if (productId) {
      // Get store connection for this user
      const { data: product, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, title, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id, last_seo_sync_at, last_synced_data")
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

      // Check if sync was done less than 5 minutes ago (unless force is true)
      if (!force && product.last_seo_sync_at) {
        const lastSync = new Date(product.last_seo_sync_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        if (lastSync > fiveMinutesAgo) {
          console.log(`Product ${productId} was synced less than 5 minutes ago, skipping`);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Cette synchronisation a déjà été effectuée il y a moins de 5 minutes. Veuillez patienter quelques instants.",
              error: "SYNC_TOO_RECENT"
            }),
            {
              status: 429,
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
      console.log(`[SYNC-SEO] Updating product ${product.shopify_id} SEO via GraphQL...`);
      console.log(`[SYNC-SEO] SEO Title: "${product.seo_title || product.title || ""}"`);
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
          seo: {
            title: product.seo_title || product.title || "",
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

      // Only make REST call if we have something to update (tags, product_type, or metafields)
      if (updateData.product.tags || updateData.product.product_type || updateData.product.metafields) {
        const shopifyResponse = await fetch(
          `https://${shopUrl}/admin/api/2024-01/products/${product.shopify_id}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": shopifyAccessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          console.error(`Shopify API error for product ${product.shopify_id}:`, errorText);
          throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
        }
        
        console.log("[SYNC-SEO] ✅ Tags, product_type, and metafields updated successfully via REST");
      } else {
        console.log("[SYNC-SEO] No tags, product_type, or metafields to update via REST");
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
        .select("id, shopify_image_id, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();

      if (productImageData) {
        imageData = productImageData;
        imageType = 'product';
      } else {
        // If not found in product_images, try content_images
        const { data: contentImageData, error: contentImageError } = await supabaseClient
          .from("content_images")
          .select("id, shopify_image_id, alt_text, content_id, content_type")
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
      
      console.log(`[SYNC-IMAGE] Syncing to Shopify:`, {
        shopUrl,
        contentId: shopifyId,
        imageId: imageData.shopify_image_id,
        altText: imageData.alt_text?.substring(0, 50) + '...'
      });
      
      const shopifyResponse = await fetch(
        `https://${shopUrl}/admin/api/2024-01/products/${shopifyId}/images/${imageData.shopify_image_id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: {
              id: imageData.shopify_image_id,
              alt: imageData.alt_text,
            },
          }),
        }
      );

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error(`[SYNC-IMAGE] Shopify API error:`, {
          status: shopifyResponse.status,
          imageId: imageData.shopify_image_id,
          error: errorText
        });
        throw new Error(`Erreur Shopify API (${shopifyResponse.status}): ${errorText}`);
      }

      console.log(`[SYNC-IMAGE] ✅ Successfully synced ALT text for image ${imageData.shopify_image_id}`);

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
        .select("shopify_collection_id, seo_title, seo_description, store_id, user_id")
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

      // Shopify collections use metafields for SEO data
      // We need to create/update metafields individually
      const metafieldsToSync: Array<{key: string, value: string, type: string}> = [];

      if (collection.seo_title) {
        metafieldsToSync.push({
          key: "title_tag",
          value: collection.seo_title,
          type: "single_line_text_field"
        });
      }

      if (collection.seo_description) {
        metafieldsToSync.push({
          key: "description_tag",
          value: collection.seo_description,
          type: "multi_line_text_field"
        });
      }

      // Sync each metafield using the correct Shopify REST API endpoint
      for (const metafield of metafieldsToSync) {
        const metafieldData = {
          metafield: {
            namespace: "global",
            key: metafield.key,
            value: metafield.value,
            type: metafield.type,
            owner_id: collection.shopify_collection_id,
            owner_resource: "collection"
          }
        };

        console.log(`[SYNC-COLLECTION] Creating/updating metafield ${metafield.key}`);

        const metafieldResponse = await fetch(
          `https://${shopUrl}/admin/api/2024-01/metafields.json`,
          {
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": shopifyAccessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(metafieldData),
          }
        );

        if (!metafieldResponse.ok) {
          const errorText = await metafieldResponse.text();
          console.error(`[SYNC-COLLECTION] ❌ Metafield ${metafield.key} sync error:`, errorText);
          
          // ⚠️ CRITICAL FIX: Throw error instead of continuing silently
          throw new Error(`Échec synchronisation ${metafield.key}: ${errorText}`);
        } else {
          console.log(`[SYNC-COLLECTION] ✅ Metafield ${metafield.key} synced successfully`);
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
