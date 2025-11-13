import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function fetchAllShopifyResources(
  baseUrl: string,
  accessToken: string,
  endpoint: string
): Promise<any[]> {
  const allItems: any[] = [];
  let nextUrl: string | null = `https://${baseUrl}/admin/api/2024-01/${endpoint}?limit=250`;
  
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
    
    // Parse Link header for pagination
    nextUrl = parseLinkHeader(response.headers.get("Link"));
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return allItems;
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

    console.log("🔄 Starting comprehensive cleanup sync for all users...");

    // Get all active Shopify connections
    const { data: connections, error: connectionsError } = await supabaseAdmin
      .from("shopify_connections")
      .select("id, user_id, store_url, access_token");

    if (connectionsError) {
      console.error("Error fetching connections:", connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log("No active Shopify connections found");
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
        console.log(`\n🔹 Processing user: ${connection.user_id} (Store: ${connection.store_url})`);

        // ========== COLLECTIONS (Custom + Smart) ==========
        console.log("📦 Syncing collections...");
        const { data: dbCollections } = await supabaseAdmin
          .from("shopify_collections")
          .select("id, shopify_collection_id")
          .eq("user_id", connection.user_id);

        if (dbCollections && dbCollections.length > 0) {
          // Fetch both custom and smart collections
          const [customCollections, smartCollections] = await Promise.all([
            fetchAllShopifyResources(connection.store_url, connection.access_token, "custom_collections.json"),
            fetchAllShopifyResources(connection.store_url, connection.access_token, "smart_collections.json"),
          ]);

          const allShopifyCollections = [...customCollections, ...smartCollections];
          const shopifyCollectionIds = new Set(allShopifyCollections.map((c: any) => c.id));

          for (const collection of dbCollections) {
            if (!shopifyCollectionIds.has(collection.shopify_collection_id)) {
              const { error } = await supabaseAdmin
                .from("shopify_collections")
                .delete()
                .eq("id", collection.id);

              if (!error) {
                results.totalCollectionsDeleted++;
                console.log(`   ✅ Deleted collection: ${collection.id}`);
              } else {
                console.error(`   ❌ Error deleting collection ${collection.id}:`, error);
              }
            }
          }
        }

        // ========== PRODUCTS (All, with pagination) ==========
        console.log("🛍️ Syncing products...");
        const { data: dbProducts } = await supabaseAdmin
          .from("shopify_products")
          .select("id, shopify_id")
          .eq("seller_id", connection.user_id)
          .not("shopify_id", "is", null);

        if (dbProducts && dbProducts.length > 0) {
          const shopifyProducts = await fetchAllShopifyResources(
            connection.store_url,
            connection.access_token,
            "products.json"
          );
          const shopifyProductIds = new Set(shopifyProducts.map((p: any) => p.id));

          for (const product of dbProducts) {
            if (!shopifyProductIds.has(product.shopify_id)) {
              const { error } = await supabaseAdmin
                .from("shopify_products")
                .delete()
                .eq("id", product.id);

              if (!error) {
                results.totalProductsDeleted++;
                console.log(`   ✅ Deleted product: ${product.id}`);
              } else {
                console.error(`   ❌ Error deleting product ${product.id}:`, error);
              }
            }
          }
        }

        // ========== ARTICLES ==========
        console.log("📝 Syncing articles...");
        const { data: dbArticles } = await supabaseAdmin
          .from("blog_articles")
          .select("id, shopify_article_id, store_id")
          .eq("store_id", connection.id);

        if (dbArticles && dbArticles.length > 0) {
          // Fetch all blogs first
          const blogs = await fetchAllShopifyResources(
            connection.store_url,
            connection.access_token,
            "blogs.json"
          );

          // Fetch articles from all blogs
          const allArticles: any[] = [];
          for (const blog of blogs) {
            const articles = await fetchAllShopifyResources(
              connection.store_url,
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
              } else {
                console.error(`   ❌ Error deleting article ${article.id}:`, error);
              }
            }
          }
        }

        // ========== PAGES ==========
        console.log("📄 Syncing pages...");
        const { data: dbPages } = await supabaseAdmin
          .from("shopify_pages")
          .select("id, shopify_page_id, store_id")
          .eq("store_id", connection.id);

        if (dbPages && dbPages.length > 0) {
          const shopifyPages = await fetchAllShopifyResources(
            connection.store_url,
            connection.access_token,
            "pages.json"
          );
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
              } else {
                console.error(`   ❌ Error deleting page ${page.id}:`, error);
              }
            }
          }
        }

        // ========== ORPHANED IMAGES ==========
        console.log("🖼️ Cleaning orphaned images...");
        
        // Clean product_images without parent product
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
            console.log(`   ✅ Deleted ${orphanedProductImages.length} orphaned product images`);
          }
        }

        // Clean content_images without parent content
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
              console.log(`   ✅ Deleted ${imagesToDelete.length} orphaned content images`);
            }
          }
        }

        results.usersProcessed++;
        console.log(`✅ User ${connection.user_id} processed successfully`);
        
        // Rate limiting between users
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = `Error processing user ${connection.user_id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log("\n✅ Comprehensive cleanup sync completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Automatic cleanup completed",
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
