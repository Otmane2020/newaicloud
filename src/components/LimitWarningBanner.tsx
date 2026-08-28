import { AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogActionCard } from "@/components/CatalogActionCard";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { formatLimit } from "@/lib/formatUtils";
import { useTranslation } from "@/lib/language";
import { useUpgradeNavigation } from "@/hooks/useUpgradeNavigation";

export function LimitWarningBanner() {
  const { limits, loading } = useUsageLimits();
  const { t, tf } = useTranslation();
  const { navigateToUpgrade, loading: upgrading } = useUpgradeNavigation();

  if (loading || !limits) return null;

  const limitReached = limits.limitReached?.optimizations || limits.limitReached?.chat || false;
  const optimizationsCount = Number(limits.usage?.optimizations_count) || 0;
  const articlesCount = Number(limits.usage?.articles_count) || 0;
  const chatCount = Number(limits.usage?.chat_responses_count) || 0;
  const maxOptimizations = Number(limits.limits?.max_optimizations) || 1;
  const maxArticles = Number(limits.limits?.max_articles) || 1;
  const maxChatResponses = Number(limits.limits?.max_chat_responses) || 1;

  if (limits.isPaid && !limitReached) return null;

  if (limits.isTrialing) {
    const optimizationRatio = maxOptimizations > 0 ? optimizationsCount / maxOptimizations : 0;
    const chatRatio = maxChatResponses > 0 ? chatCount / maxChatResponses : 0;
    const shouldShowWarning = optimizationRatio > 0.8 || chatRatio > 0.8;
    if (!shouldShowWarning && !limitReached) return null;
  }

  if (!limits.isTrialing && !limits.isPaid) return null;

  const getWarningMessage = (): string => {
    if (limitReached) {
      const limitTypes: string[] = [];
      const optLabel = t.banners?.limitWarning?.limitLabels?.optimizations;
      const chatLabel = t.banners?.limitWarning?.limitLabels?.chat;

      if (limits.limitReached?.optimizations && typeof optLabel === 'string') limitTypes.push(optLabel);
      if (limits.limitReached?.chat && typeof chatLabel === 'string') limitTypes.push(chatLabel);

      if (limits.isPaid) {
        const msg = t.banners?.limitWarning?.monthlyLimitReached;
        return typeof msg === 'string' ? msg : 'Monthly limit reached';
      }

      const result = tf("banners.limitWarning.limitReached", { limitTypes: limitTypes.join(", ") });
      return typeof result === 'string' ? result : 'Limit reached';
    }

    const approaching = t.banners?.limitWarning?.approaching;
    return typeof approaching === 'string' ? approaching : 'Approaching limit';
  };

  const actionLabel = limitReached && limits.isPaid
    ? String(t.banners?.limitWarning?.upgradeNow || 'Upgrade now')
    : limitReached
      ? String(t.banners?.limitWarning?.activateNow || 'Activate now')
      : String(t.banners?.limitWarning?.viewPlans || 'View plans');

  return (
    <div className="px-3 pt-3 sm:px-4 md:px-6 lg:px-8">
      <CatalogActionCard
        icon={AlertCircle}
        title={getWarningMessage()}
        compact
        meta={
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>{String(t.dashboard?.usage?.labels?.optimizations || 'Optimizations')}: {optimizationsCount}/{formatLimit(maxOptimizations)}</span>
            <span>{String(t.dashboard?.usage?.labels?.articles || 'Articles')}: {articlesCount}/{formatLimit(maxArticles)}</span>
            <span>{String(t.dashboard?.usage?.labels?.chatResponses || 'Chat')}: {chatCount}/{formatLimit(maxChatResponses)}</span>
          </div>
        }
        action={
          <Button
            onClick={navigateToUpgrade}
            disabled={upgrading}
            size="sm"
            className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
          >
            {upgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
            {upgrading ? String(t.banners?.limitWarning?.loading || 'Loading...') : actionLabel}
          </Button>
        }
      />
    </div>
  );
}
