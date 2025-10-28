import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Sparkles, Zap, Crown, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface Plan {
  id: string;
  icon: any;
  badgeColor?: string;
  price_monthly: number;
  price_yearly: number;
  featured?: boolean;
}

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans: Plan[] = [
    {
      id: "starter",
      price_monthly: 9.99,
      price_yearly: 95.88,
      icon: Sparkles,
      badgeColor: "bg-green-500",
      featured: false
    },
    {
      id: "pro",
      price_monthly: 49,
      price_yearly: 468,
      icon: Zap,
      badgeColor: "bg-primary",
      featured: true
    },
    {
      id: "enterprise",
      price_monthly: 199,
      price_yearly: 1908,
      icon: Crown,
      featured: false
    }
  ];

  useEffect(() => {
    const loadCurrentPlan = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      
      setCurrentPlanId(profile?.current_plan_id || null);
      setLoading(false);
    };

    loadCurrentPlan();
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
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          const planKey = `subscriptionPlans.${plan.id}`;
          const name = t(`${planKey}.name`);
          const description = t(`${planKey}.description`);
          const badge = t(`${planKey}.badge`);
          const cta = t(`${planKey}.cta`);
          const benefits = t(`${planKey}.benefits`, { returnObjects: true }) as string[];
          const features = t(`${planKey}.features`, { returnObjects: true }) as string[];
          
          return (
            <Card 
              key={plan.id}
              className={`relative ${plan.featured ? 'border-2 border-primary shadow-primary' : ''} ${isCurrent ? 'border-2 border-success' : ''}`}
            >
              {badge && (
                <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badgeColor || 'bg-primary'}`}>
                  {badge}
                </Badge>
              )}
              {isCurrent && (
                <Badge className="absolute -top-3 right-4 bg-success">
                  ✓ {t('subscriptionPlans.current_plan')}
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-6 h-6 text-primary" />
                  <CardTitle className="text-2xl">{name}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{getPrice(plan)}€</span>
                  <span className="text-muted-foreground">
                    {billingPeriod === 'monthly' ? t('subscriptionPlans.per_month') : t('subscriptionPlans.per_year')}
                  </span>
                  {billingPeriod === 'yearly' && (
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                      {t('subscriptionPlans.savings')} {getSavings(plan)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-primary">✨ {t('subscriptionPlans.why_choose')}</p>
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-primary">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <p className="font-semibold text-sm">{t('subscriptionPlans.included')}</p>
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={plan.featured ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || loading}
                >
                  {isCurrent ? t('subscriptionPlans.current_plan') : cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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