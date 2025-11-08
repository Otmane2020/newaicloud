import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-INVALID-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    
    logStep('User authenticated', { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error('No Stripe customer found');
    }
    
    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });
    
    // Find subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'trialing',
      limit: 10,
    });
    
    logStep('Found trialing subscriptions', { count: subscriptions.data.length });
    
    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'No trialing subscriptions found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Check each trialing subscription
    let fixedCount = 0;
    const results = [];
    
    for (const subscription of subscriptions.data) {
      const priceId = subscription.items.data[0].price.id;
      const subscriptionId = subscription.id;
      
      logStep('Checking subscription', { subscriptionId, priceId, status: subscription.status });
      
      // Check if this price belongs to a paid plan (not trial)
      const { data: plan } = await supabaseClient
        .from('subscription_plans')
        .select('id, name, stripe_price_id_monthly, stripe_price_id_yearly')
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .single();
      
      // Any plan that's not 'trial' shouldn't be in trialing status
      // This includes starter, pro, business, etc.
      if (plan && plan.id !== 'trial') {
        logStep('INVALID STATE: Paid plan in trial mode, fixing...', { 
          plan_id: plan.id,
          plan_name: plan.name,
          subscription_id: subscriptionId
        });
        
        // Cancel the invalid trial subscription
        await stripe.subscriptions.cancel(subscriptionId);
        logStep('Cancelled invalid trial subscription', { subscriptionId });
        
        // Create a new checkout session for immediate payment
        const origin = req.headers.get('origin') || 'https://yourdomain.com';
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [{
            price: priceId,
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: `${origin}/dashboard?payment=success`,
          cancel_url: `${origin}/dashboard?payment=cancelled`,
          subscription_data: {
            metadata: {
              seller_id: user.id,
              fixed_from_invalid_trial: 'true',
              original_subscription_id: subscriptionId,
            }
          }
        });
        
        logStep('Created new checkout session', { sessionId: session.id, url: session.url });
        
        // Update profile to inactive until payment is completed
        await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        fixedCount++;
        results.push({
          subscription_id: subscriptionId,
          plan: plan.name,
          checkout_url: session.url,
          status: 'fixed'
        });
      } else {
        logStep('Valid trial subscription, skipping', { subscriptionId });
        results.push({
          subscription_id: subscriptionId,
          plan: plan?.name || 'Unknown',
          status: 'valid_trial'
        });
      }
    }
    
    logStep('Fix complete', { fixedCount, totalChecked: subscriptions.data.length });
    
    return new Response(JSON.stringify({
      success: true,
      fixed_count: fixedCount,
      total_checked: subscriptions.data.length,
      results: results,
      checkout_url: results.find(r => r.checkout_url)?.checkout_url || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
