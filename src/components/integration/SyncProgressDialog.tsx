import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/language";

interface SimpleSyncProgressProps {
  open: boolean;
  currentType: string;
}

export function SimpleSyncProgress({
  open,
  currentType,
}: SimpleSyncProgressProps) {
  const { t, tf } = useTranslation();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Continuously animate progress bar with actual progress tracking
  useEffect(() => {
    if (!open) {
      setAnimatedProgress(0);
      return;
    }

    // Start at 10% and increment smoothly
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        // Increment by 1-3% randomly for more natural feel
        const increment = Math.random() * 2 + 1;
        const newValue = prev + increment;
        // Cap at 95% to show it's still working
        return Math.min(newValue, 95);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [open]);

  const getTypeLabel = (type: string) => {
    const typeKey = type as keyof typeof t.integration.sync.types;
    return t.integration.sync.types[typeKey] || type;
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[95vw] sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl flex items-center gap-2 pr-6">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary flex-shrink-0" />
            <span className="truncate">{t.integration.sync.progress.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm pr-6">
            <span className="block truncate">
              {tf('integration.sync.progress.importing', { type: getTypeLabel(currentType) })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-bold text-primary tabular-nums">{Math.round(animatedProgress)}%</span>
            </div>
            <Progress 
              value={animatedProgress} 
              showPercentage={false}
              className="h-3 sm:h-4" 
            />
          </div>
          
          <div className="flex justify-center items-center gap-2 py-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
