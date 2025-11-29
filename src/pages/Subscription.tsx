import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Rocket, Zap, Building2, Package, Tag } from "lucide-react";
import { LucideIcon } from "lucide-react";
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
import { PricingCard } from "@/components/pricing/PricingCard";

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
  const { t, tf, language } = useTranslation();
  const currency = getCurrencySymbol(language);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedProTier, setSelectedProTier] = useState<string>('');
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>('');
  const [prorationInfo, setProrationInfo] = useState<any>(null);
  const [loadingProration, setLoadingProration] = useState(false);
  const [useManualPromo, setUseManualPromo] = useState(false);

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
      
      // Filter plans - only include plans with valid Stripe price IDs
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

      // Get subscription and profile info
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();

      const activePlanId = subscription?.plan_id || profile?.current_plan_id;
      const currentPlanData = activePlanId ? validPlans.find((p: Plan) => p.id === activePlanId) : null;
      setCurrentPlan(currentPlanData || null);

      // Initialize default selections for Pro and Enterprise
      const proPlans = validPlans.filter(p => 
        p.id === 'professional' || 
        p.id === 'pro' || 
        p.id.startsWith('pro-') || 
        p.id.startsWith('professional')
      ).sort((a, b) => a.display_order - b.display_order);
      
      const enterprisePlans = validPlans.filter(p => 
        p.id.startsWith('enterprise')
      ).sort((a, b) => a.display_order - b.display_order);

      // Calculate next upgrade
      let nextUpgrade: string | null = null;
      if (currentPlanData) {
        if (currentPlanData.id === 'starter') {
          nextUpgrade = proPlans[0]?.id || null;
        } else if (currentPlanData.id.startsWith('pro')) {
          const currentIndex = proPlans.findIndex(p => p.id === currentPlanData.id);
          if (currentIndex >= 0 && currentIndex < proPlans.length - 1) {
            nextUpgrade = proPlans[currentIndex + 1].id;
          } else {
            nextUpgrade = enterprisePlans[0]?.id || null;
          }
        } else if (currentPlanData.id.startsWith('enterprise')) {
          const currentIndex = enterprisePlans.findIndex(p => p.id === currentPlanData.id);
          if (currentIndex >= 0 && currentIndex < enterprisePlans.length - 1) {
            nextUpgrade = enterprisePlans[currentIndex + 1].id;
          }
        }
      }

      // Set selections based on upgrade mode
      if (isUpgradeFlow && nextUpgrade) {
        // In upgrade mode, select the next recommended upgrade
        if (nextUpgrade.startsWith('pro')) {
          setSelectedProTier(nextUpgrade);
          if (enterprisePlans.length > 0) {
            setSelectedEnterpriseTier(enterprisePlans[0].id);
          }
        } else if (nextUpgrade.startsWith('enterprise')) {
          setSelectedEnterpriseTier(nextUpgrade);
          if (proPlans.length > 0) {
            setSelectedProTier(proPlans[0].id);
          }
        }
      } else {
        // Normal mode: select current plan or first available
        if (currentPlanData?.id.startsWith('pro')) {
          setSelectedProTier(currentPlanData.id);
        } else if (proPlans.length > 0) {
          setSelectedProTier(proPlans[0].id);
        }
        
        if (currentPlanData?.id.startsWith('enterprise')) {
          setSelectedEnterpriseTier(currentPlanData.id);
        } else if (enterprisePlans.length > 0) {
          setSelectedEnterpriseTier(enterprisePlans[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(t.seo.subscription.errors.loadPlans);
    } finally {
      setLoading(false);
    }
  };

  // Load proration preview when tier selection changes in upgrade flow
  useEffect(() => {
    if (isUpgradeFlow && selectedProTier && user) {
      loadProrationPreview(selectedProTier);
    }
  }, [selectedProTier, isUpgradeFlow, user]);

  useEffect(() => {
    if (isUpgradeFlow && selectedEnterpriseTier && user) {
      loadProrationPreview(selectedEnterpriseTier);
    }
  }, [selectedEnterpriseTier, isUpgradeFlow, user]);

  const loadProrationPreview = async (planId: string) => {
    if (!user) return;

    setLoadingProration(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase.functions.invoke('calculate-proration', {
        body: {
          new_plan_id: planId,
          billing_period: 'monthly',
        },
      });

      if (error) {
        console.error('Error calculating proration:', error);
        setProrationInfo(null);
        return;
      }

      setProrationInfo(data);
    } catch (error) {
      console.error('Error loading proration preview:', error);
      setProrationInfo(null);
    } finally {
      setLoadingProration(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setCheckoutLoading(planId);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Check user status
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at, stripe_customer_id')
        .eq('id', authUser.id)
        .single();

      const isInTrial = profile?.subscription_status === 'trialing' ||
        (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date());

      // Check for active PAID subscription (not trial)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('seller_id', authUser.id)
        .in('status', ['active', 'past_due'])
        .maybeSingle();

      // 🔧 CRITICAL FIX: If no subscription but user has stripe_customer_id, sync from Stripe
      if (!subscription?.stripe_subscription_id && profile?.stripe_customer_id) {
        console.log('🔄 No local subscription found but user has Stripe customer ID - attempting sync');
        
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-stripe-subscription', {
          body: { customerId: profile.stripe_customer_id }
        });

        if (!syncError && syncResult?.hasActiveSubscription) {
          console.log('✅ Successfully synced subscription from Stripe, retrying upgrade flow');
          
          // Retry the upgrade with the now-synced subscription
          const { data, error } = await supabase.functions.invoke('update-subscription', {
            body: {
              new_plan_id: planId,
              billing_period: 'monthly',
            },
          });

          if (error) throw error;

          const upgradeDetails = data?.upgrade_details;
          if (upgradeDetails?.proration) {
            const prorata = upgradeDetails.proration;
            toast.success(
              tf('dialogs.upgrade.planUpgradedProrationDetails', {
                amount: prorata.prorated_amount,
                currency: prorata.currency,
                daysRemaining: prorata.days_remaining,
                totalDays: prorata.total_cycle_days
              }),
              { duration: 6000 }
            );
          } else {
            toast.success(t.dialogs.upgrade.planUpgradedNoProration, { duration: 5000 });
          }

          await loadPlansAndCurrentPlan();
          setCheckoutLoading(null);
          setProrationInfo(null);
          return;
        }
      }

      const hasActivePaidSubscription = !!subscription?.stripe_subscription_id && !isInTrial;

      // ALWAYS use update-subscription for paid active customers
      if (hasActivePaidSubscription) {
        console.log('✅ Using update-subscription for paid customer with proration');
        
        const { data, error } = await supabase.functions.invoke('update-subscription', {
          body: {
            new_plan_id: planId,
            billing_period: 'monthly',
          },
        });

        if (error) throw error;

        const upgradeDetails = data?.upgrade_details;
        if (upgradeDetails?.proration) {
          const prorata = upgradeDetails.proration;
          toast.success(
            tf('dialogs.upgrade.planUpgradedProrationDetails', {
              amount: prorata.prorated_amount,
              currency: prorata.currency,
              daysRemaining: prorata.days_remaining,
              totalDays: prorata.total_cycle_days
            }),
            { duration: 6000 }
          );
        } else {
          toast.success(t.dialogs.upgrade.planUpgradedNoProration, { duration: 5000 });
        }

        await loadPlansAndCurrentPlan();
        setCheckoutLoading(null);
        setProrationInfo(null);
        return;
      }

      // For trial or new customers: use create-checkout
      console.log('📝 Using create-checkout for trial/new customer');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: planId,
          billing_period: 'monthly',
          force_immediate_payment: isInTrial,
          use_manual_promo: useManualPromo,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout or upgrading subscription:', error);
      toast.error(t.seo.subscription.errors.createCheckout);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPlanIcon = (planId: string): LucideIcon => {
    if (planId === 'starter') return Rocket;
    if (planId.startsWith('pro')) return Zap;
    if (planId.startsWith('enterprise')) return Building2;
    return Package;
  };
  
  const getPlanIconEmoji = (planId: string) => {
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

  // Determine if a plan is an upgrade or downgrade
  const getPlanChangeType = (targetPlanId: string): 'upgrade' | 'downgrade' | 'current' | null => {
    if (!currentPlan) return null;
    if (isCurrentPlan(targetPlanId)) return 'current';
    
    const currentPrice = currentPlan.price_monthly;
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return null;
    
    const targetPrice = targetPlan.price_monthly;
    return targetPrice > currentPrice ? 'upgrade' : 'downgrade';
  };

  // Get next recommended upgrade
  const getNextUpgrade = () => {
    if (!currentPlan) return null;
    
    if (currentPlan.id === 'starter') {
      return proPlans.length > 0 ? proPlans[0].id : null;
    }
    
    if (currentPlan.id.startsWith('pro')) {
      const currentIndex = proPlans.findIndex(p => p.id === currentPlan.id);
      if (currentIndex >= 0 && currentIndex < proPlans.length - 1) {
        return proPlans[currentIndex + 1].id;
      }
      return enterprisePlans.length > 0 ? enterprisePlans[0].id : null;
    }
    
    if (currentPlan.id.startsWith('enterprise')) {
      const currentIndex = enterprisePlans.findIndex(p => p.id === currentPlan.id);
      if (currentIndex >= 0 && currentIndex < enterprisePlans.length - 1) {
        return enterprisePlans[currentIndex + 1].id;
      }
    }
    
    return null;
  };

  const nextUpgradePlanId = getNextUpgrade();

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
          <CurrentPlanCard />

      {isUpgradeFlow && currentPlan && (
        <Card className="p-4 sm:p-5 md:p-6 mb-6 sm:mb-7 md:mb-8 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-2 border-primary/30 dark:border-primary/50">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{t.seo.subscription.yourCurrentPlan}</h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">{getPlanIconEmoji(currentPlan.id)}</span>
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

      {/* Manual Promo Code Switch */}
      <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <Label htmlFor="subscription-manual-promo" className="text-sm cursor-pointer flex-1">
          {t.subscription.useManualPromo || "J'ai un code promo"}
        </Label>
        <Switch
          id="subscription-manual-promo"
          checked={useManualPromo}
          onCheckedChange={setUseManualPromo}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
        {starterPlan && (
          <PricingCard
            icon={getPlanIcon(starterPlan.id)}
            name={starterPlan.name}
            isCurrentPlan={isCurrentPlan(starterPlan.id)}
            price={starterPlan.price_monthly}
            currency={currency}
            period={t.seo.subscription.perMonth}
            description={starterPlan.description}
            buttonText={isCurrentPlan(starterPlan.id) ? t.seo.subscription.currentPlanBadge : t.seo.subscription.selectThisPlan}
            onButtonClick={() => handleSelectPlan(starterPlan.id)}
            buttonDisabled={isCurrentPlan(starterPlan.id)}
            buttonLoading={checkoutLoading === starterPlan.id}
            buttonVariant={isCurrentPlan(starterPlan.id) ? "secondary" : "default"}
            features={[
              `${starterPlan.max_optimizations_monthly} ${t.seo.subscription.optimizationsMonth}`,
              `${starterPlan.max_articles_monthly} ${t.seo.subscription.articlesMonth}`,
              `${starterPlan.max_chat_responses_monthly} ${t.seo.subscription.chatResponsesMonth}`,
              `${starterPlan.max_shopify_stores} ${t.seo.subscription.shopifyStores}`,
            ]}
          />
        )}

        {proPlans.length > 0 && (
          <Card className={`relative flex flex-col hover:shadow-lg transition-shadow ${(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) ? 'border-2 border-primary shadow-lg' : 'border border-border'}`}>
            {(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            )}
            {!(currentPlan?.id === 'professional' || currentPlan?.id.startsWith('pro-')) && isUpgradeFlow && selectedProTier === nextUpgradePlanId && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.recommendedPlanBadge}
              </Badge>
            )}
            
            <div className="p-6 lg:p-8 space-y-6 flex-1 flex flex-col">
              {/* Bloc 1: Icon aligné au centre */}
              <div className="flex justify-center">
                <div className="text-4xl sm:text-5xl">⚡</div>
              </div>

              {/* Bloc 2: Name */}
              <div className="text-center">
                <h3 className="text-2xl sm:text-3xl font-bold">Pro</h3>
              </div>

              {/* Sélecteur de tier */}
              <div>
                <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un plan" />
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
                  {/* Bloc 3: Price */}
                  <div className="text-center space-y-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl sm:text-5xl font-bold">
                        {selectedProPlan.price_monthly}{currency}
                      </span>
                      <span className="text-muted-foreground text-base">
                        {t.seo.subscription.perMonth}
                      </span>
                    </div>
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs sm:text-sm font-medium">
                        <span className="text-pink-600 dark:text-pink-400">
                          {language === 'fr' ? 'Obtenez 20% de réduction avec' : 'Get 20% discount with'}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                          {language === 'fr' ? 'PROMO LIMITÉE' : 'LIMITED PROMO'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t.seo.subscription.proGrowth}</p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <div className="pt-2">
                    {/* Affichage du prorata */}
                    {prorationInfo && prorationInfo.proration_needed && selectedProTier && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-center space-y-2">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            💰 Prorata calculé
                          </p>
                          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <p><strong>Plan actuel:</strong> {prorationInfo.old_plan_price}{prorationInfo.currency}/mois</p>
                            <p><strong>Nouveau plan:</strong> {prorationInfo.new_plan_price}{prorationInfo.currency}/mois</p>
                            <p><strong>Différence:</strong> +{prorationInfo.price_difference}{prorationInfo.currency}</p>
                            <p><strong>Jours restants:</strong> {prorationInfo.days_remaining}/{prorationInfo.total_cycle_days} jours</p>
                            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 pt-2">
                              À payer maintenant: {prorationInfo.amount_to_pay_now}{prorationInfo.currency}
                            </p>
                            <p className="text-xs italic">{prorationInfo.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {loadingProration && selectedProTier && (
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Calcul du prorata...</span>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full text-sm sm:text-base" 
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
                      ) : getPlanChangeType(selectedProTier) === 'upgrade' ? (
                        t.seo.subscription.upgrade
                      ) : (
                        'Rétrograder'
                      )}
                    </Button>
                  </div>

                  {/* Bloc 5: Trait de séparation et détails */}
                  <div className="pt-4 mt-auto border-t space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedProPlan.max_optimizations_monthly}</span> {t.seo.subscription.optimizationsMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedProPlan.max_articles_monthly}</span> {t.seo.subscription.articlesMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedProPlan.max_chat_responses_monthly}</span> {t.seo.subscription.chatResponsesMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedProPlan.max_shopify_stores}</span> {t.seo.subscription.shopifyStores}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">
                          {selectedProPlan.max_products === -1 ? t.seo.subscription.unlimitedProducts : selectedProPlan.max_products.toLocaleString()}
                        </span>{' '}
                        {selectedProPlan.max_products === -1 ? '' : t.seo.subscription.products.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {enterprisePlans.length > 0 && (
          <Card className={`relative flex flex-col hover:shadow-lg transition-shadow ${currentPlan?.id.startsWith('enterprise-') ? 'border-2 border-primary shadow-lg' : 'border border-border'}`}>
            {currentPlan?.id.startsWith('enterprise-') && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
                {t.seo.subscription.currentPlanBadge}
              </Badge>
            )}
            {!currentPlan?.id.startsWith('enterprise-') && isUpgradeFlow && selectedEnterpriseTier === nextUpgradePlanId && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.recommendedPlanBadge}
              </Badge>
            )}
            {!currentPlan?.id.startsWith('enterprise-') && !isUpgradeFlow && enterprisePlans[0]?.best_value && (
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs sm:text-sm">
                {t.seo.subscription.bestValueBadge}
              </Badge>
            )}
            
            <div className="p-6 lg:p-8 space-y-6 flex-1 flex flex-col">
              {/* Bloc 1: Icon aligné au centre */}
              <div className="flex justify-center">
                <div className="text-4xl sm:text-5xl">🏢</div>
              </div>

              {/* Bloc 2: Name */}
              <div className="text-center">
                <h3 className="text-2xl sm:text-3xl font-bold">Enterprise</h3>
              </div>

              {/* Sélecteur de tier */}
              <div>
                <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un plan" />
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
                  {/* Bloc 3: Price */}
                  <div className="text-center space-y-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl sm:text-5xl font-bold">
                        {selectedEnterprisePlan.price_monthly.toLocaleString()}{currency}
                      </span>
                      <span className="text-muted-foreground text-base">
                        {t.seo.subscription.perMonth}
                      </span>
                    </div>
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs sm:text-sm font-medium">
                        <span className="text-pink-600 dark:text-pink-400">
                          {language === 'fr' ? 'Obtenez 30% de réduction avec' : 'Get 30% discount with'}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                          {language === 'fr' ? 'PROMO LIMITÉE' : 'LIMITED PROMO'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t.seo.subscription.enterpriseLarge}</p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <div className="pt-2">
                    {/* Affichage du prorata */}
                    {prorationInfo && prorationInfo.proration_needed && selectedEnterpriseTier && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-center space-y-2">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            💰 Prorata calculé
                          </p>
                          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                            <p><strong>Plan actuel:</strong> {prorationInfo.old_plan_price}{prorationInfo.currency}/mois</p>
                            <p><strong>Nouveau plan:</strong> {prorationInfo.new_plan_price}{prorationInfo.currency}/mois</p>
                            <p><strong>Différence:</strong> +{prorationInfo.price_difference}{prorationInfo.currency}</p>
                            <p><strong>Jours restants:</strong> {prorationInfo.days_remaining}/{prorationInfo.total_cycle_days} jours</p>
                            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 pt-2">
                              À payer maintenant: {prorationInfo.amount_to_pay_now}{prorationInfo.currency}
                            </p>
                            <p className="text-xs italic">{prorationInfo.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {loadingProration && selectedEnterpriseTier && (
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Calcul du prorata...</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full text-sm sm:text-base" 
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
                      ) : getPlanChangeType(selectedEnterpriseTier) === 'upgrade' ? (
                        t.seo.subscription.upgrade
                      ) : (
                        'Rétrograder'
                      )}
                    </Button>
                  </div>

                  {/* Bloc 5: Trait de séparation et détails */}
                  <div className="pt-4 mt-auto border-t space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedEnterprisePlan.max_optimizations_monthly.toLocaleString()}</span> {t.seo.subscription.optimizationsMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedEnterprisePlan.max_articles_monthly}</span> {t.seo.subscription.articlesMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedEnterprisePlan.max_chat_responses_monthly.toLocaleString()}</span> {t.seo.subscription.chatResponsesMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">{selectedEnterprisePlan.max_shopify_stores}</span> {t.seo.subscription.shopifyStores}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>
                        <span className="font-semibold">
                          {selectedEnterprisePlan.max_products === -1 ? t.seo.subscription.unlimitedProducts : selectedEnterprisePlan.max_products.toLocaleString()}
                        </span>{' '}
                        {selectedEnterprisePlan.max_products === -1 ? '' : t.seo.subscription.products.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
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
      </>
      )}
    </div>
  );
};

export default Subscription;