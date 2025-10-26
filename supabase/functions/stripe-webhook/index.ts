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
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No signature found');
      return new Response('No signature', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret || ''
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`, { status: 400 });
    }

    console.log('✅ Webhook event received:', event.type);

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
  const { customer, subscription, metadata, client_reference_id } = session;
  const userId = client_reference_id || metadata?.user_id;

  if (!userId) {
    console.error('❌ No user_id found in session');
    return;
  }

  console.log('🎉 Checkout completed for user:', userId);

  // Récupérer les détails utilisateur
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email;
  const userName = userData?.user?.user_metadata?.full_name;

  if (subscription && typeof subscription === 'string') {
    // Récupérer les détails de la subscription Stripe
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscription);
    
    // Déterminer le statut (trialing pendant l'essai, active après)
    const status = subscriptionDetails.status;
    const trialEnd = subscriptionDetails.trial_end 
      ? new Date(subscriptionDetails.trial_end * 1000).toISOString()
      : null;

    console.log('📋 Subscription status:', status);
    console.log('⏰ Trial end:', trialEnd);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
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
      console.log('✅ Profile updated for user:', userId);
    }

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        seller_id: userId,
        stripe_subscription_id: subscription,
        plan_id: metadata?.plan_id,
        status: status,
        billing_period: metadata?.billing_period || 'monthly',
        current_period_start: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscriptionDetails.current_period_end * 1000).toISOString(),
        trial_start: trialEnd ? new Date().toISOString() : null,
        trial_end: trialEnd,
        cancel_at_period_end: false
      }, {
        onConflict: 'stripe_subscription_id'
      });

    if (subError) {
      console.error('❌ Error creating subscription:', subError);
    } else {
      console.log('✅ Subscription created');
    }

    // Envoyer l'email de confirmation
    if (userEmail) {
      try {
        await supabase.functions.invoke('send-subscription-confirmed', {
          body: {
            email: userEmail,
            planName: metadata?.plan_name || 'Premium',
            trialEnd: trialEnd,
            fullName: userName
          }
        });
        console.log('✅ Confirmation email sent to:', userEmail);
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { status, current_period_start, current_period_end, cancel_at_period_end, metadata } = subscription;
  
  console.log('🔄 Subscription updated:', subscription.id);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      current_period_start: new Date(current_period_start * 1000).toISOString(),
      current_period_end: new Date(current_period_end * 1000).toISOString(),
      cancel_at_period_end,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Error updating subscription:', error);
  } else {
    console.log('✅ Subscription updated');
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  const userId = metadata?.user_id;

  console.log('❌ Subscription cancelled:', subscription.id);

  if (userId) {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        current_plan_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  }

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log('✅ Subscription deleted');
}