import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProgressBannerProps {
  current: number;
  total: number;
  label: string;
}

export function ProgressBanner({ current, total, label }: ProgressBannerProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="text-center space-y-3 w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="font-semibold text-lg">{label} en cours...</span>
      </div>
      <Progress value={percentage} className="h-3" />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{current} / {total}</span>
        <span className="font-bold text-primary">{percentage}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        💡 Le traitement continue en arrière-plan
      </p>
    </div>
  );
}
