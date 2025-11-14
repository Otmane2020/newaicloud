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
    let errorCount = 0;
    const shopifyUrl = connection.store_url.replace(/\/$/, "").replace(/^https?:\/\//, "");
    const accessToken = connection.access_token;

    console.log(`🔄 Processing ${products?.length || 0} products in batches of 50...`);
    
    // Process products in batches of 50 simultaneously
    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < (products || []).length; i += BATCH_SIZE) {
      batches.push((products || []).slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Created ${batches.length} batches to process`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);
      
      const batchPromises = batch.map(async (product) => {
        if (!product.shopify_id) return null;

        try {
          const graphqlQuery = `
            query {
              product(id: "gid://shopify/Product/${product.shopify_id}") {
                collections(first: 100) {
                  edges {
                    node {
                      legacyResourceId
                    }
                  }
                }
              }
            }
          `;

          const graphqlResponse = await fetch(
            `https://${shopifyUrl}/admin/api/2025-01/graphql.json`,
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
            return { success: false };
          }

          const graphqlData = await graphqlResponse.json();
          
          if (graphqlData.errors) {
            console.error(`❌ GraphQL errors for product ${product.shopify_id}`);
            return { success: false };
          }

          const productCollections = graphqlData.data?.product?.collections?.edges || [];
          
          // Map Shopify collection IDs to our internal UUIDs
          const internalCollectionIds = productCollections
            .map((edge: any) => collectionMap.get(String(edge.node.legacyResourceId)))
            .filter(Boolean);

          // Always update, even if empty array (to ensure consistency)
          const { error: updateError } = await supabase
            .from("shopify_products")
            .update({ 
              collection_ids: internalCollectionIds,
              updated_at: new Date().toISOString()
            })
            .eq("id", product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id}:`, updateError);
            return { success: false };
          }
          
          return { 
            success: true, 
            collectionCount: internalCollectionIds.length 
          };
        } catch (error) {
          console.error(`❌ Error processing product ${product.id}:`, error);
          return { success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      const successCount = batchResults.filter(r => r?.success).length;
      const failCount = batchResults.filter(r => !r?.success).length;
      
      updatedCount += successCount;
      errorCount += failCount;
      
      console.log(`✅ Batch ${batchIndex + 1} complete: ${successCount} updated, ${failCount} errors`);
      
      // Small delay between batches to respect Shopify rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✨ Sync complete: ${updatedCount} products updated, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      updated_count: updatedCount,
      error_count: errorCount,
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
