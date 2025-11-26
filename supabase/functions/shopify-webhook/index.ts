import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'node:crypto';

// ✅ Type declaration for Supabase EdgeRuntime
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook headers
    const hmac = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    console.log('📥 Webhook received:', { topic, shopDomain });

    if (!hmac || !shopDomain || !topic) {
      console.error('❌ Missing required headers');
      return new Response(JSON.stringify({ error: 'Missing required headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get webhook payload
    const rawBody = await req.text();
    
    // ✅ SHOPIFY COMPLIANCE: Verify HMAC BEFORE database lookup using app secret
    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!apiSecret) {
      console.error('❌ SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calculatedHmac = createHmac('sha256', apiSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (calculatedHmac !== hmac) {
      console.error(JSON.stringify({
        event: 'webhook_hmac_failure',
        shop: shopDomain,
        topic: topic,
        expected_hmac_length: calculatedHmac.length,
        received_hmac_length: hmac.length,
        timestamp: new Date().toISOString()
      }));
      return new Response(JSON.stringify({ error: 'Invalid HMAC' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({
      event: 'webhook_verification_success',
      shop: shopDomain,
      topic: topic,
      timestamp: new Date().toISOString()
    }));

    // ✅ SHOPIFY COMPLIANCE: Return 200 OK immediately
    const quickResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Parse payload for async processing
    const payload = JSON.parse(rawBody);

    // Find the Shopify connection for this domain
    const { data: connection, error: connError } = await supabase
      .from('shopify_connections')
      .select('id, user_id')
      .eq('shop_domain', shopDomain)
      .single();

    if (connError || !connection) {
      console.error('❌ Store not found:', shopDomain);
      // Already sent 200 OK, just log the error
      return quickResponse;
    }

    // ✅ SHOPIFY COMPLIANCE: Process webhook asynchronously in background
    EdgeRuntime.waitUntil((async () => {
      try {
        switch (topic) {
          case 'products/create':
          case 'products/update':
            await handleProductWebhook(supabase, connection, payload, topic);
            break;
          
          case 'products/delete':
            await handleProductDelete(supabase, connection, payload);
            break;
          
          case 'collections/create':
          case 'collections/update':
            await handleCollectionWebhook(supabase, connection, payload);
            break;
          
          case 'collections/delete':
            await handleCollectionDelete(supabase, connection, payload);
            break;
          
          case 'orders/create':
            await handleOrderWebhook(supabase, connection, payload);
            break;
          
          default:
            console.log('⚠️ Unhandled webhook topic:', topic);
        }

        console.log('✅ Webhook processed successfully');
      } catch (bgError: unknown) {
        const err = bgError instanceof Error ? bgError : new Error(String(bgError));
        console.error('❌ Background webhook processing error:', err);
      }
    })());

    return quickResponse;

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleProductWebhook(supabase: any, connection: any, payload: any, topic: string) {
  console.log(`📦 Processing ${topic} for product:`, payload.id);

  // Prepare product data
  const productData = {
    shopify_product_id: String(payload.id),
    store_id: connection.id,
    seller_id: connection.user_id,
    title: payload.title,
    description: payload.body_html || '',
    price: payload.variants?.[0]?.price || '0',
    vendor: payload.vendor || '',
    product_type: payload.product_type || '',
    tags: payload.tags || '',
    status: payload.status || 'active',
    handle: payload.handle || '',
    image_url: payload.image?.src || payload.images?.[0]?.src || null,
    updated_at: new Date().toISOString(),
  };

  // Upsert product
  const { error: productError } = await supabase
    .from('shopify_products')
    .upsert(productData, { 
      onConflict: 'shopify_product_id,store_id',
      ignoreDuplicates: false 
    });

  if (productError) {
    console.error('❌ Error upserting product:', productError);
    throw productError;
  }

  // Handle variants if present
  if (payload.variants && payload.variants.length > 0) {
    const { data: product } = await supabase
      .from('shopify_products')
      .select('id')
      .eq('shopify_product_id', String(payload.id))
      .eq('store_id', connection.id)
      .single();

    if (product) {
      const variants = payload.variants.map((v: any) => ({
        product_id: product.id,
        shopify_variant_id: String(v.id),
        title: v.title,
        price: v.price,
        sku: v.sku || '',
        inventory_quantity: v.inventory_quantity || 0,
      }));

      await supabase.from('product_variants').upsert(variants, {
        onConflict: 'shopify_variant_id',
        ignoreDuplicates: false
      });
    }
  }

  // Handle images if present
  if (payload.images && payload.images.length > 0) {
    const { data: product } = await supabase
      .from('shopify_products')
      .select('id')
      .eq('shopify_product_id', String(payload.id))
      .eq('store_id', connection.id)
      .single();

    if (product) {
      const images = payload.images.map((img: any, index: number) => ({
        product_id: product.id,
        shopify_image_id: String(img.id),
        url: img.src,
        alt_text: img.alt || '',
        position: index,
      }));

      await supabase.from('product_images').upsert(images, {
        onConflict: 'shopify_image_id',
        ignoreDuplicates: false
      });
    }
  }

  console.log('✅ Product webhook processed');
}

async function handleProductDelete(supabase: any, connection: any, payload: any) {
  console.log('🗑️ Deleting product:', payload.id);

  const { error } = await supabase
    .from('shopify_products')
    .delete()
    .eq('shopify_product_id', String(payload.id))
    .eq('store_id', connection.id);

  if (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }

  console.log('✅ Product deleted');
}

async function handleCollectionWebhook(supabase: any, connection: any, payload: any) {
  console.log('📁 Processing collection webhook:', payload.id);

  const collectionData = {
    shopify_collection_id: String(payload.id),
    store_id: connection.id,
    user_id: connection.user_id,
    title: payload.title,
    description: payload.body_html || '',
    handle: payload.handle || '',
    image_url: payload.image?.src || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('shopify_collections')
    .upsert(collectionData, {
      onConflict: 'shopify_collection_id,store_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('❌ Error upserting collection:', error);
    throw error;
  }

  console.log('✅ Collection webhook processed');
}

async function handleCollectionDelete(supabase: any, connection: any, payload: any) {
  console.log('🗑️ Deleting collection:', payload.id);

  const { error } = await supabase
    .from('shopify_collections')
    .delete()
    .eq('shopify_collection_id', String(payload.id))
    .eq('store_id', connection.id);

  if (error) {
    console.error('❌ Error deleting collection:', error);
    throw error;
  }

  console.log('✅ Collection deleted');
}

async function handleOrderWebhook(supabase: any, connection: any, payload: any) {
  console.log('🛒 Processing order webhook:', payload.id);

  const orderData = {
    shopify_order_id: String(payload.id),
    store_id: connection.id,
    user_id: connection.user_id,
    order_number: payload.order_number || payload.name,
    email: payload.email,
    total_price: payload.total_price,
    currency: payload.currency,
    financial_status: payload.financial_status,
    fulfillment_status: payload.fulfillment_status || 'unfulfilled',
    created_at: payload.created_at,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('shopify_orders')
    .upsert(orderData, {
      onConflict: 'shopify_order_id,store_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('❌ Error upserting order:', error);
    throw error;
  }

  console.log('✅ Order webhook processed');
}
