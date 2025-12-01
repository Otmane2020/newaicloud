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
import { useStore } from "@/contexts/StoreContext";
import { translations as enTranslations } from "@/lib/translations/en";
import { translations as frTranslations } from "@/lib/translations/fr";

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
  const { selectedStore } = useStore();
  
  // Don't show dialog if no items were optimized
  if (totalOptimized === 0) {
    return null;
  }

  // Use store language for translations
  const storeLanguage = selectedStore?.store_language || 'fr';
  const t = storeLanguage.startsWith('en') ? enTranslations : frTranslations;
  
  const getTypeLabel = () => {
    return t.optimizationCompleted.types[type as keyof typeof t.optimizationCompleted.types] || type;
  };

  const formatMessage = (template: string, vars: Record<string, any>): string => {
    return Object.entries(vars).reduce(
      (str, [key, val]) => str.replace(`{{${key}}}`, String(val)),
      template
    );
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
            {formatMessage(t.optimizationCompleted.description, { count: totalOptimized, type: getTypeLabel() })}
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
