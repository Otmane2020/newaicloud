import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { shopifyGraphQL } from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// GraphQL query to test shop access and permissions
const SHOP_QUERY = `
  query {
    shop {
      name
      myshopifyDomain
      email
    }
  }
`;

// GraphQL query to test product access
const PRODUCTS_TEST_QUERY = `
  query {
    products(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

// GraphQL query to test collection access
const COLLECTIONS_TEST_QUERY = `
  query {
    collections(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain, apiKey, accessToken } = await req.json();

    console.log('🔍 Testing Shopify credentials via GraphQL for:', shopDomain);

    const storeUrl = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Test shop access via GraphQL
    console.log('📞 Testing shop access via GraphQL...');
    
    let shopData;
    try {
      shopData = await shopifyGraphQL<{
        shop: {
          name: string;
          myshopifyDomain: string;
          email: string;
        };
      }>(storeUrl, accessToken, SHOP_QUERY);
    } catch (error) {
      console.error('❌ GraphQL shop access failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials or shop domain',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('✅ Successfully connected to Shopify shop:', shopData.shop?.name);

    // Test specific permissions via GraphQL
    console.log('🔐 Testing API permissions via GraphQL...');
    const permissions = {
      products: false,
      collections: false,
      pages: false,
      articles: false,
      images: false
    };

    // Test products
    try {
      await shopifyGraphQL(storeUrl, accessToken, PRODUCTS_TEST_QUERY);
      permissions.products = true;
      console.log(`Products access: ✅`);
    } catch (e) {
      console.log('Products access: ❌');
    }

    // Test collections
    try {
      await shopifyGraphQL(storeUrl, accessToken, COLLECTIONS_TEST_QUERY);
      permissions.collections = true;
      console.log(`Collections access: ✅`);
    } catch (e) {
      console.log('Collections access: ❌');
    }

    // Test pages (REST - not deprecated)
    try {
      const pagesRes = await fetch(`https://${storeUrl}/admin/api/2025-01/pages.json?limit=1`, {
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
      });
      permissions.pages = pagesRes.ok;
      console.log(`Pages access: ${pagesRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Pages access: ❌');
    }

    // Test articles (REST - not deprecated)
    try {
      const blogsRes = await fetch(`https://${storeUrl}/admin/api/2025-01/blogs.json?limit=1`, {
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
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
          domain: shopData.shop?.myshopifyDomain,
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
