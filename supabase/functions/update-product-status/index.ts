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
    const authHeader = req.headers.get('Authorization');
    console.log('[UPDATE-STATUS] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[UPDATE-STATUS] No authorization header found');
      throw new Error('No authorization header');
    }

    // Create admin client to verify JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('[UPDATE-STATUS] Auth error:', authError);
      throw new Error('Unauthorized');
    }
    
    console.log('[UPDATE-STATUS] User authenticated:', user.id);

    const { productId, shopifyId, storeId, newStatus } = await req.json();

    if (!productId || !shopifyId || !storeId || !newStatus) {
      throw new Error('Missing required parameters');
    }

    console.log('Updating product status:', { productId, shopifyId, storeId, newStatus });

    // Get store connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (connError) {
      console.error('Store connection error:', connError);
      throw new Error(`Failed to fetch store connection: ${connError.message}`);
    }

    if (!connection) {
      console.error('Store connection not found for storeId:', storeId, 'userId:', user.id);
      throw new Error('Store connection not found. Please verify your Shopify connection.');
    }

    console.log('[UPDATE-STATUS] Store connection found:', connection.store_url);
    console.log('[UPDATE-STATUS] Using direct access token, length:', connection.access_token?.length);

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
    const { error: updateError } = await supabaseAdmin
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
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
