import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Zap, Loader2, ExternalLink, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAIImagesCredits } from '@/hooks/useAIImagesCredits';
import { useTranslation } from '@/lib/language';

interface AIImagesCreditsPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIImagesCreditsPurchaseDialog = ({
  open,
  onOpenChange,
}: AIImagesCreditsPurchaseDialogProps) => {
  const { language } = useTranslation();
  const { isActive, plan, pricing, setupBilling, isLoading } = useAIImagesCredits();
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetupBilling = async () => {
    setIsSettingUp(true);
    try {
      const confirmationUrl = await setupBilling();
      if (confirmationUrl) {
        window.open(confirmationUrl, '_blank');
        onOpenChange(false);
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'Facturation AI Images' : 'AI Images Billing'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Paiement à l\'usage - Payez uniquement pour ce que vous générez'
              : 'Pay as you go - Only pay for what you generate'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isActive && plan ? (
            <>
              {/* Active billing status */}
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {language === 'fr' ? 'Facturation Active' : 'Billing Active'}
                    </p>
                    <p className="text-sm text-muted-foreground">{plan.name}</p>
                  </div>
                </div>
              </Card>

              {/* Usage stats */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'fr' ? 'Utilisé ce mois' : 'Used this month'}
                  </span>
                  <span className="font-medium">${parseFloat(plan.balanceUsed || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'fr' ? 'Plafond mensuel' : 'Monthly cap'}
                  </span>
                  <span className="font-medium">${parseFloat(plan.cappedAmount).toFixed(2)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (parseFloat(plan.balanceUsed || '0') / parseFloat(plan.cappedAmount)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Not active - show setup */}
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {language === 'fr' ? 'Facturation non configurée' : 'Billing not set up'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Activez pour un accès illimité' : 'Enable for unlimited access'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Pricing info */}
              {pricing && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">{pricing.name}</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>
                        ${pricing.pricePerImage.toFixed(2)} {language === 'fr' ? 'par image' : 'per image'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>
                        {language === 'fr' ? 'Plafond' : 'Capped at'} ${pricing.cappedAmount.toFixed(2)}/{language === 'fr' ? 'mois' : 'month'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>
                        {language === 'fr' ? 'Pas d\'engagement' : 'No commitment'}
                      </span>
                    </li>
                  </ul>
                </Card>
              )}

              <Button
                className="w-full"
                onClick={handleSetupBilling}
                disabled={isSettingUp || isLoading}
              >
                {isSettingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {language === 'fr' ? 'Activer la facturation' : 'Enable Billing'}
              </Button>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {language === 'fr'
              ? 'Facturation sécurisée via Shopify'
              : 'Secure billing via Shopify'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Billing status badge component for inline display
export const AIImagesCreditsDisplay = ({
  onBuyClick,
  compact = false,
}: {
  onBuyClick?: () => void;
  compact?: boolean;
}) => {
  const { isActive, plan, pricing, isLoading } = useAIImagesCredits();
  const { language } = useTranslation();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'p-2 bg-muted/50 rounded-lg'}`}>
      {isActive ? (
        <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
          <Zap className="h-3 w-3" />
          {!compact && (language === 'fr' ? 'Actif' : 'Active')}
          {plan && !compact && ` - $${parseFloat(plan.balanceUsed || '0').toFixed(2)}`}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          {!compact && `$${pricing?.pricePerImage.toFixed(2) || '0.15'}/${language === 'fr' ? 'img' : 'img'}`}
        </Badge>
      )}
      {onBuyClick && !isActive && (
        <Button size="sm" variant="outline" onClick={onBuyClick} className="h-7 text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          {language === 'fr' ? 'Activer' : 'Enable'}
        </Button>
      )}
    </div>
  );
};
