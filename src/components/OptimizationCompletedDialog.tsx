import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { translations as enTranslations } from "@/lib/translations/en";
import { translations as frTranslations } from "@/lib/translations/fr";
import { toast } from "sonner";

interface OptimizationCompletedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncShopify: () => void | Promise<void>;
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
  const [syncing, setSyncing] = useState(false);

  if (totalOptimized === 0) return null;

  const storeLanguage = selectedStore?.store_language || 'fr';
  const isEnglish = storeLanguage.startsWith('en');
  const t = isEnglish ? enTranslations : frTranslations;

  const getTypeLabel = () => {
    return t.optimizationCompleted.types[type as keyof typeof t.optimizationCompleted.types] || type;
  };

  const formatMessage = (template: string, vars: Record<string, unknown>): string => {
    return Object.entries(vars).reduce(
      (str, [key, val]) => str.replace(`{{${key}}}`, String(val)),
      template,
    );
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      await onSyncShopify();
      onOpenChange(false);
    } catch (error) {
      console.error('[OptimizationCompletedDialog] Shopify sync failed to start:', error);
      toast.error(
        isEnglish ? 'Shopify sync could not be started' : 'La synchronisation Shopify n’a pas pu démarrer',
        {
          description: isEnglish
            ? 'Your optimized data is still saved. Please retry the synchronization.'
            : 'Vos optimisations sont toujours enregistrées. Vous pouvez relancer la synchronisation.',
        },
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !syncing && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center pr-0 text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {t.optimizationCompleted.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {formatMessage(t.optimizationCompleted.description, { count: totalOptimized, type: getTypeLabel() })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          {t.optimizationCompleted.syncQuestion}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncing}
            className="w-full rounded-xl sm:w-auto"
          >
            {t.optimizationCompleted.later}
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="w-full gap-2 rounded-xl sm:w-auto"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {syncing
              ? (isEnglish ? 'Starting sync…' : 'Démarrage…')
              : t.optimizationCompleted.syncNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
