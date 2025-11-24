import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface ProgressBannerProps {
  current: number;
  total: number;
  label: string;
  onCancel?: () => void;
}

export function ProgressBanner({ current, total, label, onCancel }: ProgressBannerProps) {
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
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Annuler
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        💡 Le traitement continue en arrière-plan
      </p>
    </div>
  );
}
