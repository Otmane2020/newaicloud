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

    // Récupérer les informations actuelles du shop
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
    console.log('[SYNC-HOMEPAGE] Current shop data retrieved');

    // Mettre à jour les metafields SEO du shop
    const updateData = {
      shop: {
        metafields_global_title_tag: seoTitle,
        metafields_global_description_tag: seoDescription
      }
    };

    const updateResponse = await fetch(shopUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[SYNC-HOMEPAGE] Error updating shop:', errorText);
      throw new Error(`Failed to update homepage SEO: ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
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
