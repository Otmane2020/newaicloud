import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CreditCard, Calendar, Package, TrendingUp } from 'lucide-react';
import { PlanUpgradeDialog } from './PlanUpgradeDialog';
import { useTranslation } from '@/lib/language';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  max_optimizations_monthly?: number;
  isTrial?: boolean;
}

export function CurrentPlanCard() {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
  const { limits: limitsData } = useUsageLimits();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [nextPlan, setNextPlan] = useState<Plan | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at, created_at')
        .eq('id', user?.id)
        .single();

      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('billing_period, current_period_end')
        .eq('seller_id', user?.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('max_optimizations_monthly', { ascending: true });

      if (profileData?.current_plan_id) {
        const plan = plansData?.find((p: Plan) => p.id === profileData.current_plan_id);
        
        if (plan && plansData) {
          const currentIndex = plansData.findIndex((p: Plan) => p.id === plan.id);
          if (currentIndex >= 0 && currentIndex < plansData.length - 1) {
            setNextPlan(plansData[currentIndex + 1]);
          }
        }
        
        if (plan) {
          const isTrialing = profileData.subscription_status === 'trialing';
          const isTrial = plan.id === 'trial';
          const isTrialPlan = isTrial || isTrialing;

          setCurrentPlan({
            ...plan,
            name: isTrialPlan ? t.trial.title : plan.name,
            isTrial: isTrialPlan,
          });
          
          const period = subscriptionData?.billing_period;
          setBillingPeriod((period === 'yearly' || period === 'monthly') ? period : 'monthly');
          
          const { data: { session } } = await supabase.auth.getSession();
          const headers = session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`
          } : {};
          
          const { data: stripeData } = await supabase.functions.invoke('check-subscription', {
            headers
          });
          
          if (stripeData?.subscription_end) {
            setSubscriptionEnd(stripeData.subscription_end);
          } else if ((isTrialing || plan.id === 'trial') && profileData.trial_ends_at) {
            setSubscriptionEnd(profileData.trial_ends_at);
          } else if (plan.id === 'trial' && profileData.created_at) {
            const trialEnd = new Date(profileData.created_at);
            trialEnd.setDate(trialEnd.getDate() + 14);
            setSubscriptionEnd(trialEnd.toISOString());
          } else if (subscriptionData?.current_period_end) {
            setSubscriptionEnd(subscriptionData.current_period_end);
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
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(t.account.subscription.activationError);
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
      toast.error(t.account.subscription.portalError);
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

  const optimizationsUsed = limitsData?.usage.optimizations_count || 0;
  const optimizationsLimit = limitsData?.limits.max_optimizations || 0;
  const usagePercentage = optimizationsLimit > 0 ? (optimizationsUsed / optimizationsLimit) * 100 : 0;
  const shouldShowUpgradeAlert = usagePercentage >= 80 && nextPlan;

  const formatOptimizationsCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" />
        {t.account.subscription.title}
      </h2>
      
      {currentPlan ? (
        <div className="space-y-4">
          {shouldShowUpgradeAlert && (
            <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">{t.account.subscription.upgradeRecommended}:</span>{' '}
                {tf('account.subscription.usedPercentage', { percent: usagePercentage.toFixed(0) })}
                <Button
                  variant="link"
                  className="px-1 h-auto font-semibold text-orange-600 hover:text-orange-700"
                  onClick={() => setUpgradeDialogOpen(true)}
                >
                  {tf('account.subscription.switchToPlan', { count: formatOptimizationsCount(nextPlan.max_optimizations_monthly || 0) })}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">
                  {(t.planNames as any)[currentPlan.name] || currentPlan.name}
                </h3>
                {(currentPlan.id.includes('pro') || currentPlan.id.includes('enterprise')) && (
                  <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    {formatOptimizationsCount(currentPlan.max_optimizations_monthly || 0)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{t.account.subscription.currentPlan}</p>
                {billingPeriod === 'yearly' && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                    {t.onboarding.yearly}
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              {t.account.subscription.active}
            </Badge>
          </div>

          {subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {(currentPlan as Plan & { isTrial?: boolean }).isTrial
                ? t.account.subscription.expiresOn
                : t.account.subscription.renewalDate}: {new Date(subscriptionEnd).toLocaleDateString()}
            </div>
          )}

          {(currentPlan as Plan & { isTrial?: boolean }).isTrial && (
            <Button 
              onClick={handleUpgradeToFullPlan}
              disabled={upgradeLoading}
              variant="default"
              className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700"
            >
              {upgradeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.account.subscription.activating}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t.account.subscription.activateFullPlan}
                </>
              )}
            </Button>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleManageSubscription}
              disabled={portalLoading}
              variant="default"
              className="w-full"
            >
              {portalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t.account.subscription.manageSubscription}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">
            {t.account.subscription.noSubscription}
          </p>
          <Button onClick={() => window.location.href = '/onboarding'}>
            {t.account.subscription.choosePlan}
          </Button>
        </div>
      )}

      <PlanUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentPlanId={currentPlan?.id || null}
        onSuccess={loadSubscriptionData}
      />
    </Card>
  );
}
