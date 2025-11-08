import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-SUBSCRIPTION-SYNC] ${step}${detailsStr}`);
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

    // Get current profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    logStep('Current profile', { 
      subscription_status: profile?.subscription_status,
      stripe_customer_id: profile?.stripe_customer_id
    });

    // Check if we need to sync
    if (profile?.stripe_customer_id) {
      logStep('Profile already has stripe_customer_id, no sync needed');
      return new Response(JSON.stringify({ 
        success: true,
        already_synced: true,
        message: 'Profil déjà synchronisé avec Stripe'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Search for customer in Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep('No Stripe customer found for this email');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'no_stripe_customer',
        message: 'Aucun client Stripe trouvé pour cet email. Veuillez refaire le checkout.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customer = customers.data[0];
    logStep('Found Stripe customer', { customerId: customer.id });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    logStep('Subscriptions found', { 
      count: subscriptions.data.length,
      statuses: subscriptions.data.map(s => s.status)
    });

    // Find an active subscription
    const activeSubscription = subscriptions.data.find(s => 
      ['active', 'trialing', 'past_due'].includes(s.status)
    );

    if (!activeSubscription) {
      logStep('No active subscription found in Stripe');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'no_active_subscription',
        message: 'Aucun abonnement actif trouvé dans Stripe. Veuillez refaire le checkout.',
        customer_id: customer.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep('Found active subscription', { 
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status
    });

    // Map Stripe price to plan ID
    const priceId = activeSubscription.items.data[0]?.price?.id;
    const planIdMap: Record<string, string> = {
      'price_1QhDezBu59MKCVSyvQpXPfHl': 'starter',
      'price_1QhDfgBu59MKCVSy7lAzlwBX': 'growth',
      'price_1QhDgIBu59MKCVSy3W9Ru7bL': 'pro',
    };
    const planId = planIdMap[priceId || ''] || 'starter';

    logStep('Mapped plan', { priceId, planId });

    // Update profile with Stripe data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        stripe_customer_id: customer.id,
        subscription_status: activeSubscription.status === 'trialing' ? 'trialing' : 'active',
        current_plan_id: planId,
        trial_ends_at: activeSubscription.trial_end 
          ? new Date(activeSubscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    logStep('Profile updated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      synced: true,
      message: 'Synchronisation réussie avec Stripe',
      data: {
        customer_id: customer.id,
        subscription_id: activeSubscription.id,
        status: activeSubscription.status,
        plan_id: planId
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in fix-subscription-sync', { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
