import "../_shared/strict-ai-generation.ts";
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get webhook headers FIRST
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  const shopDomain = req.headers.get('x-shopify-shop-domain');
  const topic = req.headers.get('x-shopify-topic');

  console.log('📥 Webhook received:', { topic, shopDomain });

  // 🆕 LOG IMMEDIATELY for diagnosis (before any processing)
  try {
    await supabase.from('system_logs').insert({
      type: 'webhook_received',
      function_name: 'shopify-webhook',
      message: `Webhook received: ${topic} from ${shopDomain}`,
      metadata: { 
        topic, 
        shopDomain, 
        hmac_present: !!hmac,
        timestamp: new Date().toISOString() 
      }
    });
  } catch (logError) {
    console.error('❌ Failed to log webhook reception:', logError);
  }

  try {
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
      await supabase.from('system_logs').insert({
        type: 'webhook_error',
        function_name: 'shopify-webhook',
        message: 'SHOPIFY_API_SECRET not configured',
        metadata: { shopDomain, topic }
      });
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🆕 Wrap HMAC calculation in try-catch for better error handling
    let calculatedHmac: string;
    try {
      calculatedHmac = createHmac('sha256', apiSecret)
        .update(rawBody, 'utf8')
        .digest('base64');
    } catch (hmacError) {
      console.error('❌ HMAC calculation error:', hmacError);
      await supabase.from('system_logs').insert({
        type: 'webhook_hmac_error',
        function_name: 'shopify-webhook',
        message: 'HMAC calculation failed',
        metadata: { shopDomain, topic, error: String(hmacError) }
      });
      return new Response(JSON.stringify({ error: 'HMAC calculation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (calculatedHmac !== hmac) {
      console.error(JSON.stringify({
        event: 'webhook_hmac_failure',
        shop: shopDomain,
        topic: topic,
        expected_hmac_length: calculatedHmac.length,
        received_hmac_length: hmac.length,
        timestamp: new Date().toISOString()
      }));
      await supabase.from('system_logs').insert({
        type: 'webhook_hmac_mismatch',
        function_name: 'shopify-webhook',
        message: `HMAC mismatch for ${topic} from ${shopDomain}`,
        metadata: { shopDomain, topic }
      });
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

    // 🆕 Normalize domain for flexible lookup (remove protocol and trailing slashes)
    const normalizedDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // 🆕 Try multiple lookup strategies to find the store
    let connection: { id: string; user_id: string } | null = null;
    let connError: any = null;

    // Strategy 1: Exact match on store_url
    const result1 = await supabase
      .from('shopify_connections')
      .select('id, user_id')
      .eq('store_url', shopDomain)
      .eq('is_active', true)
      .single();
    
    if (result1.data) {
      connection = result1.data;
    } else {
      // Strategy 2: Try normalized domain
      const result2 = await supabase
        .from('shopify_connections')
        .select('id, user_id')
        .eq('store_url', normalizedDomain)
        .eq('is_active', true)
        .single();
      
      if (result2.data) {
        connection = result2.data;
      } else {
        // Strategy 3: Flexible ILIKE search
        const result3 = await supabase
          .from('shopify_connections')
          .select('id, user_id')
          .ilike('store_url', `%${normalizedDomain}%`)
          .eq('is_active', true)
          .limit(1)
          .single();
        
        if (result3.data) {
          connection = result3.data;
        } else {
          // Strategy 4: Try inactive connections for app/uninstalled
          if (topic === 'app/uninstalled') {
            const result4 = await supabase
              .from('shopify_connections')
              .select('id, user_id')
              .ilike('store_url', `%${normalizedDomain}%`)
              .limit(1)
              .single();
            
            if (result4.data) {
              connection = result4.data;
            }
          }
          connError = result3.error;
        }
      }
    }

    if (!connection) {
      console.error('❌ Store not found:', shopDomain, 'normalized:', normalizedDomain);
      // 🆕 Log the error for diagnosis but return 200 OK to satisfy Shopify
      await supabase.from('system_logs').insert({
        type: 'webhook_store_not_found',
        function_name: 'shopify-webhook',
        message: `Store not found: ${shopDomain}`,
        metadata: { 
          shopDomain, 
          normalizedDomain,
          topic, 
          error: connError?.message,
          timestamp: new Date().toISOString()
        }
      });
      // 🆕 Return 200 OK anyway to prevent Shopify from retrying
      return quickResponse;
    }

    console.log('✅ Store found:', { id: connection.id, user_id: connection.user_id });

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
          
          case 'app/uninstalled':
            await handleAppUninstalled(supabase, connection, shopDomain);
            break;
          
          // 🆕 BILLING WEBHOOKS
          case 'app_subscriptions/update':
            await handleSubscriptionUpdate(supabase, connection, payload, shopDomain);
            break;
          
          case 'subscription_billing_attempts/failure':
            await handleBillingFailure(supabase, connection, payload, shopDomain);
            break;
          
          case 'subscription_billing_attempts/success':
            await handleBillingSuccess(supabase, connection, payload, shopDomain);
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

  // Handle images - sync FULL gallery from webhook payload
  if (payload.images && payload.images.length > 0) {
    const { data: product } = await supabase
      .from('shopify_products')
      .select('id, seller_id')
      .eq('shopify_product_id', String(payload.id))
      .eq('store_id', connection.id)
      .single();

    if (product) {
      // Filter out AI-generated images that were synced back to Shopify
      const shopifyImages = payload.images.filter((img: any) => {
        const url = img.src || '';
        const isAIImage = url.includes('ai_generated_') || 
                          url.includes('ai-generated-') ||
                          url.includes('/generated-images/');
        if (isAIImage) {
          console.log(`⏭️ [WEBHOOK] Skipping AI re-import: ${url.substring(0, 60)}...`);
        }
        return !isAIImage;
      });

      // Get existing Shopify-imported images (not AI-generated)
      const { data: existingImages } = await supabase
        .from('product_images')
        .select('id, shopify_image_id, src, is_ai_generated')
        .eq('product_id', product.id)
        .eq('is_ai_generated', false);

      // Create lookup maps
      const existingByShopifyId = new Map(
        (existingImages || [])
          .filter((img: any) => img.shopify_image_id)
          .map((img: any) => [String(img.shopify_image_id), img])
      );
      const existingBySrc = new Map(
        (existingImages || []).map((img: any) => [img.src, img])
      );
      const incomingShopifyIds = new Set(
        shopifyImages
          .filter((img: any) => img.id)
          .map((img: any) => String(img.id))
      );

      // Prepare images for upsert
      const imagesToUpsert = shopifyImages.map((img: any, index: number) => {
        const existingById = img.id ? existingByShopifyId.get(String(img.id)) : null;
        const existingBySrcMatch = existingBySrc.get(img.src);
        const existing = (existingById || existingBySrcMatch) as { id: string } | null;
        
        const imageData: any = {
          product_id: product.id,
          user_id: product.seller_id,
          shopify_image_id: img.id ? Number(img.id) : null,
          src: img.src,
          alt_text: img.alt || '',
          position: index,
          is_ai_generated: false,
        };
        
        // Add id only if updating existing image
        if (existing?.id) {
          imageData.id = existing.id;
        }
        
        return imageData;
      });

      // Upsert all incoming images
      if (imagesToUpsert.length > 0) {
        await supabase.from('product_images').upsert(imagesToUpsert, {
          onConflict: 'product_id,src',
        });
        console.log(`✅ [WEBHOOK] Upserted ${imagesToUpsert.length} Shopify images`);
      }

      // Delete images that are no longer in Shopify (only Shopify-imported ones with shopify_image_id)
      const imagesToDelete = (existingImages || []).filter((img: any) => 
        img.shopify_image_id && !incomingShopifyIds.has(String(img.shopify_image_id))
      );

      if (imagesToDelete.length > 0) {
        const idsToDelete = imagesToDelete.map((img: any) => img.id);
        await supabase
          .from('product_images')
          .delete()
          .in('id', idsToDelete);
        console.log(`🗑️ [WEBHOOK] Deleted ${imagesToDelete.length} images removed from Shopify`);
      }
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

/**
 * Handle app/uninstalled webhook - CRITICAL for billing enforcement
 * When a merchant uninstalls the app, we must:
 * 1. Mark subscription as cancelled
 * 2. Mark shopify_connection as inactive
 * 3. Clear subscription data in profiles
 */
async function handleAppUninstalled(supabase: any, connection: any, shopDomain: string) {
  console.log('🚨 APP UNINSTALLED webhook received for:', shopDomain);
  console.log('📋 Connection data:', { id: connection.id, user_id: connection.user_id });

  const userId = connection.user_id;
  const storeId = connection.id;

  // ============================================
  // GDPR COMPLIANCE: Delete ALL user data
  // ============================================
  console.log('🗑️ Starting GDPR-compliant data deletion for user:', userId);

  // 1. Delete all products and related data
  const { data: products } = await supabase
    .from('shopify_products')
    .select('id')
    .eq('store_id', storeId);
  
  if (products && products.length > 0) {
    const productIds = products.map((p: any) => p.id);
    
    // Delete product images
    await supabase.from('product_images').delete().in('product_id', productIds);
    console.log('✅ Deleted product images');
    
    // Delete product variants
    await supabase.from('product_variants').delete().in('product_id', productIds);
    console.log('✅ Deleted product variants');
    
    // Delete creative history
    await supabase.from('creative_history').delete().in('product_id', productIds);
    console.log('✅ Deleted creative history');
  }
  
  // Delete all products
  await supabase.from('shopify_products').delete().eq('store_id', storeId);
  console.log('✅ Deleted all products for store');

  // 2. Delete all collections
  await supabase.from('shopify_collections').delete().eq('store_id', storeId);
  console.log('✅ Deleted all collections');

  // 3. Delete all blog articles
  await supabase.from('blog_articles').delete().eq('store_id', storeId);
  console.log('✅ Deleted all blog articles');

  // 4. Delete blog campaigns
  await supabase.from('blog_campaigns').delete().eq('store_id', storeId);
  console.log('✅ Deleted blog campaigns');

  // 5. Delete blog opportunities
  await supabase.from('blog_opportunities').delete().eq('store_id', storeId);
  console.log('✅ Deleted blog opportunities');

  // 6. Delete blog netlinking
  await supabase.from('blog_netlinking').delete().eq('store_id', storeId);
  console.log('✅ Deleted blog netlinking');

  // 7. Delete chat order tracking
  await supabase.from('chat_order_tracking').delete().eq('store_id', storeId);
  console.log('✅ Deleted chat order tracking');

  // 8. Delete content images
  await supabase.from('content_images').delete().eq('store_id', storeId);
  console.log('✅ Deleted content images');

  // 9. Delete AI opportunities
  await supabase.from('ai_opportunities').delete().eq('store_id', storeId);
  console.log('✅ Deleted AI opportunities');

  // 10. Delete ads campaigns and related data
  const { data: campaigns } = await supabase
    .from('ads_campaigns')
    .select('id')
    .eq('user_id', userId);

  if (campaigns && campaigns.length > 0) {
    const campaignIds = campaigns.map((c: any) => c.id);
    await supabase.from('ads_campaign_products').delete().in('campaign_id', campaignIds);
    await supabase.from('ads_campaign_collections').delete().in('campaign_id', campaignIds);
    await supabase.from('ads_campaigns').delete().in('id', campaignIds);
    console.log('✅ Deleted ads campaigns and relations');
  }

  // 11. Delete user-specific data linked to this store
  await supabase.from('chat_knowledge_base').delete().eq('user_id', userId);
  console.log('✅ Deleted chat knowledge base');

  // 12. Delete chat sessions and messages
  const { data: chatSessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId);

  if (chatSessions && chatSessions.length > 0) {
    const sessionIds = chatSessions.map((s: any) => s.id);
    await supabase.from('chat_messages').delete().in('session_id', sessionIds);
    await supabase.from('chat_sessions').delete().in('id', sessionIds);
    console.log('✅ Deleted chat sessions and messages');
  }

  // 13. Delete chat settings
  await supabase.from('chat_settings').delete().eq('user_id', userId);
  console.log('✅ Deleted chat settings');

  // 14. Delete automation settings
  await supabase.from('automation_settings').delete().eq('user_id', userId);
  console.log('✅ Deleted automation settings');

  // 15. Delete app notifications
  await supabase.from('app_notifications').delete().eq('user_id', userId);
  console.log('✅ Deleted app notifications');

  // ============================================
  // Mark subscription as cancelled
  // ============================================
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('seller_id', userId)
    .eq('billing_provider', 'shopify');

  if (subError) {
    console.error('❌ Error cancelling subscription:', subError);
  } else {
    console.log('✅ Subscription marked as cancelled');
  }

  // Update profile to remove active subscription
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      current_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Error updating profile:', profileError);
  } else {
    console.log('✅ Profile subscription status reset');
  }

  // Mark shopify_connection as inactive (don't delete for audit purposes)
  const { error: connError } = await supabase
    .from('shopify_connections')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId);

  if (connError) {
    console.error('❌ Error deactivating connection:', connError);
  } else {
    console.log('✅ Shopify connection marked as inactive');
  }

  // Delete pending subscriptions
  await supabase
    .from('shopify_pending_subscriptions')
    .delete()
    .eq('user_id', userId);

  // Log this critical event
  await supabase.from('system_logs').insert({
    type: 'app_uninstalled',
    function_name: 'shopify-webhook',
    message: `App uninstalled by merchant: ${shopDomain} - ALL USER DATA DELETED (GDPR)`,
    metadata: {
      shop: shopDomain,
      user_id: userId,
      connection_id: storeId,
      data_deleted: true,
      timestamp: new Date().toISOString(),
    },
  });

  // 🆕 GDPR: Also delete the user from auth.users completely
  console.log('🗑️ Deleting user from auth.users:', userId);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role to delete auth user
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete profile first (to avoid FK issues)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    console.log('✅ Deleted user profile');

    // Delete user from auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error('❌ Failed to delete auth user:', deleteAuthError);
    } else {
      console.log('✅ User completely deleted from auth.users:', userId);
    }
  } catch (authDeleteError) {
    console.error('⚠️ Error deleting auth user (non-blocking):', authDeleteError);
    // Don't fail the webhook - data has already been cleaned
  }

  console.log('✅ App uninstall webhook fully processed - ALL DATA DELETED (GDPR compliant)');
}

/**
 * Handle app_subscriptions/update webhook
 * Triggered when subscription status changes (cancelled, expired, upgraded, etc.)
 */
async function handleSubscriptionUpdate(supabase: any, connection: any, payload: any, shopDomain: string) {
  console.log('💳 SUBSCRIPTION UPDATE webhook received:', { shop: shopDomain, status: payload.status });
  
  const userId = connection.user_id;
  const status = payload.status?.toUpperCase();
  
  let newSubscriptionStatus = 'active';
  
  // Map Shopify subscription status to our status
  switch (status) {
    case 'CANCELLED':
    case 'CANCELED':
      newSubscriptionStatus = 'cancelled';
      break;
    case 'EXPIRED':
      newSubscriptionStatus = 'expired';
      break;
    case 'FROZEN':
      newSubscriptionStatus = 'past_due';
      break;
    case 'ACTIVE':
      newSubscriptionStatus = 'active';
      break;
    case 'PENDING':
      newSubscriptionStatus = 'pending';
      break;
    default:
      console.log('⚠️ Unknown subscription status:', status);
      newSubscriptionStatus = 'inactive';
  }
  
  // Update profile subscription status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: newSubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Error updating profile subscription status:', profileError);
  } else {
    console.log(`✅ Profile subscription status updated to: ${newSubscriptionStatus}`);
  }

  // Update subscriptions table
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: newSubscriptionStatus,
      updated_at: new Date().toISOString(),
      ...(newSubscriptionStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
    })
    .eq('seller_id', userId)
    .eq('billing_provider', 'shopify');

  if (subError) {
    console.error('❌ Error updating subscription:', subError);
  }

  // Log event
  await supabase.from('system_logs').insert({
    type: 'subscription_update',
    function_name: 'shopify-webhook',
    message: `Subscription status changed to ${newSubscriptionStatus} for ${shopDomain}`,
    metadata: {
      shop: shopDomain,
      user_id: userId,
      old_status: payload.previous_status,
      new_status: status,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('✅ Subscription update webhook processed');
}

/**
 * Handle subscription_billing_attempts/failure webhook
 * Triggered when a payment fails
 */
async function handleBillingFailure(supabase: any, connection: any, payload: any, shopDomain: string) {
  console.log('⚠️ BILLING FAILURE webhook received:', { shop: shopDomain });
  
  const userId = connection.user_id;
  
  // Update profile to past_due status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Error updating profile:', profileError);
  } else {
    console.log('✅ Profile marked as past_due');
  }

  // Update subscriptions table
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('seller_id', userId)
    .eq('billing_provider', 'shopify');

  // Get user email for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  // Send payment failed notification
  if (profile?.email) {
    try {
      await supabase.functions.invoke('send-payment-failed', {
        body: {
          user_id: userId,
          amount: payload.amount || '0',
          currency: payload.currency || 'USD',
          reason: payload.error_message || 'Payment failed',
        },
      });
      console.log('✅ Payment failed notification sent');
    } catch (notifError) {
      console.error('❌ Error sending payment failed notification:', notifError);
    }
  }

  // Log event
  await supabase.from('system_logs').insert({
    type: 'billing_failure',
    function_name: 'shopify-webhook',
    message: `Payment failed for ${shopDomain}`,
    metadata: {
      shop: shopDomain,
      user_id: userId,
      error: payload.error_message,
      amount: payload.amount,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('✅ Billing failure webhook processed');
}

/**
 * Handle subscription_billing_attempts/success webhook
 * Triggered when a payment succeeds
 */
async function handleBillingSuccess(supabase: any, connection: any, payload: any, shopDomain: string) {
  console.log('✅ BILLING SUCCESS webhook received:', { shop: shopDomain });
  
  const userId = connection.user_id;
  
  // Update profile to active status (in case it was past_due)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Error updating profile:', profileError);
  } else {
    console.log('✅ Profile confirmed as active');
  }

  // Update subscriptions table with new period end if available
  const updateData: any = {
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  
  if (payload.billing_on) {
    updateData.current_period_end = payload.billing_on;
  }

  await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('seller_id', userId)
    .eq('billing_provider', 'shopify');

  // Log event
  await supabase.from('system_logs').insert({
    type: 'billing_success',
    function_name: 'shopify-webhook',
    message: `Payment succeeded for ${shopDomain}`,
    metadata: {
      shop: shopDomain,
      user_id: userId,
      amount: payload.amount,
      next_billing: payload.billing_on,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('✅ Billing success webhook processed');
}
