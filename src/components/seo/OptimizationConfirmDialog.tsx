import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  const remainingBefore = maxOptimizations - currentUsage;
  const remainingAfter = remainingBefore - selectedCount;
  const usagePercentageBefore = (currentUsage / maxOptimizations) * 100;
  const usagePercentageAfter = ((currentUsage + selectedCount) / maxOptimizations) * 100;
  const willExceedLimit = remainingAfter < 0;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {willExceedLimit ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Limite dépassée
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirmer l'optimisation en masse
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {willExceedLimit
              ? "Vous ne disposez pas d'assez d'optimisations pour effectuer cette action."
              : "Vous êtes sur le point d'optimiser plusieurs produits. Vérifiez les détails ci-dessous."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recap de l'utilisation actuelle */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Utilisation actuelle</span>
              <span className="font-medium">
                {currentUsage} / {maxOptimizations}
              </span>
            </div>
            <Progress value={usagePercentageBefore} className="h-2" />
          </div>

          {/* Détails de l'opération */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Produits sélectionnés</span>
              <span className="text-2xl font-bold text-primary">{selectedCount}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Optimisations restantes avant</span>
              <span className="text-lg font-semibold">{remainingBefore}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Optimisations qui seront utilisées</span>
              <span className="text-lg font-semibold text-orange-600">-{selectedCount}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Solde après l'opération</span>
              <span className={`text-xl font-bold ${willExceedLimit ? 'text-destructive' : remainingAfter < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                {remainingAfter}
              </span>
            </div>
          </div>

          {/* Barre de progression après l'opération */}
          {!willExceedLimit && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilisation après l'opération</span>
                <span className="font-medium">
                  {currentUsage + selectedCount} / {maxOptimizations}
                </span>
              </div>
              <Progress 
                value={Math.min(usagePercentageAfter, 100)} 
                className={`h-2 ${usagePercentageAfter > 90 ? 'bg-red-200' : usagePercentageAfter > 75 ? 'bg-orange-200' : ''}`}
              />
            </div>
          )}

          {/* Alertes */}
          {willExceedLimit ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action impossible :</strong> Vous avez besoin de {selectedCount} optimisations mais il ne vous en reste que {remainingBefore}.
                {isTrialing && " Passez à un plan payant pour augmenter vos limites."}
              </AlertDescription>
            </Alert>
          ) : remainingAfter < 10 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Après cette opération, il ne vous restera que {remainingAfter} optimisation{remainingAfter > 1 ? 's' : ''}.
                {isTrialing && " Pensez à passer à un plan payant pour continuer à optimiser vos produits."}
              </AlertDescription>
            </Alert>
          ) : null}
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
            disabled={willExceedLimit}
            className="min-w-[120px]"
          >
            {willExceedLimit ? t.common.impossible : t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
