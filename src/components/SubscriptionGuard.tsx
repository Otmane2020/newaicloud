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
  const [isAdmin, setIsAdmin] = useState(false);

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
      console.log('🔍 Loading profile for user:', user.id);

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
        
        // If user has active subscription in Stripe, bypass the redirect
        if (stripeData?.subscribed) {
          console.log('✅ Active subscription found in Stripe, allowing access');
          
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
            trial_ends_at: null
          });
          setLoading(false);
          return;
        }
      }
      
      // Load the profile from database
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

  // Admins bypass subscription check
  if (isAdmin) {
    console.log('✅ Admin access granted');
    return <>{children}</>;
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
