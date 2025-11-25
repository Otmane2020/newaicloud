import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkTrialLimits } from '../_shared/trial-limits.ts';
import { shopifyGraphQL, restIdToGid, handleUserErrors, PRODUCT_UPDATE_MUTATION } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[UPDATE-STATUS] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[UPDATE-STATUS] No authorization header found');
      throw new Error('No authorization header');
    }

    // Create admin client to verify JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('[UPDATE-STATUS] Auth error:', authError);
      throw new Error('Unauthorized');
    }
    
    console.log('[UPDATE-STATUS] User authenticated:', user.id);

    // 🆕 Vérifier les limites trial
    const trialCheck = await checkTrialLimits(supabaseAdmin, user.id);
    const isTrialUser = !trialCheck.canUpdateShopify;

    if (isTrialUser) {
      console.log('[UPDATE-STATUS] ⚠️ Trial user - local update only, no Shopify sync');
    } else {
      console.log('[UPDATE-STATUS] ✅ User authorized for Shopify updates');
    }

    const { productId, shopifyId, storeId, newStatus } = await req.json();

    if (!productId || !shopifyId || !storeId || !newStatus) {
      throw new Error('Missing required parameters');
    }

    console.log('Updating product status:', { productId, shopifyId, storeId, newStatus });

    // Get store connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (connError) {
      console.error('Store connection error:', connError);
      throw new Error(`Failed to fetch store connection: ${connError.message}`);
    }

    if (!connection) {
      console.error('Store connection not found for storeId:', storeId, 'userId:', user.id);
      throw new Error('Store connection not found. Please verify your Shopify connection.');
    }

    console.log('[UPDATE-STATUS] Store connection found:', connection.store_url);
    console.log('[UPDATE-STATUS] Using direct access token, length:', connection.access_token?.length);

    // Update product status in Shopify using GraphQL (only for paid users)
    if (!isTrialUser) {
      console.log(`🔄 Updating product ${shopifyId} status to "${newStatus}" using GraphQL`);
      
      const productGid = restIdToGid(shopifyId, 'Product');
      
      try {
        const result = await shopifyGraphQL(
          connection.store_url,
          connection.access_token,
          PRODUCT_UPDATE_MUTATION,
          {
            input: {
              id: productGid,
              status: newStatus.toUpperCase(), // GraphQL expects ACTIVE, DRAFT, ARCHIVED
            },
          }
        );

        handleUserErrors(result.productUpdate?.userErrors, 'productUpdate');
        console.log(`✅ Product status updated via GraphQL: ${result.productUpdate?.product?.status}`);
      } catch (error: any) {
        console.error('❌ Shopify GraphQL error:', error);
        throw new Error(`Failed to update Shopify product: ${error?.message || String(error)}`);
      }
    } else {
      console.log('⚠️ Skipping Shopify sync for trial user - local update only');
    }

    // Update local database
    const { error: updateError } = await supabaseAdmin
      .from('shopify_products')
      .update({ status: newStatus })
      .eq('id', productId)
      .eq('seller_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update local database');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        localOnly: isTrialUser,
        message: isTrialUser 
          ? 'Statut mis à jour localement. Passez à un plan payant pour synchroniser avec Shopify.' 
          : 'Statut mis à jour sur Shopify.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
