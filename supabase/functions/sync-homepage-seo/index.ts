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

    // Utiliser l'API REST Admin pour mettre à jour le SEO du shop
    const apiUrl = `https://${connection.store_url}/admin/api/2025-01/shop.json`;
    
    console.log(`[SYNC-HOMEPAGE] Updating shop SEO via API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shop: {
          metafields: [
            {
              namespace: 'global',
              key: 'title_tag',
              value: seoTitle,
              type: 'single_line_text_field'
            },
            {
              namespace: 'global',
              key: 'description_tag',
              value: seoDescription,
              type: 'multi_line_text_field'
            }
          ]
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYNC-HOMEPAGE] Failed to update shop:`, errorText);
      throw new Error(`Failed to update shop SEO: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[SYNC-HOMEPAGE] Shop SEO successfully updated');
    
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
