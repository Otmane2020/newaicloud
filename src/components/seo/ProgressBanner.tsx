import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CatalogActionCard } from '@/components/CatalogActionCard';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface ProgressBannerProps {
  current: number;
  total: number;
  label: string;
  onCancel?: () => void;
}

export function ProgressBanner({ current, total, label, onCancel }: ProgressBannerProps) {
  const { t, tf } = useTranslation();
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <CatalogActionCard
      icon={Loader2}
      title={tf('progressBanner.inProgress', { label })}
      description={t.progressBanner.backgroundProcessing}
      compact
      meta={
        <div className="w-full max-w-md">
          <Progress value={percentage} className="h-2 [&>div]:bg-violet-600" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{current} / {total}</span>
            <span className="font-semibold text-violet-600">{percentage}%</span>
          </div>
        </div>
      }
      action={
        onCancel ? (
          <Button variant="outline" size="sm" onClick={onCancel} className="rounded-lg border-slate-200">
            <X className="mr-2 h-4 w-4" />
            {t.progressBanner.cancel}
          </Button>
        ) : undefined
      }
    />
  );
}
