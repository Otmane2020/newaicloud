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
  access_token: string;
}

interface ShopifyShop {
  shop: {
    domain: string;
    primary_domain: {
      url: string;
    } | null;
    myshopify_domain: string;
  };
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

// Fonction pour récupérer le vrai domaine depuis l'API Admin Shopify
async function getShopifyStoreDomain(connection: ShopifyConnection): Promise<string> {
  try {
    const { store_url, access_token } = connection;
    
    if (!store_url || !access_token) {
      throw new Error("Missing Shopify domain or access token");
    }

    // Nettoyer le store_url pour obtenir le domaine
    const cleanStoreUrl = store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Appel à l'API Admin Shopify pour récupérer les infos du shop
    const response = await fetch(`https://${cleanStoreUrl}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const shopData: ShopifyShop = await response.json();
    
    // Priorité: primary_domain (domaine personnalisé) -> domain -> myshopify_domain
    const domain = shopData.shop.primary_domain?.url || shopData.shop.domain || shopData.shop.myshopify_domain;
    
    // Nettoyer le domaine (enlever https:// etc.)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    console.log(`✅ Shopify domain resolved: ${cleanDomain}`);
    return cleanDomain;

  } catch (error) {
    console.error('❌ Error fetching Shopify domain:', error);
    
    // Fallback aux données locales si l'API échoue
    const fallbackDomain = connection.public_domain || connection.store_url;
    if (fallbackDomain) {
      const cleanFallback = fallbackDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      console.log(`🔄 Using fallback domain: ${cleanFallback}`);
      return cleanFallback;
    }
    
    throw new Error("Could not retrieve Shopify domain");
  }
}

async function getStoreDomain(sellerId: string, feedSettings?: FeedSettings): Promise<string | null> {
  const supabase = getSupabaseClient();
  
  try {
    // Récupérer la connexion Shopify avec le token d'accès
    const { data: connection } = await supabase
      .from("shopify_connections")
      .select("public_domain, store_url, access_token")
      .eq("user_id", sellerId)
      .eq("is_active", true)
      .single() as { data: ShopifyConnection | null };

    if (!connection) {
      console.warn(`No active Shopify connection found for seller ${sellerId}`);
      return null;
    }

    console.log('🛍️ Shopify connection data:', {
      store_url: connection.store_url,
      has_access_token: !!connection.access_token,
      public_domain: connection.public_domain
    });

    // Essayer de récupérer le domaine depuis l'API Shopify
    try {
      const shopifyDomain = await getShopifyStoreDomain(connection);
      return shopifyDomain;
    } catch (shopifyError) {
      console.error('Failed to get domain from Shopify API, using local data:', shopifyError);
      
      // Fallback aux données locales
      const localDomain = connection.public_domain || connection.store_url;
      if (localDomain) {
        const cleanDomain = localDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        console.log(`🔄 Using local domain: ${cleanDomain}`);
        return cleanDomain;
      }
      
      return null;
    }

  } catch (error) {
    console.error('❌ Error getting store domain:', error);
    return null;
  }
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

function isValidGTIN(gtin: string | null | undefined): boolean {
  if (!gtin) return false;
  
  const cleanGtin = gtin.replace(/[\s-]/g, '');
  
  if (!/^\d{8}$|^\d{12,14}$/.test(cleanGtin)) {
    return false;
  }
  
  const digits = cleanGtin.split('').map(Number);
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
  
  const lastSentenceEnd = Math.max(
    text.lastIndexOf('.', maxLength - 3),
    text.lastIndexOf('!', maxLength - 3),
    text.lastIndexOf('?', maxLength - 3)
  );
  
  if (lastSentenceEnd > maxLength * 0.7) {
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
  let description = product.optimized_description || 
                    product.seo_description || 
                    product.body_html ||
                    product.description || 
                    product.title;
  
  description = description
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!/[.!?]$/.test(description)) {
    const lastSentenceEnd = Math.max(
      description.lastIndexOf('.'),
      description.lastIndexOf('!'),
      description.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > 0 && lastSentenceEnd > description.length * 0.8) {
      description = description.substring(0, lastSentenceEnd + 1);
    } else {
      description = description + '.';
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
  
  // À implémenter: récupérer les images supplémentaires depuis votre base de données
  return additionalImages
    .filter(img => img && img !== mainImage)
    .slice(0, 9);
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

function getGoogleProductCategory(product: Product): string {
  const category = product.google_product_category;
  
  if (!category) {
    console.warn(`⚠️ Product ${product.id} (${product.title}) missing google_product_category - using default`);
    return "166"; // Default: Apparel & Accessories
  }

  // If it's already a numeric ID, return it
  if (/^\d+$/.test(category)) {
    return category;
  }

  // If it's a text category, try to extract the numeric ID if present
  const numericMatch = category.match(/^(\d+)/);
  if (numericMatch) {
    return numericMatch[1];
  }

  console.warn(`⚠️ Product ${product.id} has invalid category format: ${category} - using default`);
  return "166"; // Default fallback
}

function shouldUseIdentifierExists(product: Product, variant?: Variant): boolean {
  const hasBrand = !!product.google_brand || !!product.vendor;
  const hasMpn = !!product.google_mpn || !!variant?.sku;
  const hasGtin = isValidGTIN(product.google_gtin);
  
  return !hasBrand && !hasMpn && !hasGtin;
}

function generateProductUrl(product: Product, storeDomain: string | null): string {
  if (!storeDomain) {
    // Fallback temporaire - devrait normalement toujours avoir un domaine
    return `https://newai.sale/product/${product.handle}`;
  }
  
  const cleanDomain = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${cleanDomain}/products/${product.handle}`;
}

async function generateGoogleShoppingFeed(
  products: Product[],
  variants: { [key: string]: Variant[] },
  sellerId: string,
  storeDomain: string | null,
  feedSettings?: FeedSettings,
): Promise<string> {
  const baseUrl = storeDomain ? `https://${storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : "https://newai.sale";
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

    const hasRealVariants = productVariants.length > 1 || 
      (productVariants.length === 1 && 
       productVariants[0].title !== 'Default Title' && 
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

        if (additionalImages.length > 0) {
          additionalImages.forEach(img => {
            xml += `
      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
          });
        } else {
          xml += `
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>`;
        }

        xml += `
      <g:availability>${escapeXml(availability)}</g:availability>`;

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

        if (product.product_type) {
          xml += `
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`;
        }

        // Always include Google category (required field)
        xml += `
      <g:google_product_category>${googleCategory}</g:google_product_category>`;

        // Always include GTIN if valid, regardless of settings
        const hasValidGtin = isValidGTIN(product.google_gtin);
        
        if (hasValidGtin && product.google_gtin) {
          xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
        } else if (useIdentifierExists) {
          xml += `
      <g:identifier_exists>false</g:identifier_exists>`;
        }

        if (productVariants.length > 1) {
          xml += `
      <g:item_group_id>${escapeXml(`group_${product.id}`)}</g:item_group_id>`;
        }

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

      if (additionalImages.length > 0) {
        additionalImages.forEach(img => {
          xml += `
      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
        });
      } else {
        xml += `
      <g:additional_image_link>${escapeXml(imageUrl)}</g:additional_image_link>`;
      }

      xml += `
      <g:availability>${escapeXml(availability)}</g:availability>`;

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

      if (product.product_type) {
        xml += `
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`;
      }

      // Always include Google category (required field)
      xml += `
      <g:google_product_category>${googleCategory}</g:google_product_category>`;

      // Always include GTIN if valid, regardless of settings
      const hasValidGtin = isValidGTIN(product.google_gtin);
      
      if (hasValidGtin && product.google_gtin) {
        xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
      } else if (useIdentifierExists) {
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
  const baseUrl = storeDomain ? `https://${storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : "https://newai.sale";
  
  let csv = 'id,title,description,link,image_link,additional_image_link,availability,price,sale_price,condition,brand,mpn,gtin,identifier_exists,google_product_category,product_type,item_group_id,size,color,material\n';

  for (const product of products) {
    const productVariants = variants[product.id] || [];
    const hasRealVariants = productVariants.length > 1 || 
      (productVariants.length === 1 && 
       productVariants[0].title !== 'Default Title' && 
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

        // Always include GTIN if valid, regardless of settings
        const hasValidGtin = isValidGTIN(product.google_gtin);
        
        let priceField = `${price.toFixed(2)} ${currency}`;
        let salePriceField = '';
        
        if (product.compare_at_price) {
          const comparePrice = parseFloat(product.compare_at_price);
          if (comparePrice > price) {
            priceField = `${comparePrice.toFixed(2)} ${currency}`;
            salePriceField = `${price.toFixed(2)} ${currency}`;
          }
        }

        const gtinValue = (hasValidGtin && product.google_gtin) ? escapeCSV(product.google_gtin) : '';
        const identifierExists = (useIdentifierExists && !hasValidGtin) ? 'false' : '';
        const categoryValue = escapeCSV(googleCategory); // Always include category
        const productTypeValue = product.product_type ? escapeCSV(product.product_type) : '';
        const itemGroupId = productVariants.length > 1 ? escapeCSV("group_" + product.id) : '';
        const sizeValue = variant.option1 ? escapeCSV(variant.option1) : '';
        const colorValue = variant.option2 ? escapeCSV(variant.option2) : '';
        const materialValue = variant.option3 ? escapeCSV(variant.option3) : '';

        csv += '"' + escapeCSV(itemId) + '","' + escapeCSV(title) + '","' + escapeCSV(description) + '","' + escapeCSV(productUrl) + '","' + escapeCSV(imageUrl) + '","' + escapeCSV(imageUrl) + '","' + escapeCSV(availability) + '","' + escapeCSV(priceField) + '","' + escapeCSV(salePriceField) + '","' + escapeCSV(condition) + '","' + escapeCSV(brand) + '","' + escapeCSV(mpn) + '","' + gtinValue + '","' + identifierExists + '","' + categoryValue + '","' + productTypeValue + '","' + itemGroupId + '","' + sizeValue + '","' + colorValue + '","' + materialValue + '"\n';
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

      // Always include GTIN if valid, regardless of settings
      const hasValidGtin = isValidGTIN(product.google_gtin);
      
      let priceField = `${price.toFixed(2)} ${currency}`;
      let salePriceField = '';
      
      if (product.compare_at_price) {
        const comparePrice = parseFloat(product.compare_at_price);
        if (comparePrice > price) {
          priceField = `${comparePrice.toFixed(2)} ${currency}`;
          salePriceField = `${price.toFixed(2)} ${currency}`;
        }
      }

      const gtinValue = (hasValidGtin && product.google_gtin) ? escapeCSV(product.google_gtin) : '';
      const identifierExists = (useIdentifierExists && !hasValidGtin) ? 'false' : '';
      const categoryValue = escapeCSV(googleCategory); // Always include category
      const productTypeValue = product.product_type ? escapeCSV(product.product_type) : '';

      csv += '"' + escapeCSV(itemId) + '","' + escapeCSV(title) + '","' + escapeCSV(description) + '","' + escapeCSV(productUrl) + '","' + escapeCSV(imageUrl) + '","' + escapeCSV(imageUrl) + '","' + escapeCSV(availability) + '","' + escapeCSV(priceField) + '","' + escapeCSV(salePriceField) + '","' + escapeCSV(condition) + '","' + escapeCSV(brand) + '","' + escapeCSV(mpn) + '","' + gtinValue + '","' + identifierExists + '","' + categoryValue + '","' + productTypeValue + '","","","",""\n';
    }
  }

  console.log(`Generated CSV feed for seller ${sellerId}`);
  return csv;
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
    const format = pathParts[identifierIndex + 1] || 'xml';

    if (!identifier || identifier === "xml" || identifier === "csv") {
      return new Response(JSON.stringify({ error: "Store name or Seller ID is required in the path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format !== 'xml' && format !== 'csv') {
      return new Response(JSON.stringify({ error: "Invalid format. Use 'xml' or 'csv'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

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
      sellerId = identifier;

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

    // RÉCUPÉRATION DU VRAI DOMAINE SHOPIFY
    const storeDomain = await getStoreDomain(sellerId, feedSettings || undefined);

    if (!storeDomain) {
      return new Response(JSON.stringify({ 
        error: "Could not determine store domain. Please check Shopify connection." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🎯 Generating ${format} feed for seller: ${sellerId}, domain: ${storeDomain}`);

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

    let products = allProducts;
    
    if (feedSettings?.filter_mode === 'include' && feedSettings.included_collections && feedSettings.included_collections.length > 0) {
      const includedCollections = feedSettings.included_collections;
      products = allProducts.filter(product => {
        const productCollections = product.collection_ids || [];
        return includedCollections.some(collectionId => 
          productCollections.includes(collectionId)
        );
      });
      console.log(`Filtered to ${products.length} products from ${includedCollections.length} included collections`);
    } else if (feedSettings?.filter_mode === 'exclude' && feedSettings.excluded_collections && feedSettings.excluded_collections.length > 0) {
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

    const productIds = products.map((p) => p.id);
    const { data: allVariants } = await supabase.from("product_variants").select("*").in("product_id", productIds);

    const variantsByProduct: { [key: string]: Variant[] } = {};
    if (allVariants) {
      for (const variant of allVariants) {
        if (!variantsByProduct[variant.product_id]) {
          variantsByProduct[variant.product_id] = [];
        }
        variantsByProduct[variant.product_id].push(variant);
      }
    }

    if (format === 'csv') {
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