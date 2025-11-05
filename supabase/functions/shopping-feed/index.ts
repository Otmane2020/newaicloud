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
  body_html: string | null;
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
  collection_ids?: string[];
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
  feed_domain?: string;
  default_currency?: string;
  default_condition?: string;
  default_brand?: string;
  generate_gtin_enabled?: boolean;
  filter_mode?: string;
  included_collections?: string[];
  excluded_collections?: string[];
}

interface ShopifyConnection {
  public_domain: string | null;
  store_url: string | null;
  myshopify_domain: string | null;
  access_token?: string;
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

function escapeCSV(str: string): string {
  if (!str) return "";
  return str.replace(/"/g, '""');
}

/**
 * Validates a GTIN using the GS1 checksum algorithm
 * Supports GTIN-8, GTIN-12, GTIN-13, and GTIN-14
 */
function isValidGTIN(gtin: string | null | undefined): boolean {
  if (!gtin) return false;

  const cleanGtin = gtin.replace(/[\s-]/g, "");

  if (!/^\d{8}$|^\d{12,14}$/.test(cleanGtin)) {
    return false;
  }

  const digits = cleanGtin.split("").map(Number);
  const checkDigit = digits.pop()!;

  const sum = digits.reverse().reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 3 : 1);
  }, 0);

  const calculatedCheck = (10 - (sum % 10)) % 10;

  return calculatedCheck === checkDigit;
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  // Try to truncate at sentence end
  const lastSentenceEnd = Math.max(
    text.lastIndexOf(".", maxLength - 3),
    text.lastIndexOf("!", maxLength - 3),
    text.lastIndexOf("?", maxLength - 3),
  );

  if (lastSentenceEnd > maxLength * 0.7) {
    // Only use if we're keeping most of the text
    return text.substring(0, lastSentenceEnd + 1);
  }

  return text.substring(0, maxLength - 3) + "...";
}

function generateProductId(product: Product, variant?: Variant): string {
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
  let description =
    product.optimized_description ||
    product.seo_description ||
    product.body_html ||
    product.description ||
    product.title;

  // Clean HTML and entities
  description = description
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Ensure complete sentences
  if (!/[.!?]$/.test(description)) {
    const lastSentenceEnd = Math.max(
      description.lastIndexOf("."),
      description.lastIndexOf("!"),
      description.lastIndexOf("?"),
    );

    if (lastSentenceEnd > 0 && lastSentenceEnd > description.length * 0.8) {
      description = description.substring(0, lastSentenceEnd + 1);
    } else {
      // Add period if no proper ending
      description = description + ".";
    }
  }

  return truncateText(description, 5000);
}

function getProductImage(product: Product, variant?: Variant): string {
  return variant?.image_url || product.image_url || "https://newai.sale/placeholder.svg";
}

function getAdditionalImages(product: Product, variant?: Variant): string[] {
  const mainImage = getProductImage(product, variant);
  const additionalImages: string[] = [];

  // For now, return empty array - you should implement logic to get multiple product images
  // This could come from a product_images table or additional_image_urls field

  // Filter out duplicates and main image, limit to 9 (Google's limit)
  return additionalImages.filter((img) => img && img !== mainImage).slice(0, 9);
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
  const category = product.google_product_category;

  if (!category) {
    console.warn(
      `⚠️ Product ${product.id} (${product.title}) missing google_product_category - may be rejected by Google Merchant`,
    );
    return null;
  }

  if (/^\d+$/.test(category)) {
    return category;
  }

  return escapeXml(category);
}

function shouldUseIdentifierExists(product: Product, variant?: Variant): boolean {
  // Only use identifier_exists=false if we truly have no identifiers
  const hasBrand = !!product.google_brand || !!product.vendor;
  const hasMpn = !!product.google_mpn || !!variant?.sku;
  const hasGtin = isValidGTIN(product.google_gtin);

  return !hasBrand && !hasMpn && !hasGtin;
}

