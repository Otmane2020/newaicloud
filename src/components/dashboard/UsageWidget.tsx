import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function UsageWidget() {
  const { limits, loading } = useUsageLimits();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading || !limits) return null;

  const usageItems = [
    {
      label: 'Produits',
      current: limits.usage.products_count,
      max: limits.limits.max_products,
      color: 'blue',
      blocked: limits.limitReached.products
    },
    {
      label: 'Optimisations',
      current: limits.usage.optimizations_count,
      max: limits.limits.max_optimizations,
      color: 'purple',
      blocked: limits.limitReached.optimizations
    },
    {
      label: 'Articles AI',
      current: limits.usage.articles_count,
      max: limits.limits.max_articles,
      color: 'green',
      blocked: limits.limitReached.articles
    },
    {
      label: 'Chat AI',
      current: limits.usage.chat_responses_count,
      max: limits.limits.max_chat_responses,
      color: 'orange',
      blocked: limits.limitReached.chat
    },
    {
      label: 'Campagnes',
      current: limits.usage.campaigns_count,
      max: limits.limits.max_campaigns,
      color: 'pink',
      blocked: limits.limitReached.campaigns
    }
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Utilisation</h3>
        {limits.isTrialing && (
          <Badge variant="secondary">Version d'essai</Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {usageItems.map((item) => {
          const percentage = (item.current / item.max) * 100;
          const isNearLimit = percentage >= 80;
          const isAtLimit = percentage >= 100;
          
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={isAtLimit ? 'text-destructive font-semibold' : isNearLimit ? 'text-orange-600' : 'text-muted-foreground'}>
                    {item.current} / {item.max}
                  </span>
                  {isAtLimit && <AlertCircle className="w-4 h-4 text-destructive" />}
                  {!isAtLimit && isNearLimit && <TrendingUp className="w-4 h-4 text-orange-600" />}
                  {!isAtLimit && !isNearLimit && <CheckCircle className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              <Progress 
                value={Math.min(percentage, 100)} 
                className={`h-2 ${isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-orange-200' : 'bg-muted'}`}
              />
            </div>
          );
        })}
      </div>
      
      {(limits.limitReached.products || limits.limitReached.optimizations || limits.limitReached.articles) && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-900 dark:text-orange-100 mb-2">
            {limits.isTrialing ? (
              <>🚨 <strong>Certaines limites sont atteintes.</strong> Passez à un plan payant pour continuer.</>
            ) : (
              <>⚠️ <strong>Limites mensuelles atteintes.</strong> Elles seront réinitialisées le mois prochain.</>
            )}
          </p>
          {limits.isTrialing && (
            <Button 
              size="sm" 
              onClick={() => navigate('/subscription')}
              className="w-full"
            >
              Voir les plans
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}