import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';
import { BrowserNotificationService } from '@/lib/notificationService';

interface QuotaStatus {
  type: string;
  current: number;
  limit: number;
  percentage: number;
}

/**
 * Hook to monitor quota usage and send automatic notifications
 * - Checks quotas every 2 minutes
 * - Sends notifications at 90%, 95%, and 100% usage
 * - Handles browser notifications with permissions
 */
export function useQuotaMonitoring() {
  const { user } = useAuth();
  const { sendQuotaWarning, sendQuotaExceeded } = useNotifications();
  const notifiedQuotas = useRef<Set<string>>(new Set());
  const checkInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      return;
    }

    // Request browser notification permission on first load
    if (BrowserNotificationService.isSupported() && BrowserNotificationService.getPermission() === 'default') {
      BrowserNotificationService.requestPermission();
    }

    const checkQuotas = async () => {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, current_plan_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        // Get subscription plan limits
        const planId = profile.subscription_status === 'trialing' ? 'trial' : profile.current_plan_id;
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (!plan) return;

        // Get current usage
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        const { data: usage } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();

        if (!usage) return;

        // Detect language from browser or default to French
        const language = (navigator.language.startsWith('en') ? 'en' : 'fr') as 'fr' | 'en';

        // Check all quotas
        const quotas: QuotaStatus[] = [
          {
            type: 'optimizations',
            current: usage.optimizations_count || 0,
            limit: profile.subscription_status === 'trialing' 
              ? (plan.trial_max_optimizations || plan.max_optimizations_monthly)
              : plan.max_optimizations_monthly,
            percentage: 0
          },
          {
            type: 'articles',
            current: usage.articles_count || 0,
            limit: profile.subscription_status === 'trialing'
              ? (plan.trial_max_articles || plan.max_articles_monthly)
              : plan.max_articles_monthly,
            percentage: 0
          },
          {
            type: 'chat',
            current: usage.chat_responses_count || 0,
            limit: plan.max_chat_responses_monthly || 100,
            percentage: 0
          },
          {
            type: 'shopify_requests',
            current: usage.shopify_requests_count || 0,
            limit: plan.max_shopify_requests_monthly || 20,
            percentage: 0
          },
          {
            type: 'products',
            current: usage.products_count || 0,
            limit: profile.subscription_status === 'trialing'
              ? (plan.trial_max_products || plan.max_products)
              : plan.max_products,
            percentage: 0
          }
        ];

        // Calculate percentages and send notifications
        for (const quota of quotas) {
          quota.percentage = (quota.current / quota.limit) * 100;
          const notifKey = `${quota.type}_${Math.floor(quota.percentage / 5) * 5}`;

          // Send notification at 90%, 95%, and 100%
          if (quota.percentage >= 90 && !notifiedQuotas.current.has(notifKey)) {
            notifiedQuotas.current.add(notifKey);

            if (quota.percentage >= 100) {
              // 100% - Quota exceeded
              await sendQuotaExceeded(user.id, language as 'fr' | 'en');
              
              // Browser notification for critical alert
              if (BrowserNotificationService.isEnabled()) {
                BrowserNotificationService.showNotification(
                  language === 'fr' ? '🚨 Quota dépassé!' : '🚨 Quota exceeded!',
                  {
                    body: language === 'fr' 
                      ? `Votre quota de ${quota.type} est atteint. Passez à un plan supérieur.`
                      : `Your ${quota.type} quota is reached. Upgrade to a higher plan.`,
                    requireInteraction: true,
                    tag: `quota-exceeded-${quota.type}`
                  }
                );
              }
            } else if (quota.percentage >= 95) {
              // 95% - Critical warning
              await sendQuotaWarning(user.id, quota.percentage, language as 'fr' | 'en');
              
              if (BrowserNotificationService.isEnabled()) {
                BrowserNotificationService.showNotification(
                  language === 'fr' ? '⚠️ Quota presque atteint' : '⚠️ Quota almost reached',
                  {
                    body: language === 'fr'
                      ? `Vous avez utilisé ${Math.round(quota.percentage)}% de votre quota de ${quota.type}.`
                      : `You have used ${Math.round(quota.percentage)}% of your ${quota.type} quota.`,
                    tag: `quota-warning-${quota.type}`
                  }
                );
              }
            } else {
              // 90% - Warning
              await sendQuotaWarning(user.id, quota.percentage, language as 'fr' | 'en');
            }
          }
        }
      } catch (error) {
        console.error('Error checking quotas:', error);
      }
    };

    // Check immediately and then every 2 minutes
    checkQuotas();
    checkInterval.current = setInterval(checkQuotas, 2 * 60 * 1000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [user, sendQuotaWarning, sendQuotaExceeded]);

  return {
    // Hook runs automatically, no return needed
  };
}
