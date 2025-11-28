import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shopifyGraphQL, fetchAllProductIds } from "../_shared/shopify-graphql.ts";

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

interface ShopifyPaginationLink {
  rel: string;
  url: string;
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const links = linkHeader.split(",");
  const nextLink = links.find(link => link.includes('rel="next"'));
  if (!nextLink) return null;
  const match = nextLink.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

// For non-deprecated resources (blogs, pages), use REST with pagination
async function fetchAllShopifyResources(
  baseUrl: string,
  accessToken: string,
  endpoint: string
): Promise<any[]> {
  const allItems: any[] = [];
  let nextUrl: string | null = `https://${baseUrl}/admin/api/2025-01/${endpoint}?limit=250`;
  
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${endpoint}:`, response.status);
      break;
    }
    
    const data = await response.json();
    const key = Object.keys(data)[0];
    if (data[key]) {
      allItems.push(...data[key]);
    }
    
    nextUrl = parseLinkHeader(response.headers.get("Link"));
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return allItems;
}

// Fetch all collection IDs via GraphQL
async function fetchAllCollectionIds(
  storeUrl: string,
  accessToken: string
): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | undefined;
  let hasNext = true;

  while (hasNext) {
    const result = await shopifyGraphQL<{
      collections: {
        edges: Array<{ node: { id: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(storeUrl, accessToken, COLLECTIONS_IDS_QUERY, { first: 250, after: cursor });

    for (const edge of result.collections.edges) {
      const numericId = parseInt(edge.node.id.split('/').pop() || '0', 10);
      ids.push(numericId);
    }

    hasNext = result.collections.pageInfo.hasNextPage;
    cursor = result.collections.pageInfo.endCursor;

    if (hasNext) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return ids;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Starting comprehensive cleanup sync (GraphQL) for all users...");

    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from("shopify_connections")
      .select("id, user_id, store_url, access_token");

    if (connectionsError) {
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
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
      totalImagesDeleted: 0,
      errors: [] as string[],
    };

    for (const connection of connections) {
      try {
        console.log(`\n🔹 Processing user: ${connection.user_id}`);
        const storeUrl = (connection.store_url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

        // ========== COLLECTIONS via GraphQL ==========
        console.log("📦 Syncing collections via GraphQL...");
        const { data: dbCollections } = await supabaseAdmin
          .from("shopify_collections")
          .select("id, shopify_collection_id")
          .eq("user_id", connection.user_id);

        if (dbCollections && dbCollections.length > 0) {
          const shopifyCollectionIds = new Set(await fetchAllCollectionIds(storeUrl, connection.access_token));

          for (const collection of dbCollections) {
            if (!shopifyCollectionIds.has(collection.shopify_collection_id)) {
              const { error } = await supabaseAdmin
                .from("shopify_collections")
                .delete()
                .eq("id", collection.id);

              if (!error) {
                results.totalCollectionsDeleted++;
                console.log(`   ✅ Deleted collection: ${collection.id}`);
              }
            }
          }
        }

        // ========== PRODUCTS via GraphQL ==========
        console.log("🛍️ Syncing products via GraphQL...");
        const { data: dbProducts } = await supabaseAdmin
          .from("shopify_products")
          .select("id, shopify_id")
          .eq("seller_id", connection.user_id)
          .not("shopify_id", "is", null);

        if (dbProducts && dbProducts.length > 0) {
          const shopifyProductIds = new Set(await fetchAllProductIds(storeUrl, connection.access_token));

          for (const product of dbProducts) {
            if (!shopifyProductIds.has(product.shopify_id)) {
              const { error } = await supabaseAdmin
                .from("shopify_products")
                .delete()
                .eq("id", product.id);

              if (!error) {
                results.totalProductsDeleted++;
                console.log(`   ✅ Deleted product: ${product.id}`);
              }
            }
          }
        }

        // ========== ARTICLES via REST (not deprecated) ==========
        console.log("📝 Syncing articles...");
        const { data: dbArticles } = await supabaseAdmin
          .from("blog_articles")
          .select("id, shopify_article_id, store_id")
          .eq("store_id", connection.id);

        if (dbArticles && dbArticles.length > 0) {
          const blogs = await fetchAllShopifyResources(storeUrl, connection.access_token, "blogs.json");
          const allArticles: any[] = [];
          
          for (const blog of blogs) {
            const articles = await fetchAllShopifyResources(
              storeUrl,
              connection.access_token,
              `blogs/${blog.id}/articles.json`
            );
            allArticles.push(...articles);
          }

          const shopifyArticleIds = new Set(allArticles.map((a: any) => a.id));

          for (const article of dbArticles) {
            if (!shopifyArticleIds.has(article.shopify_article_id)) {
              const { error } = await supabaseAdmin
                .from("blog_articles")
                .delete()
                .eq("id", article.id);

              if (!error) {
                results.totalArticlesDeleted++;
                console.log(`   ✅ Deleted article: ${article.id}`);
              }
            }
          }
        }

        // ========== PAGES via REST (not deprecated) ==========
        console.log("📄 Syncing pages...");
        const { data: dbPages } = await supabaseAdmin
          .from("shopify_pages")
          .select("id, shopify_page_id, store_id")
          .eq("store_id", connection.id);

        if (dbPages && dbPages.length > 0) {
          const shopifyPages = await fetchAllShopifyResources(storeUrl, connection.access_token, "pages.json");
          const shopifyPageIds = new Set(shopifyPages.map((p: any) => p.id));

          for (const page of dbPages) {
            if (!shopifyPageIds.has(page.shopify_page_id)) {
              const { error } = await supabaseAdmin
                .from("shopify_pages")
                .delete()
                .eq("id", page.id);

              if (!error) {
                results.totalPagesDeleted++;
                console.log(`   ✅ Deleted page: ${page.id}`);
              }
            }
          }
        }

        // ========== ORPHANED IMAGES ==========
        console.log("🖼️ Cleaning orphaned images...");
        
        const { data: orphanedProductImages } = await supabaseAdmin
          .from("product_images")
          .select("id, product_id")
          .not("product_id", "in", `(SELECT id FROM shopify_products WHERE seller_id = '${connection.user_id}')`);

        if (orphanedProductImages && orphanedProductImages.length > 0) {
          const { error } = await supabaseAdmin
            .from("product_images")
            .delete()
            .in("id", orphanedProductImages.map(img => img.id));

          if (!error) {
            results.totalImagesDeleted += orphanedProductImages.length;
          }
        }

        const { data: orphanedContentImages } = await supabaseAdmin
          .from("content_images")
          .select("id, content_id, content_type, user_id")
          .eq("user_id", connection.user_id);

        if (orphanedContentImages && orphanedContentImages.length > 0) {
          const imagesToDelete: string[] = [];
          
          for (const img of orphanedContentImages) {
            if (img.content_type === "article") {
              const { data: article } = await supabaseAdmin
                .from("blog_articles")
                .select("id")
                .eq("id", img.content_id)
                .single();
              
              if (!article) imagesToDelete.push(img.id);
            } else if (img.content_type === "page") {
              const { data: page } = await supabaseAdmin
                .from("shopify_pages")
                .select("id")
                .eq("id", img.content_id)
                .single();
              
              if (!page) imagesToDelete.push(img.id);
            }
          }

          if (imagesToDelete.length > 0) {
            const { error } = await supabaseAdmin
              .from("content_images")
              .delete()
              .in("id", imagesToDelete);

            if (!error) {
              results.totalImagesDeleted += imagesToDelete.length;
            }
          }
        }

        results.usersProcessed++;
        console.log(`✅ User ${connection.user_id} processed`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.errors.push(`Error processing user ${connection.user_id}: ${err.message}`);
      }
    }

    console.log("\n✅ Comprehensive cleanup sync completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Automatic cleanup completed (GraphQL)",
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
