import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Fetching Shopify product count...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's Shopify connections
    const { data: connections, error: connectionsError } = await supabase
      .from('shopify_connections')
      .select('shop_name, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (connectionsError || !connections || connections.length === 0) {
      console.log('❌ No active Shopify connections found');
      return new Response(
        JSON.stringify({ 
          imported_count: 0,
          total_shopify_count: 0,
          has_connection: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get imported products count from our DB
    const { count: importedCount } = await supabase
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    console.log(`📦 Imported products: ${importedCount || 0}`);

    // Get total count from Shopify API for all stores
    let totalShopifyCount = 0;
    
    for (const connection of connections) {
      try {
        const shopifyResponse = await fetch(
          `https://${connection.shop_name}/admin/api/2025-01/products/count.json`,
          {
            headers: {
              'X-Shopify-Access-Token': connection.access_token,
              'Content-Type': 'application/json',
            },
          }
        );

        if (shopifyResponse.ok) {
          const data = await shopifyResponse.json();
          totalShopifyCount += data.count || 0;
          console.log(`📊 Store ${connection.shop_name}: ${data.count || 0} products`);
        } else {
          console.error(`❌ Failed to fetch count from ${connection.shop_name}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching from ${connection.shop_name}:`, error);
      }
    }

    console.log(`✅ Total Shopify products: ${totalShopifyCount}`);

    return new Response(
      JSON.stringify({
        imported_count: importedCount || 0,
        total_shopify_count: totalShopifyCount,
        has_connection: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
