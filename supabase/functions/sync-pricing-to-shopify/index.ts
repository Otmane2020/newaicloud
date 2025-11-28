import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  shopifyGraphQL, 
  restIdToGid, 
  handleUserErrors,
  PRODUCT_VARIANTS_QUERY,
  VARIANT_UPDATE_MUTATION,
  INVENTORY_ITEM_UPDATE_MUTATION
} from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('💰 [SYNC-PRICING] Starting pricing sync to Shopify via GraphQL...');
    
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

    const storeUrl = (connection.store_url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log(`🏪 [SYNC-PRICING] Store: ${storeUrl}`);

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

    let successCount = 0;
    let errorCount = 0;
    const failedProducts: Array<{ title: string; error: string }> = [];

    for (const product of products || []) {
      if (!product.shopify_id) {
        console.warn(`⚠️ [SYNC-PRICING] Product ${product.title} has no Shopify ID`);
        errorCount++;
        failedProducts.push({ title: product.title, error: 'No Shopify ID' });
        continue;
      }

      try {
        console.log(`🔄 [SYNC-PRICING] Syncing "${product.title}"...`);

        const dbVariants = (product as any).product_variants || [];
        if (dbVariants.length === 0) {
          console.warn(`⚠️ [SYNC-PRICING] No variants found for ${product.title}`);
          errorCount++;
          failedProducts.push({ title: product.title, error: 'No variants in DB' });
          continue;
        }

        // Fetch product variants from Shopify via GraphQL
        const productGid = restIdToGid(product.shopify_id, 'Product');
        const shopifyProduct = await shopifyGraphQL<{
          product: {
            id: string;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  title: string;
                  price: string;
                  compareAtPrice: string | null;
                  inventoryItem: { id: string };
                };
              }>;
            };
          };
        }>(storeUrl, connection.access_token, PRODUCT_VARIANTS_QUERY, { id: productGid });

        if (!shopifyProduct.product) {
          throw new Error('Product not found in Shopify');
        }

        const shopifyVariants = shopifyProduct.product.variants.edges.map(e => e.node);
        console.log(`   Found ${shopifyVariants.length} variant(s) in Shopify`);

        let variantsSynced = 0;
        let variantsErrored = 0;

        for (const dbVariant of dbVariants) {
          // Find matching Shopify variant by ID
          const variantGid = restIdToGid(dbVariant.shopify_variant_id, 'ProductVariant');
          const shopifyVariant = shopifyVariants.find(sv => sv.id === variantGid);

          if (!shopifyVariant) {
            console.warn(`⚠️ [SYNC-PRICING] Variant ${dbVariant.title} not found in Shopify`);
            variantsErrored++;
            continue;
          }

          try {
            // Update variant price via GraphQL
            const variantUpdateResult = await shopifyGraphQL<{
              productVariantUpdate: {
                productVariant: { id: string; price: string };
                userErrors: Array<{ field: string[]; message: string }>;
              };
            }>(storeUrl, connection.access_token, VARIANT_UPDATE_MUTATION, {
              input: {
                id: variantGid,
                price: dbVariant.price?.toString() || '0',
                compareAtPrice: dbVariant.compare_at_price?.toString() || null,
              }
            });

            handleUserErrors(variantUpdateResult.productVariantUpdate?.userErrors, 'productVariantUpdate');
            console.log(`   ✅ Variant "${dbVariant.title}" price synced`);
            variantsSynced++;

            // Sync cost price if available
            if (dbVariant.cost_price !== null && shopifyVariant.inventoryItem?.id) {
              try {
                await shopifyGraphQL(storeUrl, connection.access_token, INVENTORY_ITEM_UPDATE_MUTATION, {
                  id: shopifyVariant.inventoryItem.id,
                  input: {
                    cost: dbVariant.cost_price
                  }
                });
                console.log(`   💰 Cost synced for "${dbVariant.title}"`);
              } catch (costError) {
                console.error(`❌ [SYNC-PRICING] Error syncing cost:`, costError);
              }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));

          } catch (variantError) {
            console.error(`❌ [SYNC-PRICING] Error syncing variant ${dbVariant.title}:`, variantError);
            variantsErrored++;
          }
        }

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

      // Rate limiting between products
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`📊 [SYNC-PRICING] Sync complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        errors: errorCount,
        total: products?.length || 0,
        failedProducts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [SYNC-PRICING] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
