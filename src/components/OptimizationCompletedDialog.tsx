import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Upload } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface OptimizationCompletedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncShopify: () => void;
  type: string;
  totalOptimized: number;
}

export function OptimizationCompletedDialog({
  open,
  onOpenChange,
  onSyncShopify,
  type,
  totalOptimized,
}: OptimizationCompletedDialogProps) {
  const { t, tf } = useTranslation();

  const getTypeLabel = () => {
    return t.optimizationCompleted.types[type as keyof typeof t.optimizationCompleted.types] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-success/10">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {t.optimizationCompleted.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {tf('optimizationCompleted.description', { count: totalOptimized, type: getTypeLabel() })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <div className="text-center text-sm text-muted-foreground">
            {t.optimizationCompleted.syncQuestion}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t.optimizationCompleted.later}
          </Button>
          <Button
            onClick={() => {
              onSyncShopify();
              onOpenChange(false);
            }}
            className="w-full sm:w-auto gap-2"
          >
            <Upload className="w-4 h-4" />
            {t.optimizationCompleted.syncNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
