import "../_shared/strict-ai-generation.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Register Shopify webhooks for real-time synchronization
 * Topics: products/create, products/update, products/delete, 
 *         collections/create, collections/update, collections/delete
 */

interface WebhookRegistrationRequest {
  storeId?: string;
  shopDomain?: string;
  accessToken?: string;
}

const WEBHOOK_TOPICS = [
  // Products
  'products/create',
  'products/update', 
  'products/delete',
  // Collections
  'collections/create',
  'collections/update',
  'collections/delete',
  // Pages (no built-in Shopify webhook, handled differently)
  // Articles/Blogs - Shopify doesn't have direct webhooks for articles
  // Use CRON sync for these content types
  // Orders
  'orders/create',
  // Themes and content changes
  'themes/publish',  // Useful to know when theme changes
  // App lifecycle - CRITICAL for billing enforcement
  'app/uninstalled',  // Detect app uninstallation to cancel subscription
  // 🆕 BILLING WEBHOOKS - Critical for subscription management
  'app_subscriptions/update',  // Subscription status changes (cancelled, expired, upgraded, etc.)
  'subscription_billing_attempts/failure',  // Payment failed
  'subscription_billing_attempts/success',  // Payment succeeded
];

async function createWebhook(
  shopDomain: string,
  accessToken: string,
  topic: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string; webhookId?: string }> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2025-01/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: webhookUrl,
            format: 'json',
          },
        }),
      }
    );

    if (response.status === 201) {
      const data = await response.json();
      return { success: true, webhookId: String(data.webhook?.id) };
    }

    // 422 = webhook already exists (not an error)
    if (response.status === 422) {
      console.log(`[REGISTER-WEBHOOKS] Webhook already exists for topic: ${topic}`);
      return { success: true, error: 'already_exists' };
    }

    const errorText = await response.text();
    console.error(`[REGISTER-WEBHOOKS] Failed to create webhook ${topic}:`, errorText);
    return { success: false, error: errorText };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[REGISTER-WEBHOOKS] Error creating webhook ${topic}:`, message);
    return { success: false, error: message };
  }
}

async function listExistingWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2025-01/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.webhooks || [];
    }

    return [];
  } catch (error) {
    console.error('[REGISTER-WEBHOOKS] Error listing webhooks:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: WebhookRegistrationRequest = await req.json();
    const { storeId, shopDomain: directShopDomain, accessToken: directAccessToken } = body;

    let shopDomain: string;
    let accessToken: string;
    let userId: string | null = null;

    // Mode 1: Direct shop domain and access token (called from OAuth flow)
    if (directShopDomain && directAccessToken) {
      shopDomain = directShopDomain;
      accessToken = directAccessToken;
      console.log(`[REGISTER-WEBHOOKS] Direct mode for shop: ${shopDomain}`);
    }
    // Mode 2: Store ID (called from dashboard)
    else if (storeId) {
      const { data: store, error: storeError } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token, user_id')
        .eq('id', storeId)
        .single();

      if (storeError || !store) {
        throw new Error(`Store not found: ${storeError?.message}`);
      }

      shopDomain = store.store_url;
      accessToken = store.access_token;
      userId = store.user_id;
      console.log(`[REGISTER-WEBHOOKS] Store mode for: ${shopDomain}`);
    } else {
      throw new Error('Missing storeId or shopDomain/accessToken');
    }

    // Get webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
    console.log(`[REGISTER-WEBHOOKS] Webhook URL: ${webhookUrl}`);

    // List existing webhooks to avoid duplicates
    const existingWebhooks = await listExistingWebhooks(shopDomain, accessToken);
    const existingTopics = new Set(existingWebhooks.map((w: any) => w.topic));
    console.log(`[REGISTER-WEBHOOKS] Existing webhooks: ${existingWebhooks.length}`);

    // Register missing webhooks
    const results: Record<string, { success: boolean; error?: string }> = {};
    
    for (const topic of WEBHOOK_TOPICS) {
      if (existingTopics.has(topic)) {
        results[topic] = { success: true, error: 'already_registered' };
        console.log(`[REGISTER-WEBHOOKS] ✓ ${topic} already registered`);
        continue;
      }

      const result = await createWebhook(shopDomain, accessToken, topic, webhookUrl);
      results[topic] = result;
      
      if (result.success) {
        console.log(`[REGISTER-WEBHOOKS] ✓ ${topic} registered`);
      } else {
        console.error(`[REGISTER-WEBHOOKS] ✗ ${topic} failed:`, result.error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Log to system_logs
    await supabase.from('system_logs').insert({
      type: 'webhook_registration',
      function_name: 'register-sync-webhooks',
      message: `Webhooks registered for ${shopDomain}`,
      metadata: {
        shop: shopDomain,
        results,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
    });

    const successCount = Object.values(results).filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        shop: shopDomain,
        registered: successCount,
        total: WEBHOOK_TOPICS.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[REGISTER-WEBHOOKS] Error:', message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
