import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-SYNC-PRODUCTS] ${step}`, details ? JSON.stringify(details) : "");
};

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  descriptionHtml: string;
  createdAt: string;
  updatedAt: string;
  featuredImage: { url: string; altText: string | null } | null;
  images: { edges: Array<{ node: ProductImage }> };
  variants: { edges: Array<{ node: ProductVariant }> };
}

interface ProductsResponse {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  edges: Array<{ node: ShopifyProduct }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain, storeId, userId } = await req.json();

    log("Starting product sync", { shopDomain, storeId, userId });

    if (!shopDomain || !storeId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the access token from ai_images_shopify_connections
    const { data: connection, error: connError } = await supabase
      .from("ai_images_shopify_connections")
      .select("access_token")
      .eq("shop_domain", shopDomain)
      .single();

    if (connError || !connection?.access_token) {
      log("Connection not found", { error: connError });
      return new Response(JSON.stringify({ error: "Shop connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = connection.access_token;
    let cursor: string | null = null;
    let totalProducts = 0;
    let hasNextPage = true;

    // Fetch products using GraphQL for better performance
    while (hasNextPage) {
      const query = `
        query GetProducts($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                handle
                status
                productType
                vendor
                tags
                descriptionHtml
                createdAt
                updatedAt
                featuredImage {
                  url
                  altText
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      altText
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const graphqlResponse = await fetch(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { cursor },
        }),
      });

      if (!graphqlResponse.ok) {
        const errorText = await graphqlResponse.text();
        log("GraphQL request failed", { status: graphqlResponse.status, error: errorText });
        break;
      }

      const graphqlData = await graphqlResponse.json() as { 
        data?: { products?: ProductsResponse }; 
        errors?: unknown[] 
      };
      
      if (graphqlData.errors) {
        log("GraphQL errors", { errors: graphqlData.errors });
        break;
      }

      const productsData = graphqlData.data?.products;
      if (!productsData) {
        log("No products data in response");
        break;
      }

      // Process products
      for (const edge of productsData.edges) {
        const product = edge.node;
        const shopifyId = parseInt(product.id.replace("gid://shopify/Product/", ""));
        const featuredImageUrl = product.featuredImage?.url || null;

        // Upsert product - using seller_id constraint
        const { error: productError } = await supabase
          .from("shopify_products")
          .upsert({
            shopify_id: shopifyId,
            seller_id: userId,
            store_id: storeId,
            title: product.title,
            handle: product.handle,
            body_html: product.descriptionHtml,
            vendor: product.vendor,
            product_type: product.productType,
            tags: product.tags?.join(", ") || null,
            status: product.status.toLowerCase(),
            image_url: featuredImageUrl,
            created_at: product.createdAt,
            updated_at: product.updatedAt,
          }, { 
            onConflict: "shopify_id,seller_id",
            ignoreDuplicates: false 
          });

        if (productError) {
          log("Error upserting product", { shopifyId, error: productError });
          continue;
        }

        // Get the product ID from our database
        const { data: dbProduct } = await supabase
          .from("shopify_products")
          .select("id")
          .eq("shopify_id", shopifyId)
          .eq("store_id", storeId)
          .single();

        if (dbProduct) {
          // Sync product images
          for (let i = 0; i < product.images.edges.length; i++) {
            const imageEdge = product.images.edges[i];
            const image = imageEdge.node;
            const imageShopifyId = parseInt(image.id.replace("gid://shopify/ProductImage/", ""));

            await supabase
              .from("product_images")
              .upsert({
                product_id: dbProduct.id,
                shopify_image_id: imageShopifyId,
                src: image.url,
                alt_text: image.altText,
                position: i + 1,
                source: "shopify",
                is_ai_generated: false,
                store_id: storeId,
                user_id: userId,
              }, { 
                onConflict: "product_id,shopify_image_id",
                ignoreDuplicates: false 
              });
          }

          // Sync variants
          for (const variantEdge of product.variants.edges) {
            const variant = variantEdge.node;
            const variantShopifyId = parseInt(variant.id.replace("gid://shopify/ProductVariant/", ""));

            await supabase
              .from("shopify_variants")
              .upsert({
                shopify_variant_id: variantShopifyId,
                product_id: dbProduct.id,
                title: variant.title,
                sku: variant.sku,
                price: parseFloat(variant.price),
                compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                inventory_quantity: variant.inventoryQuantity,
              }, { 
                onConflict: "shopify_variant_id",
                ignoreDuplicates: false 
              });
          }
        }

        totalProducts++;
      }

      hasNextPage = productsData.pageInfo.hasNextPage;
      cursor = productsData.pageInfo.endCursor;
      
      log("Synced batch", { count: productsData.edges.length, totalProducts, hasNextPage });
    }

    log("Product sync completed", { totalProducts });

    return new Response(JSON.stringify({ 
      success: true, 
      productsImported: totalProducts 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
