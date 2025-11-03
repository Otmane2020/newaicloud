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
    console.log('💰 [IMPORT-COSTS] Starting cost import from Shopify...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    // Get user's active Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      throw new Error('No active Shopify connection found');
    }

    console.log(`🏪 [IMPORT-COSTS] Store: ${connection.store_url}`);

    // Get all products with their variants
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select(`
        id,
        shopify_id,
        title,
        product_variants(id, shopify_variant_id, sku)
      `)
      .eq('seller_id', user.id)
      .not('shopify_id', 'is', null);

    if (productsError) throw productsError;

    const storeUrl = connection.store_url.startsWith('http')
      ? connection.store_url
      : `https://${connection.store_url}`;

    let successCount = 0;
    let errorCount = 0;
    let totalVariants = 0;

    // Process each product
    for (const product of products || []) {
      const variants = (product as any).product_variants || [];
      
      for (const variant of variants) {
        if (!variant.shopify_variant_id) {
          console.warn(`⚠️ [IMPORT-COSTS] Variant has no Shopify ID: ${variant.sku}`);
          continue;
        }

        totalVariants++;

        try {
          // Get variant details to find inventory_item_id
          const variantResponse = await fetch(
            `${storeUrl}/admin/api/2025-01/variants/${variant.shopify_variant_id}.json`,
            {
              headers: {
                'X-Shopify-Access-Token': connection.access_token,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!variantResponse.ok) {
            throw new Error(`Failed to fetch variant: ${variantResponse.status}`);
          }

          const variantData = await variantResponse.json();
          const inventoryItemId = variantData.variant?.inventory_item_id;

          if (!inventoryItemId) {
            console.warn(`⚠️ [IMPORT-COSTS] No inventory_item_id for variant: ${variant.sku}`);
            errorCount++;
            continue;
          }

          // Get inventory item with cost
          const inventoryResponse = await fetch(
            `${storeUrl}/admin/api/2025-01/inventory_items/${inventoryItemId}.json`,
            {
              headers: {
                'X-Shopify-Access-Token': connection.access_token,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!inventoryResponse.ok) {
            throw new Error(`Failed to fetch inventory item: ${inventoryResponse.status}`);
          }

          const inventoryData = await inventoryResponse.json();
          const cost = inventoryData.inventory_item?.cost;

          if (cost !== null && cost !== undefined) {
            // Update variant cost in database
            const { error: updateError } = await supabase
              .from('product_variants')
              .update({ cost_price: parseFloat(cost) })
              .eq('id', variant.id);

            if (updateError) {
              console.error(`❌ [IMPORT-COSTS] Failed to update variant ${variant.sku}:`, updateError);
              errorCount++;
            } else {
              console.log(`✅ [IMPORT-COSTS] Updated cost for ${variant.sku}: ${cost}`);
              successCount++;
            }
          } else {
            console.log(`ℹ️ [IMPORT-COSTS] No cost found for variant: ${variant.sku}`);
          }

          // Rate limiting: 2 requests per second
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ [IMPORT-COSTS] Error processing variant ${variant.sku}:`, error);
          errorCount++;
        }
      }

      // After processing all variants of a product, calculate average cost
      if (variants.length > 0) {
        const { data: variantsWithCost } = await supabase
          .from('product_variants')
          .select('cost_price')
          .eq('product_id', product.id)
          .not('cost_price', 'is', null);

        if (variantsWithCost && variantsWithCost.length > 0) {
          const avgCost = variantsWithCost.reduce((sum, v) => sum + (v.cost_price || 0), 0) / variantsWithCost.length;
          
          await supabase
            .from('shopify_products')
            .update({ cost_price: avgCost })
            .eq('id', product.id);
        }
      }
    }

    console.log(`📊 [IMPORT-COSTS] Import complete: ${successCount}/${totalVariants} costs imported, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: successCount,
        errors: errorCount,
        total: totalVariants
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [IMPORT-COSTS] Fatal error:', error);
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
