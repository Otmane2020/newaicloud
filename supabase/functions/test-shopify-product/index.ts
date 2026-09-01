import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      vendor
      descriptionHtml
    }
  }
`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, shopifyProductId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get store connection
    const { data: store, error: storeError } = await supabase
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message}`);
    }

    console.log(`Testing product ${shopifyProductId} on ${store.store_url}`);

    const productGid = `gid://shopify/Product/${shopifyProductId}`;

    const response = await fetch(`https://${store.store_url}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.access_token,
      },
      body: JSON.stringify({ 
        query: PRODUCT_QUERY, 
        variables: { id: productGid } 
      }),
    });

    const data = await response.json();
    
    console.log('Shopify response:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        shopifyData: data,
        storeUrl: store.store_url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Test error:', errorMsg);
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
