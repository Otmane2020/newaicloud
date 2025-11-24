import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp, CheckCircle, Sparkles, Infinity } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function UsageWidget() {
  const { limits, loading } = useUsageLimits();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading || !limits) return null;

  const isUnlimitedValue = (limit: number) => {
    return limit === -1 || limit >= 999999;
  };

  const calculatePercentage = (current: number, max: number) => {
    if (isUnlimitedValue(max)) return 0;
    return Math.round((current / max) * 100);
  };

  const usageItems = [
    {
      label: t.account.usage.labels.products,
      current: limits.usage.products_count,
      max: limits.limits.max_products,
      color: 'blue',
      blocked: limits.limitReached.products
    },
    {
      label: t.account.usage.labels.shopifyStores,
      current: limits.usage.shopify_stores_count,
      max: limits.limits.max_shopify_stores,
      color: 'indigo',
      blocked: limits.limitReached.shopifyStores
    },
    {
      label: t.account.usage.labels.optimizations,
      current: limits.usage.optimizations_count,
      max: limits.limits.max_optimizations,
      color: 'purple',
      blocked: limits.limitReached.optimizations
    },
    {
      label: t.account.usage.labels.articlesAI,
      current: limits.usage.articles_count,
      max: limits.limits.max_articles,
      color: 'green',
      blocked: limits.limitReached.articles
    },
    {
      label: t.account.usage.labels.chatAI,
      current: limits.usage.chat_responses_count,
      max: limits.limits.max_chat_responses,
      color: 'orange',
      blocked: limits.limitReached.chat
    },
    {
      label: t.account.usage.labels.campaigns,
      current: limits.usage.campaigns_count,
      max: limits.limits.max_campaigns,
      color: 'pink',
      blocked: limits.limitReached.campaigns
    }
  ];

  // CRITICAL: Only show warning for optimizations and chat AI limits
  const hasAnyLimitReached = limits.limitReached.optimizations || limits.limitReached.chat;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t.account.usage.usage}</CardTitle>
          {limits.isTrialing && (
            <Badge variant="secondary">{t.account.usage.trialVersion}</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {usageItems.map((item) => {
            const percentage = calculatePercentage(item.current, item.max);
            const isNearLimit = percentage >= 80 && percentage < 100;
            const isAtLimit = percentage >= 100 || item.blocked;
            const isUnlimited = isUnlimitedValue(item.max);
            
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium flex items-center gap-1 ${
                      isAtLimit ? 'text-red-600 dark:text-red-400' : 
                      isNearLimit ? 'text-orange-600 dark:text-orange-400' : 
                      'text-muted-foreground'
                    }`}>
                      {item.current} / {isUnlimited ? <Infinity className="w-3.5 h-3.5" /> : item.max}
                    </span>
                    {isAtLimit && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    {!isAtLimit && isNearLimit && <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                    {!isAtLimit && !isNearLimit && !isUnlimited && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                  </div>
                </div>
                <div className="relative">
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    showPercentage={false}
                    className="h-2"
                  />
                  {isAtLimit && (
                    <div className="absolute inset-0 rounded-full bg-red-500/20" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {hasAnyLimitReached && (
          <div className={`p-3 rounded-lg border ${
            limits.isTrialing 
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
              : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
          }`}>
            <p 
              className={`text-sm mb-3 ${
                limits.isTrialing 
                  ? 'text-red-900 dark:text-red-100' 
                  : 'text-orange-900 dark:text-orange-100'
              }`}
              dangerouslySetInnerHTML={{ 
                __html: limits.isTrialing 
                  ? t.account.usage.messages.trialLimitReached
                  : t.account.usage.messages.monthlyLimitReached
              }}
            />
            {(limits.isTrialing || !limits.planId) ? (
              <Button 
                size="sm" 
                onClick={() => navigate('/subscription')}
                className="w-full gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {t.account.usage.buttons.activatePlan}
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/subscription')}
                className="w-full"
              >
                {t.account.usage.buttons.upgradePlan}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}