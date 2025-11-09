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

interface ProrationBreakdown {
  currentPlanTotal: number;
  newPlanTotal: number;
  daysConsumed: number;
  daysRemaining: number;
  totalCycleDays: number;
  consumedAmount: number;
  unusedCredit: number;
  newPlanProrated: number;
  netCharge: number;
}

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
  breakdown?: ProrationBreakdown | null;
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
  breakdown,
}: PlanChangeConfirmDialogProps) {
  const symbol = currency === 'eur' ? '€' : '$';
  const amount = Math.abs(prorationAmount);
  const hasBreakdown = breakdown && breakdown.daysRemaining > 0;
  
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

          {hasBreakdown ? (
            <div className="space-y-3">
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <p className="font-semibold text-lg mb-3">
                    📊 Détails du calcul de proration
                  </p>
                  
                  <div className="space-y-3 text-sm">
                    {/* Ancien plan */}
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="font-semibold mb-2">Ancien plan ({symbol}{breakdown.currentPlanTotal.toFixed(2)}/mois)</p>
                      <div className="space-y-1 pl-3 border-l-2 border-muted-foreground/30">
                        <p className="text-muted-foreground">
                          ├─ {breakdown.daysConsumed} jours consommés : {symbol}{breakdown.consumedAmount.toFixed(2)} déjà payés
                        </p>
                        <p className="text-success font-medium">
                          └─ {breakdown.daysRemaining} jours restants : {symbol}{breakdown.unusedCredit.toFixed(2)} de crédit
                        </p>
                      </div>
                    </div>

                    {/* Nouveau plan */}
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <p className="font-semibold mb-2">Nouveau plan ({symbol}{breakdown.newPlanTotal.toFixed(2)}/mois)</p>
                      <div className="pl-3 border-l-2 border-primary/50">
                        <p className="text-muted-foreground">
                          └─ {breakdown.daysRemaining} jours restants : {symbol}{breakdown.newPlanProrated.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Calcul final */}
                    <div className="bg-accent/20 p-3 rounded-lg border-2 border-accent">
                      <p className="font-semibold mb-2">Calcul</p>
                      <div className="pl-3 border-l-2 border-accent/50">
                        <p className="text-muted-foreground">
                          └─ À payer = {symbol}{breakdown.newPlanProrated.toFixed(2)} - {symbol}{breakdown.unusedCredit.toFixed(2)} = <span className="font-bold text-accent-foreground">{symbol}{breakdown.netCharge.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Votre paiement précédent est pris en compte sous forme de crédit pour les jours non utilisés.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
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
          )}
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
