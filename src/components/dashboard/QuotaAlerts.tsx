import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/lib/language';
import { useUpgradeNavigation } from '@/hooks/useUpgradeNavigation';

interface QuotaAlert {
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  percentage: number;
  quotaType: string;
}

export function QuotaAlerts() {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
  const { navigateToUpgrade, loading: upgradeLoading } = useUpgradeNavigation();
  const [alerts, setAlerts] = useState<QuotaAlert[]>([]);

  useEffect(() => {
    if (!user) return;

    const checkQuotas = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const planId = profile.subscription_status === 'trialing' ? 'trial' : profile.current_plan_id;
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (!plan) return;

        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        const { data: usage } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();

        if (!usage) return;

        const newAlerts: QuotaAlert[] = [];

        const quotas = [
          {
            name: t.quotaAlerts.seoOptimizations,
            current: usage.optimizations_count || 0,
            limit: profile.subscription_status === 'trialing' 
              ? (plan.trial_max_optimizations || plan.max_optimizations_monthly)
              : plan.max_optimizations_monthly
          },
          {
            name: t.quotaAlerts.articles,
            current: usage.articles_count || 0,
            limit: profile.subscription_status === 'trialing'
              ? (plan.trial_max_articles || plan.max_articles_monthly)
              : plan.max_articles_monthly
          },
          {
            name: t.quotaAlerts.chatResponses,
            current: usage.chat_responses_count || 0,
            limit: plan.max_chat_responses_monthly || 100
          }
        ];

        for (const quota of quotas) {
          const percentage = (quota.current / quota.limit) * 100;

          if (percentage >= 100) {
            newAlerts.push({
              type: 'critical',
              title: t.quotaAlerts.quotaReached,
              message: tf('quotaAlerts.reachedMessage', {
                name: quota.name,
                current: quota.current,
                limit: quota.limit
              }),
              percentage,
              quotaType: quota.name
            });
          } else if (percentage >= 90) {
            newAlerts.push({
              type: 'warning',
              title: t.quotaAlerts.quotaAlmostReached,
              message: tf('quotaAlerts.almostReachedMessage', {
                percentage: Math.round(percentage),
                name: quota.name,
                current: quota.current,
                limit: quota.limit
              }),
              percentage,
              quotaType: quota.name
            });
          }
        }

        setAlerts(newAlerts);
      } catch (error) {
        console.error('Error checking quotas:', error);
      }
    };

    checkQuotas();
    const interval = setInterval(checkQuotas, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, t, tf]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Alert 
          key={index} 
          variant={alert.type === 'critical' ? 'destructive' : 'default'}
          className={alert.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' : ''}
        >
          {alert.type === 'critical' && <AlertTriangle className="h-4 w-4" />}
          {alert.type === 'warning' && <TrendingUp className="h-4 w-4" />}
          {alert.type === 'info' && <Info className="h-4 w-4" />}
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{alert.message}</span>
            <Button 
              size="sm" 
              variant={alert.type === 'critical' ? 'default' : 'outline'}
              onClick={navigateToUpgrade}
              disabled={upgradeLoading}
            >
              {upgradeLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {t.quotaAlerts.viewPlans}
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
