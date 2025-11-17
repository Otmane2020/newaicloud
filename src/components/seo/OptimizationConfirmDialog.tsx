import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface OptimizationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  currentUsage: number;
  maxOptimizations: number;
  isTrialing: boolean;
}

export function OptimizationConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  currentUsage,
  maxOptimizations,
  isTrialing,
}: OptimizationConfirmDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirmer l'optimisation en masse
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d'optimiser plusieurs produits. Vérifiez les détails ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Détails de l'opération */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Produits sélectionnés</span>
              <span className="text-2xl font-bold text-primary">{selectedCount}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            className="min-w-[120px]"
          >
            {t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
