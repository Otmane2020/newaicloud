import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Loader2, Tag } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useShopifyBilling } from '@/hooks/useShopifyBilling';
import { ShopifyUpgradeDialog } from '@/components/shopify/ShopifyUpgradeDialog';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'campaigns';
  usage?: number;
  limit?: number;
  currentPlan?: string;
  currentPlanId?: string;
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
  max_campaigns?: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  limitType,
  usage = 0,
  limit = 0,
  currentPlan = 'Trial',
  currentPlanId,
  onUpgradeComplete,
}: UpgradeDialogProps) {
  const { language } = useTranslation();
  const fr = language === 'fr';
  const checkoutCurrency = fr ? 'eur' : 'usd';
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planTier, setPlanTier] = useState<'pro' | 'enterprise'>('pro');
  const [useManualPromo, setUseManualPromo] = useState(false);

  const { isShopifyUser, billingProvider, shopDomain, loading: shopifyLoading } = useShopifyBilling();

  useEffect(() => {
    if (!open || shopifyLoading || (billingProvider === 'shopify' && isShopifyUser)) return;

    const loadPlans = async () => {
      setPlansLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: usageData }, { data: plans, error: plansError }] = await Promise.all([
          supabase
            .from('usage_tracking')
            .select('products_count')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('subscription_plans')
            .select('id, name, price_monthly, max_products, max_optimizations_monthly, max_articles_monthly, max_chat_responses_monthly, max_shopify_stores, max_campaigns, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        ]);

        if (plansError) throw plansError;
        const productCount = Number(usageData?.products_count || 0);
        const eligible = (plans || []).filter((plan: any) =>
          (plan.max_products === -1 || plan.max_products >= productCount) &&
          plan.id !== currentPlanId,
        ) as Plan[];

        setAvailablePlans(eligible);
        if (eligible.length) {
          const firstPro = eligible.find((plan) => plan.name.toLowerCase().includes('pro') && !plan.name.toLowerCase().includes('enterprise'));
          const first = firstPro || eligible[0];
          setSelectedPlanId(first.id);
          setPlanTier(first.name.toLowerCase().includes('enterprise') ? 'enterprise' : 'pro');
        }
      } catch (error) {
        console.error('Unable to load upgrade plans', error);
        toast.error(fr ? 'Impossible de charger les offres.' : 'Unable to load plans.');
      } finally {
        setPlansLoading(false);
      }
    };

    void loadPlans();
  }, [open, shopifyLoading, billingProvider, isShopifyUser, currentPlanId, fr]);

  const filteredPlans = useMemo(() => availablePlans.filter((plan) => {
    const name = plan.name.toLowerCase();
    return planTier === 'enterprise'
      ? name.includes('enterprise')
      : !name.includes('enterprise');
  }), [availablePlans, planTier]);

  useEffect(() => {
    if (!filteredPlans.length) return;
    if (!filteredPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(filteredPlans[0].id);
    }
  }, [filteredPlans, selectedPlanId]);

  if (open && shopifyLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (billingProvider === 'shopify' && isShopifyUser && shopDomain) {
    return (
      <ShopifyUpgradeDialog
        open={open}
        onOpenChange={onOpenChange}
        shopDomain={shopDomain}
        currentPlanId={currentPlanId}
        limitType={limitType}
        usage={usage}
        limit={limit}
        onUpgradeComplete={onUpgradeComplete}
      />
    );
  }

  const selectedPlan = availablePlans.find((plan) => plan.id === selectedPlanId);

  const finishUpgrade = async (planId: string) => {
    const { data, error } = await supabase.functions.invoke('update-subscription', {
      body: { new_plan_id: planId, billing_period: 'monthly' },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    if (data?.payment?.required && data?.payment?.invoiceUrl) {
      // Do not use window.open after an awaited request: browsers can block it as a popup.
      window.location.assign(data.payment.invoiceUrl);
      return true;
    }

    if (data?.success) {
      toast.success(fr ? 'Votre offre a été mise à niveau.' : 'Your plan was upgraded.');
      onUpgradeComplete?.();
      onOpenChange(false);
      return true;
    }

    if (data?.paymentPending) {
      throw new Error(fr ? 'Un paiement est requis pour finaliser la mise à niveau.' : 'A payment is required to finalize the upgrade.');
    }

    return false;
  };

  const handleActivate = async () => {
    if (!selectedPlanId) {
      toast.error(fr ? 'Sélectionnez une offre.' : 'Select a plan.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(fr ? 'Session expirée.' : 'Session expired.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, stripe_customer_id')
        .eq('id', user.id)
        .single();

      const canUpdateExisting = Boolean(profile?.stripe_customer_id) &&
        ['active', 'trialing', 'past_due'].includes(profile?.subscription_status || '');

      if (canUpdateExisting) {
        await finishUpgrade(selectedPlanId);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: selectedPlanId,
          billing_period: 'monthly',
          use_manual_promo: useManualPromo,
          currency: checkoutCurrency,
          language,
        },
      });

      if (error) throw error;
      if (data?.error && data?.redirect_to_upgrade) {
        const upgraded = await finishUpgrade(selectedPlanId);
        if (upgraded) return;
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error(fr ? 'Stripe n’a retourné aucune URL de paiement.' : 'Stripe did not return a checkout URL.');

      // Same-tab redirect reliably survives async edge-function calls.
      window.location.assign(data.url);
    } catch (error: any) {
      console.error('Upgrade payment failed', error);
      toast.error(error?.message || (fr ? 'Impossible d’ouvrir le paiement Stripe.' : 'Unable to open Stripe checkout.'));
    } finally {
      setLoading(false);
    }
  };

  const limitLabel: Record<UpgradeDialogProps['limitType'], string> = {
    optimizations: fr ? 'optimisations' : 'optimizations',
    articles: fr ? 'articles' : 'articles',
    chat: fr ? 'réponses IA' : 'AI responses',
    shopifySearch: fr ? 'recherches Shopify' : 'Shopify searches',
    campaigns: fr ? 'campagnes' : 'campaigns',
  };

  const nextLimit = selectedPlan
    ? limitType === 'optimizations' ? selectedPlan.max_optimizations_monthly
      : limitType === 'articles' ? selectedPlan.max_articles_monthly
        : limitType === 'chat' ? selectedPlan.max_chat_responses_monthly
          : limitType === 'campaigns' ? (selectedPlan.max_campaigns ?? limit)
            : limit
    : limit;

  const formattedPrice = new Intl.NumberFormat(fr ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: checkoutCurrency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(selectedPlan?.price_monthly || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fr ? 'Mettre à niveau votre offre' : 'Upgrade your plan'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-950">
            <p className="font-semibold">{fr ? 'Limite atteinte' : 'Limit reached'} · {currentPlan}</p>
            <p className="mt-1 text-xs text-orange-800">
              {usage}/{limit} {limitLabel[limitType]}
            </p>
          </div>

          <Separator />

          <Tabs value={planTier} onValueChange={(value) => setPlanTier(value as 'pro' | 'enterprise')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pro">Pro</TabsTrigger>
              <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
            </TabsList>
          </Tabs>

          {plansLoading ? (
            <div className="grid min-h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filteredPlans.length ? (
            <>
              <div className="space-y-2">
                <Label>{fr ? 'Nouvelle offre' : 'New plan'}</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filteredPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">{selectedPlan.name}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{formattedPrice}<span className="text-xs font-normal text-slate-500">/{fr ? 'mois' : 'mo'}</span></p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <p className="font-semibold">{nextLimit === -1 ? (fr ? 'Illimité' : 'Unlimited') : nextLimit}</p>
                      <p>{limitLabel[limitType]}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-violet-600" />
                  <Label htmlFor="manual-promo">{fr ? 'J’ai un code promo' : 'I have a promo code'}</Label>
                </div>
                <Switch id="manual-promo" checked={useManualPromo} onCheckedChange={setUseManualPromo} />
              </div>

              <Button className="w-full rounded-xl" onClick={handleActivate} disabled={loading || !selectedPlanId}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                {fr ? 'Continuer vers le paiement' : 'Continue to payment'}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                {fr ? 'Devise du nouveau checkout : EUR. Les abonnements existants conservent leur devise Stripe.' : 'New checkout currency: USD. Existing subscriptions keep their Stripe currency.'}
              </p>
            </>
          ) : (
            <p className="rounded-xl border p-4 text-sm text-muted-foreground">
              {fr ? 'Aucune offre supérieure disponible pour votre catalogue.' : 'No higher plan is available for your catalog.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
