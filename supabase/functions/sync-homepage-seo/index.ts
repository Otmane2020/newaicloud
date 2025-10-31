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

    // Utiliser GraphQL Admin API pour mettre à jour les metafields du shop
    // C'est la méthode moderne et recommandée par Shopify
    const graphqlUrl = `https://${connection.store_url}/admin/api/2025-01/graphql.json`;
    
    // Récupérer l'ID global du shop
    const shopQuery = `
      query {
        shop {
          id
          name
        }
      }
    `;

    const shopQueryResponse = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: shopQuery }),
    });

    if (!shopQueryResponse.ok) {
      const errorText = await shopQueryResponse.text();
      console.error('[SYNC-HOMEPAGE] Failed to fetch shop ID:', errorText);
      throw new Error(`Failed to fetch shop ID: ${shopQueryResponse.status}`);
    }

    const shopQueryResult = await shopQueryResponse.json();
    const shopId = shopQueryResult.data?.shop?.id;

    if (!shopId) {
      console.error('[SYNC-HOMEPAGE] No shop ID found in response:', shopQueryResult);
      throw new Error('Could not retrieve shop ID');
    }

    console.log('[SYNC-HOMEPAGE] Shop ID retrieved:', shopId);
    
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
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
          ownerId: shopId,
          namespace: "global",
          key: "title_tag",
          value: seoTitle,
          type: "single_line_text_field"
        },
        {
          ownerId: shopId,
          namespace: "global",
          key: "description_tag",
          value: seoDescription,
          type: "single_line_text_field"
        }
      ]
    };

    const graphqlResponse = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables
      }),
    });

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('[SYNC-HOMEPAGE] GraphQL request failed:', errorText);
      throw new Error(`Failed to sync homepage SEO: ${graphqlResponse.status}`);
    }

    const graphqlResult = await graphqlResponse.json();
    
    if (graphqlResult.errors) {
      console.error('[SYNC-HOMEPAGE] GraphQL errors:', graphqlResult.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(graphqlResult.errors)}`);
    }

    if (graphqlResult.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error('[SYNC-HOMEPAGE] User errors:', graphqlResult.data.metafieldsSet.userErrors);
      throw new Error(`Metafield errors: ${JSON.stringify(graphqlResult.data.metafieldsSet.userErrors)}`);
    }

    console.log('[SYNC-HOMEPAGE] Homepage SEO successfully synced to Shopify');
    console.log('[SYNC-HOMEPAGE] Metafields set:', graphqlResult.data?.metafieldsSet?.metafields);

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
