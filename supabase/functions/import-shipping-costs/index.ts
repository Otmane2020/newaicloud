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
    console.log('🚚 [IMPORT-SHIPPING] Starting shipping costs import...');
    
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

    // Get access token (support both encrypted and plain text for backward compatibility)
    let accessToken: string;
    
    if (connection.encrypted_token && connection.token_iv) {
      // Token is encrypted, decrypt it
      console.log('🔐 Decrypting token...');
      const { data: decryptData, error: decryptError } = await supabase.functions.invoke(
        'encrypt-shopify-token',
        {
          body: {
            action: 'decrypt',
            encrypted: connection.encrypted_token,
            iv: connection.token_iv
          }
        }
      );

      if (decryptError || !decryptData?.token) {
        console.error('❌ Decryption error:', decryptError);
        throw new Error('Failed to decrypt access token');
      }

      accessToken = decryptData.token;
      console.log('✅ Token decrypted successfully');
    } else if (connection.access_token) {
      // Token is stored in plain text (legacy)
      console.log('📝 Using plain text token');
      accessToken = connection.access_token;
    } else {
      throw new Error('No access token found for this store (neither encrypted nor plain text)');
    }

    // Get products with variants
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, shopify_product_id, title, store_id')
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

    console.log(`📦 Found ${products.length} products to update`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // Get variants for this product
        const { data: variants, error: variantsError } = await supabase
          .from('product_variants')
          .select('weight')
          .eq('product_id', product.id);

        if (variantsError) {
          console.error(`❌ Error fetching variants for ${product.id}:`, variantsError);
          continue;
        }

        if (!variants || variants.length === 0) {
          console.log(`⚠️ No variants found for product ${product.title}`);
          continue;
        }

        // Calculate average weight
        const avgWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0) / variants.length;

        // Estimate shipping cost based on weight (simple estimation)
        // TODO: Replace with actual Shopify shipping rates API
        let shippingCost = 0;
        if (avgWeight > 0) {
          if (avgWeight < 0.5) shippingCost = 3.99;
          else if (avgWeight < 1) shippingCost = 5.99;
          else if (avgWeight < 2) shippingCost = 7.99;
          else if (avgWeight < 5) shippingCost = 12.99;
          else shippingCost = 19.99;
        }

        // Update shipping cost in database
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ shipping_cost: shippingCost })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Error updating product ${product.id}:`, updateError);
        } else {
          updatedCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error);
      }
    }

    console.log(`✅ Updated ${updatedCount} products with shipping costs`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total: products?.length || 0
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
