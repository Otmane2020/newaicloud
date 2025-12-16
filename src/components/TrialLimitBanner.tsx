import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";
import { useUpgradeNavigation } from "@/hooks/useUpgradeNavigation";

interface TrialLimitBannerProps {
  resourceType: string;
  usage: number;
  limit: number;
  onActivate?: () => void;
}

export function TrialLimitBanner({ resourceType, usage, limit, onActivate }: TrialLimitBannerProps) {
  const { t, tf } = useTranslation();
  const { navigateToUpgrade, loading } = useUpgradeNavigation();

  const handleActivate = () => {
    if (onActivate) {
      onActivate();
    } else {
      navigateToUpgrade();
    }
  };

  // Safe string access to prevent React error #300
  const limitReachedText = typeof t.trial?.limitReached === 'string' ? t.trial.limitReached : 'Limit reached';
  const activateText = typeof t.trial?.activateMyPlan === 'string' ? t.trial.activateMyPlan : 'Activate my plan';
  const usageMessage = tf('trial.usageMessage', { usage: Number(usage) || 0, limit: Number(limit) || 0, resourceType: String(resourceType) });

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-b border-orange-200 dark:border-orange-800 p-3 sm:p-4">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 w-full sm:w-auto">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-orange-900 dark:text-orange-100 text-sm sm:text-base">
                {limitReachedText}
              </p>
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1 break-words">
                {typeof usageMessage === 'string' ? usageMessage : ''}
              </p>
            </div>
          </div>
          <Button
            onClick={handleActivate}
            variant="default"
            size="sm"
            disabled={loading}
            className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg whitespace-nowrap w-full sm:w-auto"
          >
            {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            {activateText}
          </Button>
        </div>
      </div>
    </div>
  );
}