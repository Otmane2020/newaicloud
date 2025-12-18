import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        vendor
        title
        descriptionHtml
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function shopifyGraphQL(storeUrl: string, accessToken: string, query: string, variables: Record<string, any> = {}) {
  const response = await fetch(`https://${storeUrl}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

function restIdToGid(numericId: number | string, resourceType: string): string {
  return `gid://shopify/${resourceType}/${numericId}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, batchSize = 50 } = await req.json();

    if (!storeId) {
      throw new Error('storeId is required');
    }

    console.log(`Starting bulk vendor sync for store: ${storeId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get store connection
    const { data: store, error: storeError } = await supabase
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('id', storeId)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      throw new Error(`Store not found: ${storeError?.message}`);
    }

    console.log(`Connected to store: ${store.store_url}`);

    // Get all products with vendor = 'SweetDeco' (recently updated)
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, shopify_id, title, vendor, body_html')
      .eq('store_id', storeId)
      .eq('vendor', 'SweetDeco')
      .not('shopify_id', 'is', null);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    console.log(`Found ${products?.length || 0} products to sync`);

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products to sync',
          synced: 0,
          failed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let synced = 0;
    let failed = 0;
    const errors: Array<{ productId: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);

      for (const product of batch) {
        try {
          const productGid = restIdToGid(product.shopify_id, 'Product');
          
          const result = await shopifyGraphQL(
            store.store_url,
            store.access_token,
            PRODUCT_UPDATE_MUTATION,
            {
              input: {
                id: productGid,
                vendor: product.vendor,
                title: product.title,
                descriptionHtml: product.body_html || ''
              }
            }
          );

          if (result.productUpdate?.userErrors?.length > 0) {
            const errorMsg = result.productUpdate.userErrors.map((e: any) => e.message).join(', ');
            console.error(`User errors for product ${product.shopify_id}: ${errorMsg}`);
            errors.push({ productId: product.id, error: errorMsg });
            failed++;
          } else {
            synced++;
            console.log(`Synced product ${product.shopify_id}: ${product.title}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Failed to sync product ${product.shopify_id}:`, errorMsg);
          errors.push({ productId: product.id, error: errorMsg });
          failed++;
        }

        // Rate limiting: 100ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Additional delay between batches
      if (i + batchSize < products.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Update last_synced_at for synced products
    if (synced > 0) {
      await supabase
        .from('shopify_products')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('vendor', 'SweetDeco');
    }

    console.log(`Sync complete: ${synced} synced, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bulk sync complete`,
        synced,
        failed,
        total: products.length,
        errors: errors.slice(0, 10) // Return first 10 errors only
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Bulk sync error:', errorMsg);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
