import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();

    if (!storeId) {
      throw new Error('storeId is required');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch store connection details
    const { data: store, error: storeError } = await supabaseClient
      .from('shopify_connections')
      .select('store_url, access_token, public_domain')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    // If we already have a valid public_domain, return it
    if (store.public_domain && !store.public_domain.includes('.myshopify.com')) {
      console.log('✅ Using existing public_domain:', store.public_domain);
      return new Response(
        JSON.stringify({ domain: store.public_domain, source: 'database' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Shopify API
    if (!store.access_token) {
      throw new Error('No access token found for store');
    }

    const shopifyUrl = store.store_url.includes('https://')
      ? store.store_url
      : `https://${store.store_url}`;

    console.log('🔄 Fetching domain from Shopify API:', shopifyUrl);

    // Retry logic with exponential backoff for rate limiting
    let lastError: Error | null = null;
    let response: Response | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(`${shopifyUrl}/admin/api/2024-10/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': store.access_token,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // If rate limited (429), wait before retrying
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/3`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          lastError = new Error(`Rate limited (429), attempt ${attempt + 1}/3`);
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        if (attempt === 2) break; // Last attempt, don't wait
        
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Request failed, waiting ${waitTime}ms before retry ${attempt + 1}/3`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to fetch from Shopify after retries');
    }

    const shopData = await response.json();
    const shopifyDomain = shopData.shop?.domain;

    if (!shopifyDomain) {
      throw new Error('No domain found in Shopify response');
    }

    // Only update if it's not a myshopify.com domain
    if (!shopifyDomain.includes('.myshopify.com')) {
      console.log('✅ Fetched valid domain from Shopify:', shopifyDomain);

      // Update the database
      const { error: updateError } = await supabaseClient
        .from('shopify_connections')
        .update({ public_domain: shopifyDomain })
        .eq('id', storeId);

      if (updateError) {
        console.error('❌ Error updating public_domain:', updateError);
      } else {
        console.log('✅ Updated public_domain in database');
      }

      return new Response(
        JSON.stringify({ domain: shopifyDomain, source: 'shopify_api' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to store_url
    const fallbackDomain = store.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log('⚠️ Using store_url as fallback:', fallbackDomain);

    return new Response(
      JSON.stringify({ domain: fallbackDomain, source: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in fetch-shopify-domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
