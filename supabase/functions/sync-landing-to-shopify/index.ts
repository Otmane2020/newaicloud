import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Use access_token directly (OAuth tokens are already in plain text)
    if (!connection.access_token) {
      console.error("[sync-landing-to-shopify] No access token found");
      throw new Error("No Shopify access token found");
    }

    const accessToken = connection.access_token;
    const storeUrl = (connection.store_url || "").replace(/\/$/, "").replace(/^https?:\/\//, "");
    const fullStoreUrl = storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`;

    console.log("[sync-landing-to-shopify] Using store URL:", fullStoreUrl);

    // 🆕 SYNCHRONISER LA DESCRIPTION DU PRODUIT SHOPIFY EN PREMIER
    console.log("📝 Updating Shopify product description...");

    // Récupérer le shopify_product_id et landing_page
    const { data: productData, error: productFetchError } = await supabase
      .from("shopify_products")
      .select("shopify_product_id, landing_page, description")
      .eq("id", productId)
      .single();

    if (productFetchError || !productData?.shopify_product_id) {
      console.error("❌ Could not fetch shopify_product_id:", productFetchError);
      throw new Error("Could not find Shopify product ID");
    }

    const shopifyProductId = productData.shopify_product_id;
    
    // 🆕 Use landing_page if available, otherwise use description, otherwise use htmlContent parameter
    const contentToSync = productData.landing_page || productData.description || htmlContent;
    console.log(`📝 Using ${productData.landing_page ? 'landing_page' : productData.description ? 'description' : 'htmlContent parameter'} for sync`);

    // Mettre à jour la description du produit dans Shopify
    const updateProductResponse = await fetch(`${fullStoreUrl}/admin/api/2025-01/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          id: shopifyProductId,
          body_html: contentToSync, // Use landing_page > description > htmlContent parameter
        },
      }),
    });

    if (!updateProductResponse.ok) {
      const errorText = await updateProductResponse.text();
      console.error("❌ Failed to update product description in Shopify:", errorText);
      throw new Error(`Failed to update Shopify product description: ${updateProductResponse.status}`);
    }

    console.log("✅ Product description synced to Shopify");

    // Créer la page de landing séparée (optionnelle)
    const pageHandle = `landing-${productHandle}`;
    const pageTitle = `${productTitle} - Landing Page`;

    // Wrap HTML content in a proper page structure
    const fullHtmlContent = `
      <div class="product-landing-page">
        ${htmlContent}
      </div>
      <style>
        .product-landing-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
      </style>
    `;

    // Check if page already exists
    console.log("[sync-landing-to-shopify] Checking if landing page exists:", pageHandle);

    const checkResponse = await fetch(`${fullStoreUrl}/admin/api/2025-01/pages.json?handle=${pageHandle}`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error("[sync-landing-to-shopify] Error checking page:", errorText);
      throw new Error(`Failed to check existing page: ${checkResponse.status}`);
    }

    const existingPages = await checkResponse.json();
    const existingPage = existingPages.pages?.[0];

    let pageId: string | null = null;
    let operation: string = "description_updated_only";
    let pageUrl: string | null = null;

    if (existingPage) {
      // Update existing page
      console.log("[sync-landing-to-shopify] Updating existing landing page:", existingPage.id);
      operation = "description_updated_and_page_updated";

      const updateResponse = await fetch(`${fullStoreUrl}/admin/api/2025-01/pages/${existingPage.id}.json`, {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: {
            id: existingPage.id,
            title: pageTitle,
            body_html: fullHtmlContent,
            published: true,
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("[sync-landing-to-shopify] Error updating page:", errorText);
        // Ne pas throw ici - la description du produit est déjà mise à jour
      } else {
        const updateResult = await updateResponse.json();
        pageId = updateResult.page.id;
        pageUrl = `${fullStoreUrl}/pages/${pageHandle}`;
      }
    } else {
      // Create new page
      console.log("[sync-landing-to-shopify] Creating new landing page");
      operation = "description_updated_and_page_created";

      const createResponse = await fetch(`${fullStoreUrl}/admin/api/2025-01/pages.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: {
            title: pageTitle,
            handle: pageHandle,
            body_html: fullHtmlContent,
            published: true,
          },
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("[sync-landing-to-shopify] Error creating page:", errorText);
        // Ne pas throw ici - la description du produit est déjà mise à jour
      } else {
        const createResult = await createResponse.json();
        pageId = createResult.page.id;
        pageUrl = `${fullStoreUrl}/pages/${pageHandle}`;
      }
    }

    console.log(`[sync-landing-to-shopify] Operation completed: ${operation}`);

    // Mettre à jour product_landing_pages avec les infos de sync
    const updateData: any = {
      last_synced_at: new Date().toISOString(),
      sync_operation: operation,
    };

    if (pageId) {
      updateData.shopify_page_id = pageId.toString();
    }
    if (pageUrl) {
      updateData.shopify_page_url = pageUrl;
    }

    const { error: updateError } = await supabase
      .from("product_landing_pages")
      .update(updateData)
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
        pageUrl,
        pageId,
        operation,
        message: `Product description updated successfully${pageUrl ? ` and landing page ${operation.includes("created") ? "created" : "updated"}` : ""}`,
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
