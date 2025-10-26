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

export function SubscriptionManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      console.log('🔄 Loading subscription data...');
      
      // Load current subscription from Stripe
      const { data: subData, error: subError } = await supabase.functions.invoke('check-subscription');
      
      if (subError) {
        console.error('❌ Error checking subscription:', subError);
        throw subError;
      }

      console.log('✅ Subscription data:', subData);
      
      if (subData?.subscribed && subData?.product_id) {
        // Find plan by Stripe product ID
        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('*');

        console.log('📋 Available plans:', plansData);

        // Match by product_id from Stripe
        const plan = plansData?.find((p: Plan) => {
          // Get product ID from the price IDs in Stripe
          return p.stripe_price_id_monthly === subData.plan_id || 
                 p.stripe_price_id_yearly === subData.plan_id;
        });

        console.log('🎯 Matched plan:', plan);
        setCurrentPlan(plan || null);
        setSubscriptionEnd(subData.subscription_end);
      } else {
        console.log('⚠️ No active subscription found');
      }

      // Load all plans
      const { data: allPlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      setPlans(allPlans || []);
    } catch (error) {
      console.error('❌ Error loading subscription:', error);
      toast.error('Erreur lors du chargement de l\'abonnement');
    } finally {
      setLoading(false);
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
      <Card className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Mon abonnement</h2>
        
        {currentPlan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">Plan actuel</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">Actif</Badge>
            </div>

            {subscriptionEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Renouvellement le {new Date(subscriptionEnd).toLocaleDateString('fr-FR')}
              </div>
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
                  Chargement...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Gérer mon abonnement
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas d'abonnement actif
            </p>
            <Button onClick={() => window.location.href = '/onboarding'}>
              Choisir un plan
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Plans disponibles</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`p-4 ${currentPlan?.id === plan.id ? 'border-2 border-primary' : ''}`}
            >
              <h4 className="font-semibold text-lg">{plan.name}</h4>
                <p className="text-2xl font-bold mt-2">
                  ${plan.price_monthly}
                  <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
              {currentPlan?.id === plan.id && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600 mt-2">Plan actuel</Badge>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
