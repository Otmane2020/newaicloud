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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep('Stripe key verified');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    logStep('Authenticating user with token');
    
    // Retry logic to handle race condition during signup
    let userData: any = null;
    let userError: any = null;
    let retries = 3;
    
    while (retries > 0) {
      const result = await supabaseClient.auth.getUser(token);
      userData = result.data;
      userError = result.error;
      
      if (!userError) break;
      
      // If user doesn't exist yet (race condition during signup), retry
      if (userError.message.includes('User from sub claim in JWT does not exist')) {
        logStep('User not yet available, retrying...', { retriesLeft: retries - 1 });
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        retries--;
      } else {
        break;
      }
    }
    
    // Handle authentication errors with proper status codes
    if (userError) {
      const errorMsg = userError.message.toLowerCase();
      if (errorMsg.includes('session') || errorMsg.includes('jwt') || errorMsg.includes('auth') || errorMsg.includes('token')) {
        logStep('Invalid or expired token detected');
        return new Response(JSON.stringify({ 
          error: 'invalid_session',
          message: 'Session expired or invalid. Please log in again.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!userData) {
      logStep('No user data returned');
      return new Response(JSON.stringify({ 
        error: 'invalid_session',
        message: 'Unable to retrieve user data. Please log in again.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    const user = userData.user;
    if (!user?.email) {
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
      
      // Check if user has trialing status in database
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('subscription_status, trial_ends_at, current_plan_id')
        .eq('id', user.id)
        .single();
      
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
    
    // Accept more subscription statuses: active, trialing, past_due, unpaid
    const validStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => validStatuses.includes(sub.status)
    );
    
    // CRITICAL VALIDATION: Paid plans cannot be in trialing status
    if (activeSubscription && activeSubscription.status === 'trialing') {
      const priceId = activeSubscription.items.data[0].price.id;
      logStep('Checking if trialing subscription is on a paid plan', { priceId });
      
      // Check if this price_id belongs to a non-trial plan
      const { data: plan } = await supabaseClient
        .from('subscription_plans')
        .select('id, name')
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .single();
      
      if (plan && plan.id !== 'trial') {
        logStep('INVALID STATE DETECTED: Paid plan in trialing status', { 
          plan_id: plan.id,
          plan_name: plan.name,
          subscription_id: activeSubscription.id,
          price_id: priceId
        });
        
        return new Response(JSON.stringify({ 
          subscribed: false,
          error: 'invalid_trial_state',
          message: 'Your subscription is in an invalid state. Please complete payment.',
          details: {
            plan_id: plan.id,
            plan_name: plan.name,
            subscription_id: activeSubscription.id
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
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
      
      // Update profile with correct status
      await supabaseClient
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
      
      // Fallback: check if user has active plan in Supabase
      const { data: profile } = await supabaseClient
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