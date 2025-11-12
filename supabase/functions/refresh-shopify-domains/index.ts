import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get active Shopify connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      throw new Error('No active Shopify connection found');
    }

    console.log('Fetching shop info from Shopify API...');

    // Fetch shop info from Shopify Admin API
    const shopifyUrl = `https://${connection.store_url}/admin/api/2025-01/shop.json`;
    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status}`);
    }

    const shopData = await shopifyResponse.json();
    console.log('Shop data received:', JSON.stringify(shopData, null, 2));

    // Extract primary domain
    const primaryDomain = shopData.shop?.primary_domain?.host || null;
    const myshopifyDomain = shopData.shop?.myshopify_domain || connection.store_url;

    console.log('Primary domain:', primaryDomain);
    console.log('MyShopify domain:', myshopifyDomain);

    // Update the connection with the public domain
    const { error: updateError } = await supabaseClient
      .from('shopify_connections')
      .update({
        public_domain: primaryDomain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('Error updating connection:', updateError);
      throw new Error('Failed to update connection');
    }

    return new Response(
      JSON.stringify({
        success: true,
        public_domain: primaryDomain,
        myshopify_domain: myshopifyDomain,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in refresh-shopify-domains:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
