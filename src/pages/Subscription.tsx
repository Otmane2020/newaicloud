import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap, Crown, Package, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_chat_responses_monthly: number;
  popular?: boolean;
  best_value?: boolean;
}

export default function Subscription() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    // Handle return from Stripe Customer Portal
    const returnStatus = searchParams.get('return');
    
    if (returnStatus === 'success') {
      toast.success('Modifications enregistrées avec succès');
      // Clean URL
      searchParams.delete('return');
      setSearchParams(searchParams);
      // Reload to update subscription status
      setTimeout(() => window.location.reload(), 1500);
    }

    loadPlansAndCurrentPlan();
  }, [searchParams, setSearchParams]);

  const loadPlansAndCurrentPlan = async () => {
    try {
      // Load all plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      setPlans(plansData || []);

      // Get current plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user?.id)
        .single();

      setCurrentPlanId(profile?.current_plan_id || null);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (currentPlanId === plan.id) return;
    
    setUpgradeLoading(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: plan.id,
          billing_period: 'monthly',
          success_url: `${window.location.origin}/subscription?return=success`,
          cancel_url: `${window.location.origin}/subscription`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('enterprise')) return Crown;
    if (planName.toLowerCase().includes('pro')) return Zap;
    return Package;
  };

  const isCurrentPlan = (planId: string) => currentPlanId === planId;

  const canUpgrade = (planPrice: number) => {
    if (!currentPlanId) return true;
    const currentPlan = plans.find(p => p.id === currentPlanId);
    return currentPlan ? planPrice > currentPlan.price_monthly : true;
  };

  const canDowngrade = (planPrice: number) => {
    if (!currentPlanId) return false;
    const currentPlan = plans.find(p => p.id === currentPlanId);
    return currentPlan ? planPrice < currentPlan.price_monthly : false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Mon Abonnement
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez votre abonnement et découvrez nos offres
          </p>
        </div>

        <div className="space-y-8">
          {/* Current Plan */}
          <CurrentPlanCard />

          {/* Plans Comparison */}
          <div>
            <h2 className="text-3xl font-bold mb-2 text-center">
              Comparez les plans disponibles
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Passez au plan supérieur pour débloquer plus de fonctionnalités
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => {
                const Icon = getPlanIcon(plan.name);
                const isCurrent = isCurrentPlan(plan.id);
                const canUp = canUpgrade(plan.price_monthly);
                const canDown = canDowngrade(plan.price_monthly);

                const features = [
                  `${plan.max_products === -1 ? 'Illimité' : plan.max_products} produits`,
                  `${plan.max_optimizations_monthly} optimisations SEO/mois`,
                  `${plan.max_articles_monthly} articles/mois`,
                  `${plan.max_chat_responses_monthly} réponses chat/mois`,
                ];

                return (
                  <Card 
                    key={plan.id}
                    className={`relative p-6 transition-all hover:shadow-xl ${
                      isCurrent ? 'border-2 border-primary shadow-primary' : ''
                    } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        ⭐ Populaire
                      </Badge>
                    )}
                    {plan.best_value && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success">
                        💎 Meilleure valeur
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white">
                        Votre plan actuel
                      </Badge>
                    )}

                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${
                        plan.name.toLowerCase().includes('enterprise') ? 'from-orange-500 to-red-500' :
                        plan.name.toLowerCase().includes('pro') ? 'from-purple-500 to-pink-500' :
                        'from-blue-500 to-cyan-500'
                      } mb-4 shadow-glow`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          ${plan.price_monthly}
                        </span>
                        <span className="text-muted-foreground">/mois</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plan actuel
                      </Button>
                    ) : canUp ? (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={upgradeLoading === plan.id}
                        className="w-full bg-gradient-primary hover:opacity-90"
                      >
                        {upgradeLoading === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Chargement...
                          </>
                        ) : (
                          <>
                            ⬆️ Upgrade
                          </>
                        )}
                      </Button>
                    ) : canDown ? (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={upgradeLoading === plan.id}
                        variant="outline"
                        className="w-full"
                      >
                        {upgradeLoading === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Chargement...
                          </>
                        ) : (
                          <>
                            ⬇️ Downgrade
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={upgradeLoading === plan.id}
                        className="w-full"
                      >
                        {upgradeLoading === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Chargement...
                          </>
                        ) : (
                          'Choisir ce plan'
                        )}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Usage & Billing */}
          <div className="grid md:grid-cols-2 gap-6">
            <UsageLimits />
            <BillingPortal />
          </div>
        </div>
      </div>
    </div>
  );
}
