import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    console.log(`📊 [SYNC-PRICING] Product IDs:`, product_ids);
    console.log(`⏱️ [SYNC-PRICING] Estimated time: ${product_ids.length * 0.5}s`);

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

    // Fetch products to sync with ALL their variants
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select(`
        id, 
        shopify_id, 
        title, 
        price, 
        compare_at_price,
        cost_price,
        product_variants(id, shopify_variant_id, title, sku, price, compare_at_price, cost_price, option1, option2, option3)
      `)
      .in('id', product_ids);

    if (productsError) throw productsError;

    const storeUrl = connection.store_url.startsWith('http')
      ? connection.store_url
      : `https://${connection.store_url}`;

    let successCount = 0;
    let errorCount = 0;
    const failedProducts: Array<{ title: string; error: string }> = [];

    // Sync each product with ALL its variants
    for (const product of products || []) {
      if (!product.shopify_id) {
        console.warn(`⚠️ [SYNC-PRICING] Product ${product.title} has no Shopify ID`);
        errorCount++;
        failedProducts.push({ title: product.title, error: 'No Shopify ID' });
        continue;
      }

      try {
        console.log(`🔄 [SYNC-PRICING] Syncing "${product.title}"...`);

        // Récupérer TOUS les variants du produit depuis notre DB
        const dbVariants = (product as any).product_variants || [];

        if (dbVariants.length === 0) {
          console.warn(`⚠️ [SYNC-PRICING] No variants found for ${product.title}`);
          errorCount++;
          failedProducts.push({ title: product.title, error: 'No variants in DB' });
          continue;
        }

        console.log(`   Found ${dbVariants.length} variant(s) to sync`);

        // Récupérer le produit Shopify pour mapper les variants
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
        const shopifyVariants = productData.product?.variants || [];

        if (shopifyVariants.length === 0) {
          throw new Error('No variants found in Shopify');
        }

        console.log(`   Found ${shopifyVariants.length} variant(s) in Shopify`);

        // Synchroniser chaque variant individuellement
        let variantsSynced = 0;
        let variantsErrored = 0;

        for (const dbVariant of dbVariants) {
          // Trouver le variant Shopify correspondant par shopify_variant_id
          const shopifyVariant = shopifyVariants.find((sv: any) => 
            String(sv.id) === String(dbVariant.shopify_variant_id)
          );

          if (!shopifyVariant) {
            console.warn(`⚠️ [SYNC-PRICING] Variant ${dbVariant.title} not found in Shopify`);
            variantsErrored++;
            continue;
          }

          // Mettre à jour le variant
          try {
            const updateResponse = await fetch(
              `${storeUrl}/admin/api/2025-01/variants/${shopifyVariant.id}.json`,
              {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': connection.access_token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  variant: {
                    id: shopifyVariant.id,
                    price: dbVariant.price?.toString() || '0',
                    compare_at_price: dbVariant.compare_at_price?.toString() || null,
                  }
                })
              }
            );

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`❌ [SYNC-PRICING] Failed to sync variant ${dbVariant.title}: ${errorText}`);
              variantsErrored++;
              continue;
            }

            console.log(`   ✅ Variant "${dbVariant.title}" synced`);
            variantsSynced++;

            // Synchroniser le cost_price si disponible
            if (dbVariant.cost_price !== null && shopifyVariant.inventory_item_id) {
              try {
                const inventoryUpdateResponse = await fetch(
                  `${storeUrl}/admin/api/2025-01/inventory_items/${shopifyVariant.inventory_item_id}.json`,
                  {
                    method: 'PUT',
                    headers: {
                      'X-Shopify-Access-Token': connection.access_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      inventory_item: {
                        id: shopifyVariant.inventory_item_id,
                        cost: dbVariant.cost_price.toString()
                      }
                    })
                  }
                );

                if (inventoryUpdateResponse.ok) {
                  console.log(`   💰 Cost synced for "${dbVariant.title}"`);
                }
              } catch (costError) {
                console.error(`❌ [SYNC-PRICING] Error syncing cost:`, costError);
              }
            }

            // Rate limiting entre variants
            await new Promise(resolve => setTimeout(resolve, 250));

          } catch (variantError) {
            console.error(`❌ [SYNC-PRICING] Error syncing variant ${dbVariant.title}:`, variantError);
            variantsErrored++;
          }
        }

        // Résultat pour ce produit
        if (variantsSynced > 0) {
          console.log(`✅ [SYNC-PRICING] Product "${product.title}": ${variantsSynced}/${dbVariants.length} variants synced`);
          successCount++;
        } else {
          console.error(`❌ [SYNC-PRICING] Product "${product.title}": All variants failed`);
          errorCount++;
          failedProducts.push({ title: product.title, error: `${variantsErrored} variants failed` });
        }

      } catch (error) {
        console.error(`❌ [SYNC-PRICING] Error syncing product ${product.title}:`, error);
        errorCount++;
        failedProducts.push({ 
          title: product.title, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Rate limiting entre produits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`📊 [SYNC-PRICING] Sync complete: ${successCount} success, ${errorCount} errors`);
    
    if (failedProducts.length > 0) {
      console.warn(`⚠️ [SYNC-PRICING] Failed products:`, failedProducts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        errors: errorCount,
        total: products?.length || 0,
        failedProducts: failedProducts
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
