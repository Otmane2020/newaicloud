import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const APP_ORIGIN = "https://catalogoptimize.com";
const DEFAULT_GOOGLE_CATEGORY = "166";

type FeedFormat = "xml" | "csv";

interface FeedSettings {
  user_id: string;
  store_name?: string | null;
  feed_domain?: string | null;
  default_currency?: string | null;
  default_condition?: string | null;
  default_brand?: string | null;
  filter_mode?: string | null;
  included_collections?: string[] | null;
  excluded_collections?: string[] | null;
}

interface ShopifyConnection {
  public_domain: string | null;
  store_url: string | null;
  is_active?: boolean | null;
  updated_at?: string | null;
}

interface Product {
  id: string;
  seller_id: string;
  store_id?: string | null;
  title: string;
  optimized_title?: string | null;
  seo_title?: string | null;
  description?: string | null;
  optimized_description?: string | null;
  seo_description?: string | null;
  body_html?: string | null;
  price: string | number | null;
  compare_at_price?: string | number | null;
  image_url?: string | null;
  handle?: string | null;
  category?: string | null;
  product_type?: string | null;
  vendor?: string | null;
  status?: string | null;
  currency?: string | null;
  google_product_category?: string | null;
  google_mpn?: string | null;
  google_condition?: string | null;
  google_gtin?: string | null;
  google_brand?: string | null;
  collection_ids?: string[] | null;
}

interface Variant {
  id: string;
  product_id: string;
  title?: string | null;
  price?: string | number | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_url?: string | null;
  sku?: string | null;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname || null;
  } catch {
    const cleaned = raw
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/\/$/, "")
      .trim();
    return cleaned || null;
  }
}

async function getLatestConnection(
  supabase: ReturnType<typeof getSupabaseClient>,
  sellerId: string,
  activeOnly: boolean,
): Promise<ShopifyConnection | null> {
  let query = supabase
    .from("shopify_connections")
    .select("public_domain, store_url, is_active, updated_at")
    .eq("user_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn("Shopping feed connection lookup failed", {
      sellerId,
      activeOnly,
      message: error.message,
    });
    return null;
  }

  return data as ShopifyConnection | null;
}

