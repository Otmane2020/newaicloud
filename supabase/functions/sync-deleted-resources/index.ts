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

    const { resourceType } = await req.json();

    // Get Shopify connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("shopify_connections")
      .select("store_url, access_token")
      .eq("user_id", user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error("Shopify connection not found");
    }

    const results = {
      productsDeleted: 0,
      collectionsDeleted: 0,
      articlesDeleted: 0,
      pagesDeleted: 0,
    };

    // Sync Collections
    if (resourceType === "collections" || resourceType === "all") {
      const { data: dbCollections } = await supabaseAdmin
        .from("shopify_collections")
        .select("id, shopify_collection_id")
        .eq("user_id", user.id);

      if (dbCollections && dbCollections.length > 0) {
        // Fetch all collections from Shopify
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

          // Delete collections that no longer exist in Shopify
          for (const collection of dbCollections) {
            if (!shopifyIds.has(collection.shopify_collection_id)) {
              await supabaseAdmin
                .from("shopify_collections")
                .delete()
                .eq("id", collection.id);
              results.collectionsDeleted++;
            }
          }
        }
      }
    }

    // Sync Products
    if (resourceType === "products" || resourceType === "all") {
      const { data: dbProducts } = await supabaseAdmin
        .from("shopify_products")
        .select("id, shopify_id")
        .eq("seller_id", user.id)
        .not("shopify_id", "is", null);

      if (dbProducts && dbProducts.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < dbProducts.length; i += BATCH_SIZE) {
          const batch = dbProducts.slice(i, i + BATCH_SIZE);
          
          for (const product of batch) {
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
                results.productsDeleted++;
              }
            } catch (error) {
              console.error(`Error checking product ${product.shopify_id}:`, error);
            }
          }

          // Rate limiting
          if (i + BATCH_SIZE < dbProducts.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }

    // Sync Articles
    if (resourceType === "articles" || resourceType === "all") {
      const { data: dbArticles } = await supabaseAdmin
        .from("blog_articles")
        .select("id, shopify_article_id, shopify_blog_id")
        .eq("user_id", user.id)
        .not("shopify_article_id", "is", null);

      if (dbArticles && dbArticles.length > 0) {
        for (const article of dbArticles) {
          try {
            const shopifyResponse = await fetch(
              `https://${connection.store_url}/admin/api/2024-01/blogs/${article.shopify_blog_id}/articles/${article.shopify_article_id}.json`,
              {
                headers: {
                  "X-Shopify-Access-Token": connection.access_token,
                },
              }
            );

            if (shopifyResponse.status === 404) {
              await supabaseAdmin
                .from("blog_articles")
                .delete()
                .eq("id", article.id);
              results.articlesDeleted++;
            }
          } catch (error) {
            console.error(`Error checking article ${article.shopify_article_id}:`, error);
          }
        }
      }
    }

    // Sync Pages
    if (resourceType === "pages" || resourceType === "all") {
      const { data: dbPages } = await supabaseAdmin
        .from("shopify_pages")
        .select("id, shopify_page_id")
        .eq("user_id", user.id)
        .not("shopify_page_id", "is", null);

      if (dbPages && dbPages.length > 0) {
        for (const page of dbPages) {
          try {
            const shopifyResponse = await fetch(
              `https://${connection.store_url}/admin/api/2024-01/pages/${page.shopify_page_id}.json`,
              {
                headers: {
                  "X-Shopify-Access-Token": connection.access_token,
                },
              }
            );

            if (shopifyResponse.status === 404) {
              await supabaseAdmin
                .from("shopify_pages")
                .delete()
                .eq("id", page.id);
              results.pagesDeleted++;
            }
          } catch (error) {
            console.error(`Error checking page ${page.shopify_page_id}:`, error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Synchronization complete",
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
