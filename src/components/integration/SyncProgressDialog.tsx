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

  // Continuously animate progress bar
  useEffect(() => {
    if (!open) {
      setAnimatedProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        // Loop between 10% and 90%
        if (prev >= 90) return 10;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open]);

  const getTypeLabel = (type: string) => {
    const typeKey = type as keyof typeof t.integration.sync.types;
    return t.integration.sync.types[typeKey] || type;
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            {t.integration.sync.progress.title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {tf('integration.sync.progress.importing', { type: getTypeLabel(currentType) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Progress 
            value={animatedProgress} 
            className="h-4 transition-all duration-100 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:via-primary/90 [&>div]:to-primary/80 [&>div]:animate-pulse" 
          />
          
          <div className="flex justify-center items-center gap-2 py-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
