import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, CheckCircle, Sparkles, Infinity, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useUpgradeNavigation } from '@/hooks/useUpgradeNavigation';

export function UsageWidget() {
  const { limits, loading } = useUsageLimits();
  const { t } = useTranslation();
  const { navigateToUpgrade, loading: upgradeLoading } = useUpgradeNavigation();

  if (loading || !limits) return null;

  const isUnlimitedValue = (limit: number) => {
    return limit === -1 || limit >= 999999;
  };

  const calculatePercentage = (current: number, max: number) => {
    if (isUnlimitedValue(max)) return 0;
    if (max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  // Safe access to nested properties with Number() conversion
  const usageItems = [
    {
      label: String(t.account?.usage?.labels?.products || 'Products'),
      current: Number(limits.usage?.products_count) || 0,
      max: Number(limits.limits?.max_products) || 0,
      color: 'blue',
      blocked: !!limits.limitReached?.products
    },
    {
      label: String(t.account?.usage?.labels?.shopifyStores || 'Stores'),
      current: Number(limits.usage?.shopify_stores_count) || 0,
      max: Number(limits.limits?.max_shopify_stores) || 0,
      color: 'indigo',
      blocked: !!limits.limitReached?.shopifyStores
    },
    {
      label: String(t.account?.usage?.labels?.optimizations || 'Optimizations'),
      current: Number(limits.usage?.optimizations_count) || 0,
      max: Number(limits.limits?.max_optimizations) || 0,
      color: 'purple',
      blocked: !!limits.limitReached?.optimizations
    },
    {
      label: String(t.account?.usage?.labels?.articlesAI || 'Articles AI'),
      current: Number(limits.usage?.articles_count) || 0,
      max: Number(limits.limits?.max_articles) || 0,
      color: 'green',
      blocked: !!limits.limitReached?.articles
    },
    {
      label: String(t.account?.usage?.labels?.chatAI || 'Chat AI'),
      current: Number(limits.usage?.chat_responses_count) || 0,
      max: Number(limits.limits?.max_chat_responses) || 0,
      color: 'orange',
      blocked: !!limits.limitReached?.chat
    },
    {
      label: String(t.account?.usage?.labels?.campaigns || 'Campaigns'),
      current: Number(limits.usage?.campaigns_count) || 0,
      max: Number(limits.limits?.max_campaigns) || 0,
      color: 'pink',
      blocked: !!limits.limitReached?.campaigns
    }
  ];

  // CRITICAL: Only show warning for optimizations and chat AI limits
  const hasAnyLimitReached = !!limits.limitReached?.optimizations || !!limits.limitReached?.chat;

  // Safe access to translation strings
  const usageTitle = String(t.account?.usage?.usage || 'Usage');
  const trialBadge = String(t.account?.usage?.trialVersion || 'Trial');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{usageTitle}</CardTitle>
          {limits.isTrialing && (
            <Badge variant="secondary">{trialBadge}</Badge>
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
                      {String(item.current)} / {isUnlimited ? <Infinity className="w-3.5 h-3.5" /> : String(item.max)}
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
                __html: String(limits.isTrialing 
                  ? (t.account?.usage?.messages?.trialLimitReached || 'Trial limit reached')
                  : (t.account?.usage?.messages?.monthlyLimitReached || 'Monthly limit reached'))
              }}
            />
            {(limits.isTrialing || !limits.planId) ? (
              <Button 
                size="sm" 
                onClick={navigateToUpgrade}
                disabled={upgradeLoading}
                className="w-full gap-2"
              >
                {upgradeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {String(t.account?.usage?.buttons?.activatePlan || 'Activate plan')}
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={navigateToUpgrade}
                disabled={upgradeLoading}
                className="w-full"
              >
                {upgradeLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {String(t.account?.usage?.buttons?.upgradePlan || 'Upgrade plan')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}