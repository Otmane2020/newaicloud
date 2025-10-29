import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'trial_expired';
  limitType?: string;
}

export function TrialUpgradeDialog({ open, onOpenChange, reason, limitType }: TrialUpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      console.log('💳 Creating immediate payment checkout...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: 'starter',
          billing_period: 'monthly',
          force_immediate_payment: true
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to payment:', data.url);
        // Redirection immédiate dans le même onglet pour le paiement
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  const features = t('trialUpgrade.features', { returnObjects: true }) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {reason === 'limit_reached' 
              ? `🎯 ${t('trialUpgrade.limit_reached')}` 
              : `⏰ ${t('trialUpgrade.trial_expired')}`}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === 'limit_reached' 
              ? `Vous avez atteint la limite de ${limitType} du plan gratuit. Pour continuer, passez au plan Starter dès maintenant (paiement immédiat).`
              : `Votre période d'essai gratuite est terminée. Activez le plan Starter pour continuer (paiement immédiat).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-2">{t('trialUpgrade.starter_plan')}</div>
            <div className="text-2xl font-bold">9.99€ <span className="text-sm font-normal text-muted-foreground">/ {t('subscriptionPlans.per_month').replace('/', '')}</span></div>
          </div>

          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('trialUpgrade.later')}
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary"
          >
            {loading ? t('trialUpgrade.loading') : t('trialUpgrade.activate_now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}