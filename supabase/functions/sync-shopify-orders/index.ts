import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SHOPIFY-ORDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    // Get user's Shopify connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('shopify_connections')
      .select('*')
      .eq('seller_id', user.id);

    if (connectionsError) throw connectionsError;
    if (!connections || connections.length === 0) {
      throw new Error("No Shopify connection found");
    }

    let totalSynced = 0;
    let totalErrors = 0;

    for (const connection of connections) {
      try {
        logStep("Processing store", { storeId: connection.id, storeName: connection.store_name });

        // Decrypt token
        const { data: decryptData, error: decryptError } = await supabaseClient.functions.invoke(
          'encrypt-shopify-token',
          {
            body: { 
              action: 'decrypt',
              encryptedToken: connection.encrypted_token,
              iv: connection.token_iv
            }
          }
        );

        if (decryptError || !decryptData?.token) {
          logStep("Error decrypting token", { error: decryptError });
          totalErrors++;
          continue;
        }

        const accessToken = decryptData.token;
        const shopDomain = connection.store_domain;

        // Fetch orders from Shopify
        const ordersUrl = `https://${shopDomain}/admin/api/2024-10/orders.json?status=any&limit=250`;
        
        const ordersResponse = await fetch(ordersUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!ordersResponse.ok) {
          logStep("Error fetching orders", { status: ordersResponse.status });
          totalErrors++;
          continue;
        }

        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];

        logStep(`Found ${orders.length} orders to sync`);

        // Process each order
        for (const order of orders) {
          try {
            const fulfillments = order.fulfillments || [];
            const firstFulfillment = fulfillments[0];
            const trackingInfo = firstFulfillment?.tracking_company || null;
            const trackingNumber = firstFulfillment?.tracking_number || null;
            const trackingUrl = firstFulfillment?.tracking_url || null;

            const orderData = {
              user_id: user.id,
              store_id: connection.id,
              shopify_order_id: order.id,
              order_number: order.name || `#${order.order_number}`,
              customer_email: order.customer?.email || order.email || null,
              customer_name: order.customer 
                ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() 
                : null,
              total_price: parseFloat(order.total_price || '0'),
              currency: order.currency || 'EUR',
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status || 'unfulfilled',
              tracking_number: trackingNumber,
              tracking_url: trackingUrl,
              carrier: trackingInfo,
              estimated_delivery: null,
              order_date: order.created_at,
              notes: order.note || null,
              raw_data: order,
            };

            // Upsert order
            const { error: upsertError } = await supabaseClient
              .from('chat_order_tracking')
              .upsert(orderData, {
                onConflict: 'user_id,shopify_order_id',
              });

            if (upsertError) {
              logStep("Error upserting order", { orderId: order.id, error: upsertError });
              totalErrors++;
            } else {
              totalSynced++;
            }
          } catch (orderError) {
            logStep("Error processing order", { orderId: order.id, error: orderError });
            totalErrors++;
          }
        }
      } catch (storeError) {
        logStep("Error processing store", { storeId: connection.id, error: storeError });
        totalErrors++;
      }
    }

    logStep("Sync completed", { totalSynced, totalErrors });

    return new Response(
      JSON.stringify({ 
        success: true,
        synced: totalSynced,
        errors: totalErrors,
        message: `${totalSynced} commandes synchronisées avec succès${totalErrors > 0 ? `, ${totalErrors} erreurs` : ''}`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    let errorMessage = "Unknown error";
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { message: error.message, stack: error.stack };
    } else {
      try {
        errorMessage = JSON.stringify(error);
        errorDetails = error;
      } catch {
        errorMessage = String(error);
        errorDetails = { raw: String(error) };
      }
    }
    
    logStep("ERROR", errorDetails);
    return new Response(
      JSON.stringify({ error: errorMessage, details: errorDetails }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});