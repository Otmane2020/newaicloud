import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface Plan {
  id: string;
  name: string;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  price_monthly: number;
  price_yearly: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_chat_responses_monthly: number;
  display_order: number;
}

interface PlanUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId: string | null;
  onSuccess: () => void;
}

interface ProrationInfo {
  willProrate: boolean;
  prorationAmount: number;
  daysIntoCycle: number;
  daysRemaining: number;
  renewalDate: string;
}

export function PlanUpgradeDialog({ open, onOpenChange, currentPlanId, onSuccess }: PlanUpgradeDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [prorationInfo, setProrationInfo] = useState<ProrationInfo | null>(null);
  const [loadingProration, setLoadingProration] = useState(false);
  const { language } = useTranslation();

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = () => {
    const client = supabase as any;
    client
      .from('subscription_plans')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }: any) => {
        if (error) {
          console.error('Error loading plans:', error);
          toast.error('Erreur lors du chargement des plans');
          return;
        }

        const plans: Plan[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          stripe_price_id_monthly: item.stripe_price_id_monthly,
          stripe_price_id_yearly: item.stripe_price_id_yearly,
          price_monthly: item.price_monthly,
          price_yearly: item.price_yearly,
          max_products: item.max_products,
          max_optimizations_monthly: item.max_optimizations_monthly,
          max_articles_monthly: item.max_articles_monthly,
          max_chat_responses_monthly: item.max_chat_responses_monthly,
          display_order: item.display_order,
        }));
        
        setPlans(plans);

        if (currentPlanId) {
          const current = plans.find(p => p.id === currentPlanId);
          setCurrentPlan(current || null);
          setSelectedPlanId(currentPlanId);
        }
      });
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  
  const currentPrice = currentPlan
    ? (billingPeriod === 'monthly' ? currentPlan.price_monthly : currentPlan.price_yearly)
    : 0;

  const newPrice = selectedPlan
    ? (billingPeriod === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly)
    : 0;

  const priceChange = newPrice - currentPrice;

  const loadProrationInfo = async (planId: string, period: 'monthly' | 'yearly') => {
    if (!planId || planId === currentPlanId) {
      setProrationInfo(null);
      return;
    }

    setLoadingProration(true);
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const priceId = period === 'monthly' ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly;
      
      const { data, error } = await supabase.functions.invoke('calculate-proration', {
        body: { new_price_id: priceId }
      });

      if (error) throw error;
      
      setProrationInfo(data);
    } catch (error) {
      console.error('Error calculating proration:', error);
      setProrationInfo(null);
    } finally {
      setLoadingProration(false);
    }
  };

  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      loadProrationInfo(selectedPlanId, billingPeriod);
    }
  }, [selectedPlanId, billingPeriod, plans]);

  const handleConfirm = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      console.log('Calling update-subscription with:', { planId: selectedPlan.id, billingPeriod });
      
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: {
          new_plan_id: selectedPlan.id,
          billing_period: billingPeriod,
        },
      });

      console.log('Update subscription response:', { data, error });

      if (error) {
        console.error('Update subscription error:', error);
        throw error;
      }

      // Show detailed success message based on upgrade timing
      const upgradeDetails = data?.upgrade_details;
      if (upgradeDetails?.proration_applied) {
        const amount = upgradeDetails.prorationAmount ? `$${upgradeDetails.prorationAmount.toFixed(2)}` : '';
        toast.success(
          `✅ Plan mis à niveau ! Prorata de ${amount} facturé. Vos compteurs ont été réinitialisés.`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          '✅ Plan mis à niveau ! Nouveau cycle démarré sans prorata.',
          { duration: 5000 }
        );
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      const errorMessage = error?.message || error?.error?.message || error?.toString() || 'Erreur lors de la mise à jour';
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = priceChange > 0;
  const isDowngrade = priceChange < 0;
  const isSamePlan = (selectedPlanId === currentPlanId) && (selectedPlan !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Changer de plan</DialogTitle>
          <DialogDescription>
            Sélectionnez votre nouveau plan d'abonnement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan-select">Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="plan-select">
                <SelectValue placeholder="Sélectionner un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {plan.max_optimizations_monthly} optimizations/mois
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <Label>Période de facturation</Label>
            <RadioGroup value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">
                  Mensuel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="font-normal cursor-pointer">
                  Annuel <span className="text-sm text-muted-foreground">(économisez ~20%)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          {selectedPlan && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold text-sm">Résumé du changement</h4>
              
              <div className="space-y-2 text-sm">
                {currentPlan && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan actuel:</span>
                    <span className="font-medium">
                      {currentPlan.name} - ${currentPrice.toFixed(2)}/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nouveau plan:</span>
                  <span className="font-medium">
                    {selectedPlan.name} - ${newPrice.toFixed(2)}/{billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </span>
                </div>

                {!isSamePlan && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">
                      {isUpgrade ? 'Coût supplémentaire' : 'Remboursement'} (prorata):
                    </span>
                    <span className={`font-semibold ${isUpgrade ? 'text-orange-600' : 'text-green-600'}`}>
                      {isUpgrade ? '+' : ''}${priceChange.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                <p>✓ {selectedPlan.max_products} produits maximum</p>
                <p>✓ {selectedPlan.max_optimizations_monthly} optimisations/mois</p>
                <p>✓ {selectedPlan.max_articles_monthly} articles/mois</p>
                <p>✓ {selectedPlan.max_chat_responses_monthly} réponses chat/mois</p>
              </div>
            </div>
          )}

          {/* Upgrade Information Banner */}
          {selectedPlan && !isSamePlan && (
            <div className="text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                ℹ️ Détails de la facturation
              </p>
              {loadingProration ? (
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Calcul du prorata en cours...</span>
                </div>
              ) : prorationInfo ? (
                prorationInfo.willProrate ? (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Vous êtes au jour {prorationInfo.daysIntoCycle} de votre cycle</li>
                    <li>• {prorationInfo.daysRemaining} jours restants jusqu'au renouvellement</li>
                    <li>• Montant du prorata estimé : ${prorationInfo.prorationAmount.toFixed(2)}</li>
                    <li>• Vos compteurs mensuels seront réinitialisés immédiatement</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Vous êtes au jour {prorationInfo.daysIntoCycle} de votre cycle</li>
                    <li>• Pas de proration (début de cycle)</li>
                    <li>• Vous paierez le prix complet du nouveau plan</li>
                    <li>• Date de renouvellement : {new Date(prorationInfo.renewalDate).toLocaleDateString('fr-FR')}</li>
                  </ul>
                )
              ) : (
                isUpgrade ? (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Vous serez facturé au prorata selon votre position dans le cycle</li>
                    <li>• Vos compteurs mensuels seront réinitialisés si applicable</li>
                    <li>• Votre date de renouvellement reste inchangée</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Le changement sera effectif immédiatement</li>
                    <li>• Vous serez crédité pour le reste du cycle</li>
                    <li>• Vos compteurs mensuels seront ajustés</li>
                  </ul>
                )
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !selectedPlan || isSamePlan}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              <>
                Confirmer le changement
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
