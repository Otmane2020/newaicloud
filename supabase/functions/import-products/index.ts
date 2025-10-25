import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateImportProducts } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  weight: number | null;
  weight_unit: string;
  barcode: string | null;
  image_id: number | null;
}

interface ShopifyImage {
  id: number;
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  tags: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

interface RequestBody {
  shopName: string;
  apiToken: string;
  storeId?: string;
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel=\"next\"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate user first with anon key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestBody = await req.json();

    // Validate input
    const validation = validateImportProducts(requestBody);
    if (!validation.success || !validation.data) {
      console.error('Validation errors:', validation.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { shopName, apiToken, storeId } = validation.data;

    // Create service role client for database operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify store ownership if storeId is provided
    if (storeId) {
      const { data: store, error: storeError } = await supabaseServiceClient
        .from('shopify_connections')
        .select('user_id')
        .eq('id', storeId)
        .maybeSingle();

      if (storeError) {
        console.error('Store query error:', storeError);
        return new Response(
          JSON.stringify({ error: 'Error verifying store ownership' }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!store) {
        console.error('Store not found with id:', storeId);
        return new Response(
          JSON.stringify({ error: 'Store not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (store.user_id !== user.id) {
        console.error('User does not own this store');
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to store' }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const cleanShopName = shopName.replace(".myshopify.com", "");
    const startTime = new Date().toISOString();

    // Fetch shop details to get currency
    let shopCurrency = 'USD';
    try {
      const shopResponse = await fetch(
        `https://${cleanShopName}.myshopify.com/admin/api/2024-01/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": apiToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (shopResponse.ok) {
        const shopData = await shopResponse.json();
        shopCurrency = shopData.shop?.currency || 'USD';
        console.log(`Shop currency detected: ${shopCurrency}`);
      }
    } catch (error) {
      console.log('Could not fetch shop currency, using USD as default');
    }

    // Update store currency if storeId is provided
    if (storeId) {
      await supabaseServiceClient
        .from('shopify_connections')
        .update({ store_url: `${cleanShopName}.myshopify.com` })
        .eq('id', storeId);
    }

    let allProducts: ShopifyProduct[] = [];
    let nextPageUrl: string | null = `https://${cleanShopName}.myshopify.com/admin/api/2024-01/products.json?limit=50&fields=id,title,body_html,vendor,product_type,handle,status,tags,variants,images,metafields_global_title_tag,metafields_global_description_tag`;
    let pageCount = 0;

    console.log(`Starting import from ${cleanShopName}`);

    while (nextPageUrl) {
      pageCount++;
      console.log(`Fetching page ${pageCount}: ${nextPageUrl}`);

      const shopifyResponse = await fetch(nextPageUrl, {
        headers: {
          "X-Shopify-Access-Token": apiToken,
          "Content-Type": "application/json",
        },
      });

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error("Shopify API Error:", errorText);
        return new Response(
          JSON.stringify({
            error: `Failed to fetch products from Shopify: ${shopifyResponse.statusText}`,
          }),
          {
            status: shopifyResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const shopifyData: ShopifyResponse = await shopifyResponse.json();
      const pageProducts = shopifyData.products || [];

      console.log(`Page ${pageCount}: Fetched ${pageProducts.length} products`);
      allProducts = allProducts.concat(pageProducts);

      const linkHeader = shopifyResponse.headers.get("Link");
      nextPageUrl = parseLinkHeader(linkHeader);

      if (nextPageUrl) {
        console.log(`Next page URL found, continuing...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const products = allProducts;
    console.log(`Total products fetched across ${pageCount} pages: ${products.length}`);

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ count: 0, message: "No products found in store" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const productsToInsert = products.map((product) => {
      const firstVariant = product.variants[0] || {} as ShopifyVariant;
      const firstImage = product.images[0];
      const totalInventory = product.variants.reduce(
        (sum, v) => sum + (v.inventory_quantity || 0),
        0
      );

      return {
        shopify_id: product.id,
        title: product.title,
        description: product.body_html || "",
        vendor: product.vendor || "",
        product_type: product.product_type || "",
        handle: product.handle || "",
        status: product.status || "active",
        tags: product.tags || "",
        seo_title: product.metafields_global_title_tag || "",
        seo_description: product.metafields_global_description_tag || "",
        image_url: firstImage?.src || "",
        price: parseFloat(firstVariant.price || "0"),
        compare_at_price: firstVariant.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null,
        inventory_quantity: totalInventory,
        currency: shopCurrency,
        raw_data: product,
        shop_name: cleanShopName,
        store_id: storeId || null,
      };
    });

    const { data: upsertedProducts, error: insertError } = await supabaseServiceClient
      .from("shopify_products")
      .upsert(productsToInsert, {
        onConflict: "shopify_id",
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: `Failed to save products: ${insertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const productIdMap = new Map<number, string>();
    if (upsertedProducts) {
      upsertedProducts.forEach((p: any) => {
        productIdMap.set(p.shopify_id, p.id);
      });
    }

    let totalVariants = 0;
    let totalImages = 0;

    for (const product of products) {
      const productId = productIdMap.get(product.id);
      if (!productId) continue;

      if (product.variants && product.variants.length > 0) {
        const variantsToInsert = product.variants.map((variant) => ({
          product_id: productId,
          shopify_variant_id: variant.id,
          sku: variant.sku || "",
          title: variant.title || "Default",
          option1: variant.option1 || "",
          option2: variant.option2 || "",
          option3: variant.option3 || "",
          price: parseFloat(variant.price || "0"),
          compare_at_price: variant.compare_at_price
            ? parseFloat(variant.compare_at_price)
            : null,
          inventory_quantity: variant.inventory_quantity || 0,
          weight: variant.weight,
          weight_unit: variant.weight_unit || "kg",
          barcode: variant.barcode || "",
          currency: shopCurrency,
          image_url: variant.image_id
            ? product.images.find((img) => img.id === variant.image_id)?.src || ""
            : "",
          raw_data: variant,
        }));

        if (variantsToInsert.length > 0) {
          const { error: variantError } = await supabaseServiceClient
            .from("product_variants")
            .upsert(variantsToInsert, {
              onConflict: "shopify_variant_id",
              ignoreDuplicates: false,
            });

          if (variantError) {
            console.error("Variant insert error:", variantError);
          } else {
            totalVariants += variantsToInsert.length;
          }
        }
      }

      if (product.images && product.images.length > 0) {
        const imagesToInsert = product.images.map((image, index) => ({
          product_id: productId,
          shopify_image_id: image.id,
          src: image.src,
          position: index + 1,
          alt_text: (image as any).alt || "",
          width: (image as any).width || null,
          height: (image as any).height || null,
        }));

        const { error: imageError } = await supabaseServiceClient
          .from("product_images")
          .upsert(imagesToInsert, {
            onConflict: "shopify_image_id",
            ignoreDuplicates: false,
          });

        if (imageError) {
          console.error("Image insert error:", imageError);
        } else {
          totalImages += imagesToInsert.length;
        }
      }
    }

    const completedAt = new Date().toISOString();

    const { error: logError } = await supabaseServiceClient
      .from("sync_logs")
      .insert({
        store_id: storeId || null,
        store_name: cleanShopName,
        operation_type: "import",
        status: "success",
        products_processed: products.length,
        products_added: products.length,
        products_updated: 0,
        variants_processed: totalVariants,
        started_at: startTime,
        completed_at: completedAt,
      });

    if (logError) {
      console.error("Sync log insert error:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: products.length,
        variantsCount: totalVariants,
        imagesCount: totalImages,
        pagesProcessed: pageCount,
        message: `Successfully imported ${products.length} products, ${totalVariants} variants, and ${totalImages} images across ${pageCount} pages`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
