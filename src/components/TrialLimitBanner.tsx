import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogActionCard } from "@/components/CatalogActionCard";
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

  const limitReachedText = typeof t.trial?.limitReached === 'string' ? t.trial.limitReached : 'Limit reached';
  const activateText = typeof t.trial?.activateMyPlan === 'string' ? t.trial.activateMyPlan : 'Activate my plan';
  const usageMessage = tf('trial.usageMessage', {
    usage: Number(usage) || 0,
    limit: Number(limit) || 0,
    resourceType: String(resourceType),
  });

  return (
    <CatalogActionCard
      icon={AlertCircle}
      title={limitReachedText}
      description={typeof usageMessage === 'string' ? usageMessage : ''}
      compact
      action={
        <Button
          onClick={handleActivate}
          size="sm"
          disabled={loading}
          className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {activateText}
        </Button>
      }
    />
  );
}
