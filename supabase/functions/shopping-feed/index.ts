import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: string;
  compare_at_price: string | null;
  image_url: string | null;
  handle: string;
  category: string | null;
  sub_category: string | null;
  vendor: string | null;
  tags: string | null;
  status: string;
  currency: string | null;
  google_product_category?: string | null;
  google_mpn?: string | null;
  google_condition?: string | null;
  google_gtin?: string | null;
  optimized_title?: string | null;
  optimized_description?: string | null;
  google_brand?: string | null;
  shopify_id?: string | null;
  store_id?: string | null;
  seller_id: string;
  seo_title?: string | null;
  seo_description?: string | null;
  product_type?: string | null;
}

interface Variant {
  id: string;
  product_id: string;
  title: string;
  price: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_url: string | null;
  sku?: string | null;
}

interface FeedSettings {
  user_id: string;
  store_name: string;
  default_currency?: string;
  default_condition?: string;
  default_brand?: string;
  generate_gtin_enabled?: boolean;
  filter_mode?: string;
  included_collections?: string[];
  excluded_collections?: string[];
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function generateProductId(product: Product, variant?: Variant): string {
  // Use variant ID if available, otherwise product ID
  if (variant?.id) return `variant_${variant.id}`;
  return `product_${product.id}`;
}

function generateVariantTitle(product: Product, variant: Variant): string {
  const baseTitle = product.optimized_title || product.seo_title || product.title;

  if (!variant.option1 && !variant.option2 && !variant.option3) {
    return baseTitle;
  }

  const options = [variant.option1, variant.option2, variant.option3]
    .filter((opt) => opt && opt.trim() !== "")
    .join(" - ");

  return `${baseTitle} - ${options}`;
}

function getProductDescription(product: Product): string {
  return product.optimized_description || product.seo_description || product.description || product.title;
}

function getProductImage(product: Product, variant?: Variant): string {
  // Prefer variant image, then product image, then placeholder
  return variant?.image_url || product.image_url || "https://newai.sale/placeholder.svg";
}

function getProductPrice(product: Product, variant?: Variant): number {
  const priceStr = variant?.price || product.price;
  return parseFloat(priceStr) || 0;
}

function getProductAvailability(product: Product): string {
  return product.status === "active" ? "in stock" : "out of stock";
}

function getProductCondition(product: Product): string {
  const condition = product.google_condition || "new";
  // Validate condition against Google's allowed values
  const allowedConditions = ["new", "refurbished", "used"];
  return allowedConditions.includes(condition) ? condition : "new";
}

function getProductBrand(product: Product, feedSettings?: FeedSettings): string {
  return product.google_brand || product.vendor || feedSettings?.default_brand || "Generic";
}

function getProductMpn(product: Product, variant?: Variant): string {
  return product.google_mpn || variant?.sku || product.vendor || `MPN-${product.id}`;
}

function getGoogleProductCategory(product: Product): string | null {
  // Ensure the category is a valid Google product category ID or name
  if (!product.google_product_category) return null;

  // If it's a numeric string, it's likely a category ID
  if (/^\d+$/.test(product.google_product_category)) {
    return product.google_product_category;
  }

  // Otherwise, escape and use as is
  return escapeXml(product.google_product_category);
}

async function generateGoogleShoppingFeed(
  products: Product[],
  variants: { [key: string]: Variant[] },
  sellerId: string,
  storeDomain: string | null,
  feedSettings?: FeedSettings,
): Promise<string> {
  const baseUrl = storeDomain ? `https://${storeDomain}` : "https://newai.sale";
  const date = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Google Shopping Feed</title>
    <link>${baseUrl}</link>
    <description>Product feed for Google Shopping</description>
    <lastBuildDate>${date}</lastBuildDate>
`;

  let itemCount = 0;

  for (const product of products) {
    const productVariants = variants[product.id] || [];

    // Check if product has real variants (not just "Default Title")
    const hasRealVariants = productVariants.length > 1 || 
      (productVariants.length === 1 && 
       productVariants[0].title !== 'Default Title' && 
       (productVariants[0].option1 || productVariants[0].option2 || productVariants[0].option3));

    // If product has real variants, create an entry for each variant
    if (hasRealVariants && productVariants.length > 0) {
      for (const variant of productVariants) {
        const itemId = generateProductId(product, variant);
        const title = truncateText(generateVariantTitle(product, variant), 150);
        const description = truncateText(getProductDescription(product), 5000);
        const productUrl = storeDomain
          ? `https://${storeDomain}/products/${product.handle}`
          : `https://newai.sale/product/${product.handle}`;
        const imageUrl = getProductImage(product, variant);
        const price = getProductPrice(product, variant);
        const currency = product.currency || feedSettings?.default_currency || "EUR";
        const availability = getProductAvailability(product);
        const condition = getProductCondition(product);
        const brand = getProductBrand(product, feedSettings);
        const mpn = getProductMpn(product, variant);
        const googleCategory = getGoogleProductCategory(product);

        // Skip products with invalid prices
        if (price <= 0) {
          console.warn(`Skipping product ${itemId} with invalid price: ${price}`);
          continue;
        }

        xml += `
    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;

        // Add sale price if available and valid
        if (product.compare_at_price) {
          const comparePrice = parseFloat(product.compare_at_price);
          if (comparePrice > price) {
            xml += `
      <g:sale_price>${comparePrice.toFixed(2)} ${currency}</g:sale_price>`;
          }
        }

        xml += `
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>`;

        // Add product type and category
        if (product.product_type) {
          xml += `
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`;
        }

        if (googleCategory) {
          xml += `
      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`;
        }

        // Add GTIN if available and enabled in settings
        if (product.google_gtin && (feedSettings?.generate_gtin_enabled !== false)) {
          xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
        }

        // Add item group ID for variants
        if (productVariants.length > 1) {
          xml += `
      <g:item_group_id>${escapeXml(`group_${product.id}`)}</g:item_group_id>`;
        }

        // Add variant attributes
        if (variant.option1) {
          xml += `
      <g:size>${escapeXml(variant.option1)}</g:size>`;
        }

        if (variant.option2) {
          xml += `
      <g:color>${escapeXml(variant.option2)}</g:color>`;
        }

        if (variant.option3) {
          xml += `
      <g:material>${escapeXml(variant.option3)}</g:material>`;
        }

        xml += `
    </item>`;

        itemCount++;
      }
    } else {
      // Product without variants - single entry
      const itemId = generateProductId(product);
      const title = truncateText(product.optimized_title || product.seo_title || product.title, 150);
      const description = truncateText(getProductDescription(product), 5000);
      const productUrl = storeDomain
        ? `https://${storeDomain}/products/${product.handle}`
        : `https://newai.sale/product/${product.handle}`;
      const imageUrl = getProductImage(product);
      const price = getProductPrice(product);
      const currency = product.currency || feedSettings?.default_currency || "EUR";
      const availability = getProductAvailability(product);
      const condition = getProductCondition(product);
      const brand = getProductBrand(product, feedSettings);
      const mpn = getProductMpn(product);
      const googleCategory = getGoogleProductCategory(product);

      // Skip products with invalid prices
      if (price <= 0) {
        console.warn(`Skipping product ${itemId} with invalid price: ${price}`);
        continue;
      }

      xml += `
    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;

      // Add sale price if available and valid
      if (product.compare_at_price) {
        const comparePrice = parseFloat(product.compare_at_price);
        if (comparePrice > price) {
          xml += `
      <g:sale_price>${comparePrice.toFixed(2)} ${currency}</g:sale_price>`;
        }
      }

      xml += `
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>`;

      // Add product type and category
      if (product.product_type) {
        xml += `
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`;
      }

      if (googleCategory) {
        xml += `
      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`;
      }

      // Add GTIN if available and enabled in settings
      if (product.google_gtin && (feedSettings?.generate_gtin_enabled !== false)) {
        xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
      }

      xml += `
    </item>`;

      itemCount++;
    }
  }

  xml += `
  </channel>
</rss>`;

  console.log(`Generated feed with ${itemCount} items for seller ${sellerId}`);
  return xml;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((part) => part !== "");

    // Support URL formats:
    // /shoppingfeed/{store_name}/xml
    // /shoppingfeed/{seller_id}/xml
    const identifierIndex = pathParts.findIndex((part) => part === "shoppingfeed") + 1;

    if (identifierIndex === 0 || identifierIndex >= pathParts.length) {
      return new Response(
        JSON.stringify({
          error: "Invalid URL format. Use /shoppingfeed/{store_name}/xml or /shoppingfeed/{seller_id}/xml",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const identifier = pathParts[identifierIndex];

    if (!identifier || identifier === "xml") {
      return new Response(JSON.stringify({ error: "Store name or Seller ID is required in the path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    // Try to find feed settings by store_name first
    let sellerId: string | null = null;
    let storeDomain: string | null = null;
    let feedSettings: FeedSettings | null = null;

    const { data: settingsData } = await supabase
      .from("merchant_feed_settings")
      .select("*")
      .eq("store_name", identifier)
      .single();

    if (settingsData) {
      sellerId = settingsData.user_id;
      feedSettings = settingsData;

      // Get store domain from shopify_connections
      const { data: connection } = await supabase
        .from("shopify_connections")
        .select("store_url")
        .eq("user_id", sellerId)
        .eq("is_active", true)
        .single();

      if (connection?.store_url) {
        storeDomain = connection.store_url;
      }
    } else {
      // Fallback to legacy format (seller_id directly)
      sellerId = identifier;

      // Try to get feed settings by user_id
      const { data: userSettings } = await supabase
        .from("merchant_feed_settings")
        .select("*")
        .eq("user_id", sellerId)
        .single();

      if (userSettings) {
        feedSettings = userSettings;
      }

      // Get store domain
      const { data: connection } = await supabase
        .from("shopify_connections")
        .select("store_url")
        .eq("user_id", sellerId)
        .eq("is_active", true)
        .single();

      if (connection?.store_url) {
        storeDomain = connection.store_url;
      }
    }

    if (!sellerId) {
      return new Response(JSON.stringify({ error: "Store or seller not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating feed for seller: ${sellerId}, store: ${storeDomain}`);

