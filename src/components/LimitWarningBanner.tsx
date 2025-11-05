import { AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { formatLimit } from "@/lib/formatUtils";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function LimitWarningBanner() {
  const navigate = useNavigate();
  const { limits, loading } = useUsageLimits();
  const { t, tf } = useTranslation();
  const [upgrading, setUpgrading] = useState(false);

  if (loading || !limits) return null;

  // Show banner if trial is active and approaching any limit (>80%)
  const shouldShowWarning =
    limits.isTrialing &&
    (limits.usage.optimizations_count / limits.limits.max_optimizations > 0.8 ||
      limits.usage.articles_count / limits.limits.max_articles > 0.8 ||
      limits.usage.chat_responses_count / limits.limits.max_chat_responses > 0.8 ||
      limits.usage.shopify_requests_count / limits.limits.max_shopify_requests > 0.8 ||
      limits.usage.products_count / limits.limits.max_products > 0.8 ||
      limits.usage.shopify_stores_count / limits.limits.max_shopify_stores > 0.8);

  // Show critical banner if any limit is reached (ALSO FOR PAID USERS)
  const limitReached =
    limits.limitReached.optimizations ||
    limits.limitReached.articles ||
    limits.limitReached.chat ||
    limits.limitReached.shopifySearch ||
    limits.limitReached.products ||
    limits.limitReached.shopifyStores;

  // Show warning for trial users approaching limits
  if (!shouldShowWarning && !limitReached) return null;

  // Don't show warning for paid users unless limit is reached
  if (limits.isPaid && !limitReached) return null;

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);

      // For trial users, navigate to subscription page
      if (limits.isTrialing) {
        navigate("/subscription");
        return;
      }

      // For paid users who reached limits, navigate to subscription page to choose upgrade
      // This is safer than auto-selecting the next plan
      navigate("/subscription?upgrade=true");
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Erreur lors de la redirection");
    } finally {
      setUpgrading(false);
    }
  };

  const getWarningMessage = () => {
    if (limitReached) {
      const limitTypes = [];
      if (limits.limitReached.optimizations) limitTypes.push(t.banners.limitWarning.limitLabels.optimizations);
      if (limits.limitReached.articles) limitTypes.push(t.banners.limitWarning.limitLabels.articles);
      if (limits.limitReached.chat) limitTypes.push(t.banners.limitWarning.limitLabels.chat);
      if (limits.limitReached.shopifySearch) limitTypes.push(t.banners.limitWarning.limitLabels.searches);
      if (limits.limitReached.products) limitTypes.push(t.banners.limitWarning.limitLabels.products);
      if (limits.limitReached.shopifyStores) limitTypes.push(t.banners.limitWarning.limitLabels.stores);

      if (limits.isPaid) {
        return t.banners.limitWarning.monthlyLimitReached;
      }

      return tf("banners.limitWarning.limitReached", { limitTypes: limitTypes.join(", ") });
    }

    return t.banners.limitWarning.approaching;
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
                {t.dashboard.usage.labels.optimizations}: {limits.usage.optimizations_count}/
                {formatLimit(limits.limits.max_optimizations)}
              </span>
              <span className="whitespace-nowrap">
                {t.dashboard.usage.labels.articles}: {limits.usage.articles_count}/
                {formatLimit(limits.limits.max_articles)}
              </span>
              <span className="whitespace-nowrap">
                {t.dashboard.usage.labels.chatResponses}: {limits.usage.chat_responses_count}/
                {formatLimit(limits.limits.max_chat_responses)}
              </span>
            </div>
          </div>

          {/* Button Section */}
          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            size="sm"
            className={`${
              limitReached
                ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            } text-white gap-2 w-full sm:w-auto text-xs sm:text-sm ml-6 sm:ml-0`}
          >
            {upgrading ? (
              t.banners.limitWarning.loading
            ) : (
              <>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>
                  {limitReached && limits.isPaid
                    ? t.banners.limitWarning.upgradeNow
                    : limitReached
                      ? t.banners.limitWarning.activateNow
                      : t.banners.limitWarning.viewPlans}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
