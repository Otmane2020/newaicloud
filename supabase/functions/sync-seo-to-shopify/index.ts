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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
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

    const { productId, imageId, collectionId, syncTags, syncAltText, syncGoogleShopping }: SyncRequest = await req.json();

    // Sync product SEO data
    if (productId) {
      // Get store connection for this user
      const { data: product, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id, last_seo_sync_at, last_synced_data")
        .eq("id", productId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (productError || !product) {
        console.error('Product fetch error:', productError);
        throw new Error("Product not found or unauthorized");
      }

      // Get Shopify connection for this product's store
      const { data: storeConnection, error: storeError } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (storeError || !storeConnection) {
        console.error('Store connection error:', storeError);
        throw new Error("Store connection not found");
      }

      // Check if sync was done less than 1 hour ago
      if (product.last_seo_sync_at) {
        const lastSync = new Date(product.last_seo_sync_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (lastSync > oneHourAgo) {
          console.log(`Product ${productId} was synced less than 1 hour ago, skipping`);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Cette synchronisation a déjà été effectuée il y a moins d'une heure. Veuillez attendre avant de synchroniser à nouveau.",
              error: "SYNC_TOO_RECENT"
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      const shopUrl = storeConnection.store_url;
      const shopifyAccessToken = storeConnection.access_token;
      
      // Build product update data
      const updateData: any = {
        product: {
          id: product.shopify_id,
        }
      };

      // Update meta tags using metafields
      const metafields: any[] = [];

      if (product.seo_title) {
        metafields.push({
          namespace: "global",
          key: "title_tag",
          value: product.seo_title,
          type: "single_line_text_field"
        });
      }

      if (product.seo_description) {
        metafields.push({
          namespace: "global",
          key: "description_tag",
          value: product.seo_description,
          type: "multi_line_text_field"
        });
      }

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

      if (metafields.length > 0) {
        updateData.product.metafields = metafields;
      }

      // Sync tags if requested - Shopify expects comma-separated string
      if (syncTags && product.tags) {
        // Ensure tags is a string (it should already be from the database)
        updateData.product.tags = typeof product.tags === 'string' ? product.tags : '';
      }

      // Sync product type for Google Shopping
      if (syncGoogleShopping && product.category) {
        updateData.product.product_type = product.category;
      }

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

      // Track Shopify API usage
      await supabaseAdmin.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'shopify_requests_count',
        p_increment: 1
      });

      console.log(`Product ${product.shopify_id} synced successfully`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Product synced to Shopify successfully",
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
      
      // First, get the image details
      const { data: imageData, error: imageError } = await supabaseClient
        .from("product_images")
        .select("id, shopify_image_id, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();

      console.log(`[SYNC-IMAGE] Image query result:`, { 
        found: !!imageData, 
        imageId: imageData?.id,
        shopifyImageId: imageData?.shopify_image_id,
        hasAltText: !!imageData?.alt_text,
        error: imageError 
      });

      if (imageError) {
        console.error('[SYNC-IMAGE] Image fetch error:', imageError);
        throw new Error(`Database error fetching image: ${imageError.message}`);
      }

      if (!imageData) {
        console.error('[SYNC-IMAGE] Image not found in database:', { imageId });
        throw new Error(`Image with ID ${imageId} not found in database`);
      }

      if (!imageData.shopify_image_id) {
        console.error('[SYNC-IMAGE] Image has no Shopify ID:', { imageId });
        throw new Error("Cette image n'a pas d'ID Shopify - elle ne peut pas être synchronisée");
      }

      if (!imageData.alt_text) {
        console.error('[SYNC-IMAGE] Image has no ALT text to sync:', { imageId });
        throw new Error("Cette image n'a pas de texte ALT à synchroniser");
      }

      // Now get the product to verify ownership and get store info
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

      console.log(`[SYNC-IMAGE] Authorization successful - proceeding with sync`);

      // Get Shopify connection
      const { data: storeConnection, error: storeError } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (storeError || !storeConnection) {
        console.error('Store connection error:', storeError);
        throw new Error("Store connection not found or inactive");
      }

      const shopUrl = storeConnection.store_url;
      const shopifyAccessToken = storeConnection.access_token;
      
      console.log(`[SYNC-IMAGE] Syncing to Shopify:`, {
        shopUrl,
        productId: product.shopify_id,
        imageId: imageData.shopify_image_id,
        altText: imageData.alt_text?.substring(0, 50) + '...'
      });
      
      const shopifyResponse = await fetch(
        `https://${shopUrl}/admin/api/2024-01/products/${product.shopify_id}/images/${imageData.shopify_image_id}.json`,
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

      return new Response(
        JSON.stringify({
          success: true,
          message: "Image ALT text synced to Shopify successfully",
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
          console.error(`[SYNC-COLLECTION] Metafield ${metafield.key} sync error:`, errorText);
          // Continue with other metafields even if one fails
        } else {
          console.log(`[SYNC-COLLECTION] ✅ Metafield ${metafield.key} synced successfully`);
        }
      }

      // Track Shopify API usage
      await supabaseAdmin.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'shopify_requests_count',
        p_increment: 1
      });

      console.log(`[SYNC-COLLECTION] ✅ Successfully synced collection ${collection.shopify_collection_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Collection SEO synced to Shopify successfully",
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
