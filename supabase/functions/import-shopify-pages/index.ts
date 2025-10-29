import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyPage {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  published_at: string | null;
  template_suffix: string | null;
  updated_at: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { storeId } = await req.json();
    console.log('🔍 Import pages request:', { storeId, userId: user.id });

    // Use service role for store lookup to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get store connection
    const { data: store, error: storeError } = await supabaseServiceClient
      .from('shopify_connections')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Store lookup result:', { 
      found: !!store, 
      storeUrl: store?.store_url,
      error: storeError 
    });

    if (storeError || !store) {
      console.error('❌ Store not found:', { storeId, userId: user.id, error: storeError });
      throw new Error(`Store not found for user ${user.id} and store ${storeId}`);
    }

    // Fetch pages from Shopify
    console.log(`📄 Fetching pages from ${store.store_url}...`);
    const shopifyResponse = await fetch(
      `https://${store.store_url}/admin/api/2025-01/pages.json?limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": store.access_token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('❌ Shopify API Error:', {
        status: shopifyResponse.status,
        store: store.store_url,
        error: errorText
      });
      
      if (shopifyResponse.status === 401 || shopifyResponse.status === 403) {
        throw new Error(`Permission refusée. Vérifiez que votre token Shopify a les permissions 'read_content' et 'write_content'. Erreur: ${errorText}`);
      }
      
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
    }

    const { pages } = await shopifyResponse.json();
    console.log(`✅ Found ${pages?.length || 0} pages for store ${store.store_url}`);

    if (!pages || pages.length === 0) {
      console.log('⚠️ No pages found in Shopify store');
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'Aucune page trouvée dans cette boutique Shopify' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare pages for insert
    const pagesToInsert = pages.map((page: ShopifyPage) => ({
      user_id: user.id,
      store_id: storeId,
      shopify_page_id: page.id,
      title: page.title,
      body_html: page.body_html,
      handle: page.handle,
      published_at: page.published_at,
      template_suffix: page.template_suffix,
      updated_at: page.updated_at,
    }));

    // Upsert pages
    const { error: upsertError } = await supabaseServiceClient
      .from('shopify_pages')
      .upsert(pagesToInsert, {
        onConflict: 'shopify_page_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('❌ Page upsert error:', upsertError);
      throw new Error(`Échec de l'enregistrement des pages: ${upsertError.message}`);
    }
    
    console.log(`✅ Successfully imported ${pages.length} pages to database`);

    return new Response(
      JSON.stringify({
        success: true,
        count: pages.length,
        message: `Successfully imported ${pages.length} pages`,
        pages: pages.map((p: ShopifyPage) => ({ title: p.title, handle: p.handle }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error importing pages:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
