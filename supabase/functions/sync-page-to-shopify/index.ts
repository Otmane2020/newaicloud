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

    // Récupérer la connexion Shopify
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      console.error('[SYNC-PAGE] No active Shopify connection found');
      throw new Error('No active Shopify connection. Please connect your store first.');
    }

    console.log(`[SYNC-PAGE] Using store: ${connection.store_url}`);

    // Préparer les données de la page pour Shopify
    const shopifyPageData = {
      page: {
        id: page.shopify_page_id,
        title: page.title,
        body_html: page.body_html,
        metafields: [
          {
            namespace: "global",
            key: "title_tag",
            value: page.seo_title || page.title,
            type: "single_line_text_field"
          },
          {
            namespace: "global",
            key: "description_tag",
            value: page.seo_description || "",
            type: "single_line_text_field"
          }
        ]
      }
    };

    // Mettre à jour la page sur Shopify
    const shopifyUrl = `https://${connection.store_url}/admin/api/2025-01/pages/${page.shopify_page_id}.json`;
    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shopifyPageData),
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('[SYNC-PAGE] Shopify API error:', errorText);
      
      if (shopifyResponse.status === 403) {
        throw new Error('Permission denied. Your Shopify token needs read_content and write_content scopes.');
      }
      
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
    }

    const result = await shopifyResponse.json();
    console.log('[SYNC-PAGE] Successfully synced to Shopify');

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
        page: result.page
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
