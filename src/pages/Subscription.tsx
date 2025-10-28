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
  max_shopify_requests_monthly: number;
  max_campaigns: number;
  max_shopify_stores: number;
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
      // Load all plans (exclude Trial and Pay-as-you-go)
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', '(trial,pay-as-you-go)')
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

                const getFeatures = () => {
                  const baseFeatures = [
                    `${plan.max_products === -1 ? 'Illimité' : plan.max_products} produits`,
                    `${plan.max_optimizations_monthly} optimisations SEO/mois`,
                    `${plan.max_articles_monthly} articles/mois`,
                    `${plan.max_chat_responses_monthly} réponses chat/mois`,
                  ];

                  if (plan.id === 'starter') {
                    return [
                      ...baseFeatures,
                      `${plan.max_shopify_requests_monthly || 20} recherches Shopify/mois`,
                      '1 boutique Shopify',
                      'Automation basique (SEO + blog + chat)',
                      'Support email'
                    ];
                  }
                  
                  if (plan.id === 'professional') {
                    return [
                      ...baseFeatures,
                      `${plan.max_shopify_requests_monthly || 300} recherches Shopify/mois`,
                      `3 campagnes IA/mois`,
                      'Jusqu\'à 2 boutiques Shopify',
                      'Intégration Google Merchant Center',
                      'Automation complète',
                      'Support prioritaire 24/7'
                    ];
                  }
                  
                  if (plan.id === 'enterprise') {
                    return [
                      ...baseFeatures,
                      `${plan.max_shopify_requests_monthly || 2000} recherches Shopify/mois`,
                      `10 campagnes IA/mois`,
                      'Jusqu\'à 5 boutiques Shopify',
                      'Multi-boutique & API custom',
                      'Account manager dédié',
                      'Formations personnalisées',
                      'SLA garanti'
                    ];
                  }

                  return baseFeatures;
                };

                const features = getFeatures();

                return (
                  <Card 
                    key={plan.id}
                    className={`relative p-6 transition-all hover:shadow-xl ${
                      isCurrent ? 'border-2 border-primary shadow-primary' : ''
                    } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                  >
                    {!isCurrent && plan.id === 'professional' && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500">
                        🔥 Plus populaire
                      </Badge>
                    )}
                    {!isCurrent && plan.id === 'enterprise' && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500">
                        💎 Meilleur rapport
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white">
                        ✅ Plan actuel
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

          {/* Pay as you go Section */}
          <Card className="border-2 border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="p-8 md:p-12">
              <div className="text-center mb-8">
                <Badge className="bg-primary mb-4">
                  💳 Flexibilité maximale
                </Badge>
                <h3 className="text-3xl font-bold mb-2">Pay as you go</h3>
                <p className="text-muted-foreground text-lg">
                  Dépassez vos limites mensuelles sans interruption
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Tarifs à la demande */}
                <div className="space-y-4">
                  <p className="font-semibold text-lg">💰 Tarifs unitaires :</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-sm">SEO AI Optimization</span>
                      <span className="font-bold text-primary">$0.05</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-sm">AI Article</span>
                      <span className="font-bold text-primary">$2.00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-sm">AI Chat Response</span>
                      <span className="font-bold text-primary">$0.02</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-sm">AI Campaign (up to 30 articles)</span>
                      <span className="font-bold text-primary">$10.00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-sm">Extra Shopify Store</span>
                      <span className="font-bold text-primary">$15.00/mois</span>
                    </div>
                  </div>
                </div>
                
                {/* Avantages */}
                <div className="space-y-4">
                  <p className="font-semibold text-lg">✨ Avantages :</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Pas de limite</p>
                        <p className="text-sm text-muted-foreground">Continuez sans interruption</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Facturation automatique</p>
                        <p className="text-sm text-muted-foreground">En fin de mois uniquement</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Transparence totale</p>
                        <p className="text-sm text-muted-foreground">Suivi en temps réel de vos dépenses</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Le pay-as-you-go est automatiquement activé sur les plans Pro et Enterprise.</strong><br />
                  Vous ne payez que ce que vous consommez au-delà de vos limites mensuelles.
                </p>
                <Button 
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('customer-portal');
                      if (error) throw error;
                      if (data?.url) window.open(data.url, '_blank');
                    } catch (error) {
                      console.error('Error opening portal:', error);
                      toast.error('Erreur lors de l\'ouverture du portail');
                    }
                  }}
                  variant="outline"
                >
                  💳 Gérer la facturation
                </Button>
              </div>
            </div>
          </Card>

          {/* Usage & Billing */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <UsageLimits />
            <BillingPortal />
          </div>
        </div>
      </div>
    </div>
  );
}
