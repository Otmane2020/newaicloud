import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safe HealthCheck handler
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET');
    if (!SHOPIFY_API_SECRET) {
      return new Response(JSON.stringify({ 
        error: 'SHOPIFY_API_SECRET not configured',
        status: 'configuration_error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate test GDPR payload
    const testPayload = {
      shop_id: 12345678,
      shop_domain: "test-store.myshopify.com",
      orders_requested: ["1001", "1002"],
      customer: {
        id: 987654321,
        email: "customer@example.com",
        phone: "+1234567890"
      }
    };

    const payloadString = JSON.stringify(testPayload);
    
    // Calculate HMAC-SHA256 signature
    const hmac = createHmac('sha256', SHOPIFY_API_SECRET)
      .update(payloadString, 'utf8')
      .digest('base64');

    console.log(JSON.stringify({
      event: 'test_gdpr_webhook_hmac_generation',
      payload_length: payloadString.length,
      hmac_length: hmac.length,
      timestamp: new Date().toISOString()
    }));

    // Get GDPR webhook URL
    const SUPABASE_PROJECT_ID = Deno.env.get('VITE_SUPABASE_PROJECT_ID') || 'nekqqlhrjgmyudmmewas';
    const gdprWebhookUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/shopify-gdpr-webhook`;

    // Call GDPR webhook with proper Shopify headers
    const webhookResponse = await fetch(gdprWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': hmac,
        'x-shopify-shop-domain': 'test-store.myshopify.com',
        'x-shopify-topic': 'customers/data_request',
      },
      body: payloadString
    });

    const responseText = await webhookResponse.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Return test results
    const result = {
      success: webhookResponse.ok,
      status_code: webhookResponse.status,
      hmac_sent: hmac.substring(0, 20) + '...',
      payload_sent: testPayload,
      webhook_response: responseData,
      interpretation: webhookResponse.status === 200 
        ? '✅ HMAC validation PASSED - Webhook is correctly configured'
        : webhookResponse.status === 401
        ? '❌ HMAC validation FAILED - Check SHOPIFY_API_SECRET configuration'
        : `⚠️ Unexpected response: ${webhookResponse.status}`,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      event: 'test_gdpr_webhook_result',
      ...result
    }));

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test GDPR webhook error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
