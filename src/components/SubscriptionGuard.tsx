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
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, current_plan_id, trial_ends_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
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

  // Si pas d'abonnement actif ou en essai, rediriger vers onboarding
  if (!profile?.subscription_status || 
      !['active', 'trialing'].includes(profile.subscription_status)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