    // Fetch active products for this seller with all necessary fields
    let productsQuery = supabase
      .from("shopify_products")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .not("price", "is", null);

    const { data: allProducts, error } = await productsQuery;

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    if (!allProducts || allProducts.length === 0) {
      return new Response(JSON.stringify({ error: "No active products found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter products based on collection settings
    let products = allProducts;
    
    if (feedSettings?.filter_mode === 'include' && feedSettings.included_collections && feedSettings.included_collections.length > 0) {
      // Only include products that belong to selected collections
      const includedCollections = feedSettings.included_collections;
      products = allProducts.filter(product => {
        const productCollections = product.collection_ids || [];
        return includedCollections.some(collectionId => 
          productCollections.includes(collectionId)
        );
      });
      console.log(`Filtered to ${products.length} products from ${includedCollections.length} included collections`);
    } else if (feedSettings?.filter_mode === 'exclude' && feedSettings.excluded_collections && feedSettings.excluded_collections.length > 0) {
      // Exclude products that belong to excluded collections
      const excludedCollections = feedSettings.excluded_collections;
      products = allProducts.filter(product => {
        const productCollections = product.collection_ids || [];
        return !excludedCollections.some(collectionId => 
          productCollections.includes(collectionId)
        );
      });
      console.log(`Filtered to ${products.length} products after excluding ${excludedCollections.length} collections`);
    }

    if (products.length === 0) {
      return new Response(JSON.stringify({ error: "No products match the collection filters" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all variants for these products
    const productIds = products.map((p) => p.id);
    const { data: allVariants } = await supabase.from("product_variants").select("*").in("product_id", productIds);

    // Group variants by product_id
    const variantsByProduct: { [key: string]: Variant[] } = {};
    if (allVariants) {
      for (const variant of allVariants) {
        if (!variantsByProduct[variant.product_id]) {
          variantsByProduct[variant.product_id] = [];
        }
        variantsByProduct[variant.product_id].push(variant);
      }
    }

    const xmlFeed = await generateGoogleShoppingFeed(
      products,
      variantsByProduct,
      sellerId,
      storeDomain,
      feedSettings || undefined,
    );

    return new Response(xmlFeed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="google-shopping-feed-${identifier}.xml"`,
      },
    });
  } catch (error) {
    console.error("Error generating shopping feed:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
