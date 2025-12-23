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
import { Coins, Package, Loader2, ExternalLink, Sparkles } from 'lucide-react';
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
  const { balance, packages, purchaseCredits, isLoading } = useAIImagesCredits();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setPurchasingPackage(packageId);
    try {
      const confirmationUrl = await purchaseCredits(packageId);
      if (confirmationUrl) {
        window.open(confirmationUrl, '_blank');
        onOpenChange(false);
      }
    } finally {
      setPurchasingPackage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'Acheter des Crédits' : 'Purchase Credits'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Achetez des crédits pour générer des images IA'
              : 'Purchase credits to generate AI images'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current balance */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {language === 'fr' ? 'Solde actuel' : 'Current balance'}
            </span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <Coins className="h-4 w-4 mr-1" />
              {balance}
            </Badge>
          </div>

          {/* Packages */}
          <div className="grid gap-3">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !purchasingPackage && handlePurchase(pkg.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${(pkg.price / pkg.credits).toFixed(2)}/{language === 'fr' ? 'crédit' : 'credit'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${pkg.price.toFixed(2)}</p>
                    <Button
                      size="sm"
                      disabled={purchasingPackage !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(pkg.id);
                      }}
                    >
                      {purchasingPackage === pkg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {language === 'fr' ? 'Acheter' : 'Buy'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {language === 'fr'
              ? 'Paiement sécurisé via Shopify Billing'
              : 'Secure payment via Shopify Billing'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Credit badge component for inline display
export const AIImagesCreditsDisplay = ({
  onBuyClick,
  compact = false,
}: {
  onBuyClick?: () => void;
  compact?: boolean;
}) => {
  const { balance, isLoading } = useAIImagesCredits();
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
      <Badge
        variant={balance > 0 ? 'secondary' : 'destructive'}
        className="gap-1"
      >
        <Coins className="h-3 w-3" />
        {balance} {!compact && (language === 'fr' ? 'crédits' : 'credits')}
      </Badge>
      {onBuyClick && (
        <Button size="sm" variant="outline" onClick={onBuyClick} className="h-7 text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          {language === 'fr' ? 'Acheter' : 'Buy'}
        </Button>
      )}
    </div>
  );
};
