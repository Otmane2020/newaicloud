import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertTriangle, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface OptimizationCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  cost: number;
  currentBalance: number;
  actionType: 'article' | 'campaign';
  campaignFrequency?: 'monthly' | 'weekly' | 'daily';
  loading?: boolean;
}

export function OptimizationCostDialog({
  open,
  onOpenChange,
  onConfirm,
  cost,
  currentBalance,
  actionType,
  campaignFrequency,
  loading = false,
}: OptimizationCostDialogProps) {
  const { t } = useTranslation();
  const balanceAfter = currentBalance - cost;
  const canAfford = balanceAfter >= 0;
  const isLowBalance = balanceAfter < currentBalance * 0.2 && balanceAfter >= 0;

  const getActionLabel = () => {
    if (actionType === 'article') {
      return t.optimizationConsumption.article || 'Créer cet article';
    }
    
    if (actionType === 'campaign' && campaignFrequency) {
      const labels = {
        monthly: t.optimizationConsumption.campaignMonthly || 'Créer cette campagne mensuelle',
        weekly: t.optimizationConsumption.campaignWeekly || 'Créer cette campagne hebdomadaire',
        daily: t.optimizationConsumption.campaignDaily || 'Créer cette campagne quotidienne',
      };
      return labels[campaignFrequency];
    }
    
    return t.optimizationConsumption.title || 'Utiliser mes optimisations';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t.optimizationConsumption.title || 'Utiliser mes optimisations'}
          </DialogTitle>
          <DialogDescription>
            {getActionLabel()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Coût de l'action */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">
                {t.optimizationConsumption.cost || 'Coût de cette action'}
              </p>
              <p className="text-2xl font-bold text-foreground">{cost}</p>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <TrendingDown className="h-4 w-4 mr-1" />
              {t.optimizationConsumption.optimizations || 'optimisations'}
            </Badge>
          </div>

          {/* Solde actuel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-background border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {t.optimizationConsumption.currentBalance || 'Solde actuel'}
              </p>
              <p className="text-xl font-semibold text-foreground">{currentBalance}</p>
            </div>
            <div className={`p-3 border rounded-lg ${canAfford ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground mb-1">
                {t.optimizationConsumption.afterAction || 'Après cette action'}
              </p>
              <p className={`text-xl font-semibold ${canAfford ? 'text-primary' : 'text-destructive'}`}>
                {balanceAfter}
              </p>
            </div>
          </div>

          {/* Avertissements */}
          {!canAfford && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t.optimizationConsumption.insufficient || 'Solde insuffisant'}.{' '}
                {t.optimizationConsumption.upgradeRequired || 'Veuillez upgrader votre plan pour continuer.'}
              </AlertDescription>
            </Alert>
          )}

          {isLowBalance && canAfford && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t.optimizationConsumption.lowBalance || 'Votre solde d\'optimisations est faible. Envisagez un upgrade.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t.optimizationConsumption.cancel || 'Annuler'}
          </Button>
          
          {canAfford ? (
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t.optimizationConsumption.processing || 'En cours...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t.optimizationConsumption.confirm || 'Confirmer et créer'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                onOpenChange(false);
                window.location.href = '/subscription?upgrade=true';
              }}
              className="w-full sm:w-auto"
            >
              {t.optimizationConsumption.upgrade || 'Upgrader mon plan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
