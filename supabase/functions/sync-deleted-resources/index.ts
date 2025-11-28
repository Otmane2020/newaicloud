import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  shopifyGraphQL, 
  restIdToGid, 
  fetchAllProductIds,
  productExists 
} from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GraphQL query to fetch all collection IDs
const COLLECTIONS_IDS_QUERY = `
  query getCollectionIds($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

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

    const storeUrl = (connection.store_url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

    const results = {
      productsDeleted: 0,
      collectionsDeleted: 0,
      articlesDeleted: 0,
      pagesDeleted: 0,
    };

    // Sync Collections via GraphQL
    if (resourceType === "collections" || resourceType === "all") {
      const { data: dbCollections } = await supabaseAdmin
        .from("shopify_collections")
        .select("id, shopify_collection_id")
        .eq("user_id", user.id);

      if (dbCollections && dbCollections.length > 0) {
        // Fetch all collection IDs from Shopify via GraphQL
        const shopifyCollectionIds = new Set<number>();
        let cursor: string | undefined;
        let hasNext = true;

        while (hasNext) {
          const result = await shopifyGraphQL<{
            collections: {
              edges: Array<{ node: { id: string } }>;
              pageInfo: { hasNextPage: boolean; endCursor: string };
            };
          }>(storeUrl, connection.access_token, COLLECTIONS_IDS_QUERY, { first: 250, after: cursor });

          for (const edge of result.collections.edges) {
            const numericId = parseInt(edge.node.id.split('/').pop() || '0', 10);
            shopifyCollectionIds.add(numericId);
          }

          hasNext = result.collections.pageInfo.hasNextPage;
          cursor = result.collections.pageInfo.endCursor;
        }

        for (const collection of dbCollections) {
          if (!shopifyCollectionIds.has(collection.shopify_collection_id)) {
            await supabaseAdmin
              .from("shopify_collections")
              .delete()
              .eq("id", collection.id);
            results.collectionsDeleted++;
          }
        }
      }
    }

    // Sync Products via GraphQL
    if (resourceType === "products" || resourceType === "all") {
      const { data: dbProducts } = await supabaseAdmin
        .from("shopify_products")
        .select("id, shopify_id")
        .eq("seller_id", user.id)
        .not("shopify_id", "is", null);

      if (dbProducts && dbProducts.length > 0) {
        // Fetch all product IDs from Shopify
        const shopifyProductIds = new Set(await fetchAllProductIds(storeUrl, connection.access_token));

        for (const product of dbProducts) {
          if (!shopifyProductIds.has(product.shopify_id)) {
            await supabaseAdmin
              .from("shopify_products")
              .delete()
              .eq("id", product.id);
            results.productsDeleted++;
          }
        }
      }
    }

    // Sync Articles (blogs endpoint is still REST - not deprecated)
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
              `https://${storeUrl}/admin/api/2025-01/blogs/${article.shopify_blog_id}/articles/${article.shopify_article_id}.json`,
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

    // Sync Pages (pages endpoint is still REST - not deprecated)
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
              `https://${storeUrl}/admin/api/2025-01/pages/${page.shopify_page_id}.json`,
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
        message: "Synchronization complete (GraphQL)",
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
