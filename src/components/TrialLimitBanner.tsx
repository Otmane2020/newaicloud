import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";

interface TrialLimitBannerProps {
  resourceType: string;
  usage: number;
  limit: number;
  onActivate?: () => void;
}

export function TrialLimitBanner({ resourceType, usage, limit, onActivate }: TrialLimitBannerProps) {
  const navigate = useNavigate();
  const { t, tf } = useTranslation();

  const handleActivate = () => {
    if (onActivate) {
      onActivate();
    } else {
      navigate("/subscription");
    }
  };

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-b border-orange-200 dark:border-orange-800 p-3 sm:p-4">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 w-full sm:w-auto">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
      <p className="font-medium text-orange-900 dark:text-orange-100 text-sm sm:text-base">
        {t.trial.limitReached}
      </p>
      <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1 break-words">
        {tf('trial.usageMessage', { usage, limit, resourceType })}
      </p>
            </div>
          </div>
    <Button
      onClick={handleActivate}
      variant="default"
      size="sm"
      className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg whitespace-nowrap w-full sm:w-auto"
    >
      {t.trial.activateMyPlan}
    </Button>
        </div>
      </div>
    </div>
  );
}