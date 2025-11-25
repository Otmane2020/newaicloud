import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shopifyGraphQL, restIdToGid, handleUserErrors, PRODUCT_DELETE_MUTATION } from "../_shared/shopify-graphql.ts";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const { productId } = await req.json();
    if (!productId) {
      throw new Error("Missing productId");
    }

    // Get product details and Shopify connection
    const { data: product, error: productError } = await supabaseAdmin
      .from("shopify_products")
      .select("shopify_id, seller_id, store_id")
      .eq("id", productId)
      .eq("seller_id", user.id)
      .single();

    if (productError || !product) {
      throw new Error("Product not found or unauthorized");
    }

    // Get Shopify connection, filtering by store_id if available
    let connectionQuery = supabaseAdmin
      .from("shopify_connections")
      .select("store_url, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true);
    
    if (product.store_id) {
      connectionQuery = connectionQuery.eq("id", product.store_id);
    }
    
    const { data: connection, error: connectionError } = await connectionQuery
      .limit(1)
      .single();

    if (connectionError || !connection) {
      throw new Error("Shopify connection not found");
    }

    // Delete from Shopify if it has a shopify_id (using GraphQL)
    if (product.shopify_id) {
      console.log(`🗑️ Deleting product ${product.shopify_id} from Shopify using GraphQL`);
      
      const productGid = restIdToGid(product.shopify_id, 'Product');
      
      try {
        const result = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_DELETE_MUTATION,
          { input: { id: productGid } }
        );

        handleUserErrors(result.productDelete?.userErrors, 'productDelete');
        console.log(`✅ Product deleted from Shopify: ${result.productDelete?.deletedProductId}`);
      } catch (error: any) {
        console.error("❌ Shopify GraphQL deletion failed:", error);
        throw new Error(`Shopify deletion failed: ${error?.message || String(error)}`);
      }
    }

    // Delete from database (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from("shopify_products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Product deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
