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
    console.log('💰 [SYNC-PRICING] Starting pricing sync to Shopify...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    const { product_ids } = await req.json();
    console.log(`📦 [SYNC-PRICING] Syncing ${product_ids.length} product(s)`);

    // Get user's Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      throw new Error('No active Shopify connection found');
    }

    console.log(`🏪 [SYNC-PRICING] Store: ${connection.store_url}`);

    // Fetch products to sync
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, shopify_id, title, price, compare_at_price')
      .in('id', product_ids);

    if (productsError) throw productsError;

    const storeUrl = connection.store_url.startsWith('http')
      ? connection.store_url
      : `https://${connection.store_url}`;

    let successCount = 0;
    let errorCount = 0;

    // Sync each product
    for (const product of products || []) {
      if (!product.shopify_id) {
        console.warn(`⚠️ [SYNC-PRICING] Product ${product.title} has no Shopify ID`);
        errorCount++;
        continue;
      }

      try {
        console.log(`🔄 [SYNC-PRICING] Syncing "${product.title}"...`);
        console.log(`   Price: ${product.price}, Compare: ${product.compare_at_price}`);

        // First, get the product to find its variant
        const getResponse = await fetch(
          `${storeUrl}/admin/api/2025-01/products/${product.shopify_id}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': connection.access_token,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!getResponse.ok) {
          throw new Error(`Failed to fetch product: ${getResponse.status}`);
        }

        const productData = await getResponse.json();
        const variantId = productData.product?.variants?.[0]?.id;

        if (!variantId) {
          throw new Error('No variant found for product');
        }

        // Update the variant with new pricing
        const updateResponse = await fetch(
          `${storeUrl}/admin/api/2025-01/variants/${variantId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': connection.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              variant: {
                id: variantId,
                price: product.price?.toString() || '0',
                compare_at_price: product.compare_at_price?.toString() || null,
              }
            })
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`❌ [SYNC-PRICING] Shopify API error: ${updateResponse.status}`, errorText);
          throw new Error(`Shopify API error: ${updateResponse.status}`);
        }

        console.log(`✅ [SYNC-PRICING] Successfully synced "${product.title}"`);
        successCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ [SYNC-PRICING] Error syncing product ${product.title}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 [SYNC-PRICING] Sync complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        errors: errorCount,
        total: products?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [SYNC-PRICING] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
