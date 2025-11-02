import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CreditCard, Calendar, Package } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
}

export function CurrentPlanCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      // Récupérer d'abord les données du profil Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at')
        .eq('id', user?.id)
        .single();

      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*');

      // Si l'utilisateur a un plan dans Supabase, l'utiliser directement
      if (profileData?.current_plan_id) {
        const plan = plansData?.find((p: Plan) => p.id === profileData.current_plan_id);
        
        if (plan) {
          const isTrialing = profileData.subscription_status === 'trialing';
          setCurrentPlan({
            ...plan,
            name: isTrialing ? `${plan.name} (Trial)` : plan.name
          });
          
          // Si en trial, utiliser trial_ends_at, sinon appeler check-subscription pour Stripe
          if (isTrialing) {
            setSubscriptionEnd(profileData.trial_ends_at);
          } else {
            const { data: subData } = await supabase.functions.invoke('check-subscription');
            if (subData?.subscription_end) {
              setSubscriptionEnd(subData.subscription_end);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToFullPlan = async () => {
    setUpgradeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-payment');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Erreur lors de l\'ouverture du portail');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" />
        Current Subscription
      </h2>
      
      {currentPlan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
              <p className="text-sm text-muted-foreground">Current Plan</p>
            </div>
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              Active
            </Badge>
          </div>

          {subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {currentPlan.name.includes('Trial') ? 'Expires on' : 'Renewal date'}: {new Date(subscriptionEnd).toLocaleDateString()}
            </div>
          )}

          {currentPlan.name.includes('Trial') && (
            <Button 
              onClick={handleUpgradeToFullPlan}
              disabled={upgradeLoading}
              variant="default"
              className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
            >
              {upgradeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Activer mon abonnement
                </>
              )}
            </Button>
          )}

          <Button 
            onClick={handleManageSubscription}
            disabled={portalLoading}
            variant="outline"
            className="w-full"
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Subscription
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">
            No active subscription
          </p>
          <Button onClick={() => window.location.href = '/onboarding'}>
            Choose a Plan
          </Button>
        </div>
      )}
    </Card>
  );
}
