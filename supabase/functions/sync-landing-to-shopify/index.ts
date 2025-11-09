import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productTitle, productHandle, htmlContent } = await req.json();

    console.log('[sync-landing-to-shopify] Syncing landing page for product:', productId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get product to fetch store_id
    const { data: product, error: productError } = await supabase
      .from('shopify_products')
      .select('store_id')
      .eq('id', productId)
      .eq('seller_id', user.id)
      .single();

    if (productError || !product) {
      console.error('[sync-landing-to-shopify] Product not found:', productError);
      throw new Error('Product not found');
    }

    console.log('[sync-landing-to-shopify] Product store_id:', product.store_id);

    // Get Shopify credentials
    // If product doesn't have a store_id, try to get the first active connection
    let connection;
    if (product.store_id) {
      const { data, error: connectionError } = await supabase
        .from('shopify_connections')
        .select('store_url, encrypted_access_token')
        .eq('id', product.store_id)
        .eq('user_id', user.id)
        .single();

      if (connectionError || !data) {
        console.error('[sync-landing-to-shopify] Connection not found for store_id:', product.store_id, connectionError);
      } else {
        connection = data;
      }
    }

    // Fallback: if no connection found, try to get the first active connection for the user
    if (!connection) {
      console.log('[sync-landing-to-shopify] No store_id or connection not found, fetching first active connection');
      const { data, error: fallbackError } = await supabase
        .from('shopify_connections')
        .select('store_url, encrypted_access_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError || !data) {
        console.error('[sync-landing-to-shopify] No active Shopify connection found for user:', user.id, fallbackError);
        throw new Error('No active Shopify connection found. Please connect your Shopify store first.');
      }

      connection = data;
      console.log('[sync-landing-to-shopify] Using fallback connection');
    }

    // Decrypt access token
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke('encrypt-shopify-token', {
      body: { 
        action: 'decrypt', 
        token: connection.encrypted_access_token 
      }
    });

    if (decryptError || !decryptData?.token) {
      console.error('[sync-landing-to-shopify] Decrypt error:', decryptError);
      throw new Error('Failed to decrypt Shopify token');
    }

    const accessToken = decryptData.token;
    const storeUrl = connection.store_url.replace(/\/$/, '');

    // Create page handle from product handle
    const pageHandle = `landing-${productHandle}`;
    const pageTitle = `${productTitle} - Landing Page`;

    // Wrap HTML content in a proper page structure
    const fullHtmlContent = `
      <div class="product-landing-page">
        ${htmlContent}
      </div>
      <style>
        .product-landing-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
      </style>
    `;

    // Check if page already exists
    console.log('[sync-landing-to-shopify] Checking if page exists:', pageHandle);
    
    const checkResponse = await fetch(`${storeUrl}/admin/api/2025-01/pages.json?handle=${pageHandle}`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('[sync-landing-to-shopify] Error checking page:', errorText);
      throw new Error(`Failed to check existing page: ${checkResponse.status}`);
    }

    const existingPages = await checkResponse.json();
    const existingPage = existingPages.pages?.[0];

    let pageId: string;
    let operation: string;

    if (existingPage) {
      // Update existing page
      console.log('[sync-landing-to-shopify] Updating existing page:', existingPage.id);
      operation = 'updated';
      
      const updateResponse = await fetch(`${storeUrl}/admin/api/2025-01/pages/${existingPage.id}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: {
            id: existingPage.id,
            title: pageTitle,
            body_html: fullHtmlContent,
            published: true,
          }
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[sync-landing-to-shopify] Error updating page:', errorText);
        throw new Error(`Failed to update Shopify page: ${updateResponse.status}`);
      }

      const updateResult = await updateResponse.json();
      pageId = updateResult.page.id;
      
    } else {
      // Create new page
      console.log('[sync-landing-to-shopify] Creating new page');
      operation = 'created';
      
      const createResponse = await fetch(`${storeUrl}/admin/api/2025-01/pages.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: {
            title: pageTitle,
            handle: pageHandle,
            body_html: fullHtmlContent,
            published: true,
          }
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[sync-landing-to-shopify] Error creating page:', errorText);
        throw new Error(`Failed to create Shopify page: ${createResponse.status}`);
      }

      const createResult = await createResponse.json();
      pageId = createResult.page.id;
    }

    const pageUrl = `${storeUrl}/pages/${pageHandle}`;

    console.log(`[sync-landing-to-shopify] Page ${operation}:`, pageUrl);

    // Mettre à jour product_landing_pages avec les infos de sync
    const { error: updateError } = await supabaseAdmin
      .from("product_landing_pages")
      .update({
        shopify_page_id: pageId.toString(),
        shopify_page_url: pageUrl,
        last_synced_at: new Date().toISOString(),
      })
      .eq("product_id", productId)
      .eq("is_active", true);

    if (updateError) {
      console.error("⚠️ Error updating sync metadata:", updateError);
    } else {
      console.log("✅ Sync metadata saved successfully");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pageUrl,
        pageId,
        operation,
        message: `Landing page ${operation} successfully on Shopify`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[sync-landing-to-shopify] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
