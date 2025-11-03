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

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    // Get Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('shop_domain, encrypted_access_token')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Shopify connection not found');
    }

    // Decrypt token
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke(
      'encrypt-shopify-token',
      {
        body: {
          action: 'decrypt',
          encryptedToken: connection.encrypted_access_token
        }
      }
    );

    if (decryptError || !decryptData?.token) {
      throw new Error('Failed to decrypt access token');
    }

    const accessToken = decryptData.token;

    // Get products with variants
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select(`
        id,
        shopify_product_id,
        title,
        product_variants(shopify_variant_id, weight)
      `)
      .eq('store_id', storeId);

    if (productsError) throw productsError;

    console.log(`📦 Found ${products?.length || 0} products to update`);

    let updatedCount = 0;

    for (const product of products || []) {
      try {
        const variants = (product as any).product_variants || [];
        
        if (variants.length === 0) continue;

        // Calculate average weight
        const avgWeight = variants.reduce((sum: number, v: any) => sum + (v.weight || 0), 0) / variants.length;

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
