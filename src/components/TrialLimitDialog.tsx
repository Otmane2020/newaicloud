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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">✨ Libérez toutes les fonctionnalités</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Profitez de l'ensemble des fonctionnalités de NewAI sans limite en activant votre abonnement maintenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-5 h-5 text-primary" />
              <span>Avec le plan Starter à 9,99€/mois :</span>
            </div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Optimisations SEO illimitées</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Génération d'articles IA</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Chat assistant avancé</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Automatisations complètes</span>
              </li>
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
            🚀 Activez votre abonnement en quelques clics et continuez à faire croître votre business
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
