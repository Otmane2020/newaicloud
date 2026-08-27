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
    const { shopDomain, apiKey, accessToken, clientId, clientSecret } = await req.json();

    const storeUrl = shopDomain.replace(/^https?:\\/\\//, '').replace(/\\/$/, '');
    let resolvedAccessToken = accessToken || '';
    let expiresIn: number | null = null;

    // New Dev Dashboard apps use the client credentials grant.
    if (clientId && clientSecret) {
      const tokenResponse = await fetch(`https://${storeUrl}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const details = await tokenResponse.text();
        return new Response(JSON.stringify({
          success: false,
          error: 'Unable to exchange Client ID and Secret for a Shopify access token',
          details,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      const tokenData = await tokenResponse.json();
      resolvedAccessToken = tokenData.access_token;
      expiresIn = tokenData.expires_in || 86399;
    }

    if (!resolvedAccessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Shopify credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log('🔍 Testing Shopify credentials via GraphQL for:', shopDomain);

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
      }>(storeUrl, resolvedAccessToken, SHOP_QUERY);
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
      await shopifyGraphQL(storeUrl, resolvedAccessToken, PRODUCTS_TEST_QUERY);
      permissions.products = true;
      console.log(`Products access: ✅`);
    } catch (e) {
      console.log('Products access: ❌');
    }

    // Test collections
    try {
      await shopifyGraphQL(storeUrl, resolvedAccessToken, COLLECTIONS_TEST_QUERY);
      permissions.collections = true;
      console.log(`Collections access: ✅`);
    } catch (e) {
      console.log('Collections access: ❌');
    }

    // Test pages (REST - not deprecated)
    try {
      const pagesRes = await fetch(`https://${storeUrl}/admin/api/2025-01/pages.json?limit=1`, {
        headers: { 'X-Shopify-Access-Token': resolvedAccessToken, 'Content-Type': 'application/json' }
      });
      permissions.pages = pagesRes.ok;
      console.log(`Pages access: ${pagesRes.ok ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Pages access: ❌');
    }

    // Test articles (REST - not deprecated)
    try {
      const blogsRes = await fetch(`https://${storeUrl}/admin/api/2025-01/blogs.json?limit=1`, {
        headers: { 'X-Shopify-Access-Token': resolvedAccessToken, 'Content-Type': 'application/json' }
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
        permissions,
        accessToken: resolvedAccessToken,
        expiresIn,
        authType: clientId && clientSecret ? 'client_credentials' : 'legacy_token'
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
