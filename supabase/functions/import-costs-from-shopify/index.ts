import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { shopifyGraphQL, restIdToGid, gidToRestId } from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GraphQL query to fetch product with variants and inventory items
const PRODUCT_WITH_INVENTORY_QUERY = `
  query getProductWithInventory($id: ID!) {
    product(id: $id) {
      id
      title
      variants(first: 100) {
        edges {
          node {
            id
            sku
            inventoryItem {
              id
              unitCost {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('💰 [IMPORT-COSTS] Starting cost import from Shopify via GraphQL...');
    
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

    const storeUrl = (connection.store_url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log(`🏪 [IMPORT-COSTS] Store: ${storeUrl}`);

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

    let successCount = 0;
    let errorCount = 0;
    let totalVariants = 0;

    // Process each product using GraphQL
    for (const product of products || []) {
      const variants = (product as any).product_variants || [];
      
      if (!product.shopify_id || variants.length === 0) {
        continue;
      }

      try {
        // Fetch product with inventory data from Shopify via GraphQL
        const productGid = restIdToGid(product.shopify_id, 'Product');
        
        const result = await shopifyGraphQL<{
          product: {
            id: string;
            title: string;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  sku: string;
                  inventoryItem: {
                    id: string;
                    unitCost: {
                      amount: string;
                      currencyCode: string;
                    } | null;
                  };
                };
              }>;
            };
          };
        }>(storeUrl, connection.access_token, PRODUCT_WITH_INVENTORY_QUERY, { id: productGid });

        if (!result.product) {
          console.warn(`⚠️ [IMPORT-COSTS] Product ${product.shopify_id} not found in Shopify`);
          continue;
        }

        const shopifyVariants = result.product.variants.edges.map(e => e.node);

        for (const dbVariant of variants) {
          if (!dbVariant.shopify_variant_id) {
            console.warn(`⚠️ [IMPORT-COSTS] Variant has no Shopify ID: ${dbVariant.sku}`);
            continue;
          }

          totalVariants++;

          // Find matching Shopify variant
          const variantGid = restIdToGid(dbVariant.shopify_variant_id, 'ProductVariant');
          const shopifyVariant = shopifyVariants.find(sv => sv.id === variantGid);

          if (!shopifyVariant) {
            console.warn(`⚠️ [IMPORT-COSTS] Variant ${dbVariant.sku} not found in Shopify`);
            errorCount++;
            continue;
          }

          const cost = shopifyVariant.inventoryItem?.unitCost?.amount;

          if (cost !== null && cost !== undefined) {
            // Update variant cost in database
            const { error: updateError } = await supabase
              .from('product_variants')
              .update({ cost_price: parseFloat(cost) })
              .eq('id', dbVariant.id);

            if (updateError) {
              console.error(`❌ [IMPORT-COSTS] Failed to update variant ${dbVariant.sku}:`, updateError);
              errorCount++;
            } else {
              console.log(`✅ [IMPORT-COSTS] Updated cost for ${dbVariant.sku}: ${cost}`);
              successCount++;
            }
          } else {
            console.log(`ℹ️ [IMPORT-COSTS] No cost found for variant: ${dbVariant.sku}`);
          }
        }

        // After processing all variants of a product, calculate average cost
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

        // Rate limiting between products
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ [IMPORT-COSTS] Error processing product ${product.title}:`, error);
        errorCount += variants.length;
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
