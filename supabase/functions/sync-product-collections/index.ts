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

    // Process products using GraphQL (more efficient)
    console.log(`🔄 Using GraphQL to fetch product collections...`);
    
    for (const product of products || []) {
      if (!product.shopify_id) continue;

      try {
        // Use GraphQL to get product collections in one call
        const graphqlQuery = `
          query {
            product(id: "gid://shopify/Product/${product.shopify_id}") {
              collections(first: 100) {
                edges {
                  node {
                    id
                    legacyResourceId
                  }
                }
              }
            }
          }
        `;

        const graphqlResponse = await fetch(
          `${shopifyUrl}/admin/api/2025-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: graphqlQuery }),
          }
        );

        if (!graphqlResponse.ok) {
          console.error(`❌ GraphQL failed for product ${product.shopify_id}`);
          continue;
        }

        const graphqlData = await graphqlResponse.json();
        
        if (graphqlData.errors) {
          console.error(`❌ GraphQL errors for product ${product.shopify_id}:`, graphqlData.errors);
          continue;
        }

        const productCollections = graphqlData.data?.product?.collections?.edges || [];
        
        // Map Shopify collection IDs to our internal UUIDs
        const internalCollectionIds = productCollections
          .map((edge: any) => collectionMap.get(String(edge.node.legacyResourceId)))
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
            console.error(`❌ Error updating product ${product.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ Updated product ${product.id} with ${internalCollectionIds.length} collections`);
          }
        } else {
          console.log(`ℹ️ Product ${product.id} has no collections`);
        }

        // Rate limiting (GraphQL is more efficient, still be respectful)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error);
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
