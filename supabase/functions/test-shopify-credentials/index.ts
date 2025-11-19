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

    // Test credentials by calling Shopify Admin API
    const authHeader = btoa(`${apiKey}:${accessToken}`);
    const shopifyUrl = `https://${shopDomain}/admin/api/2024-01/shop.json`;
    
    console.log('📞 Calling Shopify API:', shopifyUrl);

    const response = await fetch(shopifyUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Shopify API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials or shop domain',
          statusCode: response.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const shopData = await response.json();
    console.log('✅ Successfully connected to Shopify shop:', shopData.shop?.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shop: {
          name: shopData.shop?.name,
          domain: shopData.shop?.myshopify_domain,
          email: shopData.shop?.email,
        }
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
