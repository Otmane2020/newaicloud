import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      logStep('ERROR: STRIPE_SECRET_KEY not found');
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    logStep('Stripe key verified');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('ERROR: No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    logStep('Authenticating user');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError) {
      logStep('ERROR: Failed to get user', { error: userError.message });
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      logStep('ERROR: No user found');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get profile with Stripe customer ID
    logStep('Fetching user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep('ERROR: Failed to fetch profile', { error: profileError.message });
      return new Response(
        JSON.stringify({ error: `Failed to fetch profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let customerId = profile?.stripe_customer_id;

    // Fallback: If no customer ID in profile, search Stripe by email
    if (!customerId) {
      logStep('No customer ID in profile, searching Stripe by email', { email: user.email });
      
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep('Found Stripe customer by email', { customerId });

        // Update profile with the customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          logStep('WARNING: Failed to update profile with customer ID', { error: updateError.message });
        } else {
          logStep('Profile updated with Stripe customer ID');
        }
      } else {
        logStep('ERROR: No Stripe customer found by email');
        return new Response(
          JSON.stringify({ error: 'No Stripe customer found. Please subscribe first.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      logStep('Found Stripe customer ID in profile', { customerId });
    }

    // Create portal session
    const origin = req.headers.get('origin') || 'http://localhost:8080';
    logStep('Creating Stripe portal session', { customerId, returnUrl: `${origin}/account?tab=subscription` });
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account?tab=subscription`,
    });

    logStep('Portal session created successfully', { sessionId: portalSession.id, url: portalSession.url });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logStep('ERROR in customer-portal', { message: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
