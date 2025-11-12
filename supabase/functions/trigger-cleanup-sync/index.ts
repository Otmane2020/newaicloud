import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Starting automatic cleanup sync for all users...");

    // Get all active Shopify connections
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from("shopify_connections")
      .select("user_id, store_url, access_token");

    if (connectionsError) {
      console.error("Error fetching connections:", connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log("No active Shopify connections found");
      return new Response(
        JSON.stringify({ success: true, message: "No connections to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      usersProcessed: 0,
      totalCollectionsDeleted: 0,
      totalProductsDeleted: 0,
      totalArticlesDeleted: 0,
      totalPagesDeleted: 0,
      errors: [] as string[],
    };

    for (const connection of connections) {
      try {
        console.log(`Processing user: ${connection.user_id}`);

        // Sync Collections
        const { data: dbCollections } = await supabaseAdmin
          .from("shopify_collections")
          .select("id, shopify_collection_id")
          .eq("user_id", connection.user_id);

        if (dbCollections && dbCollections.length > 0) {
          const shopifyResponse = await fetch(
            `https://${connection.store_url}/admin/api/2024-01/custom_collections.json?limit=250`,
            {
              headers: {
                "X-Shopify-Access-Token": connection.access_token,
              },
            }
          );

          if (shopifyResponse.ok) {
            const { custom_collections } = await shopifyResponse.json();
            const shopifyIds = new Set(custom_collections.map((c: any) => c.id));

            for (const collection of dbCollections) {
              if (!shopifyIds.has(collection.shopify_collection_id)) {
                await supabaseAdmin
                  .from("shopify_collections")
                  .delete()
                  .eq("id", collection.id);
                results.totalCollectionsDeleted++;
                console.log(`Deleted collection: ${collection.id}`);
              }
            }
          }
        }

        // Sync Products (only check first 50 to avoid rate limits)
        const { data: dbProducts } = await supabaseAdmin
          .from("shopify_products")
          .select("id, shopify_id")
          .eq("seller_id", connection.user_id)
          .not("shopify_id", "is", null)
          .limit(50);

        if (dbProducts && dbProducts.length > 0) {
          for (const product of dbProducts) {
            try {
              const shopifyResponse = await fetch(
                `https://${connection.store_url}/admin/api/2024-01/products/${product.shopify_id}.json`,
                {
                  headers: {
                    "X-Shopify-Access-Token": connection.access_token,
                  },
                }
              );

              if (shopifyResponse.status === 404) {
                await supabaseAdmin
                  .from("shopify_products")
                  .delete()
                  .eq("id", product.id);
                results.totalProductsDeleted++;
                console.log(`Deleted product: ${product.id}`);
              }
            } catch (error) {
              console.error(`Error checking product ${product.shopify_id}:`, error);
            }
          }
        }

        results.usersProcessed++;
        
        // Rate limiting between users
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Error processing user ${connection.user_id}: ${error.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log("✅ Cleanup sync completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Automatic cleanup completed",
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
