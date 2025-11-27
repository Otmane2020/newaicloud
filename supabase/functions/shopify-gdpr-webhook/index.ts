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

/**
 * ✅ SHOPIFY COMPLIANCE: GDPR Webhooks Handler
 * Handles mandatory Shopify GDPR webhooks:
 * - customers/data_request
 * - customers/redact
 * - shop/redact
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ✅ CRITICAL: Read body as text FIRST (can only be read once)
    const rawBody = await req.text();

    // Safe HealthCheck handler - parse JSON from rawBody
    let parsedBody: any = {};
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // Not JSON, ignore for health check
      parsedBody = {};
    }

    if (parsedBody?.healthCheck === true) {
      console.log('[GDPR-WEBHOOK] ✅ Health check passed');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook headers
    const hmac = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    console.log(JSON.stringify({
      event: 'gdpr_webhook_received',
      topic: topic,
      shop: shopDomain,
      has_hmac: !!hmac,
      body_length: rawBody.length,
      timestamp: new Date().toISOString()
    }));

    if (!hmac || !shopDomain || !topic) {
      console.error('❌ Missing required headers:', { hmac: !!hmac, shopDomain: !!shopDomain, topic: !!topic });
      return new Response(JSON.stringify({ error: 'Missing required headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ SHOPIFY COMPLIANCE: Verify HMAC using app secret
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
      const debugMode = url.searchParams.get('debug') === '1';

      const logPayload: Record<string, unknown> = {
        event: 'gdpr_webhook_hmac_failure',
        shop: shopDomain,
        topic: topic,
        calculated_length: calculatedHmac.length,
        received_length: hmac.length,
        body_length: rawBody.length,
        debug_mode: debugMode,
        timestamp: new Date().toISOString(),
      };

      if (debugMode) {
        logPayload['calculated_hmac'] = calculatedHmac;
        logPayload['received_hmac'] = hmac;
      }

      console.error(JSON.stringify(logPayload));

      const responseBody: Record<string, unknown> = { error: 'Invalid HMAC' };
      if (debugMode) {
        responseBody['expected_hmac'] = calculatedHmac;
        responseBody['received_hmac'] = hmac;
        responseBody['note'] = 'Debug mode active: values returned for local testing only. Do not expose this URL publicly.';
      }

      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({
      event: 'gdpr_webhook_verification_success',
      shop: shopDomain,
      topic: topic,
      hmac_valid: true,
      timestamp: new Date().toISOString()
    }));

    // ✅ SHOPIFY COMPLIANCE: Return 200 OK immediately (within 5 seconds)
    const quickResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Parse payload for async processing
    const payload = JSON.parse(rawBody);

    // Process GDPR webhook asynchronously in background
    EdgeRuntime.waitUntil((async () => {
      try {
        switch (topic) {
          case 'customers/data_request':
            await handleCustomerDataRequest(supabase, shopDomain, payload);
            break;

          case 'customers/redact':
            await handleCustomerRedact(supabase, shopDomain, payload);
            break;

          case 'shop/redact':
            await handleShopRedact(supabase, shopDomain, payload);
            break;

          default:
            console.log('⚠️ Unhandled GDPR webhook topic:', topic);
        }

        console.log(JSON.stringify({
          event: 'gdpr_webhook_processed',
          topic: topic,
          shop: shopDomain,
          timestamp: new Date().toISOString()
        }));
      } catch (bgError: unknown) {
        const err = bgError instanceof Error ? bgError : new Error(String(bgError));
        console.error(JSON.stringify({
          event: 'gdpr_webhook_processing_error',
          topic: topic,
          shop: shopDomain,
          error: err.message,
          timestamp: new Date().toISOString()
        }));
      }
    })());

    return quickResponse;

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ GDPR webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Handle customers/data_request webhook
 * Returns customer data for GDPR compliance
 */
