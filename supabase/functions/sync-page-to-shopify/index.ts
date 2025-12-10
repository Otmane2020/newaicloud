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
    const { pageId } = await req.json();
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

    console.log(`[SYNC-PAGE] Syncing page ${pageId} for user ${user.id}`);

    // Récupérer la page depuis la base de données
    const { data: page, error: pageError } = await supabaseClient
      .from('shopify_pages')
      .select('*, store_id')
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError) {
      console.error('[SYNC-PAGE] Error fetching page:', pageError);
      throw new Error(`Page not found: ${pageError.message}`);
    }

    if (!page.shopify_page_id) {
      throw new Error('Page does not have a Shopify ID');
    }

    // Récupérer la connexion Shopify - gérer le cas où store_id est NULL
    let connection = null;
    let connError = null;

    if (page.store_id) {
      // Si le store_id existe, on l'utilise
      const result = await supabaseClient
        .from('shopify_connections')
        .select('*')
        .eq('id', page.store_id)
        .eq('is_active', true)
        .maybeSingle();
      
      connection = result.data;
      connError = result.error;
    }

    // Fallback: si pas de store_id ou connexion non trouvée, prendre la connexion active de l'utilisateur
    if (!connection) {
      console.log('[SYNC-PAGE] No store_id or connection not found, using user\'s active connection');
      const result = await supabaseClient
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      connection = result.data;
      connError = result.error;
    }

    if (connError || !connection) {
      console.error('[SYNC-PAGE] No active Shopify connection found');
      throw new Error('No active Shopify connection. Please connect your store first.');
    }

    console.log(`[SYNC-PAGE] Using store: ${connection.store_url}`);

    // Utiliser GraphQL API pour la mise à jour des pages (plus fiable pour SEO)
    const shopifyGraphqlUrl = `https://${connection.store_url}/admin/api/2025-01/graphql.json`;
    
    // Construire la mutation GraphQL pour mettre à jour la page
    const pageGid = `gid://shopify/Page/${page.shopify_page_id}`;
    
    const graphqlMutation = `
      mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page {
            id
            title
            body
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const pageInput: any = {
      title: page.title,
      body: page.body_html || '',
    };

    // Ajouter les champs SEO si disponibles
    if (page.seo_title || page.seo_description) {
      pageInput.seo = {
        title: page.seo_title || page.title,
        description: page.seo_description || ''
      };
    }

    console.log(`[SYNC-PAGE] Sending GraphQL mutation for page ${page.shopify_page_id}`);
    console.log(`[SYNC-PAGE] SEO Title: ${page.seo_title}, SEO Desc: ${page.seo_description?.substring(0, 50)}...`);

    const graphqlResponse = await fetch(shopifyGraphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlMutation,
        variables: {
          id: pageGid,
          page: pageInput
        }
      }),
    });

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('[SYNC-PAGE] Shopify GraphQL error:', errorText);
      
      if (graphqlResponse.status === 403) {
        throw new Error('Permission denied. Your Shopify token needs write_content scope.');
      }
      
      throw new Error(`Shopify GraphQL error: ${graphqlResponse.status} - ${errorText}`);
    }

    const graphqlResult = await graphqlResponse.json();
    
    if (graphqlResult.errors) {
      console.error('[SYNC-PAGE] GraphQL errors:', graphqlResult.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(graphqlResult.errors)}`);
    }

    if (graphqlResult.data?.pageUpdate?.userErrors?.length > 0) {
      console.error('[SYNC-PAGE] User errors:', graphqlResult.data.pageUpdate.userErrors);
      throw new Error(`Page update errors: ${JSON.stringify(graphqlResult.data.pageUpdate.userErrors)}`);
    }

    console.log('[SYNC-PAGE] ✅ Successfully synced page SEO to Shopify via GraphQL');

    // Mettre à jour last_synced_at
    const { error: updateError } = await supabaseClient
      .from('shopify_pages')
      .update({ 
        last_synced_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('[SYNC-PAGE] Error updating last_synced_at:', updateError);
    }

    // Extract store name and build Shopify admin URL
    const storeName = connection.store_url.replace('.myshopify.com', '');
    const shopifyAdminUrl = `https://admin.shopify.com/store/${storeName}/pages/${page.shopify_page_id}`;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Page synced to Shopify successfully',
        shopifyUrl: shopifyAdminUrl,
        resourceType: 'page',
        page: graphqlResult.data?.pageUpdate?.page
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SYNC-PAGE] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to sync page to Shopify'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
