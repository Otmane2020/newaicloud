import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DIAGNOSE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Get Supabase profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    logStep('Supabase profile retrieved', { 
      subscription_status: profile?.subscription_status,
      current_plan_id: profile?.current_plan_id,
      stripe_customer_id: profile?.stripe_customer_id
    });

    // Get Stripe data
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let stripeData = null;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      const customer = customers.data[0];
      logStep('Stripe customer found', { customerId: customer.id });

      // Get subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      // Get payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        limit: 10,
      });

      stripeData = {
        customer_id: customer.id,
        email: customer.email,
        created: new Date(customer.created * 1000).toISOString(),
        subscriptions: subscriptions.data.map((s: Stripe.Subscription) => ({
          id: s.id,
          status: s.status,
          created: new Date(s.created * 1000).toISOString(),
          current_period_start: new Date(s.current_period_start * 1000).toISOString(),
          current_period_end: new Date(s.current_period_end * 1000).toISOString(),
          plan: s.items.data[0]?.price?.product,
          price: s.items.data[0]?.price?.id,
        })),
        payment_methods: paymentMethods.data.map((pm: Stripe.PaymentMethod) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          } : null,
        })),
      };

      logStep('Stripe data compiled', { 
        subscriptions_count: stripeData.subscriptions.length,
        payment_methods_count: stripeData.payment_methods.length 
      });
    } else {
      logStep('No Stripe customer found');
    }

    // Determine sync status
    let syncStatus = 'unknown';
    if (!stripeData) {
      syncStatus = profile?.subscription_status === 'active' ? 'supabase_only' : 'no_subscription';
    } else if (stripeData.subscriptions.length === 0) {
      syncStatus = profile?.subscription_status === 'active' ? 'out_of_sync' : 'no_subscription';
    } else {
      const validStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
      const hasValidStripeSub = stripeData.subscriptions.some((s: any) => validStatuses.includes(s.status));
      const hasValidSupabaseSub = profile?.subscription_status === 'active';
      
      if (hasValidStripeSub && hasValidSupabaseSub) {
        syncStatus = 'synced';
      } else if (hasValidStripeSub && !hasValidSupabaseSub) {
        syncStatus = 'stripe_ahead';
      } else if (!hasValidStripeSub && hasValidSupabaseSub) {
        syncStatus = 'supabase_ahead';
      } else {
        syncStatus = 'both_inactive';
      }
    }

    const diagnosticReport = {
      user: {
        id: user.id,
        email: user.email,
      },
      supabase: {
        subscription_status: profile?.subscription_status,
        current_plan_id: profile?.current_plan_id,
        stripe_customer_id: profile?.stripe_customer_id,
        trial_ends_at: profile?.trial_ends_at,
        onboarding_completed: profile?.onboarding_completed,
      },
      stripe: stripeData,
      sync_status: syncStatus,
      timestamp: new Date().toISOString(),
    };

    logStep('Diagnostic complete', { sync_status: syncStatus });

    return new Response(JSON.stringify(diagnosticReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in diagnose-subscription', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
