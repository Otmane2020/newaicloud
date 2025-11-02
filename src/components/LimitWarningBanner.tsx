import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { formatLimit } from '@/lib/formatUtils';

export function LimitWarningBanner() {
  const navigate = useNavigate();
  const { limits, loading } = useUsageLimits();

  if (loading || !limits) return null;

  // Hide banner if user has an active paid plan
  if (limits.isPaid) return null;

  // Show banner if trial is active and approaching any limit (>80%)
  const shouldShowWarning = limits.isTrialing && (
    limits.usage.optimizations_count / limits.limits.max_optimizations > 0.8 ||
    limits.usage.articles_count / limits.limits.max_articles > 0.8 ||
    limits.usage.chat_responses_count / limits.limits.max_chat_responses > 0.8 ||
    limits.usage.shopify_requests_count / limits.limits.max_shopify_requests > 0.8 ||
    limits.usage.products_count / limits.limits.max_products > 0.8 ||
    limits.usage.shopify_stores_count / limits.limits.max_shopify_stores > 0.8
  );

  // Show critical banner if any limit is reached
  const limitReached = limits.limitReached.optimizations || 
    limits.limitReached.articles || 
    limits.limitReached.chat || 
    limits.limitReached.shopifySearch ||
    limits.limitReached.products ||
    limits.limitReached.shopifyStores;

  if (!shouldShowWarning && !limitReached) return null;

  const handleActivate = () => {
    navigate('/subscription');
  };

  const getWarningMessage = () => {
    if (limitReached) {
      const limitTypes = [];
      if (limits.limitReached.optimizations) limitTypes.push('optimisations SEO');
      if (limits.limitReached.articles) limitTypes.push('articles');
      if (limits.limitReached.chat) limitTypes.push('réponses chat');
      if (limits.limitReached.shopifySearch) limitTypes.push('recherches Shopify');
      if (limits.limitReached.products) limitTypes.push('produits');
      if (limits.limitReached.shopifyStores) limitTypes.push('boutiques');
      
      return `⚠️ Limite d'essai atteinte pour : ${limitTypes.join(', ')}`;
    }

    return '📊 Vous approchez de vos limites d\'essai gratuit';
  };

  return (
    <div className={`${
      limitReached 
        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-b border-red-200 dark:border-red-800' 
        : 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-b border-yellow-200 dark:border-yellow-800'
    } p-4 sticky top-0 z-50`}>
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertCircle className={`w-5 h-5 ${
            limitReached 
              ? 'text-red-600 dark:text-red-500' 
              : 'text-orange-600 dark:text-orange-500'
          } flex-shrink-0`} />
          <div>
            <p className={`font-medium ${
              limitReached 
                ? 'text-red-900 dark:text-red-100' 
                : 'text-orange-900 dark:text-orange-100'
            }`}>
              {getWarningMessage()}
            </p>
            <p className={`text-sm ${
              limitReached 
                ? 'text-red-700 dark:text-red-300' 
                : 'text-orange-700 dark:text-orange-300'
            }`}>
              Optimisations: {limits.usage.optimizations_count}/{formatLimit(limits.limits.max_optimizations)} • 
              Articles: {limits.usage.articles_count}/{formatLimit(limits.limits.max_articles)} • 
              Chat: {limits.usage.chat_responses_count}/{formatLimit(limits.limits.max_chat_responses)}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleActivate}
          className={`${
            limitReached
              ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
          } text-white whitespace-nowrap`}
        >
          {limitReached ? 'Activer maintenant' : 'Voir les plans'}
        </Button>
      </div>
    </div>
  );
}
