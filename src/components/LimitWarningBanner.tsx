import { AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { formatLimit } from "@/lib/formatUtils";
import { useTranslation } from "@/lib/language";
import { useUpgradeNavigation } from "@/hooks/useUpgradeNavigation";

export function LimitWarningBanner() {
  const { limits, loading } = useUsageLimits();
  const { t, tf } = useTranslation();
  const { navigateToUpgrade, loading: upgrading } = useUpgradeNavigation();

  if (loading || !limits) return null;

  // Safe access to nested properties with defaults
  const limitReached = limits.limitReached?.optimizations || limits.limitReached?.chat || false;
  const optimizationsCount = Number(limits.usage?.optimizations_count) || 0;
  const articlesCount = Number(limits.usage?.articles_count) || 0;
  const chatCount = Number(limits.usage?.chat_responses_count) || 0;
  const maxOptimizations = Number(limits.limits?.max_optimizations) || 1;
  const maxArticles = Number(limits.limits?.max_articles) || 1;
  const maxChatResponses = Number(limits.limits?.max_chat_responses) || 1;

  // For PAID users: ONLY show if limit is actually reached (100%)
  if (limits.isPaid) {
    if (!limitReached) return null;
  }

  // For TRIAL users: show if approaching limit (>80%) OR if limit reached
  if (limits.isTrialing) {
    const optimizationRatio = maxOptimizations > 0 ? optimizationsCount / maxOptimizations : 0;
    const chatRatio = maxChatResponses > 0 ? chatCount / maxChatResponses : 0;
    const shouldShowWarning = optimizationRatio > 0.8 || chatRatio > 0.8;
    
    if (!shouldShowWarning && !limitReached) return null;
  }

  // If not trial and not paid, don't show
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

  return (
    <div
      className={`${
        limitReached
          ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-b border-red-200 dark:border-red-800"
          : "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-b border-yellow-200 dark:border-yellow-800"
      } p-3 sm:p-4 sticky top-0 z-50`}
    >
      <div className="container mx-auto">
        <div className="flex flex-col gap-3">
          {/* Message Section */}
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                limitReached ? "text-red-600 dark:text-red-500" : "text-orange-600 dark:text-orange-500"
              } flex-shrink-0 mt-0.5`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium text-sm sm:text-base ${
                  limitReached ? "text-red-900 dark:text-red-100" : "text-orange-900 dark:text-orange-100"
                }`}
              >
                {getWarningMessage()}
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div
            className={`text-xs sm:text-sm flex flex-col gap-1 ml-6 sm:ml-8 ${
              limitReached ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"
            }`}
          >
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="whitespace-nowrap">
                {String(t.dashboard?.usage?.labels?.optimizations || 'Optimizations')}: {optimizationsCount}/
                {formatLimit(maxOptimizations)}
              </span>
              <span className="whitespace-nowrap">
                {String(t.dashboard?.usage?.labels?.articles || 'Articles')}: {articlesCount}/
                {formatLimit(maxArticles)}
              </span>
              <span className="whitespace-nowrap">
                {String(t.dashboard?.usage?.labels?.chatResponses || 'Chat')}: {chatCount}/
                {formatLimit(maxChatResponses)}
              </span>
            </div>
          </div>

          {/* Button Section */}
          <Button
            onClick={navigateToUpgrade}
            disabled={upgrading}
            size="sm"
            className={`${
              limitReached
                ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            } text-white gap-2 w-full sm:w-auto text-xs sm:text-sm ml-6 sm:ml-0`}
          >
            {upgrading ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 animate-spin" />
                <span>{String(t.banners?.limitWarning?.loading || 'Loading...')}</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>
                  {limitReached && limits.isPaid
                    ? String(t.banners?.limitWarning?.upgradeNow || 'Upgrade now')
                    : limitReached
                      ? String(t.banners?.limitWarning?.activateNow || 'Activate now')
                      : String(t.banners?.limitWarning?.viewPlans || 'View plans')}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
