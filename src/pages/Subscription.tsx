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
import { useTranslation } from "@/lib/language";
import { UsageLimits } from "@/components/dashboard/UsageLimits";
import { BillingPortal } from "@/components/dashboard/BillingPortal";
import { CurrentPlanCard } from "@/components/dashboard/CurrentPlanCard";
import PricingComparison from "@/components/PricingComparison";
import { getCurrencySymbol } from "@/lib/formatUtils";

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
  const { t, language } = useTranslation();
  const currency = getCurrencySymbol(language);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedProTier, setSelectedProTier] = useState<string>('');
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>('');

  const isUpgradeFlow = searchParams.get('upgrade') === 'true';

  useEffect(() => {
    const status = searchParams.get('checkout');
    if (status === 'success') {
      toast.success(t.seo.subscription.success);
      navigate('/subscription', { replace: true });
    } else if (status === 'cancelled') {
      toast.info(t.seo.subscription.cancelled);
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
      
      // Filter plans - include Trial (free) and plans with valid Stripe price IDs
      const validPlans = plansData?.filter(plan => {
        // Always include Trial plan (no Stripe required)
        if (plan.id === 'trial') return true;
        
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

      // Also check the profiles table for current_plan_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();

      const activePlanId = subscription?.plan_id || profile?.current_plan_id;

      if (activePlanId) {
        const currentPlanData = validPlans.find((p: Plan) => p.id === activePlanId);
        setCurrentPlan(currentPlanData || null);
        
        if (activePlanId === 'professional' || activePlanId.startsWith('pro')) {
          setSelectedProTier(activePlanId);
        } else if (activePlanId.startsWith('enterprise')) {
          setSelectedEnterpriseTier(activePlanId);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(t.seo.subscription.errors.loadPlans);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    // Special handling for Trial plan - no Stripe checkout needed
    if (planId === 'trial') {
      navigate('/auth?mode=signup&plan=trial');
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
      toast.error(t.seo.subscription.errors.createCheckout);
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

  // Determine recommended upgrade plan
  const getRecommendedPlan = () => {
    if (!isUpgradeFlow || !currentPlan) return null;
    
    if (currentPlan.id === 'starter') return 'pro';
    if (currentPlan.id.startsWith('pro')) return 'enterprise';
    if (currentPlan.id.startsWith('enterprise')) {
      const currentIndex = enterprisePlans.findIndex(p => p.id === currentPlan.id);
      return currentIndex < enterprisePlans.length - 1 ? 'enterprise' : null;
    }
    return null;
  };

  const recommendedPlanType = getRecommendedPlan();

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:p-6 md:p-8 space-y-6 sm:space-y-8 md:space-y-12">
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t.seo.subscription.title}</h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
          {t.seo.subscription.subtitle}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <CurrentPlanCard currentPlan={currentPlan} />

          {plans.find(p => p.id === 'trial') && (
            <Card className="border-2 border-success bg-success/5">
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold text-foreground">{t.trial.title}</h2>
                      <Badge className="bg-success text-success-foreground">{t.trial.free}</Badge>
                      <Badge variant="outline" className="border-success text-success">{t.trial.noCreditCard}</Badge>
                    </div>
                    <p className="text-muted-foreground">{t.trial.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm">{t.trial.features.optimizations}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm">{t.trial.features.article}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm">{t.trial.features.duration}</span>
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full md:w-auto bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => handleSelectPlan('trial')}
                >
                  {t.trial.startButton}
                </Button>
              </div>
            </Card>
          )}
        
        {!isUpgradeFlow && currentPlan && currentPlan.id !== 'trial' && (
          <CurrentPlanCard />
        )}

      {isUpgradeFlow && currentPlan && (
        <Card className="p-4 sm:p-5 md:p-6 mb-6 sm:mb-7 md:mb-8 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-2 border-primary/30 dark:border-primary/50">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{t.seo.subscription.yourCurrentPlan}</h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">{getPlanIcon(currentPlan.id)}</span>
                  <div>
                    <p className="text-lg sm:text-xl font-bold">{currentPlan.name}</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">{currentPlan.price_monthly}{currency}{t.seo.subscription.perMonth}</p>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-sm sm:text-base md:text-lg px-3 py-1.5 sm:px-4 sm:py-2 border-primary self-start sm:self-auto">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">{currentPlan.max_optimizations_monthly}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.seo.subscription.monthlyOptimizations}</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">{currentPlan.max_products === -1 ? '∞' : currentPlan.max_products}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.seo.subscription.products}</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">{currentPlan.max_articles_monthly}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.seo.subscription.articlesPerMonth}</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary">{currentPlan.max_shopify_stores}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t.seo.subscription.stores}</p>
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-primary">
                {t.seo.subscription.limitReachedMessage}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {starterPlan && (
          <Card className={`p-4 sm:p-6 md:p-8 relative flex flex-col ${isCurrentPlan(starterPlan.id) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            )}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl">{getPlanIcon(starterPlan.id)}</span>
                  <h3 className="text-xl sm:text-2xl font-bold">{starterPlan.name}</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">{starterPlan.description}</p>
              </div>
              
              <div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold">{starterPlan.price_monthly}{currency}</span>
                  <span className="text-muted-foreground text-sm sm:text-base">{t.seo.subscription.perMonth}</span>
                </div>
              </div>

              <div className="space-y-2.5 sm:space-y-3 pt-4 sm:pt-5 md:pt-6 border-t">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                  <span>{starterPlan.max_optimizations_monthly} {t.seo.subscription.optimizationsMonth}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                  <span>{starterPlan.max_articles_monthly} {t.seo.subscription.articlesMonth}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                  <span>{starterPlan.max_chat_responses_monthly} {t.seo.subscription.chatResponsesMonth}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                  <span>{starterPlan.max_shopify_stores} {t.seo.subscription.shopifyStores}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-4 sm:mt-5 md:mt-6 text-sm sm:text-base" 
              size="lg"
              variant={isCurrentPlan(starterPlan.id) ? "secondary" : "default"}
              disabled={isCurrentPlan(starterPlan.id) || checkoutLoading === starterPlan.id}
              onClick={() => handleSelectPlan(starterPlan.id)}
            >
              {checkoutLoading === starterPlan.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(starterPlan.id) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t.seo.subscription.currentPlanBadge}
                </>
              ) : (
                t.seo.subscription.selectThisPlan
              )}
            </Button>
          </Card>
        )}

        {proPlans.length > 0 && (
          <Card className={`p-4 sm:p-6 md:p-8 relative flex flex-col ${(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            )}
            {!(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) && isUpgradeFlow && recommendedPlanType === 'pro' && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.recommendedPlanBadge}
              </Badge>
            )}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl">⚡</span>
                  <h3 className="text-xl sm:text-2xl font-bold">Pro</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">{t.seo.subscription.proGrowth}</p>
              </div>
              
              <div>
                <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_optimizations_monthly} optimisations - {plan.price_monthly}{currency}/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProPlan && (
                <>
                  <div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold">{selectedProPlan.price_monthly}{currency}</span>
                      <span className="text-muted-foreground text-sm sm:text-base">{t.seo.subscription.perMonth}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 pt-4 sm:pt-5 md:pt-6 border-t">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedProPlan.max_optimizations_monthly} {t.seo.subscription.optimizationsMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedProPlan.max_articles_monthly} {t.seo.subscription.articlesMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedProPlan.max_chat_responses_monthly} {t.seo.subscription.chatResponsesMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedProPlan.max_shopify_stores} {t.seo.subscription.shopifyStores}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedProPlan.max_products === -1 ? t.seo.subscription.unlimitedProducts : `${selectedProPlan.max_products.toLocaleString()} ${t.seo.subscription.products.toLowerCase()}`}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button 
              className="w-full mt-4 sm:mt-5 md:mt-6 text-sm sm:text-base" 
              size="lg"
              variant={isCurrentPlan(selectedProTier) ? "secondary" : "default"}
              disabled={isCurrentPlan(selectedProTier) || checkoutLoading === selectedProTier}
              onClick={() => handleSelectPlan(selectedProTier)}
            >
              {checkoutLoading === selectedProTier ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(selectedProTier) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t.seo.subscription.currentPlanBadge}
                </>
              ) : (
                t.seo.subscription.upgrade
              )}
            </Button>
          </Card>
        )}

        {enterprisePlans.length > 0 && (
          <Card className={`p-4 sm:p-6 md:p-8 relative flex flex-col ${currentPlan?.id.startsWith('enterprise-') ? 'border-2 border-primary shadow-primary' : ''}`}>
            {currentPlan?.id.startsWith('enterprise-') && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            )}
            {!currentPlan?.id.startsWith('enterprise-') && isUpgradeFlow && recommendedPlanType === 'enterprise' && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.recommendedPlanBadge}
              </Badge>
            )}
            {!currentPlan?.id.startsWith('enterprise-') && !isUpgradeFlow && enterprisePlans[0]?.best_value && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.bestValueBadge}
              </Badge>
            )}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl">🏢</span>
                  <h3 className="text-xl sm:text-2xl font-bold">Enterprise</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">{t.seo.subscription.enterpriseLarge}</p>
              </div>
              
              <div>
                <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enterprisePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_optimizations_monthly.toLocaleString()} optimisations - {plan.price_monthly.toLocaleString()}{currency}/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEnterprisePlan && (
                <>
                  <div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold">{selectedEnterprisePlan.price_monthly.toLocaleString()}{currency}</span>
                      <span className="text-muted-foreground text-sm sm:text-base">{t.seo.subscription.perMonth}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 pt-4 sm:pt-5 md:pt-6 border-t">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedEnterprisePlan.max_optimizations_monthly.toLocaleString()} {t.seo.subscription.optimizationsMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedEnterprisePlan.max_articles_monthly} {t.seo.subscription.articlesMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedEnterprisePlan.max_chat_responses_monthly.toLocaleString()} {t.seo.subscription.chatResponsesMonth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedEnterprisePlan.max_shopify_stores} {t.seo.subscription.shopifyStores}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                      <span>{selectedEnterprisePlan.max_products === -1 ? t.seo.subscription.unlimitedProducts : `${selectedEnterprisePlan.max_products.toLocaleString()} ${t.seo.subscription.products.toLowerCase()}`}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button 
              className="w-full mt-4 sm:mt-5 md:mt-6 text-sm sm:text-base" 
              size="lg"
              variant={isCurrentPlan(selectedEnterpriseTier) ? "secondary" : "default"}
              disabled={isCurrentPlan(selectedEnterpriseTier) || checkoutLoading === selectedEnterpriseTier}
              onClick={() => handleSelectPlan(selectedEnterpriseTier)}
            >
              {checkoutLoading === selectedEnterpriseTier ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentPlan(selectedEnterpriseTier) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t.seo.subscription.currentPlanBadge}
                </>
              ) : (
                t.seo.subscription.upgrade
              )}
            </Button>
          </Card>
        )}
      </div>

      {!isUpgradeFlow && (
        <>
          <div className="mt-8 sm:mt-12 md:mt-16">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold mb-2">{t.seo.subscription.detailedComparison}</h3>
              <p className="text-muted-foreground text-sm sm:text-base">{t.seo.subscription.comparePlans}</p>
            </div>
            <PricingComparison />
          </div>

          <UsageLimits />
          <BillingPortal />
        </>
      )}
    </div>
  );
};

export default Subscription;