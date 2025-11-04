import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'trial_expired';
  limitType?: string;
}

export function TrialUpgradeDialog({ open, onOpenChange, reason, limitType }: TrialUpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t, tf } = useTranslation();
  const { limits } = useUsageLimits();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('max_products', { ascending: true });
      
      if (data) {
        setPlans(data);
      }
    };

    if (open) {
      fetchPlans();
    }
  }, [open]);

  const currentPlan = plans.find(p => p.id === limits?.currentPlanId);
  const currentProducts = limits?.usage.products_count || 0;
  const maxProducts = limits?.limits.max_products || 50;
  
  const getRecommendedPlan = () => {
    const neededCapacity = currentProducts;
    return plans.find(plan => plan.max_products > neededCapacity) || plans[plans.length - 1];
  };

  const recommendedPlan = getRecommendedPlan();
  const progressPercentage = Math.min((currentProducts / maxProducts) * 100, 100);

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
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(t.toasts.error.payment);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      console.log('🔧 Opening customer portal...');
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Portal error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to portal:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error(t.toasts.error.portal);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            {reason === 'limit_reached' 
              ? t.dialogs.upgrade.limitReached.title
              : t.dialogs.upgrade.trialExpired.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === 'limit_reached' 
              ? tf('dialogs.upgrade.limitReached.description', { limitType })
              : t.dialogs.upgrade.trialExpired.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Usage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan actuel</span>
              <Badge variant="outline">{currentPlan?.name || 'Trial'}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Produits utilisés</span>
                <span className="text-lg font-bold text-primary">
                  {currentProducts} / {maxProducts}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Recommended Plan */}
          {recommendedPlan && (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">{recommendedPlan.name}</h3>
                <Badge variant="secondary" className="ml-auto">
                  Recommandé
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-primary">
                  {recommendedPlan.price_monthly}€
                  <span className="text-lg font-normal text-muted-foreground">
                    /mois
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Jusqu'à {recommendedPlan.max_products} produits
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{recommendedPlan.max_optimizations_monthly} optimisations SEO/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{recommendedPlan.max_articles_monthly} articles de blog/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{recommendedPlan.max_chat_responses_monthly} réponses chat/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{recommendedPlan.max_shopify_stores} boutiques Shopify</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t.dialogs.upgrade.later}
          </Button>
          <Button
            onClick={handleManageSubscription}
            disabled={loading}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {loading ? t.dialogs.upgrade.loading : t.dialogs.upgrade.manageSub}
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary w-full sm:w-auto"
          >
            {loading ? t.dialogs.upgrade.loading : t.dialogs.upgrade.activateNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}