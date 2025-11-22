import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();

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
      throw new Error('Store not found');
    }

    console.log('Testing Shopify API with store:', store.store_url);

    // Test with 2024-10 API version
    const testUrl = `https://${store.store_url}/admin/api/2024-10/shop.json`;
    
    const response = await fetch(testUrl, {
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
    });

    console.log('Shopify API response status:', response.status);
    
    const responseText = await response.text();
    console.log('Shopify API response:', responseText.substring(0, 500));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          valid: false,
          status: response.status,
          message: responseText,
          suggestion: response.status === 401 
            ? 'Access token invalide ou expiré. Reconnectez votre boutique Shopify.'
            : 'Erreur lors de la connexion à Shopify.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const shopData = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        valid: true,
        shopName: shopData.shop?.name,
        domain: shopData.shop?.domain,
        email: shopData.shop?.email,
        currency: shopData.shop?.currency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error testing Shopify token:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
