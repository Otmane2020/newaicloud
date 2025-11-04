import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GraphQL queries for Shopify Storefront API
const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
      }
      userErrors { field message }
    }
  }
`;

const CART_BUYER_IDENTITY_UPDATE = `
  mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
        deliveryGroups {
          deliveryOptions {
            title
            handle
            cost {
              amount
              currencyCode
            }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

// Default shipping address (France, Paris)
const DEFAULT_SHIPPING_ADDRESS = {
  address1: "1 Rue de Rivoli",
  city: "Paris",
  province: "Île-de-France",
  country: "FR",
  zip: "75001"
};

async function storefrontApiRequest(storeUrl: string, storefrontToken: string, query: string, variables: any = {}) {
  const response = await fetch(`https://${storeUrl}/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

async function getShippingRateForVariant(
  storeUrl: string,
  storefrontToken: string,
  variantId: string,
  quantity: number
): Promise<number | null> {
  try {
    // Step 1: Create cart with variant
    const cartData = await storefrontApiRequest(storeUrl, storefrontToken, CART_CREATE_MUTATION, {
      input: {
        lines: [{
          quantity,
          merchandiseId: variantId, // Must be in format: gid://shopify/ProductVariant/123
        }],
      },
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      console.error('Cart creation error:', cartData.data.cartCreate.userErrors);
      return null;
    }

    const cartId = cartData.data.cartCreate.cart.id;

    // Step 2: Update shipping address
    const shippingData = await storefrontApiRequest(storeUrl, storefrontToken, CART_BUYER_IDENTITY_UPDATE, {
      cartId,
      buyerIdentity: {
        deliveryAddressPreferences: [{
          deliveryAddress: DEFAULT_SHIPPING_ADDRESS
        }]
      },
    });

    if (shippingData.data.cartBuyerIdentityUpdate.userErrors.length > 0) {
      console.error('Shipping update error:', shippingData.data.cartBuyerIdentityUpdate.userErrors);
      return null;
    }

    // Step 3: Extract shipping rate
    const deliveryGroups = shippingData.data.cartBuyerIdentityUpdate.cart.deliveryGroups;
    
    if (!deliveryGroups || deliveryGroups.length === 0) {
      console.warn('⚠️ No delivery groups found');
      return null;
    }

    const deliveryOptions = deliveryGroups[0].deliveryOptions;
    
    if (!deliveryOptions || deliveryOptions.length === 0) {
      console.warn('⚠️ No delivery options found');
      return null;
    }

    // Get cheapest shipping rate
    const shippingCosts = deliveryOptions
      .map((option: any) => parseFloat(option.cost.amount))
      .filter((cost: number) => !isNaN(cost) && cost > 0);

    if (shippingCosts.length === 0) return null;

    return Math.min(...shippingCosts);

  } catch (error) {
    console.error('Error getting shipping rate:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚚 [IMPORT-SHIPPING] Starting real Shopify shipping costs import...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    const { storeId } = await req.json();
    console.log('📋 Received storeId:', storeId);
    console.log('👤 User ID:', user.id);

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    // Get Shopify connection - check what stores exist for this user
    const { data: allStores, error: allStoresError } = await supabase
      .from('shopify_connections')
      .select('id, store_url, store_name')
      .eq('user_id', user.id);

    console.log('🏪 All stores for user:', allStores);

    if (allStoresError) {
      console.error('❌ Error fetching stores:', allStoresError);
      throw new Error(`Database error: ${allStoresError.message}`);
    }

    if (!allStores || allStores.length === 0) {
      throw new Error('No Shopify stores connected. Please connect a store first.');
    }

    // Get the specific connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('store_url, access_token, encrypted_token, token_iv')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Connection found:', connection ? 'Yes' : 'No');

    if (connectionError) {
      console.error('❌ Connection error:', connectionError);
      throw new Error(`Connection error: ${connectionError.message}`);
    }

    if (!connection) {
      throw new Error(`Store with ID ${storeId} not found. Available stores: ${allStores.map(s => s.id).join(', ')}`);
    }

    // Get Shopify Storefront Access Token
    const SHOPIFY_STOREFRONT_ACCESS_TOKEN = Deno.env.get('SHOPIFY_STOREFRONT_ACCESS_TOKEN');
    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured');
    }

    console.log('✅ Using Storefront API token');

    // Get products with variants
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select(`
        id, 
        shopify_id, 
        title, 
        store_id,
        product_variants!inner(
          id,
          shopify_variant_id
        )
      `)
      .eq('store_id', storeId);

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ No products found for store');
      return new Response(
        JSON.stringify({
          success: true,
          updated: 0,
          total: 0,
          message: 'No products found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📦 Found ${products.length} products to analyze`);
    console.log(`⏱️ Estimated time: ${Math.ceil(products.length * 2)} seconds (2s per product)`);

    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const variants = (product as any).product_variants || [];
        
        if (variants.length === 0) {
          console.log(`⚠️ No variants found for product ${product.title}`);
          failedCount++;
          errors.push(`${product.title}: Aucun variant`);
          continue;
        }

        console.log(`🔍 Processing: ${product.title} (${variants.length} variants)`);

        // Calculate shipping for each variant
        const shippingCosts: number[] = [];

        for (const variant of variants) {
          if (!variant.shopify_variant_id) {
            console.warn(`⚠️ No shopify_variant_id for variant ${variant.id}`);
            continue;
          }

          // Convert to GraphQL ID format
          const graphqlVariantId = `gid://shopify/ProductVariant/${variant.shopify_variant_id}`;

          const shippingRate = await getShippingRateForVariant(
            connection.store_url,
            SHOPIFY_STOREFRONT_ACCESS_TOKEN,
            graphqlVariantId,
            1
          );

          if (shippingRate !== null) {
            shippingCosts.push(shippingRate);
            console.log(`  ✓ Variant ${variant.shopify_variant_id}: ${shippingRate.toFixed(2)}€`);
          }

          // Rate limiting: 500ms between calls
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (shippingCosts.length === 0) {
          console.warn(`⚠️ No shipping rates found for ${product.title}`);
          failedCount++;
          errors.push(`${product.title}: Aucun tarif de livraison disponible`);
          continue;
        }

        // Calculate average shipping cost
        const avgShippingCost = shippingCosts.reduce((sum, cost) => sum + cost, 0) / shippingCosts.length;

        // Update shipping cost in database
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ 
            shipping_cost: Math.round(avgShippingCost * 100) / 100 
          })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Error updating product ${product.id}:`, updateError);
          failedCount++;
          errors.push(`${product.title}: Erreur DB`);
        } else {
          updatedCount++;
          console.log(`✅ ${product.title}: ${avgShippingCost.toFixed(2)}€`);
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error);
        failedCount++;
        errors.push(`${product.title}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    console.log(`✅ Import complete: ${updatedCount} updated, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        failed: failedCount,
        total: products?.length || 0,
        errors: errors.slice(0, 5), // Return first 5 errors
        message: `Frais de livraison Shopify récupérés pour ${updatedCount} produits (adresse: Paris, France)`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [IMPORT-SHIPPING] Fatal error:', error);
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
