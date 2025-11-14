import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🎯 [SYNC-IMAGE] Function invoked - method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [SYNC-IMAGE] Starting collection image sync...');
    console.log('🔍 [SYNC-IMAGE] Supabase URL:', Deno.env.get('SUPABASE_URL'));
    console.log('🔍 [SYNC-IMAGE] Request headers:', req.headers);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { collection_id } = await req.json();
    console.log(`📦 [SYNC-IMAGE] Collection ID: ${collection_id}`);

    // Get collection data with user info
    const { data: collection, error: collectionError } = await supabase
      .from('shopify_collections')
      .select('shopify_collection_id, image_url, image_alt, store_id, user_id')
      .eq('id', collection_id)
      .single();

    if (collectionError) {
      console.error('❌ [SYNC-IMAGE] Collection fetch error:', collectionError);
      throw collectionError;
    }

    console.log(`🔍 [SYNC-IMAGE] Collection data:`, {
      shopify_id: collection.shopify_collection_id,
      has_image: !!collection.image_url,
      image_url_preview: collection.image_url?.substring(0, 80) + '...'
    });

    // ✅ CRITICAL: Validate image URL format
    if (collection.image_url?.startsWith('data:')) {
      console.error('❌ [SYNC-IMAGE] Base64 image detected - Shopify cannot process base64');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Base64 images not supported',
          message: 'L\'image doit être une URL publique HTTP, pas du base64'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Check if image is already on Shopify CDN
    if (collection.image_url?.includes('cdn.shopify.com')) {
      console.log('✅ [SYNC-IMAGE] Image already on Shopify CDN - no sync needed');
      return new Response(
        JSON.stringify({ 
          success: true,
          skipped: true,
          message: 'Image déjà sur Shopify',
          note: 'L\'image est déjà hébergée sur le CDN Shopify'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!collection.shopify_collection_id) {
      console.log('⚠️ [SYNC-IMAGE] Collection not synced to Shopify yet');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Collection not synced to Shopify' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store credentials - use user_id if store_id is null
    let storeData;
    if (collection.store_id) {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token')
        .eq('id', collection.store_id)
        .single();
      if (error) throw error;
      storeData = data;
    } else {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token')
        .eq('user_id', collection.user_id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      storeData = data;
    }
    
    if (!storeData) {
      console.error('❌ [SYNC-IMAGE] No store connection found');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No store connected' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🏪 [SYNC-IMAGE] Store: ${storeData.store_url}`);

    // Try custom collection first
    console.log(`🔄 [SYNC-IMAGE] Attempting sync as custom_collection...`);
    let shopifyResponse = await fetch(
      `https://${storeData.store_url}/admin/api/2025-01/custom_collections/${collection.shopify_collection_id}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': storeData.access_token,
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

    // If 404, try smart collection
    if (shopifyResponse.status === 404) {
      console.log(`⚠️ [SYNC-IMAGE] Not a custom collection, trying smart_collection...`);
      shopifyResponse = await fetch(
        `https://${storeData.store_url}/admin/api/2025-01/smart_collections/${collection.shopify_collection_id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': storeData.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            smart_collection: {
              id: collection.shopify_collection_id,
              image: {
                src: collection.image_url,
                alt: collection.image_alt || ''
              }
            }
          })
        }
      );
    }

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error(`❌ [SYNC-IMAGE] Shopify API error: ${shopifyResponse.status}`);
      console.error(`Response: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Shopify API error: ${shopifyResponse.status}`,
          details: errorText
        }),
        { status: shopifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await shopifyResponse.json();
    console.log('✅ [SYNC-IMAGE] Collection image synced to Shopify successfully');
    console.log(`📸 [SYNC-IMAGE] Shopify response:`, JSON.stringify(responseData).substring(0, 200));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Image synchronisée avec Shopify',
        shopify_response: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [SYNC-IMAGE] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Erreur lors de la synchronisation avec Shopify'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
