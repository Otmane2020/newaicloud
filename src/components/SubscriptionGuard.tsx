import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  subscription_status: string | null;
  current_plan_id: string | null;
  trial_ends_at: string | null;
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Loading profile for user:', user.id);
      
      // First check Stripe for the real subscription status
      console.log('🔄 Checking Stripe subscription status...');
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription');
      
      if (stripeError) {
        console.error('❌ Error checking Stripe subscription:', stripeError);
      } else {
        console.log('✅ Stripe subscription data:', stripeData);
        
        // If user has active subscription in Stripe, update profile
        if (stripeData?.subscribed) {
          console.log('🔄 Updating profile with Stripe subscription status...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('❌ Error updating profile:', updateError);
          } else {
            console.log('✅ Profile updated with active subscription');
          }
        }
      }
      
      // Then load the updated profile
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, current_plan_id, trial_ends_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error loading profile:', error);
        setLoading(false);
        return;
      }

      console.log('✅ Profile loaded:', {
        status: data.subscription_status,
        plan: data.current_plan_id,
        trialEnds: data.trial_ends_at
      });

      setProfile(data);
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check subscription status
  const hasValidSubscription = profile?.subscription_status && 
    ['active', 'trialing'].includes(profile.subscription_status);

  if (!hasValidSubscription) {
    console.log('⚠️ No valid subscription, redirecting to onboarding. Status:', profile?.subscription_status);
    return <Navigate to="/onboarding" replace />;
  }

  console.log('✅ Valid subscription found, allowing access');

  return <>{children}</>;
}
