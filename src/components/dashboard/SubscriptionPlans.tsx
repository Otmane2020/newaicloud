import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Sparkles, Zap, Crown, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_campaigns: number;
  max_chat_responses_monthly: number;
  trial_days: number;
  features: any;
}

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
        .order('price_monthly', { ascending: true });
      
      if (plansData) {
        setPlans(plansData);
        
        // Set default selections
        const proPlans = plansData.filter(p => 
          p.id === 'professional' || 
          p.id === 'pro' || 
          p.id.startsWith('pro-')
        );
        const enterprisePlans = plansData.filter(p => 
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
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: planId,
          billing_period: billingPeriod,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/account?tab=subscription&checkout=cancelled`
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: t('common.error'),
        description: "Unable to create payment session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (planId: string) => currentPlanId === planId;

  const getPrice = (plan: Plan) => {
    return billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    const savings = ((monthlyCost - yearlyCost) / monthlyCost * 100).toFixed(0);
    return savings;
  };

  // Group plans by category
  const starterPlan = plans.find(p => p.id === 'starter');
  const proPlans = plans.filter(p => 
    p.id === 'professional' || 
    p.id === 'pro' || 
    p.id.startsWith('pro-')
  );
  const enterprisePlans = plans.filter(p => 
    p.id === 'enterprise' || 
    p.id.startsWith('enterprise-')
  );
  
  const selectedPro = proPlans.find(p => p.id === selectedProPlan);
  const selectedEnterprise = enterprisePlans.find(p => p.id === selectedEnterprisePlan);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('subscriptionPlans.title')}</h2>
        <p className="text-muted-foreground">
          {t('subscriptionPlans.subtitle')}
        </p>
        
        <div className="flex justify-center">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly">{t('subscriptionPlans.monthly')}</TabsTrigger>
              <TabsTrigger value="yearly">
                {t('subscriptionPlans.yearly')}
                <Badge variant="secondary" className="ml-2 bg-success/20 text-success">
                  {t('subscriptionPlans.savings')}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        {starterPlan && (
          <Card className={`relative ${isCurrentPlan(starterPlan.id) ? 'border-2 border-success' : ''}`}>
            {starterPlan.trial_days > 0 && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500">
                🎁 {t('subscriptionPlans.starter.badge')}
              </Badge>
            )}
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-3 right-4 bg-success">
                ✓ {t('subscriptionPlans.current_plan')}
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">{t('subscriptionPlans.starter.name')}</CardTitle>
              </div>
              <CardDescription>{t('subscriptionPlans.starter.description')}</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">${getPrice(starterPlan).toFixed(2)}</span>
                <span className="text-muted-foreground">{t('subscriptionPlans.per_month')}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {starterPlan.max_products} {t('common.products')} • 
                  {starterPlan.max_optimizations_monthly} {t('common.optimizations')} • 
                  {starterPlan.max_articles_monthly} {t('common.articles')}
                </p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleSelectPlan(starterPlan.id)}
                disabled={isCurrentPlan(starterPlan.id) || loading}
              >
                {isCurrentPlan(starterPlan.id) ? t('subscriptionPlans.current_plan') : t('subscriptionPlans.starter.cta')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pro Plans */}
        {selectedPro && (
          <Card className={`relative border-2 border-primary shadow-primary ${isCurrentPlan(selectedPro.id) ? 'border-success' : ''}`}>
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
              {t('subscriptionPlans.pro.badge')}
            </Badge>
            {isCurrentPlan(selectedPro.id) && (
              <Badge className="absolute -top-3 right-4 bg-success">
                ✓ {t('subscriptionPlans.current_plan')}
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">{t('subscriptionPlans.pro.name')}</CardTitle>
              </div>
              
              {proPlans.length > 1 && (
                <Select value={selectedProPlan} onValueChange={setSelectedProPlan}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {proPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_products.toLocaleString()} {t('common.products')} • 
                        {plan.max_optimizations_monthly.toLocaleString()} {t('common.optimizations')} / {t('common.month')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <CardDescription>{t('subscriptionPlans.pro.description')}</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">${getPrice(selectedPro).toFixed(2)}</span>
                <span className="text-muted-foreground">{t('subscriptionPlans.per_month')}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedPro.max_products.toLocaleString()} {t('common.products')} • 
                  {selectedPro.max_optimizations_monthly.toLocaleString()} {t('common.optimizations')} • 
                  {selectedPro.max_articles_monthly} {t('common.articles')}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => handleSelectPlan(selectedPro.id)}
                disabled={isCurrentPlan(selectedPro.id) || loading}
              >
                {isCurrentPlan(selectedPro.id) ? t('subscriptionPlans.current_plan') : t('subscriptionPlans.pro.cta')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enterprise Plans */}
        {selectedEnterprise && (
          <Card className={`relative ${isCurrentPlan(selectedEnterprise.id) ? 'border-2 border-success' : ''}`}>
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500">
              {t('subscriptionPlans.enterprise.badge')}
            </Badge>
            {isCurrentPlan(selectedEnterprise.id) && (
              <Badge className="absolute -top-3 right-4 bg-success">
                ✓ {t('subscriptionPlans.current_plan')}
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">{t('subscriptionPlans.enterprise.name')}</CardTitle>
              </div>
              
              {enterprisePlans.length > 1 && (
                <Select value={selectedEnterprisePlan} onValueChange={setSelectedEnterprisePlan}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {enterprisePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.max_products === -1 ? t('common.unlimited') : plan.max_products.toLocaleString()} {t('common.products')} • 
                        {plan.max_optimizations_monthly.toLocaleString()} {t('common.optimizations')} / {t('common.month')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <CardDescription>{t('subscriptionPlans.enterprise.description')}</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">${getPrice(selectedEnterprise).toFixed(2)}</span>
                <span className="text-muted-foreground">{t('subscriptionPlans.per_month')}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedEnterprise.max_products === -1 ? t('common.unlimited') : selectedEnterprise.max_products.toLocaleString()} {t('common.products')} • 
                  {selectedEnterprise.max_optimizations_monthly.toLocaleString()} {t('common.optimizations')} • 
                  {selectedEnterprise.max_articles_monthly} {t('common.articles')}
                </p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleSelectPlan(selectedEnterprise.id)}
                disabled={isCurrentPlan(selectedEnterprise.id) || loading}
              >
                {isCurrentPlan(selectedEnterprise.id) ? t('subscriptionPlans.current_plan') : t('subscriptionPlans.enterprise.cta')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-2 border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">{t('subscriptionPlans.payg.title')}</CardTitle>
          </div>
          <CardDescription className="text-base">
            {t('subscriptionPlans.payg.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold">💰 {t('subscriptionPlans.payg.pricing_title')}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('subscriptionPlans.payg.seo_opt')}</li>
                <li>• {t('subscriptionPlans.payg.article')}</li>
                <li>• {t('subscriptionPlans.payg.search')}</li>
                <li>• {t('subscriptionPlans.payg.chat')}</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">✨ {t('subscriptionPlans.payg.benefits_title')}</p>
              <ul className="space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>{t('subscriptionPlans.payg.no_limit')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>{t('subscriptionPlans.payg.auto_billing')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>{t('subscriptionPlans.payg.volume_discount')}</strong></span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 {t('subscriptionPlans.payg.tip')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}