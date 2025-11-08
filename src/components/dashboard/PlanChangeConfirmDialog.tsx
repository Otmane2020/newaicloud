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
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/formatUtils";

interface PlanChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName: string;
  newPlanName: string;
  prorationAmount: number;
  currency: string;
  isLoading: boolean;
  onConfirm: () => void;
  isUpgrade: boolean;
}

export function PlanChangeConfirmDialog({
  open,
  onOpenChange,
  currentPlanName,
  newPlanName,
  prorationAmount,
  currency,
  isLoading,
  onConfirm,
  isUpgrade,
}: PlanChangeConfirmDialogProps) {
  const symbol = currency === 'eur' ? '€' : '$';
  const amount = Math.abs(prorationAmount);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-warning" />
            )}
            Confirmation du changement de plan
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de {isUpgrade ? 'passer au plan supérieur' : 'changer de plan'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Plan actuel</span>
              <span className="font-semibold">{currentPlanName}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm text-muted-foreground">Nouveau plan</span>
              <span className="font-semibold text-primary">{newPlanName}</span>
            </div>
          </div>

          <Alert className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-lg">
                  Montant à payer aujourd'hui : {symbol}{amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {prorationAmount > 0 ? (
                    <>
                      Ce montant correspond à la différence au prorata pour la période restante 
                      de votre cycle de facturation actuel.
                    </>
                  ) : prorationAmount < 0 ? (
                    <>
                      Un crédit de {symbol}{amount.toFixed(2)} sera appliqué à votre compte 
                      pour la période restante.
                    </>
                  ) : (
                    <>
                      Aucun frais supplémentaire aujourd'hui. Le nouveau tarif s'appliquera 
                      à votre prochain cycle de facturation.
                    </>
                  )}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer le changement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
