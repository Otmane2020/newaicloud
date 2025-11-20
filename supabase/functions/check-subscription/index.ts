import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep('Stripe key verified');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    // Create client with ANON key and authorization header to validate user token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false } 
      }
    );

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    logStep('Authenticating user');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    // Retry logic to handle race condition during signup
    let retries = 3;
    
    while (retries > 0 && userError) {
      logStep('User not yet available, retrying...', { retriesLeft: retries - 1 });
      await new Promise(resolve => setTimeout(resolve, 500));
      retries--;
      const retryResult = await supabaseClient.auth.getUser();
      if (!retryResult.error) {
        break;
      }
    }
    
    // Handle authentication errors
    if (userError || !user) {
      logStep('Authentication failed', { error: userError });
      return new Response(JSON.stringify({ 
        error: 'invalid_session',
        message: 'Session expired or invalid. Please log in again.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    if (!user.email) {
      logStep('User missing email');
      return new Response(JSON.stringify({ 
        error: 'invalid_user',
        message: 'User not authenticated or email not available.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    logStep('User authenticated', { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep('No customer found, checking database profile');
      
      // Check if user has trial or legacy trial-like status in database
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, trial_ends_at, current_plan_id')
        .eq('id', user.id)
        .single();
      
      // ✅ Standard trial profile (status = trialing)
      if (profile?.subscription_status === 'trialing' && profile.trial_ends_at) {
        try {
          const trialEnd = new Date(profile.trial_ends_at);
          if (!isNaN(trialEnd.getTime()) && trialEnd > new Date()) {
            logStep('Valid trial found in database');
            return new Response(JSON.stringify({ 
              subscribed: true,
              status: 'trialing',
              plan_id: profile.current_plan_id,
              trial_end: profile.trial_ends_at
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        } catch (dateError) {
          logStep('Invalid trial_ends_at date', { trial_ends_at: profile.trial_ends_at });
        }
      }

      // ✅ Legacy profiles: status=active but plan_id="trial" with a future trial_ends_at
      if (profile?.subscription_status === 'active' && profile.current_plan_id === 'trial' && profile.trial_ends_at) {
        try {
          const trialEnd = new Date(profile.trial_ends_at);
          if (!isNaN(trialEnd.getTime()) && trialEnd > new Date()) {
            logStep('Legacy active-trial profile treated as valid trial', {
              subscription_status: profile.subscription_status,
              current_plan_id: profile.current_plan_id,
              trial_end: profile.trial_ends_at,
            });
            return new Response(JSON.stringify({
              subscribed: true,
              status: 'trialing',
              plan_id: 'trial',
              trial_end: profile.trial_ends_at,
              source: 'legacy_trial_profile',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        } catch (dateError) {
          logStep('Invalid legacy trial_ends_at date', { trial_ends_at: profile.trial_ends_at });
        }
      }
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });

    logStep('Fetching subscriptions for customer');
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    
    logStep('Subscriptions found', { 
      count: subscriptions.data.length,
      subscriptions: subscriptions.data.map((s: Stripe.Subscription) => ({ 
        id: s.id, 
        status: s.status,
        created: s.created ? new Date(s.created * 1000).toISOString() : null,
        current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null
      }))
    });
    
    // SECURITY: Accepter UNIQUEMENT 'active' et 'trialing' comme statuts valides
    // past_due et unpaid ne sont PAS des abonnements valides
    const validStatuses = ['active', 'trialing'];
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => validStatuses.includes(sub.status)
    );
    
    // CRITICAL CHECK: Pour les trials, vérifier que la date de fin n'est pas dépassée
    if (activeSubscription && activeSubscription.status === 'trialing') {
      const trialEnd = activeSubscription.trial_end;
      if (trialEnd && trialEnd * 1000 < Date.now()) {
        logStep('Trial expired but status not updated', { trialEnd: new Date(trialEnd * 1000) });
        
        // Update profile using admin client
        await supabaseAdmin
          .from('profiles')
          .update({ 
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        return new Response(JSON.stringify({ 
          subscribed: false,
          error: 'trial_expired',
          message: 'Your trial has expired. Please upgrade to continue.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      // ✅ Accept trialing status for paid plans when there's a valid Stripe subscription
      // The SubscriptionGuard handles the case of trialing without stripe_customer_id
      logStep('Trialing subscription found with valid Stripe customer', { 
        subscriptionId: activeSubscription.id,
        status: activeSubscription.status
      });
    }
    
    const hasActiveSub = !!activeSubscription;
    let planId = null;
    let subscriptionEnd = null;
    let status = null;

    if (hasActiveSub && activeSubscription) {
      const subscription = activeSubscription;
      status = subscription.status;
      
      // Safely handle subscription end date
      if (subscription.current_period_end) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      
      logStep('Active subscription found', { 
        subscriptionId: subscription.id, 
        status: status,
        endDate: subscriptionEnd 
      });
      
      planId = subscription.items.data[0].price.product as string;
      logStep('Determined subscription plan', { planId });
      
      // Update profile with correct status using admin client
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: status,
          stripe_customer_id: customerId,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      logStep('Profile updated with subscription status');
    } else {
      logStep('No active subscription found in Stripe, checking Supabase profile');
      
      // Fallback: check if user has active plan in Supabase using admin client
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, current_plan_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.subscription_status === 'active' && profile.current_plan_id) {
        logStep('Found active plan in Supabase, returning as subscribed', {
          plan_id: profile.current_plan_id,
          status: profile.subscription_status
        });
        
        return new Response(JSON.stringify({
          subscribed: true,
          status: 'active',
          plan_id: profile.current_plan_id,
          source: 'supabase_fallback'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      logStep('No active subscription found anywhere');
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      status: status,
      plan_id: planId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in check-subscription', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});