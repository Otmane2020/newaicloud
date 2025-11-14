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
        images:product_images(id, src, alt_text, position, shopify_image_id, variant_id)
      `)
      .eq("id", productId)
      .eq("seller_id", user.id)
      .single();

    if (productError || !product) {
      // Check if product exists but doesn't belong to user
      const { data: anyProduct } = await supabaseClient
        .from("shopify_products")
        .select("id, seller_id")
        .eq("id", productId)
        .single();
      
      if (anyProduct) {
        console.error(`❌ Product ${productId} belongs to another user`);
        throw new Error(`Product access denied`);
      }
      
      console.error(`❌ Product ${productId} not found in database`);
      throw new Error(`Product not found or has been deleted`);
    }

    // If product not synced to Shopify, just return success without syncing
    if (!product.shopify_product_id) {
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
        .select("shop_domain, access_token")
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
        .select("shop_domain, access_token")
        .eq("seller_id", user.id)
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

    // Get existing images from Shopify first
    console.log(`🔍 Fetching existing images from Shopify product ${product.shopify_product_id}`);
    const getResponse = await fetch(
      `https://${connection.shop_domain}/admin/api/2024-01/products/${product.shopify_product_id}.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": connection.access_token,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error("Shopify GET error:", getResponse.status, errorText);
      throw new Error(`Failed to fetch Shopify product: ${getResponse.status}`);
    }

    const existingProduct = await getResponse.json();
    const existingImages = existingProduct.product?.images || [];
    
    console.log(`📸 Found ${existingImages.length} existing images in Shopify`);

    // Prepare new images to add (only those without shopify_image_id)
    const newImages = (product.images || [])
      .filter((img: any) => !img.shopify_image_id) // Only new images
      .map((img: any) => ({
        src: img.src,
        alt: img.alt_text || "",
        variant_ids: img.variant_id ? [img.variant_id] : undefined,
      }));

    console.log(`➕ Adding ${newImages.length} new images to Shopify`);

    // Add new images one by one to preserve existing ones
    const addedImages = [];
    for (const newImage of newImages) {
      const addResponse = await fetch(
        `https://${connection.shop_domain}/admin/api/2024-01/products/${product.shopify_product_id}/images.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": connection.access_token,
          },
          body: JSON.stringify({ image: newImage }),
        }
      );

      if (addResponse.ok) {
        const result = await addResponse.json();
        addedImages.push(result.image);
        console.log(`✅ Added image: ${result.image.id}`);
      } else {
        const errorText = await addResponse.text();
        console.error("Failed to add image:", errorText);
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

    console.log(`✅ Successfully added ${addedImages.length} new images to Shopify`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Images synchronized successfully",
        imageCount: addedImages.length,
        totalImages: existingImages.length + addedImages.length,
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
