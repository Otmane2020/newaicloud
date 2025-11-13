import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { productId } = await req.json();

    if (!productId) {
      throw new Error("Product ID is required");
    }

    console.log(`🔄 Syncing images for product: ${productId}`);

    // Get product with images
    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select(`
        *,
        images:product_images(id, src, alt_text, position)
      `)
      .eq("id", productId)
      .eq("seller_id", user.id)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (!product.shopify_product_id || !product.store_id) {
      throw new Error("Product not connected to Shopify");
    }

    // Get Shopify connection
    const { data: connection, error: connError } = await supabaseClient
      .from("shopify_connections")
      .select("shop_domain, access_token")
      .eq("id", product.store_id)
      .single();

    if (connError || !connection) {
      throw new Error("Shopify connection not found");
    }

    console.log('Using direct access token, length:', connection.access_token?.length);

    // Prepare images data for Shopify
    const images = (product.images || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => ({
        id: img.shopify_image_id || undefined,
        src: img.src,
        alt: img.alt_text || "",
        position: img.position + 1, // Shopify uses 1-indexed positions
      }));

    console.log(`📤 Updating ${images.length} images for Shopify product ${product.shopify_product_id}`);

    // Update product images in Shopify
    const shopifyResponse = await fetch(
      `https://${connection.shop_domain}/admin/api/2024-01/products/${product.shopify_product_id}.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": connection.access_token,
        },
        body: JSON.stringify({
          product: {
            id: product.shopify_product_id,
            images: images,
          },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error("Shopify API error:", shopifyResponse.status, errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status}`);
    }

    const result = await shopifyResponse.json();
    
    // Update shopify_image_id for new images
    if (result.product?.images) {
      for (let i = 0; i < result.product.images.length; i++) {
        const shopifyImg = result.product.images[i];
        const localImg = product.images[i];
        
        if (localImg && !localImg.shopify_image_id) {
          await supabaseClient
            .from("product_images")
            .update({ shopify_image_id: shopifyImg.id })
            .eq("id", localImg.id);
        }
      }
    }

    console.log(`✅ Successfully synced ${images.length} images to Shopify`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Images synchronized successfully",
        imageCount: images.length,
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
