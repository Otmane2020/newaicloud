import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain, apiKey, accessToken } = await req.json();

    console.log('🔍 Testing Shopify credentials for:', shopDomain);

    const authHeader = btoa(`${apiKey}:${accessToken}`);
    const baseUrl = `https://${shopDomain}/admin/api/2024-01`;
    
    // Test shop access first
    console.log('📞 Testing shop access...');
    const shopResponse = await fetch(`${baseUrl}/shop.json`, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    if (!shopResponse.ok) {
      console.error('❌ Shopify API error:', shopResponse.status, shopResponse.statusText);
      const errorText = await shopResponse.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials or shop domain',
          statusCode: shopResponse.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const shopData = await shopResponse.json();
    console.log('✅ Successfully connected to Shopify shop:', shopData.shop?.name);

    // Test specific permissions
    console.log('🔐 Testing API permissions...');
    const permissions = {
      products: false,
      collections: false,
      pages: false,
      articles: false,
      images: false
    };

    // Test products
    try {
      const productsRes = await fetch(`${baseUrl}/products.json?limit=1`, {
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' }
      });
      permissions.products = productsRes.ok;
      console.log(`Products access: ${productsRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Products access: ❌');
    }

    // Test collections
    try {
      const collectionsRes = await fetch(`${baseUrl}/custom_collections.json?limit=1`, {
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' }
      });
      permissions.collections = collectionsRes.ok;
      console.log(`Collections access: ${collectionsRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Collections access: ❌');
    }

    // Test pages
    try {
      const pagesRes = await fetch(`${baseUrl}/pages.json?limit=1`, {
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' }
      });
      permissions.pages = pagesRes.ok;
      console.log(`Pages access: ${pagesRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Pages access: ❌');
    }

    // Test articles (blogs)
    try {
      const blogsRes = await fetch(`${baseUrl}/blogs.json?limit=1`, {
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' }
      });
      permissions.articles = blogsRes.ok;
      console.log(`Articles access: ${blogsRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Articles access: ❌');
    }

    // Images typically work if products work
    permissions.images = permissions.products;

    return new Response(
      JSON.stringify({ 
        success: true, 
        shop: {
          name: shopData.shop?.name,
          domain: shopData.shop?.myshopify_domain,
          email: shopData.shop?.email,
        },
        permissions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Error testing credentials:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
})
