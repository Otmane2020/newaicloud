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

    // Utiliser l'API REST Admin pour créer/mettre à jour les metafields du shop
    // C'est la seule méthode qui fonctionne pour le SEO de la page d'accueil
    const apiUrl = `https://${connection.store_url}/admin/api/2025-01`;
    
    // Fonction helper pour créer ou mettre à jour un metafield
    const upsertMetafield = async (key: string, value: string) => {
      // D'abord, vérifier si le metafield existe déjà
      const listUrl = `${apiUrl}/metafields.json?namespace=seo&key=${key}`;
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error(`[SYNC-HOMEPAGE] Failed to list metafields for ${key}:`, errorText);
        throw new Error(`Failed to list metafields: ${listResponse.status}`);
      }

      const listResult = await listResponse.json();
      const existingMetafield = listResult.metafields?.find((m: any) => 
        m.namespace === 'seo' && m.key === key
      );

      if (existingMetafield) {
        // Mettre à jour le metafield existant
        console.log(`[SYNC-HOMEPAGE] Updating existing metafield ${key} (ID: ${existingMetafield.id})`);
        const updateUrl = `${apiUrl}/metafields/${existingMetafield.id}.json`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metafield: {
              id: existingMetafield.id,
              value: value,
              type: 'single_line_text_field'
            }
          }),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`[SYNC-HOMEPAGE] Failed to update metafield ${key}:`, errorText);
          throw new Error(`Failed to update ${key}: ${updateResponse.status}`);
        }

        return await updateResponse.json();
      } else {
        // Créer un nouveau metafield
        console.log(`[SYNC-HOMEPAGE] Creating new metafield ${key}`);
        const createUrl = `${apiUrl}/metafields.json`;
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metafield: {
              namespace: 'seo',
              key: key,
              value: value,
              type: 'single_line_text_field'
            }
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(`[SYNC-HOMEPAGE] Failed to create metafield ${key}:`, errorText);
          throw new Error(`Failed to create ${key}: ${createResponse.status}`);
        }

        return await createResponse.json();
      }
    };

    // Mettre à jour les deux metafields
    await upsertMetafield('home_title', seoTitle);
    await upsertMetafield('home_description', seoDescription);

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
