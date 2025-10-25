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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { productId, imageId, syncTags, syncAltText, syncGoogleShopping }: SyncRequest = await req.json();

    const shopifyAccessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!shopifyAccessToken) {
      throw new Error("Shopify access token not configured");
    }

    // Sync product SEO data
    if (productId) {
      const { data: product, error: productError } = await supabaseClient
        .from("shopify_products")
        .select("shopify_id, seo_title, seo_description, tags, category, sub_category, vendor")
        .eq("id", productId)
        .maybeSingle();

      if (productError || !product) {
        throw new Error("Product not found");
      }

      const shopUrl = Deno.env.get("SHOPIFY_STORE_URL") || "";
      
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

      // Sync tags if requested
      if (syncTags && product.tags) {
        updateData.product.tags = product.tags;
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
        .select("shopify_id")
        .eq("id", image.product_id)
        .maybeSingle();

      if (!product) {
        throw new Error("Product not found for image");
      }

      const shopUrl = Deno.env.get("SHOPIFY_STORE_URL") || "";
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
