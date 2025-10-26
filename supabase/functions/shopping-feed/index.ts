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

function generateGoogleShoppingFeed(products: Product[], sellerId: string): string {
  const baseUrl = "https://newai.sale";
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
    const productUrl = `${baseUrl}/product/${product.handle}`;
    const imageUrl = product.image_url || `${baseUrl}/placeholder.svg`;
    const price = parseFloat(product.price);
    const currency = product.currency || 'EUR';
    const availability = product.status === 'active' ? 'in stock' : 'out of stock';
    const condition = product.google_condition || 'new';
    const mpn = product.google_mpn || product.vendor || 'N/A';
    
    xml += `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description || product.title)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ${currency}</g:price>
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:mpn>${escapeXml(mpn)}</g:mpn>`;
    
    if (product.compare_at_price) {
      const comparePrice = parseFloat(product.compare_at_price);
      if (comparePrice > price) {
        xml += `
      <g:sale_price>${price.toFixed(2)} ${currency}</g:sale_price>`;
      }
    }
    
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
    
    // Expected path: /shoppingfeed/{seller_id}/xml
    const sellerId = pathParts[pathParts.length - 2];
    
    if (!sellerId || sellerId === 'xml') {
      return new Response(
        JSON.stringify({ error: "Seller ID is required in the path: /shoppingfeed/{seller_id}/xml" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = getSupabaseClient();
    
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

    const xmlFeed = generateGoogleShoppingFeed(products, sellerId);

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
