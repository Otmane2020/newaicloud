import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Sparkles, Zap, Crown, CreditCard, TrendingUp, Loader2, ShoppingBag, FileText, BarChart3, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol, getPriceByLanguage, formatPrice, getPriceIdByLanguage } from "@/lib/formatUtils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  price_monthly_eur?: number;
  price_yearly_eur?: number;
  price_monthly_usd?: number;
  price_yearly_usd?: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_monthly_eur?: string | null;
  stripe_price_id_yearly_eur?: string | null;
  stripe_price_id_monthly_usd?: string | null;
  stripe_price_id_yearly_usd?: string | null;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_campaigns: number;
  max_chat_responses_monthly: number;
  max_shopify_stores: number;
  trial_days: number;
  features: any;
  display_order: number;
}

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits } = useUsageLimits();
  const { t, tf, language } = useTranslation();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedProPlan, setSelectedProPlan] = useState<string>('');
  const [selectedEnterprisePlan, setSelectedEnterprisePlan] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      // Load plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (plansData) {
        // Filter only plans with valid Stripe price IDs
        const validPlans = plansData.filter(plan => {
          const monthlyId = plan.stripe_price_id_monthly || '';
          const yearlyId = plan.stripe_price_id_yearly || '';
          
          // Check if at least one price ID is valid (real Stripe IDs are longer than 15 chars)
          const hasValidMonthly = monthlyId.startsWith('price_') && monthlyId.length > 15;
          const hasValidYearly = yearlyId.startsWith('price_') && yearlyId.length > 15;
          
          return hasValidMonthly || hasValidYearly;
        });
        
        setPlans(validPlans);
        
        // Set default selections
        const proPlans = validPlans.filter(p => 
          p.id === 'professional' || 
          p.id === 'pro' || 
          p.id.startsWith('pro-')
        );
        const enterprisePlans = validPlans.filter(p => 
          p.id === 'enterprise' || 
          p.id.startsWith('enterprise-')
        );
        
        if (proPlans.length > 0) setSelectedProPlan(proPlans[0].id);
        if (enterprisePlans.length > 0) setSelectedEnterprisePlan(enterprisePlans[0].id);
      }
      
      // Load current plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      
      setCurrentPlanId(profile?.current_plan_id || null);
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  const handleSelectPlan = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      // Check if user has active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('seller_id', user?.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, current_plan_id')
        .eq('id', user?.id)
        .single();

      const hasActiveSubscription = !!subscription?.stripe_subscription_id;
      const isTrialing = profile?.subscription_status === 'trialing';
      const isCurrentPlan = profile?.current_plan_id === planId;

      // If in trial and activating current plan, use direct payment
      if (isTrialing && isCurrentPlan) {
        const { data, error } = await supabase.functions.invoke('activate-full-plan');
        if (error) throw error;
        
        if (data?.success) {
          toast({
            title: t.account.subscription.activationSuccess,
            description: t.toasts.subscriptionActivatedMessage,
          });
          setTimeout(() => window.location.reload(), 1500);
        }
        return;
      }

      // If user has active subscription, use update-subscription for proration
      if (hasActiveSubscription) {
        const selectedPlan = plans.find(p => p.id === planId);
        if (!selectedPlan) throw new Error('Plan not found');

        const stripePriceId = billingPeriod === 'yearly' 
          ? selectedPlan.stripe_price_id_yearly 
          : selectedPlan.stripe_price_id_monthly;

        if (!stripePriceId || !stripePriceId.startsWith('price_')) {
          toast({
            title: t.errors.missingConfiguration,
            description: tf('dashboard.plans.errors.missingConfig', { planName: selectedPlan?.name }),
            variant: "destructive"
          });
          setCheckoutLoading(null);
          return;
        }

        const { data, error } = await supabase.functions.invoke('update-subscription', {
          body: { 
            new_price_id: stripePriceId,
            new_plan_id: planId,
          }
        });

        if (error) throw error;

        toast({
          title: t.account.subscription.activationSuccess,
          description: 'Your plan has been upgraded with prorated billing!',
        });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // Otherwise, create new checkout session
      const selectedPlan = plans.find(p => p.id === planId);
      
      const stripePriceId = billingPeriod === 'yearly' 
        ? selectedPlan?.stripe_price_id_yearly 
        : selectedPlan?.stripe_price_id_monthly;
      
      if (!stripePriceId || !stripePriceId.startsWith('price_')) {
        toast({
          title: t.errors.missingConfiguration,
          description: tf('dashboard.plans.errors.missingConfig', { planName: selectedPlan?.name }),
          variant: "destructive"
        });
        setCheckoutLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: planId,
          billing_period: billingPeriod,
          currency: language === 'fr' ? 'EUR' : 'USD',
          success_url: `${window.location.origin}/account?tab=subscription&checkout=success`,
          cancel_url: `${window.location.origin}/account?tab=subscription&checkout=cancelled`
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error handling plan selection:', error);
      toast({
        title: t.errors.error,
        description: t.dashboard.plans.errors.genericError,
        variant: "destructive"
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isCurrentPlan = (planId: string) => currentPlanId === planId;

  const getPrice = (plan: Plan) => {
    const price = getPriceByLanguage(plan, language, billingPeriod);
    // Format: keep decimals for prices under 10, remove for whole numbers
    if (price < 10) return formatPrice(price, language, true).replace(/[€$]/, '');
    return formatPrice(price, language, false).replace(/[€$]/, '');
  };

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    const savings = ((monthlyCost - yearlyCost) / monthlyCost * 100).toFixed(0);
    return savings;
  };
  
  const getPlanLevel = (planId: string) => {
    if (planId === 'trial' || planId === 'starter') return 1;
    if (planId === 'professional' || planId.startsWith('pro-')) return 2;
    if (planId.startsWith('enterprise-')) return 3;
    return 0;
  };
  
  const getButtonText = (planId: string) => {
    if (isCurrentPlan(planId)) return t.dashboard.plans.currentPlan;
    
    const currentLevel = getPlanLevel(currentPlanId || '');
    const targetLevel = getPlanLevel(planId);
    
    if (targetLevel > currentLevel) return t.dashboard.plans.upgrade;
    if (targetLevel < currentLevel) return t.dashboard.plans.downgrade;
    return t.dashboard.plans.changePlan;
  };

  // Group plans by category
  const starterPlan = plans.find(p => p.id === 'starter');
  const proPlans = plans.filter(p => 
    p.id.startsWith('pro-')
  ).sort((a, b) => a.display_order - b.display_order);
  const enterprisePlans = plans.filter(p => 
    p.id.startsWith('enterprise-')
  ).sort((a, b) => a.display_order - b.display_order);
  
  const selectedPro = proPlans.find(p => p.id === selectedProPlan);
  const selectedEnterprise = enterprisePlans.find(p => p.id === selectedEnterprisePlan);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t.dashboard.plans.title}</h2>
        <p className="text-muted-foreground">
          {t.dashboard.plans.subtitle}
        </p>
        
        <div className="flex justify-center">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly">{t.dashboard.plans.monthly}</TabsTrigger>
              <TabsTrigger value="yearly">
                {t.dashboard.plans.yearly}
                <Badge variant="secondary" className="ml-2 bg-success/20 text-success">
                  {tf('dashboard.plans.save', { percent: '20' })}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        {starterPlan && (
          <Card className={`p-8 relative flex flex-col ${isCurrentPlan(starterPlan.id) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">{starterPlan.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.starter}</p>
              </div>
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{getCurrencySymbol(language)}{getPrice(starterPlan)}</span>
                  <span className="text-muted-foreground">{t.dashboard.plans.perMonth}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{starterPlan.max_products} {t.dashboard.plans.features.products}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{starterPlan.max_optimizations_monthly} {t.dashboard.plans.features.optimizations}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{starterPlan.max_articles_monthly} {t.dashboard.plans.features.articles}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>0 {t.dashboard.plans.features.campaigns}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{starterPlan.max_chat_responses_monthly} {t.dashboard.plans.features.chatResponses}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(starterPlan.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(starterPlan.id)}
              disabled={isCurrentPlan(starterPlan.id) || checkoutLoading === starterPlan.id}
            >
              {checkoutLoading === starterPlan.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(starterPlan.id)
              )}
            </Button>
          </Card>
        )}

        {/* Pro Plans */}
        {selectedPro && (
          <Card className={`p-8 relative flex flex-col ${isCurrentPlan(selectedPro.id) ? 'border-2 border-primary shadow-primary' : 'border-2 border-primary/20'}`}>
            {isCurrentPlan(selectedPro.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">Pro</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.pro}</p>
              </div>
              
              {proPlans.length > 1 && (
              <Select value={selectedProPlan} onValueChange={setSelectedProPlan}>
                <SelectTrigger className="w-full bg-card border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {proPlans.map((plan) => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                    >
                      {plan.max_optimizations_monthly.toLocaleString()} optimisations - {formatPrice(getPriceByLanguage(plan, language, billingPeriod), language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{getCurrencySymbol(language)}{getPrice(selectedPro)}</span>
                  <span className="text-muted-foreground">{t.dashboard.plans.perMonth}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedPro.max_products.toLocaleString()} {t.dashboard.plans.features.products}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedPro.max_optimizations_monthly.toLocaleString()} {t.dashboard.plans.features.optimizations}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedPro.max_articles_monthly} {t.dashboard.plans.features.articles}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedPro.max_campaigns} {t.dashboard.plans.features.campaigns}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedPro.max_chat_responses_monthly.toLocaleString()} {t.dashboard.plans.features.chatResponses}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(selectedPro.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(selectedPro.id)}
              disabled={isCurrentPlan(selectedPro.id) || checkoutLoading === selectedPro.id}
            >
              {checkoutLoading === selectedPro.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(selectedPro.id)
              )}
            </Button>
          </Card>
        )}

        {/* Enterprise Plans */}
        {selectedEnterprise && (
          <Card className={`p-8 relative flex flex-col ${isCurrentPlan(selectedEnterprise.id) ? 'border-2 border-primary shadow-primary' : ''}`}>
            {isCurrentPlan(selectedEnterprise.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            
            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">Enterprise</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.enterprise}</p>
              </div>
              
              {enterprisePlans.length > 1 && (
              <Select value={selectedEnterprisePlan} onValueChange={setSelectedEnterprisePlan}>
                <SelectTrigger className="w-full bg-card border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enterprisePlans.map((plan) => (
                    <SelectItem 
                      key={plan.id} 
                      value={plan.id}
                    >
                      {plan.max_optimizations_monthly.toLocaleString()} optimisations - {formatPrice(getPriceByLanguage(plan, language, billingPeriod), language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{getCurrencySymbol(language)}{getPrice(selectedEnterprise)}</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Illimité produits</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_optimizations_monthly.toLocaleString()} optimisations/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_articles_monthly} articles/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_campaigns} campagnes</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_chat_responses_monthly.toLocaleString()} réponses chat/mois</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(selectedEnterprise.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(selectedEnterprise.id)}
              disabled={isCurrentPlan(selectedEnterprise.id) || checkoutLoading === selectedEnterprise.id}
            >
              {checkoutLoading === selectedEnterprise.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(selectedEnterprise.id)
              )}
            </Button>
          </Card>
        )}
      </div>

    </div>
  );
}