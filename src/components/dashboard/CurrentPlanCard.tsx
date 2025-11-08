import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CreditCard, Calendar, Package, RefreshCw } from 'lucide-react';
import { PlanUpgradeDialog } from './PlanUpgradeDialog';
import { useTranslation } from '@/lib/language';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
}

export function CurrentPlanCard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      // Récupérer d'abord les données du profil Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at')
        .eq('id', user?.id)
        .single();

      // Récupérer les données d'abonnement pour obtenir le billing_period
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('billing_period, current_period_end')
        .eq('seller_id', user?.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*');

      // Si l'utilisateur a un plan dans Supabase, l'utiliser directement
      if (profileData?.current_plan_id) {
        const plan = plansData?.find((p: Plan) => p.id === profileData.current_plan_id);
        
        if (plan) {
          const isTrialing = profileData.subscription_status === 'trialing';
          setCurrentPlan({
            ...plan,
            name: isTrialing ? `${plan.name} (Trial)` : plan.name
          });
          
          // Set billing period from subscription data or default to monthly
          const period = subscriptionData?.billing_period;
          setBillingPeriod((period === 'yearly' || period === 'monthly') ? period : 'monthly');
          
          // Always try to get fresh data from Stripe via check-subscription
          // This ensures subscription_end is always up to date
          const { data: stripeData } = await supabase.functions.invoke('check-subscription');
          
          if (stripeData?.subscription_end) {
            setSubscriptionEnd(stripeData.subscription_end);
          } else if (isTrialing && profileData.trial_ends_at) {
            // Fallback to trial_ends_at if in trial
            setSubscriptionEnd(profileData.trial_ends_at);
          } else if (subscriptionData?.current_period_end) {
            // Fallback to local subscription data
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

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" />
        {t.account.subscription.title}
      </h2>
      
      {currentPlan ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
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
              {currentPlan.name.includes('Trial') ? t.account.subscription.expiresOn : t.account.subscription.renewalDate}: {new Date(subscriptionEnd).toLocaleDateString()}
            </div>
          )}

          {currentPlan.name.includes('Trial') && (
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
              onClick={() => setUpgradeDialogOpen(true)}
              disabled={portalLoading}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t.account.subscription.changePlan}
            </Button>

            <Button 
              onClick={handleManageSubscription}
              disabled={portalLoading}
              variant="default"
              className="flex-1"
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
