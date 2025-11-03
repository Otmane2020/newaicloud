import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { validateCreateCheckout } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting checkout session creation...');

    const requestBody = await req.json();

    // Validate input
    const validation = validateCreateCheckout(requestBody);
    if (!validation.success || !validation.data) {
      console.error('Validation errors:', validation.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { plan_id, billing_period, success_url, cancel_url, force_immediate_payment } = validation.data;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Plan found:', plan.name);

    // Get Stripe Price ID
    const stripePriceId = billing_period === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : (plan.stripe_price_id_monthly || plan.stripe_price_id);

    if (!stripePriceId || !stripePriceId.startsWith('price_')) {
      console.error(`❌ Invalid Stripe Price ID: ${stripePriceId}`);
      return new Response(
        JSON.stringify({ 
          error: `Configuration incomplète: Le forfait "${plan.name}" n'a pas de tarif Stripe configuré.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Vérifier si l'utilisateur a un trial actif
    const hasActiveTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
    const trialDaysRemaining = hasActiveTrial 
      ? Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    console.log('🎯 Trial status:', {
      hasActiveTrial,
      trialDaysRemaining,
      trialEndsAt: profile?.trial_ends_at,
      subscriptionStatus: profile?.subscription_status
    });

    let customerId = profile?.stripe_customer_id;

    // Récupérer les détails du prix pour vérifier la devise
    const priceDetails = await stripe.prices.retrieve(stripePriceId);
    const targetCurrency = priceDetails.currency; // 'eur' pour vos plans
    
    console.log(`🎯 Target currency for new checkout: ${targetCurrency}`);

    // Si customer existe, vérifier les conflits de devise
    if (customerId) {
      console.log('🔍 Checking existing customer for currency conflicts...');
      
      try {
        // Vérifier s'il y a des éléments en devise différente
        const [subscriptions, invoiceItems, schedules] = await Promise.all([
          stripe.subscriptions.list({ customer: customerId, limit: 100 }),
          stripe.invoiceItems.list({ customer: customerId, limit: 100 }),
          stripe.subscriptionSchedules.list({ customer: customerId, limit: 100 })
        ]);

        let hasCurrencyConflict = false;

        // Vérifier les abonnements
        for (const sub of subscriptions.data) {
          const subPrice = sub.items.data[0]?.price;
          if (subPrice && subPrice.currency !== targetCurrency) {
            console.log(`⚠️ Currency conflict found in subscription ${sub.id}: ${subPrice.currency} vs ${targetCurrency}`);
            hasCurrencyConflict = true;
            break;
          }
        }

        // Vérifier les invoice items
        if (!hasCurrencyConflict) {
          for (const item of invoiceItems.data) {
            if (item.currency !== targetCurrency) {
              console.log(`⚠️ Currency conflict found in invoice item ${item.id}: ${item.currency} vs ${targetCurrency}`);
              hasCurrencyConflict = true;
              break;
            }
          }
        }

        // Si conflit détecté, créer un nouveau customer
        if (hasCurrencyConflict) {
          console.log('🔄 Creating new Stripe customer to resolve currency conflict...');
          const newCustomer = await stripe.customers.create({
            email: user.email,
            name: profile?.full_name || user.user_metadata?.full_name,
            metadata: {
              user_id: user.id,
              replaced_customer: customerId,
              reason: 'currency_conflict'
            }
          });
          
          customerId = newCustomer.id;
          console.log(`✅ New customer created: ${customerId}`);

          // Mettre à jour le profil avec le nouveau customer_id
          await supabase
            .from('profiles')
            .update({ 
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        } else {
          console.log('✅ No currency conflict detected');
        }

      } catch (checkError) {
        console.error('⚠️ Error checking currency conflicts:', checkError);
        // En cas d'erreur, créer un nouveau customer par sécurité
        console.log('🔄 Creating new customer as fallback...');
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: profile?.full_name || user.user_metadata?.full_name,
          metadata: {
            user_id: user.id,
            replaced_customer: customerId,
            reason: 'check_error'
          }
        });
        customerId = newCustomer.id;
        
        await supabase
          .from('profiles')
          .update({ 
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } else {
      // Pas de customer existant, en créer un nouveau
      console.log('👥 Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // Annuler les anciens abonnements avant de créer un nouveau
    console.log('🔍 Checking for existing subscriptions to cancel...');
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    
    // Annuler tous les abonnements actifs, trialing, past_due ou unpaid
    const cancelableStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    for (const sub of existingSubscriptions.data) {
      if (cancelableStatuses.includes(sub.status)) {
        console.log(`🗑️ Cancelling existing subscription: ${sub.id} (status: ${sub.status})`);
        await stripe.subscriptions.cancel(sub.id, {
          prorate: true,
        });
      }
    }
    
    console.log('🎫 Creating Stripe checkout session...');

    const origin = req.headers.get('origin') || 'http://localhost:8080';
    
    // Configuration de base de la session
    const sessionConfig: any = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{
        price: stripePriceId,
        quantity: 1
      }],
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        billing_period: billing_period,
        plan_name: plan.name,
        upgraded_from_trial: hasActiveTrial ? 'true' : 'false'
      },
      success_url: success_url || `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/onboarding?checkout=cancelled&plan_id=${plan_id}`,
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    };

    // Déterminer la configuration du trial
    // IMPORTANT: Stripe n'accepte PAS trial_period_days: 0
    // Pour un paiement immédiat, on doit OMETTRE trial_period_days complètement
    if (force_immediate_payment) {
      // Paiement forcé immédiat (limite atteinte) - PAS de trial
      console.log('💳 Force immediate payment - no trial');
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period,
          upgraded_from_trial: hasActiveTrial ? 'true' : 'false',
          forced_payment: 'true'
        }
        // trial_period_days omis = paiement immédiat
      };
    } else if (hasActiveTrial && billing_period === 'monthly') {
      // Trial actif + abonnement mensuel = paiement immédiat SANS trial
      console.log('💳 Active trial with monthly plan - immediate payment');
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period,
          upgraded_from_trial: 'true',
          forced_payment: 'false'
        }
        // trial_period_days omis = paiement immédiat
      };
    } else if (hasActiveTrial && billing_period === 'yearly' && trialDaysRemaining > 0) {
      // Trial actif + abonnement annuel = conserver les jours restants
      console.log(`⏰ Active trial with yearly plan - preserve ${trialDaysRemaining} days`);
      sessionConfig.subscription_data = {
        trial_period_days: trialDaysRemaining,
        trial_end: Math.floor(new Date(profile.trial_ends_at).getTime() / 1000),
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period,
          upgraded_from_trial: 'true',
          forced_payment: 'false'
        }
      };
    } else {
      // Nouveau user sans trial actif = appliquer le trial du plan
      const trialDays = plan.trial_days ?? 14; // Use nullish coalescing to handle 0 correctly
      
      if (trialDays === 0) {
        // Pas de trial pour ce plan - paiement immédiat
        console.log(`💳 No trial for plan "${plan.name}" - immediate payment`);
        sessionConfig.subscription_data = {
          metadata: {
            user_id: user.id,
            plan_id: plan_id,
            billing_period: billing_period,
            upgraded_from_trial: 'false',
            forced_payment: 'false'
          }
          // trial_period_days omis = paiement immédiat
        };
      } else {
        // Appliquer le trial du plan
        console.log(`🎁 New subscription - apply ${trialDays} days trial`);
        sessionConfig.subscription_data = {
          trial_period_days: trialDays,
          metadata: {
            user_id: user.id,
            plan_id: plan_id,
            billing_period: billing_period,
            upgraded_from_trial: 'false',
            forced_payment: 'false'
          }
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Checkout session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        url: session.url,
        customer_id: customerId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});