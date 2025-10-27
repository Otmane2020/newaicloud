import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
  console.log('🎯 Webhook received:', {
    method: req.method,
    hasSignature: !!req.headers.get('stripe-signature'),
    hasSecret: !!webhookSecret,
  });

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No signature found');
      return new Response('No signature', { status: 400 });
    }

    if (!webhookSecret) {
      console.error('❌ No webhook secret configured');
      return new Response('No webhook secret', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`, { status: 400 });
    }

    console.log('📨 Webhook event received:', event.type, 'ID:', event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        console.log('📧 Invoice payment succeeded:', event.data.object.id);
        break;
      
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processed successfully');
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('🛒 Processing checkout.session.completed');
    const { customer, subscription, metadata, client_reference_id } = session;
    const userId = client_reference_id || metadata?.user_id;

    if (!userId) {
      console.error('❌ No user_id found in session');
      return;
    }

    console.log('👤 User ID:', userId);
    console.log('💳 Customer ID:', customer);

    // Récupérer les détails utilisateur
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData) {
      console.error('❌ Error fetching user:', userError);
      return;
    }
    
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name;
    console.log('✅ User found:', userEmail);

    if (subscription && typeof subscription === 'string') {
      console.log('📝 Fetching subscription details:', subscription);
      
      // Récupérer les détails de la subscription Stripe
      const subscriptionDetails = await stripe.subscriptions.retrieve(subscription);
      
      // Déterminer le statut (trialing pendant l'essai, active après)
      const status = subscriptionDetails.status;
      const trialEnd = subscriptionDetails.trial_end 
        ? new Date(subscriptionDetails.trial_end * 1000).toISOString()
        : null;

      console.log('📋 Subscription status:', status);
      console.log('⏰ Trial end:', trialEnd);
      console.log('📦 Plan ID:', metadata?.plan_id);

      console.log('💾 Updating profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: typeof customer === 'string' ? customer : null,
          subscription_status: status,
          current_plan_id: metadata?.plan_id,
          trial_ends_at: trialEnd,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
      } else {
        console.log('✅ Profile updated successfully');
      }

      console.log('💾 Creating/updating subscription record...');
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          seller_id: userId,
          stripe_subscription_id: subscription,
          plan_id: metadata?.plan_id,
          status: status,
          billing_period: metadata?.billing_period || 'monthly',
          current_period_start: subscriptionDetails.current_period_start 
            ? new Date(subscriptionDetails.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscriptionDetails.current_period_end 
            ? new Date(subscriptionDetails.current_period_end * 1000).toISOString()
            : null,
          trial_start: trialEnd ? new Date().toISOString() : null,
          trial_end: trialEnd,
          cancel_at_period_end: false
        }, {
          onConflict: 'stripe_subscription_id'
        });

      if (subError) {
        console.error('❌ Error creating subscription:', subError);
      } else {
        console.log('✅ Subscription record saved');
      }

      // Envoyer l'email de confirmation
      if (userEmail) {
        try {
          console.log('📧 Sending confirmation email to:', userEmail);
          await supabase.functions.invoke('send-subscription-confirmed', {
            body: {
              email: userEmail,
              planName: metadata?.plan_name || 'Premium',
              trialEnd: trialEnd,
              fullName: userName
            }
          });
          console.log('✅ Confirmation email sent');
        } catch (emailError) {
          console.error('❌ Error sending confirmation email:', emailError);
        }
      }
      
      console.log('✅ Checkout processing completed for user:', userId);
    } else {
      console.warn('⚠️ No subscription found in checkout session');
    }
  } catch (error) {
    console.error('❌ Error in handleCheckoutCompleted:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('🔄 Processing subscription.updated/created');
    const { status, current_period_start, current_period_end, cancel_at_period_end, metadata, customer } = subscription;
    
    console.log('📋 Subscription:', subscription.id, 'Status:', status);
    console.log('💳 Customer:', customer);

    // Get the Stripe price ID and map it to our plan ID
    const stripePriceId = subscription.items.data[0].price.id;
    console.log('💰 Stripe Price ID:', stripePriceId);

    // Find the corresponding plan in our database
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id, stripe_price_id_monthly, stripe_price_id_yearly')
      .eq('is_active', true);

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
    }

    // Map the Stripe price ID to our plan ID
    let planId = metadata?.plan_id; // Try metadata first
    if (!planId && plans) {
      const matchingPlan = plans.find(
        plan => plan.stripe_price_id_monthly === stripePriceId || plan.stripe_price_id_yearly === stripePriceId
      );
      if (matchingPlan) {
        planId = matchingPlan.id;
        console.log('✅ Mapped Stripe price to plan:', planId);
      } else {
        console.warn('⚠️ No matching plan found for Stripe price:', stripePriceId);
      }
    }

    // Update subscriptions table
    console.log('💾 Updating subscriptions table...');
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: status,
        plan_id: planId || 'starter', // Fallback to starter
        current_period_start: new Date(current_period_start * 1000).toISOString(),
        current_period_end: new Date(current_period_end * 1000).toISOString(),
        cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Error updating subscription:', error);
    } else {
      console.log('✅ Subscription table updated');
    }

    // CRITICAL: Also update the profiles table with the subscription status
    // This is what SubscriptionGuard checks!
    const userId = metadata?.user_id;
    if (userId) {
      console.log('👤 Updating profile for user:', userId);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: status,
          current_plan_id: planId || 'starter', // Use mapped plan ID
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error updating profile subscription status:', profileError);
      } else {
        console.log('✅ Profile subscription status updated to:', status, 'with plan:', planId);
      }
    } else {
      console.warn('⚠️ No user_id in subscription metadata, trying to find by customer_id');
      
      // Fallback: try to find user by stripe_customer_id
      if (customer && typeof customer === 'string') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customer)
          .single();
        
        if (profileError) {
          console.error('❌ Error finding profile by customer_id:', profileError);
        } else if (profile) {
          console.log('👤 Found profile via customer_id:', profile.id);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: status,
              current_plan_id: planId || 'starter', // Use mapped plan ID
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

          if (updateError) {
            console.error('❌ Error updating profile via customer_id:', updateError);
          } else {
            console.log('✅ Profile updated via customer_id lookup with plan:', planId);
          }
        } else {
          console.error('❌ No profile found for customer_id:', customer);
        }
      }
    }
    
    console.log('✅ Subscription update completed');
  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('🗑️ Processing subscription.deleted');
    const { metadata, customer } = subscription;
    const userId = metadata?.user_id;

    console.log('📋 Subscription:', subscription.id);
    console.log('💳 Customer:', customer);

    if (userId) {
      console.log('👤 Updating profile for user:', userId);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          current_plan_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
      } else {
        console.log('✅ Profile updated');
      }
    } else if (customer && typeof customer === 'string') {
      console.log('⚠️ No user_id, trying customer_id lookup');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customer)
        .single();

      if (profileError) {
        console.error('❌ Error finding profile:', profileError);
      } else if (profile) {
        console.log('👤 Found profile:', profile.id);
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'cancelled',
            current_plan_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
        console.log('✅ Profile updated via customer lookup');
      }
    }

    console.log('💾 Updating subscription record...');
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (subError) {
      console.error('❌ Error updating subscription:', subError);
    } else {
      console.log('✅ Subscription record updated');
    }

    console.log('✅ Subscription deletion completed');
  } catch (error) {
    console.error('❌ Error in handleSubscriptionDeleted:', error);
    throw error;
  }
}