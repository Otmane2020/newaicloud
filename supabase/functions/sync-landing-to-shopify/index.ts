import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { wrapForShopify } from "../_shared/shopify-html-wrapper.ts";
import { 
  shopifyGraphQL, 
  restIdToGid, 
  handleUserErrors,
  PRODUCT_UPDATE_FULL_MUTATION 
} from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productTitle, productHandle, htmlContent } = await req.json();

    console.log("[sync-landing-to-shopify] Syncing landing page via GraphQL for product:", productId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get product to fetch store_id
    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("store_id")
      .eq("id", productId)
      .eq("seller_id", user.id)
      .single();

    if (productError || !product) {
      console.error("[sync-landing-to-shopify] Product not found:", productError);
      throw new Error("Product not found");
    }

    // Get Shopify credentials
    let connection;

    if (product.store_id) {
      const { data, error: connectionError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, access_token")
        .eq("id", product.store_id)
        .maybeSingle();

      if (!connectionError && data) {
        const { data: verifyData } = await supabase
          .from("shopify_connections")
          .select("id")
          .eq("id", product.store_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (verifyData) {
          connection = data;
        }
      }
    }

    if (!connection) {
      const { data, error: fallbackError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, access_token")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        throw new Error(`Database error: ${fallbackError.message}`);
      }

      if (!data) {
        throw new Error("No Shopify connection found. Please connect your Shopify store first.");
      }

      connection = data;
    }

    if (!connection.access_token) {
      throw new Error("No Shopify access token found");
    }

    const storeUrl = (connection.store_url || "").replace(/\/$/, "").replace(/^https?:\/\//, "");
    const fullStoreUrl = `https://${storeUrl}`;

    // Get product data
    const { data: productData, error: productFetchError } = await supabase
      .from("shopify_products")
      .select("id, shopify_id, landing_page, description, handle, title")
      .eq("id", productId)
      .single();

    if (productFetchError) {
      return new Response(
        JSON.stringify({ 
          error: "Erreur de base de données",
          details: "Impossible de récupérer les informations du produit."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!productData?.shopify_id) {
      return new Response(
        JSON.stringify({ 
          error: "Produit non synchronisé avec Shopify",
          details: "Ce produit n'a pas encore été importé depuis Shopify.",
          needsImport: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyProductId = productData.shopify_id;
    const titleToSync = productTitle || productData.title;
    
    let contentToSync = htmlContent || productData.description || '';
    let localDescriptionUpdated = false;
    
    if (productData.landing_page && productData.landing_page !== productData.description) {
      const { error: updateDescError } = await supabase
        .from("shopify_products")
        .update({ 
          description: productData.landing_page,
          updated_at: new Date().toISOString()
        })
        .eq("id", productData.id);
        
      if (!updateDescError) {
        localDescriptionUpdated = true;
      }
      
      contentToSync = productData.landing_page;
    }

    // Update product via GraphQL
    console.log("🔄 Syncing to Shopify via GraphQL - Title:", titleToSync?.substring(0, 50), "...");
    
    const productGid = restIdToGid(shopifyProductId, 'Product');
    
    const result = await shopifyGraphQL<{
      productUpdate: {
        product: { id: string; title: string; descriptionHtml: string; handle: string };
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(storeUrl, connection.access_token, PRODUCT_UPDATE_FULL_MUTATION, {
      input: {
        id: productGid,
        title: titleToSync,
        descriptionHtml: wrapForShopify(contentToSync),
      }
    });

    handleUserErrors(result.productUpdate?.userErrors, 'productUpdate');
    console.log("✅ Product title and description synced via GraphQL");

    const productUrl = `${fullStoreUrl}/products/${productData.handle || productHandle}`;

    // Update sync metadata
    await supabase
      .from("product_landing_pages")
      .update({
        last_synced_at: new Date().toISOString(),
        sync_operation: "description_updated",
        shopify_page_url: productUrl,
      })
      .eq("product_id", productId)
      .eq("is_active", true);

    return new Response(
      JSON.stringify({
        success: true,
        productDescriptionUpdated: true,
        localDescriptionUpdated,
        productUrl,
        message: `Landing page synced via GraphQL${localDescriptionUpdated ? " (description updated)" : ""}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-landing-to-shopify] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
