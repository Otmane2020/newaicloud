import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shopifyGraphQL, extractNodes, PRODUCTS_QUERY } from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function syncProductsFromShopify(userId: string, supabase: any) {
  console.log(`Starting sync for user: ${userId}`);
  
  // Get active Shopify connection
  const { data: connection, error: connError } = await supabase
    .from("shopify_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (connError || !connection) {
    throw new Error("No active Shopify connection found");
  }

  const storeUrl = connection.store_url;
  const accessToken = connection.access_token;

  if (!storeUrl || !accessToken) {
    throw new Error("Could not determine store domain. Please check Shopify connection.");
  }

  // Clean the store URL (remove https://, http://, trailing slashes)
  const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  console.log(`Using cleaned store URL: ${cleanStoreUrl}`);

  // Fetch products from Shopify using GraphQL
  console.log("📦 Fetching products from Shopify using GraphQL...");
  let allProducts: any[] = [];
  let hasNextPage = true;
  let cursor: string | undefined;
  let pageCount = 0;

  while (hasNextPage && pageCount < 50) { // Safety limit
    try {
      const result = await shopifyGraphQL(
        cleanStoreUrl,
        accessToken,
        PRODUCTS_QUERY,
        { first: 50, after: cursor }
      );

      const products = extractNodes(result.products);
      allProducts.push(...products);
      
      hasNextPage = result.products?.pageInfo?.hasNextPage || false;
      cursor = result.products?.pageInfo?.endCursor;
      pageCount++;
      
      console.log(`📄 Page ${pageCount}: Fetched ${products.length} products (total: ${allProducts.length})`);
      
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }
    } catch (error: any) {
      console.error(`❌ GraphQL fetch error on page ${pageCount}:`, error);
      throw new Error(`Shopify GraphQL error: ${error?.message || String(error)}`);
    }
  }
  
  let updatedCount = 0;

  // Update each product in our database
  for (const shopifyProduct of allProducts) {
    try {
      // Extract numeric ID from GID
      const numericId = shopifyProduct.id.split('/').pop();
      const variants = extractNodes(shopifyProduct.variants || { edges: [] });
      const firstVariant: any = variants[0];
      const images = extractNodes(shopifyProduct.images || { edges: [] });
      const firstImage: any = images[0];
      
      const { error: updateError } = await supabase
        .from("shopify_products")
        .update({
          title: shopifyProduct.title,
          description: shopifyProduct.descriptionHtml || "",
          price: firstVariant?.price || "0",
          compare_at_price: firstVariant?.compareAtPrice || null,
          status: shopifyProduct.status?.toLowerCase() || "draft",
          vendor: shopifyProduct.vendor || "",
          product_type: shopifyProduct.productType || "",
          tags: shopifyProduct.tags?.join(", ") || "",
          image_url: firstImage?.url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("shopify_id", numericId)
        .eq("seller_id", userId);

      if (!updateError) {
        updatedCount++;
      }
    } catch (error) {
      console.error(`Error updating product ${shopifyProduct.id}:`, error);
    }
  }

  // Update last sync time
  await supabase
    .from("merchant_feed_settings")
    .update({
      last_shopify_sync_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { productsUpdated: updatedCount, totalProducts: allProducts.length };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getSupabaseClient(authHeader);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await syncProductsFromShopify(userId, supabase);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-shopify-to-feed:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        productsUpdated: 0 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});