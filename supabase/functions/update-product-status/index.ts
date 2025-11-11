import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { productId, shopifyId, storeId, newStatus } = await req.json();

    if (!productId || !shopifyId || !storeId || !newStatus) {
      throw new Error('Missing required parameters');
    }

    // Get store connection
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('id', storeId)
      .eq('seller_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error('Store connection not found');
    }

    // Update product status in Shopify
    const shopifyResponse = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/products/${shopifyId}.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': connection.access_token,
        },
        body: JSON.stringify({
          product: { status: newStatus },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Failed to update Shopify product: ${shopifyResponse.status}`);
    }

    // Update local database
    const { error: updateError } = await supabaseClient
      .from('shopify_products')
      .update({ status: newStatus })
      .eq('id', productId)
      .eq('seller_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update local database');
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
