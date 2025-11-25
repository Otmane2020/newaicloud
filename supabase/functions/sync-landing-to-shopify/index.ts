import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { wrapForShopify } from "../_shared/shopify-html-wrapper.ts";

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

    console.log("[sync-landing-to-shopify] Syncing landing page for product:", productId);
    console.log("[sync-landing-to-shopify] Using encrypted_token column (v2)");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

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

    console.log("[sync-landing-to-shopify] Product store_id:", product.store_id);

    // Get Shopify credentials - try multiple strategies
    let connection;

    // Strategy 1: Use product's store_id if available
    if (product.store_id) {
      console.log("[sync-landing-to-shopify] Trying to fetch connection by store_id:", product.store_id);
      const { data, error: connectionError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, access_token")
        .eq("id", product.store_id)
        .maybeSingle();

      if (connectionError) {
        console.error("[sync-landing-to-shopify] Error fetching connection by store_id:", connectionError);
      } else if (!data) {
        console.warn("[sync-landing-to-shopify] No connection found for store_id:", product.store_id);
      } else {
        // Verify this connection belongs to the user
        const { data: verifyData } = await supabase
          .from("shopify_connections")
          .select("id")
          .eq("id", product.store_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (verifyData) {
          connection = data;
          console.log("[sync-landing-to-shopify] Using product store_id connection");
        } else {
          console.warn("[sync-landing-to-shopify] Connection belongs to different user");
        }
      }
    }

    // Strategy 2: If no connection yet, get user's most recent connection
    if (!connection) {
      console.log("[sync-landing-to-shopify] Fetching user's most recent Shopify connection");
      const { data, error: fallbackError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, access_token")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        console.error("[sync-landing-to-shopify] Error fetching user connections:", fallbackError);
        throw new Error(`Database error: ${fallbackError.message}`);
      }

      if (!data) {
        console.error("[sync-landing-to-shopify] No Shopify connection found for user:", user.id);
        throw new Error("No Shopify connection found. Please connect your Shopify store first.");
      }

      connection = data;
      console.log("[sync-landing-to-shopify] Using most recent connection:", connection.id);
    }

    // Use direct access token
    if (!connection.access_token) {
      console.error("[sync-landing-to-shopify] No access token found");
      throw new Error("No Shopify access token found");
    }

    console.log("[sync-landing-to-shopify] Using direct access token, length:", connection.access_token.length);
    const storeUrl = (connection.store_url || "").replace(/\/$/, "").replace(/^https?:\/\//, "");
    const fullStoreUrl = storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`;

    console.log("[sync-landing-to-shopify] Using store URL:", fullStoreUrl);

    // 🆕 SYNCHRONISER LA DESCRIPTION ET LE TITRE DU PRODUIT SHOPIFY
    console.log("📝 Updating Shopify product description and title...");

    // Récupérer le shopify_id, landing_page et titre optimisé
    const { data: productData, error: productFetchError } = await supabase
      .from("shopify_products")
      .select("id, shopify_id, landing_page, description, handle, title")
      .eq("id", productId)
      .single();

    if (productFetchError) {
      console.error("❌ Database error fetching product:", productFetchError);
      return new Response(
        JSON.stringify({ 
          error: "Erreur de base de données",
          details: "Impossible de récupérer les informations du produit depuis la base de données."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!productData?.shopify_id) {
      console.error("❌ Product missing shopify_id:", productId);
      return new Response(
        JSON.stringify({ 
          error: "Produit non synchronisé avec Shopify",
          details: "Ce produit n'a pas encore été importé depuis Shopify. Veuillez d'abord importer vos produits via l'intégration Shopify dans la page Intégration.",
          needsImport: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyProductId = productData.shopify_id;
    
    // ✅ Use productTitle parameter if provided (optimized title), otherwise fallback to DB title
    const titleToSync = productTitle || productData.title;
    console.log(`🎯 [SYNC] Product title to sync: "${titleToSync}"`);
    
    // 🆕 Update local description with landing_page content before syncing
    let contentToSync = htmlContent || productData.description || '';
    let localDescriptionUpdated = false;
    
    if (productData.landing_page && productData.landing_page !== productData.description) {
      console.log("📝 Updating local description with landing_page content...");
      
      const { error: updateDescError } = await supabase
        .from("shopify_products")
        .update({ 
          description: productData.landing_page,
          updated_at: new Date().toISOString()
        })
        .eq("id", productData.id);
        
      if (updateDescError) {
        console.error("⚠️ Failed to update local description:", updateDescError);
      } else {
        console.log("✅ Local description updated successfully");
        localDescriptionUpdated = true;
      }
      
      // Use landing_page for Shopify sync
      contentToSync = productData.landing_page;
    } else {
      console.log("ℹ️ No landing_page to sync or description already up-to-date");
    }

    // Mettre à jour la description ET le titre du produit dans Shopify
    console.log("🔄 Syncing to Shopify - Title:", titleToSync?.substring(0, 50), "...");
    const updateProductResponse = await fetch(`${fullStoreUrl}/admin/api/2025-01/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": connection.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          id: shopifyProductId,
          title: titleToSync, // 🔥 Use optimized title from landing generation if provided
          body_html: wrapForShopify(contentToSync), // Wrapped for Shopify full-width compatibility
        },
      }),
    });

    if (!updateProductResponse.ok) {
      const errorText = await updateProductResponse.text();
      console.error("❌ Failed to update product in Shopify:", errorText);
      throw new Error(`Failed to update Shopify product: ${updateProductResponse.status}`);
    }

    console.log("✅ Product title and description synced to Shopify");

    // Construire l'URL du produit Shopify
    const productUrl = `${fullStoreUrl}/products/${productData.handle || productHandle}`;
    console.log(`[sync-landing-to-shopify] Product URL: ${productUrl}`);

    // Mettre à jour product_landing_pages avec les infos de sync
    const { error: updateError } = await supabase
      .from("product_landing_pages")
      .update({
        last_synced_at: new Date().toISOString(),
        sync_operation: "description_updated",
        shopify_page_url: productUrl,
      })
      .eq("product_id", productId)
      .eq("is_active", true);

    if (updateError) {
      console.error("⚠️ Error updating sync metadata:", updateError);
    } else {
      console.log("✅ Sync metadata saved successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        productDescriptionUpdated: true,
        localDescriptionUpdated,
        productUrl,
        message: `Landing page synced to Shopify${localDescriptionUpdated ? " (description updated)" : ""}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[sync-landing-to-shopify] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
