import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { getCurrencySymbol } from '@/lib/formatUtils';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch';
  usage?: number;
  limit?: number;
  currentPlan?: string;
  onUpgradeComplete?: () => void;
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

export function UpgradeDialog({ open, onOpenChange, limitType, usage, limit, currentPlan = "Trial", onUpgradeComplete }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState<Plan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [subscriptionChannel, setSubscriptionChannel] = useState<any>(null);
  const { t, tf, language } = useTranslation();

  const limitTitle = t.dialogs.limit.limitTypes[limitType];
  const limitMessage = tf('dialogs.limit.usageMessage', { 
    usage: usage || 0, 
    limit: limit || 0, 
    type: limitTitle 
  });

  // Cleanup subscription listener when dialog closes
  useEffect(() => {
    if (!open && subscriptionChannel) {
      subscriptionChannel.unsubscribe();
      setSubscriptionChannel(null);
    }
  }, [open, subscriptionChannel]);

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
          
          // Tous les plans sont disponibles pour upgrade depuis trial
          setAvailablePlans(allPlans as Plan[]);
          setSelectedPlanId(allPlans[0].id);
        } else {
          setCurrentPlanData(current as Plan);
          
          // Trouver les plans supérieurs au plan actuel
          const currentIndex = allPlans.findIndex(p => p.id === currentPlanId);
          const upgradePlans = allPlans.slice(currentIndex + 1);
          
          if (upgradePlans.length > 0) {
            setAvailablePlans(upgradePlans as Plan[]);
            setSelectedPlanId(upgradePlans[0].id);
          } else {
            // Si déjà au max, proposer quand même le plan actuel
            setAvailablePlans([current] as Plan[]);
            setSelectedPlanId(current.id);
          }
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
    if (!selectedPlanId) {
      toast.error(t.forms.validation.selectOption);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: selectedPlanId,
          billing_period: 'monthly',
          force_immediate_payment: true
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Setup realtime listener for subscription updates
        if (onUpgradeComplete) {
          const channel = supabase
            .channel(`subscription-updates-${user.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`
            }, (payload) => {
              if (payload.new.subscription_status === 'active') {
                toast.success('Plan upgraded successfully!');
                onUpgradeComplete();
                channel.unsubscribe();
              }
            })
            .subscribe();
          
          setSubscriptionChannel(channel);
          
          // Auto cleanup after 5 minutes
          setTimeout(() => {
            channel.unsubscribe();
            setSubscriptionChannel(null);
          }, 5 * 60 * 1000);
        }
        
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

  const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl">{t.dialogs.limit.upgradeRequired}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">
              {t.dialogs.upgrade.youReachedLimit} <span className="font-bold">{currentPlanData?.name || currentPlan}</span>
            </p>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {limitTitle}: {limitMessage}
            </p>
          </div>
          
          <Separator />
          
          {availablePlans.length > 0 && (
            <>
              <div className="space-y-3">
                <p className="text-muted-foreground font-medium text-sm sm:text-base">
                  {t.dialogs.upgrade.chooseOptimizations}
                </p>
                
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={t.dialogs.upgrade.selectPlan} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <span className="text-xs sm:text-sm">
                          {tf('dashboard.plans.optimizationsCount', { count: plan.max_optimizations_monthly })} - {plan.price_monthly}{getCurrencySymbol(language)}/mois
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPlan && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-3 sm:p-4 rounded-lg border border-primary/30">
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">
                    {selectedPlan.name} - {selectedPlan.price_monthly}{getCurrencySymbol(language)}/{t.dashboard.plans.perMonth.replace('/', '')}
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">
                        {selectedPlan.max_products === -1 ? t.dashboard.plans.features.unlimitedProducts : `${selectedPlan.max_products} ${t.dashboard.plans.features.products}`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{selectedPlan.max_optimizations_monthly} {t.dashboard.plans.features.optimizationsPerMonth}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{selectedPlan.max_articles_monthly} {t.dashboard.plans.features.articlesPerMonth}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{selectedPlan.max_chat_responses_monthly} {t.dashboard.plans.features.chatResponsesPerMonth}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{selectedPlan.max_shopify_stores} {t.dashboard.plans.features.shopifyStores}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{t.dashboard.plans.features.seoAutomation}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                      <span className="text-xs sm:text-sm">{t.dashboard.plans.features.prioritySupport}</span>
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
          
          <Button 
            onClick={handleActivate} 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            size="lg"
            disabled={loading || !selectedPlanId}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : (
              <CreditCard className="w-5 h-5 mr-2" />
            )}
            {loading ? t.dialogs.upgrade.loading : t.dialogs.upgrade.activateThisPlan}
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