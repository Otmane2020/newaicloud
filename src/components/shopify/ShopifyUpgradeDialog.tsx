import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

const SHOPIFY_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: { en: 'Perfect for getting started', fr: 'Parfait pour commencer' },
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    features: {
      en: ['100 analyzed products', '100 AI SEO optimizations / month', '1 AI article / month'],
      fr: ['100 produits analysés', '100 optimisations SEO IA / mois', '1 article IA / mois'],
    },
    icon: Zap,
    maxOptimizations: 100,
  },
  {
    id: 'pro-500',
    name: 'Pro',
    description: { en: 'For growing businesses', fr: 'Pour les entreprises en croissance' },
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: {
      en: ['1,000 analyzed products', '500 AI SEO optimizations / month', '5 AI articles / month', '3 automatic AI campaigns / month'],
      fr: ['1 000 produits analysés', '500 optimisations SEO IA / mois', '5 articles IA / mois', '3 campagnes IA automatiques / mois'],
    },
    icon: Crown,
    popular: true,
    maxOptimizations: 500,
  },
  {
    id: 'enterprise-2000',
    name: 'Enterprise',
    description: { en: 'For large-scale operations', fr: 'Pour les opérations à grande échelle' },
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: {
      en: ['Unlimited products', '2,000 AI SEO optimizations / month', '20 AI articles / month', '10 automatic AI campaigns / month'],
      fr: ['Produits illimités', '2 000 optimisations SEO IA / mois', '20 articles IA / mois', '10 campagnes IA automatiques / mois'],
    },
    icon: Building2,
    maxOptimizations: 2000,
  },
];

interface ShopifyUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopDomain: string;
  currentPlanId?: string;
  limitType?: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'campaigns';
  usage?: number;
  limit?: number;
  onUpgradeComplete?: () => void;
  isTrialing?: boolean;
}

export function ShopifyUpgradeDialog({
  open,
  onOpenChange,
  shopDomain,
  currentPlanId,
  limitType = 'optimizations',
  usage,
  limit,
  isTrialing = false,
}: ShopifyUpgradeDialogProps) {
  const { t, language } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const availablePlans = SHOPIFY_PLANS.filter(plan => {
    if (!currentPlanId || currentPlanId === 'free' || currentPlanId === 'trial' || isTrialing) return true;

    const planOrder = ['starter', 'pro-500', 'enterprise-2000'];
    const currentIndex = planOrder.indexOf(currentPlanId);
    const planIndex = planOrder.indexOf(plan.id);
    return planIndex > currentIndex;
  });

  const handleSelectPlan = async (planId: string) => {
    if (!shopDomain || loading) {
      if (!shopDomain) toast.error(language === 'fr' ? "Domaine Shopify manquant" : "Shop domain missing");
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      const { data, error } = await supabase.functions.invoke("shopify-upgrade-subscription", {
        body: { newPlanId: planId, billingCycle },
      });

      if (error) throw error;
      if (!data?.confirmationUrl || typeof data.confirmationUrl !== 'string') {
        throw new Error("No confirmation URL received");
      }

      let confirmationUrl: URL;
      try {
        confirmationUrl = new URL(data.confirmationUrl);
      } catch {
        throw new Error("Invalid Shopify confirmation URL received");
      }

      if (confirmationUrl.protocol !== 'https:') {
        throw new Error("Unsafe Shopify confirmation URL received");
      }

      // Creating the charge is NOT an upgrade success. Shopify still needs the
      // merchant to approve the charge on its confirmation page, so do not call
      // onUpgradeComplete here. The billing callback must confirm activation.
      onOpenChange(false);

      if (window.top && window.top !== window) {
        window.top.location.href = confirmationUrl.toString();
      } else {
        window.location.assign(confirmationUrl.toString());
      }
    } catch (err) {
      console.error("[ShopifyUpgradeDialog] Error:", err);
      toast.error(language === 'fr' ? "Impossible de démarrer la mise à niveau" : "Could not start the upgrade", {
        description: err instanceof Error ? err.message : undefined,
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const limitTitle = t.dialogs.limit.limitTypes[limitType];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                {language === 'fr' ? "Mettre à niveau votre plan" : "Upgrade your plan"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {language === 'fr'
                  ? 'Choisissez un plan, puis confirmez la facturation directement dans Shopify.'
                  : 'Choose a plan, then approve billing directly in Shopify.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {usage !== undefined && limit !== undefined && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="font-medium">{t.dialogs.upgrade.youReachedLimit}</p>
            <p className="mt-1 text-sm text-muted-foreground">{limitTitle}: {usage} / {limit}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
          <Label htmlFor="billing-toggle-upgrade" className={billingCycle === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
            {language === 'fr' ? 'Mensuel' : 'Monthly'}
          </Label>
          <Switch
            id="billing-toggle-upgrade"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
            disabled={loading}
          />
          <Label htmlFor="billing-toggle-upgrade" className={`flex items-center gap-2 ${billingCycle === 'yearly' ? 'font-medium' : 'text-muted-foreground'}`}>
            {language === 'fr' ? 'Annuel' : 'Yearly'}
            <Badge variant="secondary">-20%</Badge>
          </Label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map(plan => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const features = plan.features[language];
            const isSelected = selectedPlan === plan.id;
            const isLoading = loading && isSelected;
            const isCurrent = currentPlanId === plan.id;

            return (
              <Card key={plan.id} className={`relative overflow-hidden rounded-2xl transition-all ${plan.popular ? 'border-primary/50 shadow-md' : 'border-border/70'} ${isCurrent && !isTrialing ? 'opacity-60' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute right-3 top-3 gap-1">
                    <Sparkles className="h-3 w-3" />
                    {language === 'fr' ? 'Populaire' : 'Popular'}
                  </Badge>
                )}

                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description[language]}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold tracking-tight">${price.toFixed(2)}</span>
                    <span className="ml-1 text-sm text-muted-foreground">{language === 'fr' ? '/mois' : '/month'}</span>
                    {billingCycle === 'yearly' && (
                      <p className="mt-1 text-xs text-muted-foreground">{language === 'fr' ? 'facturé annuellement' : 'billed yearly'}</p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full rounded-xl"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading || (isCurrent && !isTrialing)}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{language === 'fr' ? 'Ouverture Shopify…' : 'Opening Shopify…'}</>
                    ) : isCurrent && !isTrialing ? (
                      language === 'fr' ? 'Plan actuel' : 'Current plan'
                    ) : isCurrent && isTrialing ? (
                      language === 'fr' ? `Activer ${plan.name}` : `Activate ${plan.name}`
                    ) : (
                      language === 'fr' ? 'Sélectionner' : 'Select'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availablePlans.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-muted/25 py-8 text-center text-muted-foreground">
            {language === 'fr' ? 'Vous êtes déjà sur le plan le plus élevé' : 'You are already on the highest plan'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
