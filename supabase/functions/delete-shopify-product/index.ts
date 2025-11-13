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

    // Delete from Shopify if it has a shopify_id
    if (product.shopify_id) {
      const shopifyResponse = await fetch(
        `https://${connection.store_url}/admin/api/2024-01/products/${product.shopify_id}.json`,
        {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": connection.access_token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!shopifyResponse.ok) {
        const error = await shopifyResponse.text();
        console.error("Shopify deletion failed:", error);
        throw new Error(`Shopify deletion failed: ${error}`);
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
