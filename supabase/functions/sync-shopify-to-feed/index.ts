import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // Fetch products from Shopify API
  const shopifyApiUrl = `https://${storeUrl}/admin/api/2024-01/products.json`;
  const response = await fetch(shopifyApiUrl, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const { products } = await response.json();
  
  let updatedCount = 0;

  // Update each product in our database
  for (const shopifyProduct of products) {
    try {
      const { error: updateError } = await supabase
        .from("shopify_products")
        .update({
          title: shopifyProduct.title,
          description: shopifyProduct.body_html,
          price: shopifyProduct.variants[0]?.price || "0",
          compare_at_price: shopifyProduct.variants[0]?.compare_at_price,
          status: shopifyProduct.status,
          vendor: shopifyProduct.vendor,
          product_type: shopifyProduct.product_type,
          tags: shopifyProduct.tags ? shopifyProduct.tags.split(", ") : [],
          image_url: shopifyProduct.image?.src || null,
          updated_at: new Date().toISOString(),
        })
        .eq("shopify_id", shopifyProduct.id.toString())
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

  return { productsUpdated: updatedCount, totalProducts: products.length };
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