import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch';
  usage?: number;
  limit?: number;
  currentPlan?: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_chat_responses_monthly: number;
  max_shopify_stores: number;
}

export function UpgradeDialog({ open, onOpenChange, limitType, usage, limit, currentPlan = "Trial" }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState<Plan | null>(null);
  const [upgradePlanData, setUpgradePlanData] = useState<Plan | null>(null);
  const { t, tf } = useTranslation();

  const limitTitle = t.dialogs.limit.limitTypes[limitType];
  const limitMessage = tf('dialogs.limit.usageMessage', { 
    usage: usage || 0, 
    limit: limit || 0, 
    type: limitTitle 
  });

  useEffect(() => {
    const loadPlanData = async () => {
      try {
        // Charger le plan actuel
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('current_plan_id')
          .eq('id', userData.user.id)
          .single();

        // Charger tous les plans actifs triés par prix
        const { data: allPlans } = await supabase
          .from('subscription_plans')
          .select('id, name, price_monthly, max_products, max_optimizations_monthly, max_articles_monthly, max_chat_responses_monthly, max_shopify_stores')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });

        if (!allPlans || allPlans.length === 0) return;

        // Trouver le plan actuel
        const currentPlanId = profile?.current_plan_id || 'trial';
        let current = allPlans.find(p => p.id === currentPlanId);
        
        // Si trial ou pas de plan, utiliser le premier plan
        if (!current || currentPlanId === 'trial') {
          current = allPlans[0];
          setCurrentPlanData({ 
            id: 'trial',
            name: 'Trial',
            price_monthly: 0,
            max_products: 100,
            max_optimizations_monthly: 10,
            max_articles_monthly: 5,
            max_chat_responses_monthly: 20,
            max_shopify_stores: 1
          });
          setUpgradePlanData(current as Plan);
        } else {
          setCurrentPlanData(current as Plan);
          
          // Trouver le plan suivant (supérieur)
          const currentIndex = allPlans.findIndex(p => p.id === currentPlanId);
          const nextPlan = currentIndex < allPlans.length - 1 
            ? allPlans[currentIndex + 1] 
            : allPlans[currentIndex]; // Si déjà au max, proposer le même
          
          setUpgradePlanData(nextPlan as Plan);
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
      }
    };

    if (open) {
      loadPlanData();
    }
  }, [open]);

  const handleActivate = async () => {
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
        onOpenChange(false);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(t.toasts.error.payment);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.dialogs.limit.upgradeRequired}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">
              Vous avez atteint la limite de votre plan <span className="font-bold">{currentPlanData?.name || currentPlan}</span>
            </p>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {limitTitle}: {limitMessage}
            </p>
          </div>
          
          <Separator />
          
          {upgradePlanData && (
            <>
              <p className="text-muted-foreground font-medium">
                Passez à <span className="text-blue-600 dark:text-blue-400 font-bold">{upgradePlanData.name}</span> pour débloquer:
              </p>
              
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-3 text-lg">
                  {upgradePlanData.name} - {upgradePlanData.price_monthly}€/mois
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">{upgradePlanData.max_products} produits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">{upgradePlanData.max_optimizations_monthly} optimisations SEO/mois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">{upgradePlanData.max_articles_monthly} articles blog/mois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">{upgradePlanData.max_chat_responses_monthly} réponses chat/mois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">{upgradePlanData.max_shopify_stores} boutique(s) Shopify</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">Automatisation SEO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                    <span className="text-sm">Support prioritaire</span>
                  </li>
                </ul>
              </div>
            </>
          )}
          
          <Button 
            onClick={handleActivate} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : (
              <CreditCard className="w-5 h-5 mr-2" />
            )}
            {loading ? t.dialogs.upgrade.loading : t.dialogs.limit.activatePlan}
          </Button>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            {t.dialogs.limit.maybeLater}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}