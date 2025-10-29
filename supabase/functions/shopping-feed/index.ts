import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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
}

interface Variant {
  id: string;
  title: string;
  price: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_url: string | null;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateGoogleShoppingFeed(
  products: Product[], 
  variants: { [key: string]: Variant[] },
  sellerId: string,
  storeDomain: string | null
): Promise<string> {
  const baseUrl = storeDomain || "https://newai.sale";
  const date = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Product Feed</title>
    <link>${baseUrl}</link>
    <description>Google Shopping Product Feed</description>
    <lastBuildDate>${date}</lastBuildDate>
`;

  for (const product of products) {
    const productVariants = variants[product.id] || [];
    
    // If product has variants, create an entry for each variant
    if (productVariants.length > 0) {
      for (const variant of productVariants) {
        const variantTitle = product.optimized_title || 
          `${product.title}${variant.option1 ? ' - ' + variant.option1 : ''}${variant.option2 ? ' - ' + variant.option2 : ''}${variant.option3 ? ' - ' + variant.option3 : ''}`;
        
        // Use Shopify product link if available
        const productUrl = product.shopify_id && storeDomain
          ? `${storeDomain}/products/${product.handle}`
          : `https://newai.sale/product/${product.handle}`;
          
        const imageUrl = variant.image_url || product.image_url || `${baseUrl}/placeholder.svg`;
        const price = parseFloat(variant.price);
        const currency = product.currency || 'EUR';
        const availability = product.status === 'active' ? 'in stock' : 'out of stock';
        const condition = product.google_condition || 'new';
        const brand = product.google_brand || product.vendor || 'N/A';
        const mpn = product.google_mpn || product.vendor || 'N/A';
        
        xml += `
    <item>
      <g:id>${escapeXml(variant.id)}</g:id>
      <g:title>${escapeXml(variantTitle)}</g:title>
      <g:description>${escapeXml(product.optimized_description || product.description || product.title)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>`;
        
        if (product.google_product_category) {
          xml += `
      <g:google_product_category>${escapeXml(product.google_product_category)}</g:google_product_category>`;
        }
        
        if (product.google_gtin) {
          xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
        }
        
        xml += `
    </item>`;
      }
    } else {
      // Product without variants - single entry
      const productUrl = product.shopify_id && storeDomain
        ? `${storeDomain}/products/${product.handle}`
        : `https://newai.sale/product/${product.handle}`;
        
      const imageUrl = product.image_url || `${baseUrl}/placeholder.svg`;
      const price = parseFloat(product.price);
      const currency = product.currency || 'EUR';
      const availability = product.status === 'active' ? 'in stock' : 'out of stock';
      const condition = product.google_condition || 'new';
      const brand = product.google_brand || product.vendor || 'N/A';
      const mpn = product.google_mpn || product.vendor || 'N/A';
      
      xml += `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.optimized_title || product.title)}</g:title>
      <g:description>${escapeXml(product.optimized_description || product.description || product.title)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>`;
      
      if (product.google_product_category) {
        xml += `
      <g:google_product_category>${escapeXml(product.google_product_category)}</g:google_product_category>`;
      }
      
      if (product.google_gtin) {
        xml += `
      <g:gtin>${escapeXml(product.google_gtin)}</g:gtin>`;
      }
      
      xml += `
    </item>`;
    }
  }

  xml += `
  </channel>
</rss>`;

  return xml;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Support two URL formats:
    // 1. /shoppingfeed/{store_name}/xml (new format)
    // 2. /shoppingfeed/{seller_id}/xml (legacy format)
    const identifier = pathParts[pathParts.length - 2];
    
    if (!identifier || identifier === 'xml') {
      return new Response(
        JSON.stringify({ error: "Store name or Seller ID is required in the path" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = getSupabaseClient();
    
    // Try to find feed settings by store_name first (new format)
    let sellerId: string | null = null;
    let storeDomain: string | null = null;
    
    const { data: feedSettings } = await supabase
      .from('merchant_feed_settings')
      .select('user_id')
      .eq('store_name', identifier)
      .single();
    
    if (feedSettings) {
      sellerId = feedSettings.user_id;
      
      // Get store domain from shopify_connections
      const { data: connection } = await supabase
        .from('shopify_connections')
        .select('store_url')
        .eq('user_id', sellerId)
        .single();
      
      if (connection) {
        storeDomain = connection.store_url;
      }
    } else {
      // Fallback to legacy format (seller_id directly)
      sellerId = identifier;
    }
    
    if (!sellerId) {
      return new Response(
        JSON.stringify({ error: "Invalid store name or seller ID" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Fetch active products for this seller
    const { data: products, error } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('status', 'active');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active products found for this seller" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Fetch all variants for these products
    const productIds = products.map(p => p.id);
    const { data: allVariants } = await supabase
      .from('product_variants')
      .select('*')
      .in('product_id', productIds);
    
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

    const xmlFeed = await generateGoogleShoppingFeed(products, variantsByProduct, sellerId, storeDomain);

    return new Response(xmlFeed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating shopping feed:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
