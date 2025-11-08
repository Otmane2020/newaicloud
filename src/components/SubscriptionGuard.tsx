import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  subscription_status: string | null;
  current_plan_id: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasActiveStripeSubscription, setHasActiveStripeSubscription] = useState(false);
  const [invalidTrialState, setInvalidTrialState] = useState(false);
  const [fixingSubscription, setFixingSubscription] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAndLoadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminAndLoadProfile = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 [SubscriptionGuard] Checking subscription for user:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      // Check if user is admin first
      const { data: adminCheck } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (adminCheck) {
        console.log('👑 Admin user detected, bypassing subscription check');
        setIsAdmin(true);
        setLoading(false);
        return;
      }
      
      // Check Stripe for the real subscription status
      console.log('🔄 Checking Stripe subscription status...');
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription');
      
      if (stripeError) {
        console.error('❌ Error checking Stripe subscription:', stripeError);
      } else {
        console.log('✅ Stripe subscription data:', stripeData);
        
        // Check for invalid trial state on paid plan
        if (stripeData?.error === 'invalid_trial_state') {
          console.error('⚠️ INVALID TRIAL STATE DETECTED:', stripeData);
          setInvalidTrialState(true);
          setLoading(false);
          return;
        }
        
        // If user has active subscription in Stripe, bypass the redirect
        if (stripeData?.subscribed) {
          console.log('✅ Active subscription found in Stripe, allowing access');
          setHasActiveStripeSubscription(true);
          
          // Update profile in background (don't wait for it)
          supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('❌ Error updating profile:', updateError);
              } else {
                console.log('✅ Profile updated with active subscription');
              }
            });
          
          // Set a valid profile to bypass the redirect check
          setProfile({
            subscription_status: 'active',
            current_plan_id: null,
            trial_ends_at: null,
            stripe_customer_id: null
          });
          setLoading(false);
          return;
        }
      }
      
      // Load the profile from database
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, current_plan_id, trial_ends_at, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error loading profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('📝 Profile not found, creating new profile...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              subscription_status: 'inactive',
              onboarding_completed: false
            });
          
          if (insertError) {
            console.error('❌ Error creating profile:', insertError);
          } else {
            console.log('✅ Profile created successfully');
            // Set default profile
            setProfile({
              subscription_status: 'inactive',
              current_plan_id: null,
              trial_ends_at: null,
              stripe_customer_id: null
            });
          }
        }
        
        setLoading(false);
        return;
      }

      console.log('✅ [SubscriptionGuard] Profile loaded:', {
        userId: user.id,
        status: data.subscription_status,
        plan: data.current_plan_id,
        trialEnds: data.trial_ends_at,
        timestamp: new Date().toISOString()
      });

      setProfile(data);
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixSubscription = async () => {
    setFixingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-invalid-trial-subscriptions');
      
      if (error) throw error;
      
      if (data?.checkout_url) {
        toast.success('Redirecting to payment...');
        window.location.href = data.checkout_url;
      } else {
        toast.error('Unable to fix subscription. Please contact support.');
      }
    } catch (error) {
      console.error('Error fixing subscription:', error);
      toast.error('Failed to fix subscription. Please contact support.');
    } finally {
      setFixingSubscription(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show alert if invalid trial state detected
  if (invalidTrialState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold mb-2">
            Action Requise : Validation de Paiement
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-base">
              Votre abonnement est dans un état invalide. Vous avez un plan payant mais le paiement n'a pas été effectué.
            </p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur le bouton ci-dessous pour compléter le paiement et activer votre abonnement.
            </p>
            <Button 
              onClick={handleFixSubscription} 
              disabled={fixingSubscription}
              size="lg"
              className="w-full"
            >
              {fixingSubscription ? 'Traitement en cours...' : 'Valider Mon Paiement'}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Admins bypass subscription check
  if (isAdmin) {
    console.log('✅ Admin access granted');
    return <>{children}</>;
  }

  // SECURITY: Vérifier strictement l'abonnement avec stripe_customer_id OBLIGATOIRE
  // CRITICAL: Ne JAMAIS accepter 'trialing' sans stripe_customer_id
  if (profile?.subscription_status === 'trialing' && !profile.stripe_customer_id) {
    console.error('🚨 SECURITY ALERT: Trial without Stripe customer ID detected!', {
      userId: user?.id,
      email: user?.email,
      status: profile.subscription_status,
      timestamp: new Date().toISOString()
    });
    
    // Reset le profil à 'inactive' pour forcer le passage par Stripe
    supabase
      .from('profiles')
      .update({ 
        subscription_status: 'inactive',
        trial_ends_at: null 
      })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) {
          console.error('❌ Error resetting invalid trial:', error);
        } else {
          console.log('✅ Invalid trial reset to inactive');
        }
      });
    
    // Rediriger immédiatement vers onboarding
    return <Navigate to="/onboarding" replace />;
  }
  
  const hasValidSubscription = profile?.subscription_status && 
    profile.stripe_customer_id && // ✅ NOUVEAU: Vérifier stripe_customer_id OBLIGATOIRE
    (profile.subscription_status === 'active' || 
     (profile.subscription_status === 'trialing' && 
      profile.trial_ends_at && 
      new Date(profile.trial_ends_at) > new Date()));

  if (!hasValidSubscription && !hasActiveStripeSubscription) {
    console.log('⚠️ [SubscriptionGuard] No valid subscription, redirecting to onboarding:', {
      userId: user?.id,
      status: profile?.subscription_status,
      hasStripeSubscription: hasActiveStripeSubscription,
      timestamp: new Date().toISOString()
    });
    return <Navigate to="/onboarding" replace />;
  }

  console.log('✅ [SubscriptionGuard] Valid subscription found, allowing access:', {
    userId: user?.id,
    status: profile?.subscription_status,
    timestamp: new Date().toISOString()
  });

  return <>{children}</>;
}
