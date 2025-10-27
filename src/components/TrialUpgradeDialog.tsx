import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'trial_expired';
  limitType?: string;
}

export function TrialUpgradeDialog({ open, onOpenChange, reason, limitType }: TrialUpgradeDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: 'starter',
          billing_period: 'monthly'
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Ouvrir dans un nouvel onglet
        window.open(data.url, '_blank');
        toast.success('Redirection vers le paiement...');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erreur upgrade:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Jusqu'à 100 produits",
    "1000 optimisations SEO / mois",
    "5 articles de blog IA / mois",
    "100 recherches IA Shopify / mois",
    "200 réponses Chat IA / mois",
    "1 boutique Shopify",
    "Support par e-mail",
    "Intégration Shopify"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {reason === 'limit_reached' 
              ? '🎯 Limite atteinte !' 
              : '⏰ Période d\'essai terminée'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === 'limit_reached' 
              ? `Vous avez atteint la limite de votre essai gratuit pour ${limitType}. Passez au plan Starter pour continuer.`
              : 'Votre essai gratuit de 14 jours est terminé. Passez au plan Starter pour continuer à profiter de toutes les fonctionnalités.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-2">Plan Starter</div>
            <div className="text-2xl font-bold">9,99€ <span className="text-sm font-normal text-muted-foreground">/ mois</span></div>
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
            Plus tard
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary"
          >
            {loading ? 'Chargement...' : 'Activer maintenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