function generateProductUrl(product: Product, storeDomain: string | null): string {
  if (!storeDomain) {
    return `https://newai.sale/product/${product.handle}`;
  }

  const cleanDomain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${cleanDomain}/products/${product.handle}`;
}

async function generateGoogleShoppingFeed(
  products: Product[],
  variants: { [key: string]: Variant[] },
  sellerId: string,
  storeDomain: string | null,
  feedSettings?: FeedSettings,
): Promise<string> {
  const baseUrl = storeDomain
    ? `https://${storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : "https://newai.sale";
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

    const hasRealVariants =
      productVariants.length > 1 ||
      (productVariants.length === 1 &&
        productVariants[0].title !== "Default Title" &&
        (productVariants[0].option1 || productVariants[0].option2 || productVariants[0].option3));

    if (hasRealVariants && productVariants.length > 0) {
      for (const variant of productVariants) {
        const itemId = generateProductId(product, variant);
        const title = truncateText(generateVariantTitle(product, variant), 150);
        const description = getProductDescription(product);
        const productUrl = generateProductUrl(product, storeDomain);
        const imageUrl = getProductImage(product, variant);
        const additionalImages = getAdditionalImages(product, variant);
        const price = getProductPrice(product, variant);
        const currency = product.currency || feedSettings?.default_currency || "EUR";
        const availability = getProductAvailability(product);
        const condition = getProductCondition(product);
        const brand = getProductBrand(product, feedSettings);
        const mpn = getProductMpn(product, variant);
        const googleCategory = getGoogleProductCategory(product);
        const useIdentifierExists = shouldUseIdentifierExists(product, variant);

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
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>`;

        // Add additional images if available
        if (additionalImages.length > 0) {
          additionalImages.forEach((img) => {
            xml += `
      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
          });
        } else {
          // Fallback to main image if no additional images
          xml += `
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>`;
        }

        xml += `
      <g:availability>${escapeXml(availability)}</g:availability>`;

        // Handle pricing
        if (product.compare_at_price) {
          const comparePrice = parseFloat(product.compare_at_price);
          if (comparePrice > price) {
            xml += `
      <g:price>${comparePrice.toFixed(2)} ${currency}</g:price>
      <g:sale_price>${price.toFixed(2)} ${currency}</g:sale_price>`;
          } else {
            xml += `
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;
          }
        } else {
          xml += `
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;
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

        // Handle GTIN and identifier_exists
        const hasValidGtin = isValidGTIN(product.google_gtin) && feedSettings?.generate_gtin_enabled !== false;

        if (hasValidGtin) {
          xml += `
      <g:gtin>${escapeXml(product.google_gtin!)}</g:gtin>`;
        }

        if (useIdentifierExists && !hasValidGtin) {
          xml += `
      <g:identifier_exists>false</g:identifier_exists>`;
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
      const description = getProductDescription(product);
      const productUrl = generateProductUrl(product, storeDomain);
      const imageUrl = getProductImage(product);
      const additionalImages = getAdditionalImages(product);
      const price = getProductPrice(product);
      const currency = product.currency || feedSettings?.default_currency || "EUR";
      const availability = getProductAvailability(product);
      const condition = getProductCondition(product);
      const brand = getProductBrand(product, feedSettings);
      const mpn = getProductMpn(product);
      const googleCategory = getGoogleProductCategory(product);
      const useIdentifierExists = shouldUseIdentifierExists(product);

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
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>`;

      // Add additional images if available
      if (additionalImages.length > 0) {
        additionalImages.forEach((img) => {
          xml += `
      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
        });
      } else {
        // Fallback to main image if no additional images
        xml += `
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>`;
      }

      xml += `
      <g:availability>${escapeXml(availability)}</g:availability>`;

      // Handle pricing
      if (product.compare_at_price) {
        const comparePrice = parseFloat(product.compare_at_price);
        if (comparePrice > price) {
          xml += `
      <g:price>${comparePrice.toFixed(2)} ${currency}</g:price>
      <g:sale_price>${price.toFixed(2)} ${currency}</g:sale_price>`;
        } else {
          xml += `
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;
        }
      } else {
        xml += `
      <g:price>${price.toFixed(2)} ${currency}</g:price>`;
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

      // Handle GTIN and identifier_exists
      const hasValidGtin = isValidGTIN(product.google_gtin) && feedSettings?.generate_gtin_enabled !== false;

      if (hasValidGtin) {
        xml += `
      <g:gtin>${escapeXml(product.google_gtin!)}</g:gtin>`;
      }

      if (useIdentifierExists && !hasValidGtin) {
        xml += `
      <g:identifier_exists>false</g:identifier_exists>`;
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

function generateGoogleShoppingCSV(
  products: Product[],
  variants: { [key: string]: Variant[] },
  sellerId: string,
  storeDomain: string | null,
  feedSettings?: FeedSettings,
): string {
  const baseUrl = storeDomain
    ? `https://${storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : "https://newai.sale";

  let csv =
    "id,title,description,link,image_link,additional_image_link,availability,price,sale_price,condition,brand,mpn,gtin,identifier_exists,google_product_category,product_type,item_group_id,size,color,material\n";

  for (const product of products) {
    const productVariants = variants[product.id] || [];
    const hasRealVariants =
      productVariants.length > 1 ||
      (productVariants.length === 1 &&
        productVariants[0].title !== "Default Title" &&
        (productVariants[0].option1 || productVariants[0].option2 || productVariants[0].option3));

    if (hasRealVariants && productVariants.length > 0) {
      for (const variant of productVariants) {
        const itemId = generateProductId(product, variant);
        const title = truncateText(generateVariantTitle(product, variant), 150);
        const description = getProductDescription(product);
        const productUrl = generateProductUrl(product, storeDomain);
        const imageUrl = getProductImage(product, variant);
        const price = getProductPrice(product, variant);
        const currency = product.currency || feedSettings?.default_currency || "EUR";
        const availability = getProductAvailability(product);
        const condition = getProductCondition(product);
        const brand = getProductBrand(product, feedSettings);
        const mpn = getProductMpn(product, variant);
        const googleCategory = getGoogleProductCategory(product);
        const useIdentifierExists = shouldUseIdentifierExists(product, variant);

        if (price <= 0) continue;

        const hasValidGtin = isValidGTIN(product.google_gtin) && feedSettings?.generate_gtin_enabled !== false;

        let priceField = `${price.toFixed(2)} ${currency}`;
        let salePriceField = "";

        if (product.compare_at_price) {
          const comparePrice = parseFloat(product.compare_at_price);
          if (comparePrice > price) {
            priceField = `${comparePrice.toFixed(2)} ${currency}`;
            salePriceField = `${price.toFixed(2)} ${currency}`;
          }
        }

        const gtinValue = hasValidGtin ? escapeCSV(product.google_gtin!) : "";
        const identifierExists = useIdentifierExists && !hasValidGtin ? "false" : "";
        const categoryValue = googleCategory ? escapeCSV(googleCategory) : "";
        const productTypeValue = product.product_type ? escapeCSV(product.product_type) : "";
        const itemGroupId = productVariants.length > 1 ? escapeCSV("group_" + product.id) : "";
        const sizeValue = variant.option1 ? escapeCSV(variant.option1) : "";
        const colorValue = variant.option2 ? escapeCSV(variant.option2) : "";
        const materialValue = variant.option3 ? escapeCSV(variant.option3) : "";

        csv +=
          '"' +
          escapeCSV(itemId) +
          '","' +
          escapeCSV(title) +
          '","' +
          escapeCSV(description) +
          '","' +
          escapeCSV(productUrl) +
          '","' +
          escapeCSV(imageUrl) +
          '","' +
          escapeCSV(imageUrl) +
          '","' +
          escapeCSV(availability) +
          '","' +
          escapeCSV(priceField) +
          '","' +
          escapeCSV(salePriceField) +
          '","' +
          escapeCSV(condition) +
          '","' +
          escapeCSV(brand) +
          '","' +
          escapeCSV(mpn) +
          '","' +
          gtinValue +
          '","' +
          identifierExists +
          '","' +
          categoryValue +
          '","' +
          productTypeValue +
          '","' +
          itemGroupId +
          '","' +
          sizeValue +
          '","' +
          colorValue +
          '","' +
          materialValue +
          '"\n';
      }
    } else {
      const itemId = generateProductId(product);
      const title = truncateText(product.optimized_title || product.seo_title || product.title, 150);
      const description = getProductDescription(product);
      const productUrl = generateProductUrl(product, storeDomain);
      const imageUrl = getProductImage(product);
      const price = getProductPrice(product);
      const currency = product.currency || feedSettings?.default_currency || "EUR";
      const availability = getProductAvailability(product);
      const condition = getProductCondition(product);
      const brand = getProductBrand(product, feedSettings);
      const mpn = getProductMpn(product);
      const googleCategory = getGoogleProductCategory(product);
      const useIdentifierExists = shouldUseIdentifierExists(product);

      if (price <= 0) continue;

      const hasValidGtin = isValidGTIN(product.google_gtin) && feedSettings?.generate_gtin_enabled !== false;

      let priceField = `${price.toFixed(2)} ${currency}`;
      let salePriceField = "";

      if (product.compare_at_price) {
        const comparePrice = parseFloat(product.compare_at_price);
        if (comparePrice > price) {
          priceField = `${comparePrice.toFixed(2)} ${currency}`;
          salePriceField = `${price.toFixed(2)} ${currency}`;
        }
      }

      const gtinValue = hasValidGtin ? escapeCSV(product.google_gtin!) : "";
      const identifierExists = useIdentifierExists && !hasValidGtin ? "false" : "";
      const categoryValue = googleCategory ? escapeCSV(googleCategory) : "";
      const productTypeValue = product.product_type ? escapeCSV(product.product_type) : "";

      csv +=
        '"' +
        escapeCSV(itemId) +
        '","' +
        escapeCSV(title) +
        '","' +
        escapeCSV(description) +
        '","' +
        escapeCSV(productUrl) +
        '","' +
        escapeCSV(imageUrl) +
        '","' +
        escapeCSV(imageUrl) +
        '","' +
        escapeCSV(availability) +
        '","' +
        escapeCSV(priceField) +
        '","' +
        escapeCSV(salePriceField) +
        '","' +
        escapeCSV(condition) +
        '","' +
        escapeCSV(brand) +
        '","' +
        escapeCSV(mpn) +
        '","' +
        gtinValue +
        '","' +
        identifierExists +
        '","' +
        categoryValue +
        '","' +
        productTypeValue +
        '","","","",""\n';
    }
  }

  console.log(`Generated CSV feed for seller ${sellerId}`);
  return csv;
}

async function getStoreDomain(sellerId: string, feedSettings?: FeedSettings): Promise<string | null> {
  const supabase = getSupabaseClient();

  try {
    // Get store domain from shopify_connections with proper priority
    const { data: connection } = (await supabase
      .from("shopify_connections")
      .select("public_domain, store_url, myshopify_domain")
      .eq("user_id", sellerId)
      .eq("is_active", true)
      .single()) as { data: ShopifyConnection | null };

    console.log("Shopify Connection Data:", {
      userId: sellerId,
      connectionData: connection,
      feedSettingsDomain: feedSettings?.feed_domain,
    });

    // Priority: 1) public_domain (custom domain), 2) store_url, 3) myshopify_domain, 4) feed_domain fallback
    let storeDomain =
      connection?.public_domain ||
      connection?.store_url ||
      connection?.myshopify_domain ||
      feedSettings?.feed_domain ||
      null;

    // Clean the domain - remove http:// or https:// and trailing slashes
    if (storeDomain) {
      storeDomain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }

    // Check if we're getting myshopify.com domains and try to find custom domain
    if (storeDomain && storeDomain.includes("myshopify.com")) {
      console.warn("⚠️ Using myshopify.com domain instead of custom domain");

      // Try to get the custom domain from store_settings
      const { data: storeSettings } = await supabase
        .from("store_settings")
        .select("custom_domain, primary_domain")
        .eq("user_id", sellerId)
        .single();

      if (storeSettings?.custom_domain || storeSettings?.primary_domain) {
        storeDomain = storeSettings.custom_domain || storeSettings.primary_domain;
        console.log(`Found custom domain from store_settings: ${storeDomain}`);
      }
    }

    console.log(`Final domain for feed: ${storeDomain}`);
    return storeDomain;
  } catch (error) {
    console.error("Error getting store domain:", error);
    return feedSettings?.feed_domain || null;
  }
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

    const identifierIndex = pathParts.findIndex((part) => part === "shoppingfeed") + 1;

    if (identifierIndex === 0 || identifierIndex >= pathParts.length) {
      return new Response(
        JSON.stringify({
          error: "Invalid URL format. Use /shoppingfeed/{store_name}/xml or /shoppingfeed/{store_name}/csv",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const identifier = pathParts[identifierIndex];
    const format = pathParts[identifierIndex + 1] || "xml";

    if (!identifier || identifier === "xml" || identifier === "csv") {
      return new Response(JSON.stringify({ error: "Store name or Seller ID is required in the path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format !== "xml" && format !== "csv") {
      return new Response(JSON.stringify({ error: "Invalid format. Use 'xml' or 'csv'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    // Try to find feed settings by store_name first
    let sellerId: string | null = null;
    let feedSettings: FeedSettings | null = null;

    const { data: settingsData } = await supabase
      .from("merchant_feed_settings")
      .select("*")
      .eq("store_name", identifier)
      .single();

    if (settingsData) {
      sellerId = settingsData.user_id;
      feedSettings = settingsData;
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
    }

    if (!sellerId) {
      return new Response(JSON.stringify({ error: "Store or seller not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get store domain with improved logic
    const storeDomain = await getStoreDomain(sellerId, feedSettings || undefined);

    console.log(`Generating ${format} feed for seller: ${sellerId}, domain: ${storeDomain}`);

    // Fetch active products for this seller
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

    if (
      feedSettings?.filter_mode === "include" &&
      feedSettings.included_collections &&
      feedSettings.included_collections.length > 0
    ) {
      const includedCollections = feedSettings.included_collections;
      products = allProducts.filter((product) => {
        const productCollections = product.collection_ids || [];
        return includedCollections.some((collectionId) => productCollections.includes(collectionId));
      });
      console.log(`Filtered to ${products.length} products from ${includedCollections.length} included collections`);
    } else if (
      feedSettings?.filter_mode === "exclude" &&
      feedSettings.excluded_collections &&
      feedSettings.excluded_collections.length > 0
    ) {
      const excludedCollections = feedSettings.excluded_collections;
      products = allProducts.filter((product) => {
        const productCollections = product.collection_ids || [];
        return !excludedCollections.some((collectionId) => productCollections.includes(collectionId));
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

    if (format === "csv") {
      const csvFeed = generateGoogleShoppingCSV(
        products,
        variantsByProduct,
        sellerId,
        storeDomain,
        feedSettings || undefined,
      );

      return new Response(csvFeed, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="google-shopping-feed-${identifier}.csv"`,
        },
      });
    } else {
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
    }
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
