import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: string;
  currentUsage: number;
  maxUsage: number;
  trialMaxUsage?: number;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  maxUsage,
  trialMaxUsage,
}: TrialLimitDialogProps) {
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-payment', {
        body: {
          success_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating immediate payment:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <DialogTitle className="text-xl">Limite d'essai atteinte</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Vous avez atteint votre limite d'essai gratuit pour{' '}
            <span className="font-semibold text-foreground">{limitType}</span> (
            {currentUsage}/{trialMaxUsage || maxUsage}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium">En activant votre abonnement maintenant :</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Accès immédiat aux limites complètes du plan</li>
              <li>• Le paiement sera effectué immédiatement</li>
              <li>• Facturation mensuelle dès aujourd'hui</li>
              <li>• Votre essai de 14 jours reste valide (pas de double facturation)</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={handlePayNow}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payer maintenant
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full"
            >
              Plus tard
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Vous ne pourrez plus utiliser cette fonctionnalité tant que vous n'aurez pas activé
            votre abonnement
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