async function handleCustomerDataRequest(supabase: any, shopDomain: string, payload: any) {
  console.log(JSON.stringify({
    event: 'customer_data_request',
    shop: shopDomain,
    customer_id: payload.customer?.id,
    timestamp: new Date().toISOString()
  }));

  // NewAI doesn't store customer personal data
  // Log the request for compliance audit trail
  await supabase.from('system_logs').insert({
    type: 'gdpr_compliance',
    function_name: 'shopify-gdpr-webhook',
    message: `Customer data request received for shop ${shopDomain}`,
    metadata: {
      shop: shopDomain,
      customer_id: payload.customer?.id,
      customer_email: payload.customer?.email,
      order_ids: payload.orders_requested || []
    }
  });

  console.log('✅ Customer data request logged');
}

/**
 * Handle customers/redact webhook
 * Removes customer personal data
 */
async function handleCustomerRedact(supabase: any, shopDomain: string, payload: any) {
  console.log(JSON.stringify({
    event: 'customer_redact',
    shop: shopDomain,
    customer_id: payload.customer?.id,
    timestamp: new Date().toISOString()
  }));

  // Delete customer data if any exists
  const customerId = payload.customer?.id;
  const customerEmail = payload.customer?.email;

  if (customerId || customerEmail) {
    // Delete from chat_order_tracking if exists
    await supabase.from('chat_order_tracking')
      .delete()
      .or(`customer_email.eq.${customerEmail},shopify_order_id.eq.${customerId}`);

    console.log('✅ Customer data redacted');
  }

  // Log the redaction for compliance audit trail
  await supabase.from('system_logs').insert({
    type: 'gdpr_compliance',
    function_name: 'shopify-gdpr-webhook',
    message: `Customer data redacted for shop ${shopDomain}`,
    metadata: {
      shop: shopDomain,
      customer_id: customerId,
      customer_email: customerEmail
    }
  });
}

/**
 * Handle shop/redact webhook
 * Removes all shop data after 48 hours of uninstallation
 */
async function handleShopRedact(supabase: any, shopDomain: string, payload: any) {
  console.log(JSON.stringify({
    event: 'shop_redact',
    shop: shopDomain,
    shop_id: payload.shop_id,
    timestamp: new Date().toISOString()
  }));

  try {
    // Find the shop connection
    const { data: connection } = await supabase
      .from('shopify_connections')
      .select('id, user_id, store_url')
      .eq('store_url', shopDomain)
      .single();

    if (!connection) {
      console.log('⚠️ Shop connection not found, may have been already deleted');
      return;
    }

    // Delete all shop-related data
    const storeId = connection.id;
    const userId = connection.user_id;

    // Delete in order (respecting foreign key constraints)
    await supabase.from('product_variants').delete().eq('store_id', storeId);
    await supabase.from('product_images').delete().eq('store_id', storeId);
    await supabase.from('content_images').delete().eq('store_id', storeId);
    await supabase.from('shopify_products').delete().eq('store_id', storeId);
    await supabase.from('shopify_collections').delete().eq('store_id', storeId);
    await supabase.from('shopify_orders').delete().eq('store_id', storeId);
    await supabase.from('blog_articles').delete().eq('store_id', storeId);
    await supabase.from('blog_campaigns').delete().eq('store_id', storeId);
    await supabase.from('chat_order_tracking').delete().eq('store_id', storeId);
    await supabase.from('blog_netlinking').delete().eq('store_id', storeId);
    await supabase.from('blog_opportunities').delete().eq('store_id', storeId);
    
    // Finally delete the connection itself
    await supabase.from('shopify_connections').delete().eq('id', storeId);

    console.log('✅ All shop data redacted');

    // Log the redaction for compliance audit trail
    await supabase.from('system_logs').insert({
      type: 'gdpr_compliance',
      function_name: 'shopify-gdpr-webhook',
      message: `Complete shop data redacted for ${shopDomain}`,
      metadata: {
        shop: shopDomain,
        shop_id: payload.shop_id,
        store_id: storeId,
        user_id: userId
      }
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error during shop redaction:', err);
    throw err;
  }
}
