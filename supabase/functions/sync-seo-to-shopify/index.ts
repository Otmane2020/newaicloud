import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  productId?: string;
  imageId?: string;
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { productId, imageId, syncTags, syncAltText, syncGoogleShopping }: SyncRequest = await req.json();

    // Sync product SEO data
    if (productId) {
      // Get store connection for this user
      const { data: product, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id")
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

      // Update sync status in database
      await supabaseClient
        .from("shopify_products")
        .update({
          seo_synced_to_shopify: true,
          last_seo_sync_at: new Date().toISOString(),
          seo_sync_error: null,
        })
        .eq("id", productId);

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
      const { data: image, error: imageError } = await supabaseClient
        .from("product_images")
        .select("shopify_image_id, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();

      if (imageError || !image) {
        throw new Error("Image not found");
      }

      const { data: product } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, store_id, seller_id")
        .eq("id", image.product_id)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (!product) {
        throw new Error("Product not found for image");
      }

      // Get Shopify connection
      const { data: storeConnection, error: storeError } = await supabaseClient
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (storeError || !storeConnection) {
        throw new Error("Store connection not found");
      }

      const shopUrl = storeConnection.store_url;
      const shopifyAccessToken = storeConnection.access_token;
      const shopifyResponse = await fetch(
        `https://${shopUrl}/admin/api/2024-01/products/${product.shopify_id}/images/${image.shopify_image_id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: {
              id: image.shopify_image_id,
              alt: image.alt_text,
            },
          }),
        }
      );

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error(`Shopify API error for image ${image.shopify_image_id}:`, errorText);
        throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
      }

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

    throw new Error("Either productId or imageId must be provided");
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