async function getStoreDomain(
  sellerId: string,
  feedSettings?: FeedSettings | null,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  // A product-feed URL only needs the storefront domain. Do not depend on
  // decrypting a Shopify Admin token or on an external Shopify API request.
  const activeConnection = await getLatestConnection(supabase, sellerId, true);
  const activeDomain = normalizeDomain(activeConnection?.public_domain)
    || normalizeDomain(activeConnection?.store_url);
  if (activeDomain) {
    console.log("Shopping feed storefront domain resolved from active connection", {
      sellerId,
      domain: activeDomain,
    });
    return activeDomain;
  }

  // Reinstalled/temporarily inactive stores can still have valid local domain data.
  const latestConnection = await getLatestConnection(supabase, sellerId, false);
  const latestDomain = normalizeDomain(latestConnection?.public_domain)
    || normalizeDomain(latestConnection?.store_url);
  if (latestDomain) {
    console.log("Shopping feed storefront domain resolved from latest connection", {
      sellerId,
      domain: latestDomain,
    });
    return latestDomain;
  }

  const settingsDomain = normalizeDomain(feedSettings?.feed_domain);
  if (settingsDomain) {
    console.log("Shopping feed storefront domain resolved from feed settings", {
      sellerId,
      domain: settingsDomain,
    });
    return settingsDomain;
  }

  console.warn("Shopping feed could not resolve storefront domain", { sellerId });
  return null;
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCSV(value: unknown): string {
  return String(value ?? "").replace(/"/g, '""');
}

function cleanDescription(value?: string | null): string {
  const text = (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 5000);
}

function numericPrice(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function validGTIN(value?: string | null): boolean {
  if (!value) return false;
  const gtin = value.replace(/[\s-]/g, "");
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) return false;

  const digits = gtin.split("").map(Number);
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits.reverse().reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === check;
}

function googleCategory(product: Product): string {
  const value = product.google_product_category?.trim();
  if (!value) return DEFAULT_GOOGLE_CATEGORY;
  if (/^\d+$/.test(value)) return value;
  return value.match(/^(\d+)/)?.[1] || DEFAULT_GOOGLE_CATEGORY;
}

function productTitle(product: Product, variant?: Variant): string {
  const base = product.optimized_title || product.seo_title || product.title || "Product";
  if (!variant) return base.slice(0, 150);

  const options = [variant.option1, variant.option2, variant.option3]
    .filter((item): item is string => Boolean(item?.trim()))
    .join(" - ");
  return (options ? `${base} - ${options}` : base).slice(0, 150);
}

function productDescription(product: Product): string {
  const description = cleanDescription(
    product.optimized_description
      || product.seo_description
      || product.body_html
      || product.description
      || product.title,
  );
  return description || product.title || "Product";
}

function productImage(product: Product, variant?: Variant): string {
  return variant?.image_url || product.image_url || `${APP_ORIGIN}/placeholder.svg`;
}

function productUrl(product: Product, storeDomain: string): string {
  const handle = (product.handle || product.id).replace(/^\/+|\/+$/g, "");
  return `https://${storeDomain}/products/${encodeURIComponent(handle)}`;
}

function currency(product: Product, settings?: FeedSettings | null): string {
  return product.currency || settings?.default_currency || "EUR";
}

function condition(product: Product, settings?: FeedSettings | null): string {
  const value = product.google_condition || settings?.default_condition || "new";
  return ["new", "refurbished", "used"].includes(value) ? value : "new";
}

function brand(product: Product, settings?: FeedSettings | null): string {
  return product.google_brand || product.vendor || settings?.default_brand || "Generic";
}

function mpn(product: Product, variant?: Variant): string {
  return product.google_mpn || variant?.sku || `MPN-${variant?.id || product.id}`;
}

function hasRealVariants(variants: Variant[]): boolean {
  return variants.length > 1 || (
    variants.length === 1
    && variants[0].title !== "Default Title"
    && Boolean(variants[0].option1 || variants[0].option2 || variants[0].option3)
  );
}

function itemXml(
  product: Product,
  storeDomain: string,
  settings: FeedSettings | null,
  variant?: Variant,
  variantCount = 0,
): string | null {
  const price = numericPrice(variant?.price ?? product.price);
  if (price <= 0) return null;

  const compareAt = numericPrice(product.compare_at_price);
  const itemId = variant ? `variant_${variant.id}` : `product_${product.id}`;
  const gtin = validGTIN(product.google_gtin) ? product.google_gtin!.replace(/[\s-]/g, "") : null;
  const itemBrand = brand(product, settings);
  const itemMpn = mpn(product, variant);
  const identifierExists = Boolean(gtin || itemBrand || itemMpn);
  const itemCurrency = currency(product, settings);

  let xml = `\n    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:title>${escapeXml(productTitle(product, variant))}</g:title>
      <g:description>${escapeXml(productDescription(product))}</g:description>
      <g:link>${escapeXml(productUrl(product, storeDomain))}</g:link>
      <g:image_link>${escapeXml(productImage(product, variant))}</g:image_link>
      <g:availability>in stock</g:availability>`;

  if (compareAt > price) {
    xml += `\n      <g:price>${compareAt.toFixed(2)} ${escapeXml(itemCurrency)}</g:price>`;
    xml += `\n      <g:sale_price>${price.toFixed(2)} ${escapeXml(itemCurrency)}</g:sale_price>`;
  } else {
    xml += `\n      <g:price>${price.toFixed(2)} ${escapeXml(itemCurrency)}</g:price>`;
  }

  xml += `\n      <g:condition>${escapeXml(condition(product, settings))}</g:condition>`;
  xml += `\n      <g:brand>${escapeXml(itemBrand)}</g:brand>`;
  xml += `\n      <g:mpn>${escapeXml(itemMpn)}</g:mpn>`;
  xml += `\n      <g:google_product_category>${escapeXml(googleCategory(product))}</g:google_product_category>`;

  if (product.product_type) {
    xml += `\n      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`;
  }
  if (gtin) {
    xml += `\n      <g:gtin>${escapeXml(gtin)}</g:gtin>`;
  } else if (!identifierExists) {
    xml += "\n      <g:identifier_exists>false</g:identifier_exists>";
  }
  if (variant && variantCount > 1) {
    xml += `\n      <g:item_group_id>${escapeXml(`group_${product.id}`)}</g:item_group_id>`;
  }
  if (variant?.option1) xml += `\n      <g:size>${escapeXml(variant.option1)}</g:size>`;
  if (variant?.option2) xml += `\n      <g:color>${escapeXml(variant.option2)}</g:color>`;
  if (variant?.option3) xml += `\n      <g:material>${escapeXml(variant.option3)}</g:material>`;

  return `${xml}\n    </item>`;
}

function generateXml(
  products: Product[],
  variantsByProduct: Record<string, Variant[]>,
  storeDomain: string,
  settings: FeedSettings | null,
): string {
  const items: string[] = [];

  for (const product of products) {
    const variants = variantsByProduct[product.id] || [];
    if (hasRealVariants(variants)) {
      for (const variant of variants) {
        const xml = itemXml(product, storeDomain, settings, variant, variants.length);
        if (xml) items.push(xml);
      }
    } else {
      const xml = itemXml(product, storeDomain, settings);
      if (xml) items.push(xml);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Google Shopping Feed</title>
    <link>https://${escapeXml(storeDomain)}</link>
    <description>Product feed for Google Shopping</description>
    <lastBuildDate>${new Date().toISOString()}</lastBuildDate>${items.join("")}
  </channel>
</rss>`;
}

function csvRow(
  product: Product,
  storeDomain: string,
  settings: FeedSettings | null,
  variant?: Variant,
  variantCount = 0,
): string | null {
  const price = numericPrice(variant?.price ?? product.price);
  if (price <= 0) return null;

  const compareAt = numericPrice(product.compare_at_price);
  const itemCurrency = currency(product, settings);
  const itemId = variant ? `variant_${variant.id}` : `product_${product.id}`;
  const gtin = validGTIN(product.google_gtin) ? product.google_gtin!.replace(/[\s-]/g, "") : "";
  const fields = [
    itemId,
    productTitle(product, variant),
    productDescription(product),
    productUrl(product, storeDomain),
    productImage(product, variant),
    "in stock",
    compareAt > price ? `${compareAt.toFixed(2)} ${itemCurrency}` : `${price.toFixed(2)} ${itemCurrency}`,
    compareAt > price ? `${price.toFixed(2)} ${itemCurrency}` : "",
    condition(product, settings),
    brand(product, settings),
    mpn(product, variant),
    gtin,
    gtin ? "" : "true",
    googleCategory(product),
    product.product_type || "",
    variant && variantCount > 1 ? `group_${product.id}` : "",
    variant?.option1 || "",
    variant?.option2 || "",
    variant?.option3 || "",
  ];

  return fields.map((field) => `"${escapeCSV(field)}"`).join(",");
}

function generateCsv(
  products: Product[],
  variantsByProduct: Record<string, Variant[]>,
  storeDomain: string,
  settings: FeedSettings | null,
): string {
  const rows = [
    "id,title,description,link,image_link,availability,price,sale_price,condition,brand,mpn,gtin,identifier_exists,google_product_category,product_type,item_group_id,size,color,material",
  ];

  for (const product of products) {
    const variants = variantsByProduct[product.id] || [];
    if (hasRealVariants(variants)) {
      for (const variant of variants) {
        const row = csvRow(product, storeDomain, settings, variant, variants.length);
        if (row) rows.push(row);
      }
    } else {
      const row = csvRow(product, storeDomain, settings);
      if (row) rows.push(row);
    }
  }

  return `${rows.join("\n")}\n`;
}

function applyCollectionFilters(products: Product[], settings: FeedSettings | null): Product[] {
  if (!settings) return products;

  const included = settings.included_collections || [];
  const excluded = settings.excluded_collections || [];

  if (settings.filter_mode === "include" && included.length > 0) {
    return products.filter((product) => {
      const ids = product.collection_ids || [];
      return included.some((id) => ids.includes(id));
    });
  }

  if (settings.filter_mode === "exclude" && excluded.length > 0) {
    return products.filter((product) => {
      const ids = product.collection_ids || [];
      return !excluded.some((id) => ids.includes(id));
    });
  }

  return products;
}

async function loadVariants(
  supabase: ReturnType<typeof getSupabaseClient>,
  productIds: string[],
): Promise<Record<string, Variant[]>> {
  const variantsByProduct: Record<string, Variant[]> = {};
  const batchSize = 100;

  for (let index = 0; index < productIds.length; index += batchSize) {
    const batch = productIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, title, price, option1, option2, option3, image_url, sku")
      .in("product_id", batch);

    if (error) {
      console.warn("Shopping feed variant batch failed", error.message);
      continue;
    }

    for (const variant of (data || []) as Variant[]) {
      (variantsByProduct[variant.product_id] ||= []).push(variant);
    }
  }

  return variantsByProduct;
}

async function resolveSeller(
  supabase: ReturnType<typeof getSupabaseClient>,
  identifier: string,
): Promise<{ sellerId: string; settings: FeedSettings | null }> {
  const { data: byStore } = await supabase
    .from("merchant_feed_settings")
    .select("*")
    .eq("store_name", identifier)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byStore?.user_id) {
    return { sellerId: byStore.user_id, settings: byStore as FeedSettings };
  }

  const sellerId = identifier;
  const { data: byUser } = await supabase
    .from("merchant_feed_settings")
    .select("*")
    .eq("user_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { sellerId, settings: (byUser as FeedSettings | null) || null };
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
    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) => part === "shoppingfeed");
    const identifier = markerIndex >= 0 ? parts[markerIndex + 1] : null;
    const format = (markerIndex >= 0 ? parts[markerIndex + 2] : "xml") as FeedFormat;

    if (!identifier) {
      return new Response(JSON.stringify({
        error: "Invalid URL format. Use /shoppingfeed/{store_name_or_seller_id}/xml",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format !== "xml" && format !== "csv") {
      return new Response(JSON.stringify({ error: "Invalid format. Use xml or csv" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();
    const { sellerId, settings } = await resolveSeller(supabase, identifier);
    const storeDomain = await getStoreDomain(sellerId, settings);

    if (!storeDomain) {
      return new Response(JSON.stringify({
        error: "Could not determine store domain. Please check Shopify connection.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: productRows, error: productError } = await supabase
      .from("shopify_products")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .not("price", "is", null);

    if (productError) throw productError;

    const allProducts = (productRows || []) as Product[];
    const products = applyCollectionFilters(allProducts, settings);
    if (products.length === 0) {
      return new Response(JSON.stringify({ error: "No active products found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variants = await loadVariants(supabase, products.map((product) => product.id));

    if (format === "csv") {
      const csv = generateCsv(products, variants, storeDomain, settings);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="google-shopping-feed-${identifier}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const xml = generateXml(products, variants, storeDomain, settings);
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `inline; filename="google-shopping-feed-${identifier}.xml"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Shopping feed generation failed", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
