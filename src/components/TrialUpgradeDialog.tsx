import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedOptimizations, setSelectedOptimizations] = useState("100");
  const [realProductCount, setRealProductCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch plans
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('max_products', { ascending: true });
      
      if (data) {
        setPlans(data);
      }

      // Fetch real product count
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { count } = await supabase
          .from('shopify_products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', user.user.id);
        
        setRealProductCount(count || 0);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const currentPlan = plans.find(p => p.id === limits?.currentPlanId);
  const currentProducts = realProductCount || limits?.usage.products_count || 0;
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
      console.log('💳 Creating immediate payment checkout with optimizations:', selectedOptimizations);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: recommendedPlan?.id || 'starter',
          billing_period: 'monthly',
          force_immediate_payment: true,
          optimization_quantity: parseInt(selectedOptimizations)
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg sm:text-xl">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <span className="leading-tight">
              {reason === 'limit_reached' 
                ? t.dialogs.upgrade.limitReached.title
                : t.dialogs.upgrade.trialExpired.title}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {reason === 'limit_reached' 
              ? tf('dialogs.upgrade.limitReached.description', { limitType })
              : t.dialogs.upgrade.trialExpired.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quota Warning */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-destructive">
                  Quota dépassé
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                  Vous avez <span className="font-bold text-destructive">{currentProducts} produits</span> mais votre quota actuel est de <span className="font-bold">{maxProducts} produits</span>. 
                  Passez à un plan supérieur pour continuer.
                </p>
              </div>
            </div>
          </div>

          {/* Current Usage */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
              <span className="text-muted-foreground">Plan actuel</span>
              <Badge variant="outline" className="text-xs">{currentPlan?.name || 'Trial'}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
                <span className="font-medium">Produits</span>
                <span className="text-base sm:text-lg font-bold text-primary">
                  {currentProducts} / {maxProducts}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Optimization Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre d'optimisations
            </label>
            <Select value={selectedOptimizations} onValueChange={setSelectedOptimizations}>
              <SelectTrigger className="w-full bg-card border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="50">50 optimisations - 5€/mois</SelectItem>
                <SelectItem value="100">100 optimisations - 9€/mois</SelectItem>
                <SelectItem value="200">200 optimisations - 16€/mois</SelectItem>
                <SelectItem value="500">500 optimisations - 35€/mois</SelectItem>
                <SelectItem value="1000">1000 optimisations - 65€/mois</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sélectionnez le nombre d'optimisations SEO dont vous avez besoin
            </p>
          </div>

          {/* Recommended Plan */}
          {recommendedPlan && (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 border border-primary/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-base sm:text-lg truncate">{recommendedPlan.name}</h3>
                </div>
                <Badge variant="secondary" className="text-xs w-fit">
                  Recommandé
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {recommendedPlan.price_monthly}€
                  <span className="text-base sm:text-lg font-normal text-muted-foreground">
                    /mois
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Jusqu'à {recommendedPlan.max_products} produits
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="break-words">{recommendedPlan.max_optimizations_monthly} optimisations SEO/mois</span>
                </div>
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="break-words">{recommendedPlan.max_articles_monthly} articles de blog/mois</span>
                </div>
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="break-words">{recommendedPlan.max_chat_responses_monthly} réponses chat/mois</span>
                </div>
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="break-words">{recommendedPlan.max_shopify_stores} boutiques Shopify</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t.dialogs.upgrade.later}
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto sm:flex-1 order-1 sm:order-2"
          >
            {loading ? t.dialogs.upgrade.loading : '💳 Payer maintenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}