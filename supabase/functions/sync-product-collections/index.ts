import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Support both normal mode (with auth header) and service mode (with userId in body)
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    
    if (bodyCheck.userId) {
      // Service mode: use provided userId
      console.log(`🔧 [SYNC-COLLECTIONS] SERVICE MODE: Using provided userId: ${bodyCheck.userId}`);
      userId = bodyCheck.userId;
    } else if (authHeader) {
      // Normal mode: validate JWT
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (userError || !user) {
        throw new Error("Unauthorized");
      }
      userId = user.id;
    } else {
      throw new Error("Missing authorization header or userId");
    }

    console.log(`🚀 [SYNC-COLLECTIONS] Function invoked for user ${userId}`);

    // Use bodyCheck from earlier
    let storeId = bodyCheck.storeId;

    if (!storeId) {
      // Fallback: chercher la connexion active si storeId non fourni (backward compatibility)
      console.log(`⚠️ [SYNC-COLLECTIONS] No storeId provided, falling back to active connection`);
      const { data: connection, error: connectionError } = await supabase
        .from("shopify_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();
        
      if (connectionError || !connection) {
        console.error(`❌ [SYNC-COLLECTIONS] No storeId provided and no active connection found for user ${userId}`);
        throw new Error("No storeId provided and no active Shopify connection found");
      }
      storeId = connection.id;
    } else {
      // Vérifier que le store appartient bien à l'utilisateur
      const { data: connection, error: connectionError } = await supabase
        .from("shopify_connections")
        .select("*")
        .eq("id", storeId)
        .eq("user_id", userId)
        .single();
        
      if (connectionError || !connection) {
        console.error(`❌ [SYNC-COLLECTIONS] Store ${storeId} not found or unauthorized for user ${userId}`);
        throw new Error("Store not found or unauthorized");
      }
      console.log(`✅ [SYNC-COLLECTIONS] Using specified store: ${connection.store_url} (store_id: ${storeId})`);
    }

    // Get connection details for API calls
    const { data: storeConnection, error: storeError } = await supabase
      .from("shopify_connections")
      .select("store_url, access_token")
      .eq("id", storeId)
      .single();

    if (storeError || !storeConnection) {
      console.error(`❌ [SYNC-COLLECTIONS] Failed to fetch store connection details`);
      throw new Error("Failed to fetch store connection");
    }

    // Get all collections for this store
    const { data: collections, error: collectionsError } = await supabase
      .from("shopify_collections")
      .select("id, shopify_collection_id")
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (collectionsError) {
      console.error(`❌ [SYNC-COLLECTIONS] Error fetching collections:`, collectionsError);
      throw collectionsError;
    }

    const collectionMap = new Map(
      collections?.map(c => [String(c.shopify_collection_id), c.id]) || []
    );

    console.log(`📦 [SYNC-COLLECTIONS] Found ${collections?.length || 0} collections in database for store ${storeId}`);

    // Get all products for this store
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("id, shopify_id")
      .eq("seller_id", userId)
      .eq("store_id", storeId);

    if (productsError) {
      console.error(`❌ [SYNC-COLLECTIONS] Error fetching products:`, productsError);
      throw productsError;
    }

    console.log(`📦 [SYNC-COLLECTIONS] Processing ${products?.length || 0} products`);
    console.log(`🔧 [SYNC-COLLECTIONS] Shopify store URL: ${storeConnection.store_url}`);

    let updatedCount = 0;
    let errorCount = 0;
    const shopifyUrl = storeConnection.store_url.replace(/\/$/, "").replace(/^https?:\/\//, "");
    const accessToken = storeConnection.access_token;

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
      console.log(`🔄 [SYNC-COLLECTIONS] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);
      
      const batchPromises = batch.map(async (product) => {
        if (!product.shopify_id) {
          console.log(`⚠️ [SYNC-COLLECTIONS] Skipping product ${product.id} - no shopify_id`);
          return null;
        }

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
            console.error(`❌ [SYNC-COLLECTIONS] GraphQL failed for product ${product.shopify_id} - Status: ${graphqlResponse.status}`);
            return { success: false };
          }

          const graphqlData = await graphqlResponse.json();
          
          if (graphqlData.errors) {
            console.error(`❌ [SYNC-COLLECTIONS] GraphQL errors for product ${product.shopify_id}:`, graphqlData.errors);
            return { success: false };
          }

          const productCollections = graphqlData.data?.product?.collections?.edges || [];
          
          // Map Shopify collection IDs to our internal UUIDs
          const internalCollectionIds = productCollections
            .map((edge: any) => collectionMap.get(String(edge.node.legacyResourceId)))
            .filter(Boolean);

          console.log(`📋 [SYNC-COLLECTIONS] Product ${product.shopify_id} belongs to ${internalCollectionIds.length} collections`);

          // Always update, even if empty array (to ensure consistency)
          const { error: updateError } = await supabase
            .from("shopify_products")
            .update({ 
              collection_ids: internalCollectionIds,
              updated_at: new Date().toISOString()
            })
            .eq("id", product.id);

          if (updateError) {
            console.error(`❌ [SYNC-COLLECTIONS] Error updating product ${product.id}:`, updateError);
            return { success: false };
          }
          
          return { 
            success: true, 
            collectionCount: internalCollectionIds.length 
          };
        } catch (error) {
          console.error(`❌ [SYNC-COLLECTIONS] Error processing product ${product.id}:`, error);
          return { success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      const successCount = batchResults.filter(r => r?.success).length;
      const failCount = batchResults.filter(r => !r?.success).length;
      
      updatedCount += successCount;
      errorCount += failCount;
      
      console.log(`✅ [SYNC-COLLECTIONS] Batch ${batchIndex + 1}/${batches.length} complete: ${successCount} updated, ${failCount} errors`);
      
      // Small delay between batches to respect Shopify rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✨ [SYNC-COLLECTIONS] Sync complete: ${updatedCount} products updated, ${errorCount} errors out of ${products?.length || 0} total`);

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
