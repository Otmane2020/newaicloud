import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all connections without public_domain
    const { data: connections, error: fetchError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .is('public_domain', null)
      .eq('is_active', true);

    if (fetchError) {
      throw fetchError;
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No connections to update',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} connections to update`);

    const results = [];

    // Update each connection with public_domain
    for (const conn of connections) {
      try {
        const shopInfoResponse = await fetch(
          `https://${conn.store_url}/admin/api/2025-10/shop.json`,
          {
            headers: {
              'X-Shopify-Access-Token': conn.access_token,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!shopInfoResponse.ok) {
          console.error(`Failed to fetch shop info for ${conn.store_url}`);
          results.push({
            id: conn.id,
            store_url: conn.store_url,
            success: false,
            error: 'Failed to fetch shop info'
          });
          continue;
        }

        const shopInfo = await shopInfoResponse.json();
        const publicDomain = shopInfo.shop?.domain || null;

        console.log(`Updating ${conn.store_url} with public_domain: ${publicDomain}`);

        const { error: updateError } = await supabaseClient
          .from('shopify_connections')
          .update({ public_domain: publicDomain })
          .eq('id', conn.id);

        if (updateError) {
          console.error(`Failed to update connection ${conn.id}:`, updateError);
          results.push({
            id: conn.id,
            store_url: conn.store_url,
            success: false,
            error: updateError.message
          });
        } else {
          results.push({
            id: conn.id,
            store_url: conn.store_url,
            public_domain: publicDomain,
            success: true
          });
        }
      } catch (error) {
        console.error(`Error processing connection ${conn.id}:`, error);
        results.push({
          id: conn.id,
          store_url: conn.store_url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        total: connections.length,
        updated: successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
