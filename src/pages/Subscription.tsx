import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UsageLimits } from "@/components/dashboard/UsageLimits";
import { BillingPortal } from "@/components/dashboard/BillingPortal";
import { CurrentPlanCard } from "@/components/dashboard/CurrentPlanCard";
import PricingComparison from "@/components/PricingComparison";
import { useTranslation } from '@/hooks/useTranslation';

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
  max_shopify_stores: number;
  max_campaigns: number;
  display_order: number;
  recommended?: boolean;
  best_value?: boolean;
  popular?: boolean;
}

const Subscription = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedProTier, setSelectedProTier] = useState<string>('');
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>('');

  useEffect(() => {
    const status = searchParams.get('checkout');
    if (status === 'success') {
      toast.success('Paiement réussi! Votre abonnement est maintenant actif.');
      navigate('/subscription', { replace: true });
    } else if (status === 'cancelled') {
      toast.info('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
      navigate('/subscription', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    loadPlansAndCurrentPlan();
  }, [user]);

  const loadPlansAndCurrentPlan = async () => {
    if (!user) return;
    
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;
      
      // Filter only plans with valid Stripe price IDs
      const validPlans = plansData?.filter(plan => {
        const monthlyId = plan.stripe_price_id_monthly || '';
        const yearlyId = plan.stripe_price_id_yearly || '';
        
        const hasValidMonthly = monthlyId.startsWith('price_') && 
          !monthlyId.includes('monthly') && 
          !monthlyId.includes('pro_') && 
          !monthlyId.includes('enterprise_');
        
        const hasValidYearly = yearlyId.startsWith('price_') && 
          !yearlyId.includes('yearly') && 
          !yearlyId.includes('pro_') && 
          !yearlyId.includes('enterprise_');
        
        return hasValidMonthly || hasValidYearly;
      }) || [];
      
      setPlans(validPlans);

      // Initialize default selections for Pro and Enterprise
      const proPlans = validPlans.filter(p => 
        p.id === 'professional' || 
        p.id === 'pro' || 
        p.id.startsWith('pro-') || 
        p.id.startsWith('professional')
      );
      const enterprisePlans = validPlans.filter(p => 
        p.id.startsWith('enterprise')
      );

      if (proPlans.length > 0 && !selectedProTier) {
        setSelectedProTier(proPlans[0].id);
      }
      if (enterprisePlans.length > 0 && !selectedEnterpriseTier) {
        setSelectedEnterpriseTier(enterprisePlans[0].id);
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.plan_id) {
        const currentPlanData = validPlans.find((p: Plan) => p.id === subscription.plan_id);
        setCurrentPlan(currentPlanData || null);
        
        if (subscription.plan_id === 'professional' || subscription.plan_id.startsWith('pro')) {
          setSelectedProTier(subscription.plan_id);
        } else if (subscription.plan_id.startsWith('enterprise')) {
          setSelectedEnterpriseTier(subscription.plan_id);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: planId,
          billing_period: 'monthly',
          force_immediate_payment: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId === 'starter') return '🚀';
    if (planId.startsWith('pro')) return '⚡';
    if (planId.startsWith('enterprise')) return '🏢';
    return '📦';
  };

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId;

  const starterPlan = plans.find(p => p.id === 'starter');
  const proPlans = plans.filter(p => 
    p.id === 'professional' || 
    p.id === 'pro' || 
    p.id.startsWith('pro-') || 
    p.id.startsWith('professional')
  ).sort((a, b) => a.display_order - b.display_order);
  const enterprisePlans = plans.filter(p => 
    p.id.startsWith('enterprise')
  ).sort((a, b) => a.display_order - b.display_order);

  const selectedProPlan = proPlans.find(p => p.id === selectedProTier);
  const selectedEnterprisePlan = enterprisePlans.find(p => p.id === selectedEnterpriseTier);

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">{t('subscription.title')}</h1>
        <p className="text-muted-foreground text-lg">
          Choisissez le plan qui correspond à vos besoins et évoluez à votre rythme
        </p>
      </div>

      <CurrentPlanCard />

      <div className="grid md:grid-cols-3 gap-8">
        {starterPlan && (
          <Card className={`p-8 relative flex flex-col ${isCurrentPlan(starterPlan.id) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Plan actuel
              </Badge>
            )}
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{getPlanIcon(starterPlan.id)}</span>
                  <h3 className="text-2xl font-bold">{starterPlan.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{starterPlan.description}</p>
              </div>
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{starterPlan.price_monthly}€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>{starterPlan.max_optimizations_monthly} {t('subscription.optimizations')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>{starterPlan.max_articles_monthly} {t('subscription.articles')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>{starterPlan.max_chat_responses_monthly} {t('subscription.chat_responses')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>{starterPlan.max_shopify_stores} {t('subscription.stores')}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-6" 
              variant={isCurrentPlan(starterPlan.id) ? "outline" : "default"}
              disabled={isCurrentPlan(starterPlan.id) || checkoutLoading === starterPlan.id}
              onClick={() => handleSelectPlan(starterPlan.id)}
            >
              {checkoutLoading === starterPlan.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(starterPlan.id) ? (
                'Plan actuel'
              ) : (
                t('subscription.upgrade')
              )}
            </Button>
          </Card>
        )}

        {proPlans.length > 0 && (
          <Card className={`p-8 relative flex flex-col ${(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Plan actuel
              </Badge>
            )}
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">⚡</span>
                  <h3 className="text-2xl font-bold">Pro</h3>
                </div>
                <p className="text-muted-foreground text-sm">Pour les boutiques en croissance</p>
              </div>
              
              <div>
                <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_optimizations_monthly} optimizations - {plan.price_monthly}€/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProPlan && (
                <>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">{selectedProPlan.price_monthly}€</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedProPlan.max_optimizations_monthly} {t('subscription.optimizations')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedProPlan.max_articles_monthly} {t('subscription.articles')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedProPlan.max_chat_responses_monthly} {t('subscription.chat_responses')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedProPlan.max_shopify_stores} {t('subscription.stores')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedProPlan.max_products.toLocaleString()} {t('subscription.products')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button 
              className="w-full mt-6" 
              variant={isCurrentPlan(selectedProTier) ? "outline" : "default"}
              disabled={isCurrentPlan(selectedProTier) || checkoutLoading === selectedProTier}
              onClick={() => handleSelectPlan(selectedProTier)}
            >
              {checkoutLoading === selectedProTier ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(selectedProTier) ? (
                'Plan actuel'
              ) : (
                t('subscription.upgrade_now')
              )}
            </Button>
          </Card>
        )}

        {enterprisePlans.length > 0 && (
          <Card className={`p-8 relative flex flex-col ${currentPlan?.id.startsWith('enterprise-') ? 'border-2 border-primary shadow-primary' : ''}`}>
            {currentPlan?.id.startsWith('enterprise-') && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Plan actuel
              </Badge>
            )}
            {enterprisePlans[0]?.best_value && !currentPlan?.id.startsWith('enterprise-') && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success">
                Meilleur rapport qualité-prix
              </Badge>
            )}
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🏢</span>
                  <h3 className="text-2xl font-bold">Enterprise</h3>
                </div>
                <p className="text-muted-foreground text-sm">Pour les grandes opérations</p>
              </div>
              
              <div>
                <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enterprisePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_optimizations_monthly.toLocaleString()} optimizations - {plan.price_monthly.toLocaleString()}€/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEnterprisePlan && (
                <>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">{selectedEnterprisePlan.price_monthly.toLocaleString()}€</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedEnterprisePlan.max_optimizations_monthly.toLocaleString()} {t('subscription.optimizations')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedEnterprisePlan.max_articles_monthly} {t('subscription.articles')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedEnterprisePlan.max_chat_responses_monthly.toLocaleString()} {t('subscription.chat_responses')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedEnterprisePlan.max_shopify_stores} {t('subscription.stores')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span>{selectedEnterprisePlan.max_products.toLocaleString()} {t('subscription.products')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button 
              className="w-full mt-6" 
              variant={isCurrentPlan(selectedEnterpriseTier) ? "outline" : "default"}
              disabled={isCurrentPlan(selectedEnterpriseTier) || checkoutLoading === selectedEnterpriseTier}
              onClick={() => handleSelectPlan(selectedEnterpriseTier)}
            >
              {checkoutLoading === selectedEnterpriseTier ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(selectedEnterpriseTier) ? (
                'Plan actuel'
              ) : (
                t('subscription.upgrade_now')
              )}
            </Button>
          </Card>
        )}
      </div>

      <div className="mt-16">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold mb-2">Comparaison détaillée</h3>
          <p className="text-muted-foreground">Comparez toutes les fonctionnalités de nos plans</p>
        </div>
        <PricingComparison />
      </div>

      <UsageLimits />
      <BillingPortal />
    </div>
  );
};

export default Subscription;