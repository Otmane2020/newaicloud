import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
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

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  const body = await req.text();
  // Don't add healthCheck handler to webhook - signature validation required

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No signature found');
      return new Response('No signature', { status: 400 });
    }

    if (!webhookSecret) {
      console.error('❌ No webhook secret configured');
      return new Response('No webhook secret', { status: 400 });
    }

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
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processed successfully');
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    
    // Log detailed error for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    console.error('📋 Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Send notification to admins about webhook failure
    try {
      await supabase.functions.invoke('send-admin-email', {
        body: {
          subject: '🚨 Stripe Webhook Failed',
          body: `Webhook processing failed:\n\n${JSON.stringify(errorDetails, null, 2)}`,
        }
      });
    } catch (notifyError) {
      console.error('Failed to send admin notification:', notifyError);
    }
    
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
      
      // Si l'utilisateur upgrade depuis un trial actif, ANNULER le trial car il a payé immédiatement
      const upgradedFromTrial = metadata?.upgraded_from_trial === 'true';
      const forcedPayment = metadata?.forced_payment === 'true';
      
      // Récupérer le profile existant pour vérifier le trial_ends_at
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('trial_ends_at')
        .eq('id', userId)
        .single();
      
      // CRITICAL FIX: Si upgrade depuis trial OU paiement forcé, annuler le trial
      const trialEnd = upgradedFromTrial || forcedPayment
        ? null // ✅ Annuler le trial pour les upgrades et paiements forcés
        : (subscriptionDetails.trial_end 
            ? new Date(subscriptionDetails.trial_end * 1000).toISOString()
            : null);

      console.log('📋 Subscription status:', status);
      console.log('⏰ Trial calculation:', {
        upgradedFromTrial,
        forcedPayment,
        subscriptionTrialEnd: subscriptionDetails.trial_end,
        finalTrialEnd: trialEnd,
        reason: upgradedFromTrial ? 'Upgrade from trial - canceled' : forcedPayment ? 'Forced payment - no trial' : 'Normal trial'
      });
      console.log('🔄 Upgraded from trial:', upgradedFromTrial);
      console.log('📦 Plan ID:', metadata?.plan_id);

      console.log('💾 Updating profile with:', {
        subscription_status: status === 'trialing' && upgradedFromTrial ? 'active' : status,
        trial_ends_at: trialEnd,
        reason: trialEnd === null ? 'Trial canceled due to upgrade/payment' : 'Trial maintained'
      });
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: typeof customer === 'string' ? customer : null,
          subscription_status: status === 'trialing' && upgradedFromTrial ? 'active' : status,
          current_plan_id: metadata?.plan_id,
          trial_ends_at: trialEnd, // Sera null pour les upgrades
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
    let oldPlanId: string | null = null;
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
      
      // Get old plan ID to detect upgrades
      const { data: oldProfile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', userId)
        .single();
      
      oldPlanId = oldProfile?.current_plan_id;
      
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
        
        // Trigger auto-sync if this is an upgrade (plan changed and status is active)
        if (oldPlanId && planId && oldPlanId !== planId && status === 'active') {
          console.log('🚀 Plan upgrade detected, triggering auto-sync...');
          supabase.functions.invoke('trigger-auto-sync', {
            body: { user_id: userId }
          }).then(() => {
            console.log('✅ Auto-sync triggered successfully');
          }).catch((error) => {
            console.error('❌ Failed to trigger auto-sync:', error);
          });
        }
      }
    } else {
      console.warn('⚠️ No user_id in subscription metadata, trying to find by customer_id');
      
      // Fallback: try to find user by stripe_customer_id
      if (customer && typeof customer === 'string') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, current_plan_id')
          .eq('stripe_customer_id', customer)
          .single();
        
        if (profileError) {
          console.error('❌ Error finding profile by customer_id:', profileError);
        } else if (profile) {
          console.log('👤 Found profile via customer_id:', profile.id);
          oldPlanId = profile.current_plan_id;
          
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
            
            // Trigger auto-sync if this is an upgrade
            if (oldPlanId && planId && oldPlanId !== planId && status === 'active') {
              console.log('🚀 Plan upgrade detected, triggering auto-sync...');
              supabase.functions.invoke('trigger-auto-sync', {
                body: { user_id: profile.id }
              }).then(() => {
                console.log('✅ Auto-sync triggered successfully');
              }).catch((error) => {
                console.error('❌ Failed to trigger auto-sync:', error);
              });
            }
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

    // Vérifier s'il y a d'autres abonnements actifs pour ce customer
    let hasOtherActiveSubscription = false;
    if (customer && typeof customer === 'string') {
      console.log('🔍 Checking for other active subscriptions...');
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customer,
        status: 'active',
        limit: 10,
      });
      
      // Exclure l'abonnement actuel qui est en cours de suppression
      hasOtherActiveSubscription = activeSubscriptions.data.some(
        (sub: Stripe.Subscription) => sub.id !== subscription.id
      );
      
      console.log('📊 Other active subscriptions:', hasOtherActiveSubscription);
    }

    if (userId) {
      console.log('👤 Updating profile for user:', userId);
      
      // Ne réinitialiser le profil que s'il n'y a pas d'autre abonnement actif
      if (!hasOtherActiveSubscription) {
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
          console.log('✅ Profile updated to cancelled (no other active subscriptions)');
        }
      } else {
        console.log('ℹ️ Keeping profile unchanged (other active subscription exists)');
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
      } else if (profile && !hasOtherActiveSubscription) {
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
      } else if (profile && hasOtherActiveSubscription) {
        console.log('ℹ️ Keeping profile unchanged (other active subscription exists)');
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

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('💰 Processing invoice.payment_succeeded');
    const { subscription, customer, billing_reason } = invoice;
    
    console.log('📋 Invoice:', invoice.id, 'Billing reason:', billing_reason);
    
    // Find user by subscription or customer
    let userId: string | null = null;
    
    if (subscription && typeof subscription === 'string') {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('seller_id')
        .eq('stripe_subscription_id', subscription)
        .single();
      
      userId = subData?.seller_id;
      console.log('👤 Found user via subscription:', userId);
    }
    
    if (!userId && customer && typeof customer === 'string') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customer)
        .single();
      
      userId = profile?.id;
      console.log('👤 Found user via customer:', userId);
    }
    
    if (!userId) {
      console.warn('⚠️ No user found for invoice');
      return;
    }
    
    // Handle plan upgrade/change (when user pays a proration invoice)
    if (billing_reason === 'subscription_update' && subscription && typeof subscription === 'string') {
      console.log('🔄 Plan upgrade detected, syncing subscription...');
      
      try {
        // Get updated subscription from Stripe
        const subscriptionDetails = await stripe.subscriptions.retrieve(subscription);
        const stripePriceId = subscriptionDetails.items.data[0].price.id;
        
        console.log('💰 New Stripe Price ID:', stripePriceId);
        
        // Find the corresponding plan in our database
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('id, stripe_price_id_monthly, stripe_price_id_yearly, name')
          .eq('is_active', true);
        
        const matchingPlan = plans?.find(
          plan => plan.stripe_price_id_monthly === stripePriceId || plan.stripe_price_id_yearly === stripePriceId
        );
        
        if (matchingPlan) {
          console.log('✅ Mapped to plan:', matchingPlan.id, matchingPlan.name);
          
          // Determine billing period
          const billingPeriod = subscriptionDetails.items.data[0].price.recurring?.interval === 'year' 
            ? 'yearly' 
            : 'monthly';
          
          // Update subscription record
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({
              plan_id: matchingPlan.id,
              billing_period: billingPeriod,
              status: subscriptionDetails.status,
              current_period_start: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscriptionDetails.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription);
          
          if (subError) {
            console.error('❌ Error updating subscription:', subError);
          } else {
            console.log('✅ Subscription record updated');
          }
          
          // Update profile
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              current_plan_id: matchingPlan.id,
              subscription_status: subscriptionDetails.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (profileError) {
            console.error('❌ Error updating profile:', profileError);
          } else {
            console.log('✅ Profile updated with new plan');
          }
          
          // Get user email for notification
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const userEmail = userData?.user?.email;
          const userName = userData?.user?.user_metadata?.full_name;
          
          // Send upgrade confirmation email
          if (userEmail) {
            try {
              console.log('📧 Sending upgrade confirmation email');
              await supabase.functions.invoke('send-subscription-confirmed', {
                body: {
                  email: userEmail,
                  planName: matchingPlan.name,
                  fullName: userName,
                  isUpgrade: true
                }
              });
              console.log('✅ Upgrade confirmation email sent');
            } catch (emailError) {
              console.error('❌ Error sending upgrade email:', emailError);
            }
          }
          
          console.log('✅ Plan upgrade sync completed');
        } else {
          console.warn('⚠️ No matching plan found for Stripe price:', stripePriceId);
        }
      } catch (upgradeError) {
        console.error('❌ Error handling plan upgrade:', upgradeError);
      }
      
      return;
    }
    
    // Handle subscription cycle renewal (reset quotas)
    if (billing_reason === 'subscription_cycle') {
      console.log('🔄 Subscription cycle renewal detected, resetting monthly quotas...');
      
      // Reset monthly usage counters (preserve products_count and shopify_stores_count)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      const monthKey = currentMonth.toISOString().split('T')[0];
      
      // Get current usage to preserve product/store counts
      const { data: currentUsage } = await supabase
        .from('usage_tracking')
        .select('products_count, shopify_stores_count')
        .eq('seller_id', userId)
        .eq('month', monthKey)
        .single();
      
      console.log('💾 Resetting monthly counters for user:', userId);
      const { error: usageError } = await supabase
        .from('usage_tracking')
        .upsert({
          seller_id: userId,
          month: monthKey,
          optimizations_count: 0,
          articles_count: 0,
          chat_responses_count: 0,
          shopify_requests_count: 0,
          campaigns_count: 0,
          products_count: currentUsage?.products_count || 0,
          shopify_stores_count: currentUsage?.shopify_stores_count || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'seller_id,month'
        });
      
      if (usageError) {
        console.error('❌ Error resetting usage counters:', usageError);
      } else {
        console.log('✅ Monthly usage counters reset successfully', {
          preservedProducts: currentUsage?.products_count || 0,
          preservedStores: currentUsage?.shopify_stores_count || 0
        });
      }
    } else {
      console.log('ℹ️ Billing reason:', billing_reason, '- no specific action needed');
    }
  } catch (error) {
    console.error('❌ Error in handleInvoicePaymentSucceeded:', error);
    throw error;
  }
}