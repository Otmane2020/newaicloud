import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seoTitle, seoDescription } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log(`[SYNC-HOMEPAGE] Syncing homepage SEO for user ${user.id}`);

    // Récupérer la connexion Shopify active
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      console.error('[SYNC-HOMEPAGE] No active Shopify connection found');
      throw new Error('No active Shopify connection. Please connect your store first.');
    }

    console.log(`[SYNC-HOMEPAGE] Using store: ${connection.store_url}`);

    // Get shop ID first
    const shopUrl = `https://${connection.store_url}/admin/api/2025-01/shop.json`;
    const shopResponse = await fetch(shopUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!shopResponse.ok) {
      const errorText = await shopResponse.text();
      console.error(`[SYNC-HOMEPAGE] Failed to get shop:`, errorText);
      throw new Error(`Failed to get shop: ${shopResponse.status} - ${errorText}`);
    }

    const shopData = await shopResponse.json();
    const shopId = shopData.shop.id;
    console.log(`[SYNC-HOMEPAGE] Got shop ID: ${shopId}`);

    // Update metafields using GraphQL Admin API (more reliable for metafields)
    const graphqlUrl = `https://${connection.store_url}/admin/api/2025-01/graphql.json`;
    
    const mutation = `
      mutation UpdateShopMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          ownerId: `gid://shopify/Shop/${shopId}`,
          namespace: 'global',
          key: 'title_tag',
          value: seoTitle,
          type: 'single_line_text_field'
        },
        {
          ownerId: `gid://shopify/Shop/${shopId}`,
          namespace: 'global',
          key: 'description_tag',
          value: seoDescription,
          type: 'multi_line_text_field'
        }
      ]
    };

    console.log(`[SYNC-HOMEPAGE] Updating shop metafields via GraphQL`);
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYNC-HOMEPAGE] GraphQL request failed:`, errorText);
      throw new Error(`Failed to update shop SEO: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      const errors = result.data.metafieldsSet.userErrors;
      console.error(`[SYNC-HOMEPAGE] Metafield errors:`, errors);
      throw new Error(`Metafield update failed: ${errors.map((e: any) => e.message).join(', ')}`);
    }

    console.log('[SYNC-HOMEPAGE] Shop SEO metafields successfully updated');
    
    // Sauvegarder dans la table homepage_seo
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    await supabaseAdmin
      .from('homepage_seo')
      .upsert({
        user_id: user.id,
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    console.log('[SYNC-HOMEPAGE] Homepage SEO successfully synced to Shopify');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Homepage SEO synced to Shopify successfully',
        seo: {
          title: seoTitle,
          description: seoDescription
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SYNC-HOMEPAGE] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to sync homepage SEO to Shopify'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
