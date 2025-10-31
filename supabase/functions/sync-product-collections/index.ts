import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`🔄 Starting product-collection sync for user ${user.id}`);

    // Get user's Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connectionError || !connection) {
      throw new Error("No active Shopify connection found");
    }

    // Get all collections
    const { data: collections, error: collectionsError } = await supabase
      .from("shopify_collections")
      .select("id, shopify_collection_id")
      .eq("user_id", user.id);

    if (collectionsError) throw collectionsError;

    const collectionMap = new Map(
      collections?.map(c => [String(c.shopify_collection_id), c.id]) || []
    );

    console.log(`📦 Found ${collections?.length || 0} collections`);

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("id, shopify_id")
      .eq("seller_id", user.id);

    if (productsError) throw productsError;

    console.log(`📦 Processing ${products?.length || 0} products`);

    let updatedCount = 0;
    const shopifyUrl = connection.store_url.replace(/\/$/, "");
    const accessToken = connection.access_token;

    // Process products in batches
    for (const product of products || []) {
      if (!product.shopify_id) continue;

      try {
        // Fetch product from Shopify to get collections
        const response = await fetch(
          `${shopifyUrl}/admin/api/2025-01/products/${product.shopify_id}.json`,
          {
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch product ${product.shopify_id}`);
          continue;
        }

        const data = await response.json();
        const shopifyProduct = data.product;

        // Get collection IDs from Shopify product
        const shopifyCollectionIds = shopifyProduct.collections || [];
        
        // Map Shopify collection IDs to our internal UUIDs
        const internalCollectionIds = shopifyCollectionIds
          .map((coll: any) => collectionMap.get(String(coll.collection_id)))
          .filter(Boolean);

        if (internalCollectionIds.length > 0) {
          // Update product with collection_ids
          const { error: updateError } = await supabase
            .from("shopify_products")
            .update({ 
              collection_ids: internalCollectionIds,
              updated_at: new Date().toISOString()
            })
            .eq("id", product.id);

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ Updated product ${product.id} with ${internalCollectionIds.length} collections`);
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
      }
    }

    console.log(`✨ Sync complete: ${updatedCount} products updated`);

    return new Response(JSON.stringify({
      success: true,
      updated_count: updatedCount,
      total_products: products?.length || 0
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
