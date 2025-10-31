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

    // Récupérer l'ID du shop
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
      console.error('[SYNC-HOMEPAGE] Error fetching shop:', errorText);
      
      if (shopResponse.status === 403) {
        throw new Error('Permission denied. Your Shopify token needs read_content and write_content scopes.');
      }
      
      throw new Error(`Shopify API error: ${shopResponse.status}`);
    }

    const shopData = await shopResponse.json();
    const shopId = shopData.shop.id;
    console.log('[SYNC-HOMEPAGE] Shop ID retrieved:', shopId);

    // Récupérer les metafields existants pour le shop
    const metafieldsUrl = `https://${connection.store_url}/admin/api/2025-01/metafields.json?metafield[owner_id]=${shopId}&metafield[owner_resource]=shop`;
    const metafieldsResponse = await fetch(metafieldsUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
    });

    const existingMetafields = metafieldsResponse.ok ? await metafieldsResponse.json() : { metafields: [] };
    console.log('[SYNC-HOMEPAGE] Existing metafields retrieved');

    // Trouver les metafields title_tag et description_tag existants
    const titleMetafield = existingMetafields.metafields?.find(
      (m: any) => m.namespace === 'global' && m.key === 'title_tag'
    );
    const descriptionMetafield = existingMetafields.metafields?.find(
      (m: any) => m.namespace === 'global' && m.key === 'description_tag'
    );

    // Créer ou mettre à jour le metafield title_tag
    const titleMetafieldData = {
      metafield: {
        namespace: 'global',
        key: 'title_tag',
        value: seoTitle,
        type: 'single_line_text_field',
        owner_resource: 'shop',
        owner_id: shopId,
      }
    };

    if (titleMetafield) {
      // Mettre à jour le metafield existant
      const updateTitleUrl = `https://${connection.store_url}/admin/api/2025-01/metafields/${titleMetafield.id}.json`;
      const updateTitleResponse = await fetch(updateTitleUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(titleMetafieldData),
      });

      if (!updateTitleResponse.ok) {
        const errorText = await updateTitleResponse.text();
        console.error('[SYNC-HOMEPAGE] Error updating title metafield:', errorText);
        throw new Error(`Failed to update title metafield: ${updateTitleResponse.status}`);
      }
      console.log('[SYNC-HOMEPAGE] Title metafield updated');
    } else {
      // Créer un nouveau metafield
      const createTitleUrl = `https://${connection.store_url}/admin/api/2025-01/metafields.json`;
      const createTitleResponse = await fetch(createTitleUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(titleMetafieldData),
      });

      if (!createTitleResponse.ok) {
        const errorText = await createTitleResponse.text();
        console.error('[SYNC-HOMEPAGE] Error creating title metafield:', errorText);
        throw new Error(`Failed to create title metafield: ${createTitleResponse.status}`);
      }
      console.log('[SYNC-HOMEPAGE] Title metafield created');
    }

    // Créer ou mettre à jour le metafield description_tag
    const descriptionMetafieldData = {
      metafield: {
        namespace: 'global',
        key: 'description_tag',
        value: seoDescription,
        type: 'single_line_text_field',
        owner_resource: 'shop',
        owner_id: shopId,
      }
    };

    if (descriptionMetafield) {
      // Mettre à jour le metafield existant
      const updateDescUrl = `https://${connection.store_url}/admin/api/2025-01/metafields/${descriptionMetafield.id}.json`;
      const updateDescResponse = await fetch(updateDescUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(descriptionMetafieldData),
      });

      if (!updateDescResponse.ok) {
        const errorText = await updateDescResponse.text();
        console.error('[SYNC-HOMEPAGE] Error updating description metafield:', errorText);
        throw new Error(`Failed to update description metafield: ${updateDescResponse.status}`);
      }
      console.log('[SYNC-HOMEPAGE] Description metafield updated');
    } else {
      // Créer un nouveau metafield
      const createDescUrl = `https://${connection.store_url}/admin/api/2025-01/metafields.json`;
      const createDescResponse = await fetch(createDescUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(descriptionMetafieldData),
      });

      if (!createDescResponse.ok) {
        const errorText = await createDescResponse.text();
        console.error('[SYNC-HOMEPAGE] Error creating description metafield:', errorText);
        throw new Error(`Failed to create description metafield: ${createDescResponse.status}`);
      }
      console.log('[SYNC-HOMEPAGE] Description metafield created');
    }

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
