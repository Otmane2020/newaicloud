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
  const { language, t, tf } = useTranslation();

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
          toast.error(t.dialogs.planUpgrade.loadError);
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
          tf('dialogs.upgrade.planUpgradedWithProration', { amount }),
          { duration: 6000 }
        );
      } else {
        toast.success(t.dialogs.upgrade.planUpgradedNoProration, { duration: 5000 });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      const errorMessage = error?.message || error?.error?.message || error?.toString() || t.dialogs.upgrade.updateError;
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = priceChange > 0;
  const isDowngrade = priceChange < 0;
  // Consider it the same plan only if both plan ID and price are identical
  // This allows changing billing period (monthly <-> yearly) even for the same plan
  const isSamePlan = (selectedPlanId === currentPlanId) && (priceChange === 0) && (selectedPlan !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.dialogs.planUpgrade.title}</DialogTitle>
          <DialogDescription>
            {t.dialogs.planUpgrade.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan-select">{t.dialogs.planUpgrade.plan}</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="plan-select">
                <SelectValue placeholder={t.dialogs.planUpgrade.selectPlan} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {plan.max_optimizations_monthly} {t.dialogs.planUpgrade.optimizationsPerMonth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <Label>{t.dialogs.planUpgrade.billingPeriod}</Label>
            <RadioGroup value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">
                  {t.dialogs.planUpgrade.monthly}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="font-normal cursor-pointer">
                  {t.dialogs.planUpgrade.yearly} <span className="text-sm text-muted-foreground">({t.dialogs.planUpgrade.savePercent})</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          {selectedPlan && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold text-sm">{t.dialogs.planUpgrade.changeSummary}</h4>
              
              <div className="space-y-3 text-sm">
                {currentPlan && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t.dialogs.planUpgrade.currentPrice}:</span>
                      <span className="font-semibold text-base">
                        {currentPlan.name} - ${currentPrice.toFixed(2)}/{billingPeriod === 'monthly' ? t.dialogs.planUpgrade.perMonth : t.dialogs.planUpgrade.perYear}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t.dialogs.planUpgrade.newPrice}:</span>
                      <span className="font-semibold text-base text-primary">
                        {selectedPlan.name} - ${newPrice.toFixed(2)}/{billingPeriod === 'monthly' ? t.dialogs.planUpgrade.perMonth : t.dialogs.planUpgrade.perYear}
                      </span>
                    </div>

                    {!isSamePlan && prorationInfo && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t.dialogs.planUpgrade.priceDifference}:</span>
                          <span className="font-medium">
                            ${Math.abs(priceChange).toFixed(2)}/{billingPeriod === 'monthly' ? t.dialogs.planUpgrade.perMonth : t.dialogs.planUpgrade.perYear}
                          </span>
                        </div>
                        
                        {prorationInfo.willProrate && (
                          <>
                            <div className="flex justify-between items-start">
                              <span className="text-muted-foreground">{t.dialogs.planUpgrade.prorationFormula}:</span>
                              <div className="text-right font-mono text-xs bg-background/50 px-2 py-1 rounded">
                                ({newPrice.toFixed(2)} - {currentPrice.toFixed(2)}) × ({prorationInfo.daysRemaining}d / {prorationInfo.daysIntoCycle + prorationInfo.daysRemaining}d)
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="font-medium">
                                {isUpgrade ? t.dialogs.planUpgrade.payToday : t.dialogs.planUpgrade.creditApplied} {t.dialogs.planUpgrade.prorata}:
                              </span>
                              <span className={`font-bold text-lg ${isUpgrade ? 'text-orange-600' : 'text-green-600'}`}>
                                {isUpgrade ? '' : '-'}${Math.abs(prorationInfo.prorationAmount).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {!prorationInfo.willProrate && (
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-medium">{t.dialogs.planUpgrade.fullPrice}:</span>
                            <span className="font-bold text-lg text-orange-600">
                              ${newPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                <p>✓ {tf('dialogs.planUpgrade.maxProducts', { count: selectedPlan.max_products })}</p>
                <p>✓ {tf('dialogs.planUpgrade.maxOptimizations', { count: selectedPlan.max_optimizations_monthly })}</p>
                <p>✓ {tf('dialogs.planUpgrade.maxArticles', { count: selectedPlan.max_articles_monthly })}</p>
                <p>✓ {tf('dialogs.planUpgrade.maxChatResponses', { count: selectedPlan.max_chat_responses_monthly })}</p>
              </div>
            </div>
          )}

          {/* Upgrade Information Banner */}
          {selectedPlan && !isSamePlan && (
            <div className="text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                {t.dialogs.planUpgrade.billingDetails}
              </p>
              {loadingProration ? (
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t.dialogs.planUpgrade.calculatingProration}</span>
                </div>
              ) : prorationInfo ? (
                prorationInfo.willProrate ? (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• {tf('dialogs.planUpgrade.cycleDay', { day: prorationInfo.daysIntoCycle })}</li>
                    <li>• {tf('dialogs.planUpgrade.daysRemaining', { days: prorationInfo.daysRemaining })}</li>
                    <li>• {tf('dialogs.planUpgrade.estimatedProration', { amount: `$${prorationInfo.prorationAmount.toFixed(2)}` })}</li>
                    <li>• {t.dialogs.planUpgrade.countersReset}</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• {tf('dialogs.planUpgrade.cycleDay', { day: prorationInfo.daysIntoCycle })}</li>
                    <li>• {t.dialogs.planUpgrade.noProration}</li>
                    <li>• {t.dialogs.planUpgrade.fullPriceCharged}</li>
                    <li>• {tf('dialogs.planUpgrade.renewalDate', { date: new Date(prorationInfo.renewalDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US') })}</li>
                  </ul>
                )
              ) : (
                isUpgrade ? (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• {t.dialogs.planUpgrade.prorationBilled}</li>
                    <li>• {t.dialogs.planUpgrade.countersResetIfApplicable}</li>
                    <li>• {t.dialogs.planUpgrade.renewalDateUnchanged}</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• {t.dialogs.planUpgrade.changeEffectiveImmediately}</li>
                    <li>• {t.dialogs.planUpgrade.creditedForRemainingCycle}</li>
                    <li>• {t.dialogs.planUpgrade.countersAdjusted}</li>
                  </ul>
                )
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t.dialogs.planUpgrade.cancel}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !selectedPlan || isSamePlan}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.dialogs.planUpgrade.updating}
              </>
            ) : (
              <>
                {t.dialogs.planUpgrade.confirmChange}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
