import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { collection_id } = await req.json();

    // Get collection data with user info
    const { data: collection, error: collectionError } = await supabase
      .from('shopify_collections')
      .select('shopify_collection_id, image_url, image_alt, store_id, user_id')
      .eq('id', collection_id)
      .single();

    if (collectionError) throw collectionError;

    if (!collection.shopify_collection_id) {
      console.log('Collection not synced to Shopify yet');
      return new Response(
        JSON.stringify({ message: 'Collection not synced to Shopify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store credentials - use user_id if store_id is null
    const storeQuery = collection.store_id 
      ? supabase.from('shopify_connections').select('store_url, access_token').eq('id', collection.store_id).single()
      : supabase.from('shopify_connections').select('store_url, access_token').eq('user_id', collection.user_id).eq('is_active', true).single();
    
    const { data: store } = await storeQuery;

    if (!store) {
      console.log('No store found for this collection');
      return new Response(
        JSON.stringify({ message: 'No store connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync image to Shopify using Admin API
    const shopifyResponse = await fetch(
      `https://${store.store_url}/admin/api/2025-01/custom_collections/${collection.shopify_collection_id}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_collection: {
            id: collection.shopify_collection_id,
            image: {
              src: collection.image_url,
              alt: collection.image_alt || ''
            }
          }
        })
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status}`);
    }

    console.log('Collection image synced to Shopify successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing collection image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
