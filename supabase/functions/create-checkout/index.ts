import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
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

    // Get user's product count to determine appropriate plan
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('products_count')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const productCount = usage?.products_count || 0;
    console.log('📊 User product count:', productCount);

    // Get all active plans to determine appropriate plan based on product count
    const { data: allPlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly_eur', { ascending: true });

    if (!allPlans || allPlans.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active plans available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find appropriate plan based on product count
    let plan = allPlans.find(p => p.id === plan_id);
    
    if (!plan) {
      console.error('❌ Requested plan not found:', plan_id);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user's product count exceeds the selected plan's limit
    // CRITICAL FIX: Ne pas auto-upgrade si l'utilisateur choisit explicitement un plan
    // L'auto-upgrade ne devrait s'appliquer que si l'utilisateur DÉPASSE la limite du plan sélectionné
    // Si l'utilisateur a 600 produits et sélectionne pro-500, on doit l'informer, PAS le forcer vers pro-1000
    if (productCount > plan.max_products && plan.max_products !== -1) {
      console.log(`⚠️ Product count (${productCount}) exceeds plan limit (${plan.max_products})`);
      
      // Ne PAS auto-upgrade - retourner une erreur explicite à l'utilisateur
      return new Response(
        JSON.stringify({ 
          error: `Votre boutique contient ${productCount} produits, ce qui dépasse la limite de ${plan.max_products} produits du plan ${plan.name}. Veuillez sélectionner un plan supérieur.`,
          suggested_plan_id: allPlans.find(p => p.max_products === -1 || p.max_products >= productCount)?.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Final selected plan:', plan.name);

    // Get Stripe Price ID based on billing period
    // All prices are in EUR
    let stripePriceId;

    if (billing_period === 'yearly') {
      stripePriceId = plan.stripe_price_id_yearly;
    } else {
      stripePriceId = plan.stripe_price_id_monthly;
    }

    console.log(`💰 Selected price ID: ${stripePriceId} (${billing_period})`);

    if (!stripePriceId || !stripePriceId.startsWith('price_')) {
      console.error(`❌ Invalid Stripe Price ID: ${stripePriceId}`);
      return new Response(
        JSON.stringify({ 
          error: `Configuration incomplète: Le forfait "${plan.name}" n'a pas de tarif Stripe configuré pour la période ${billing_period}.` 
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
          if (subPrice && subPrice.currency !== 'eur') {
            console.log(`⚠️ Currency conflict found in subscription ${sub.id}: ${subPrice.currency} vs eur`);
            hasCurrencyConflict = true;
            break;
          }
        }

        // Vérifier les invoice items
        if (!hasCurrencyConflict) {
          for (const item of invoiceItems.data) {
            if (item.currency !== 'eur') {
              console.log(`⚠️ Currency conflict found in invoice item ${item.id}: ${item.currency} vs eur`);
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
    let canceledTrialSub = false;
    for (const sub of existingSubscriptions.data) {
      if (cancelableStatuses.includes(sub.status)) {
        console.log(`🗑️ Cancelling existing subscription: ${sub.id} (status: ${sub.status})`);
        if (sub.status === 'trialing') {
          canceledTrialSub = true;
          console.log('⚠️ TRIAL SUBSCRIPTION CANCELLED - User upgrading from trial to paid');
        }
        await stripe.subscriptions.cancel(sub.id, {
          prorate: true,
        });
      }
    }
    
    if (force_immediate_payment && canceledTrialSub) {
      console.log('✅ Trial cancelled and immediate payment will be required');
    }
    
    console.log('🎫 Creating Stripe checkout session...');

    const origin = req.headers.get('origin') || 'http://localhost:8080';
    
    console.log('🎫 Manual promotion codes will be enabled in checkout');
    
    // SECURITY: Configuration de base avec carte OBLIGATOIRE
    // Même pour les trials, Stripe capture les infos de carte sans charger
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
      success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/onboarding?checkout=cancelled&plan_id=${plan_id}`,
      billing_address_collection: 'required',
      // CRITICAL: Toujours collecter le moyen de paiement
      payment_method_collection: 'always',
      // Permettre les codes promo manuels
      allow_promotion_codes: true
    };

    // Les prix annuels dans la base de données sont déjà réduits de 20%
    if (billing_period === 'yearly') {
      console.log('💰 Using pre-discounted yearly price (20% discount already applied in price)');
    }

    // Vérifier si l'utilisateur a déjà utilisé son trial à vie
    const { data: profileData } = await supabase
      .from('profiles')
      .select('has_used_trial')
      .eq('id', user.id)
      .single();
    
    const hasUsedTrial = profileData?.has_used_trial || false;
    console.log(`🎁 User trial status: has_used_trial=${hasUsedTrial}`);

    // Déterminer la configuration du trial
    // RÈGLES:
    // 1. Stripe n'accepte PAS trial_period_days: 0 - on doit OMETTRE ce champ pour paiement immédiat
    // 2. Trial UNIQUEMENT si: !hasUsedTrial && plan.trial_days > 0 && !force_immediate_payment && !hasActiveTrial
    // 3. Starter plan a trial_days = 0, donc PAS de trial possible
    if (force_immediate_payment) {
      // Paiement forcé immédiat (limite atteinte OU upgrade depuis trial) - PAS de trial
      console.log('💳 Force immediate payment - no trial period (PAYMENT REQUIRED NOW)');
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period,
          upgraded_from_trial: hasActiveTrial ? 'true' : 'false',
          forced_payment: 'true',
          trial_cancelled: canceledTrialSub ? 'true' : 'false'
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
    } else if (hasActiveTrial && billing_period === 'yearly') {
      // Trial actif + abonnement annuel = paiement immédiat
      console.log('💳 Active trial with yearly plan - immediate payment');
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          billing_period: billing_period,
          upgraded_from_trial: 'true',
          forced_payment: 'false'
        }
      };
    } else {
      // Nouveau user ou user avec trial expiré
      const trialDays = plan.trial_days ?? 0;
      
      // RÈGLE: Trial UNIQUEMENT si l'utilisateur ne l'a JAMAIS utilisé ET le plan offre un trial
      if (trialDays > 0 && !hasUsedTrial) {
        // Appliquer le trial ET marquer comme utilisé
        console.log(`🎁 FIRST TIME TRIAL - Applying ${trialDays} days trial for user (lifetime trial)`);
        sessionConfig.subscription_data = {
          trial_period_days: trialDays,
          metadata: {
            user_id: user.id,
            plan_id: plan_id,
            billing_period: billing_period,
            upgraded_from_trial: 'false',
            forced_payment: 'false',
            first_trial: 'true'
          }
        };
        
        // Marquer le trial comme utilisé (une seule fois dans la vie de l'utilisateur)
        await supabase
          .from('profiles')
          .update({ has_used_trial: true })
          .eq('id', user.id);
        
        console.log('✅ User marked as has_used_trial=true (lifetime trial claimed)');
      } else {
        // Pas de trial: soit déjà utilisé, soit plan sans trial (Starter)
        if (hasUsedTrial) {
          console.log(`💳 User already used their lifetime trial - immediate payment`);
        } else if (trialDays === 0) {
          console.log(`💳 Plan "${plan.name}" has no trial (trial_days=0) - immediate payment`);
        }
        
        sessionConfig.subscription_data = {
          metadata: {
            user_id: user.id,
            plan_id: plan_id,
            billing_period: billing_period,
            upgraded_from_trial: 'false',
            forced_payment: 'false',
            trial_already_used: hasUsedTrial ? 'true' : 'false'
          }
          // trial_period_days omis = paiement immédiat
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