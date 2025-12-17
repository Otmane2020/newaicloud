import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Zap, Crown, Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

// Plans Shopify synchronisés avec shopify-create-subscription
const SHOPIFY_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: {
      en: 'Perfect for getting started',
      fr: 'Parfait pour commencer'
    },
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    features: {
      en: [
        '100 analyzed products',
        '100 AI SEO optimizations / month',
        '1 AI article / month'
      ],
      fr: [
        '100 produits analysés',
        '100 optimisations SEO IA / mois',
        '1 article IA / mois'
      ]
    },
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    maxOptimizations: 100
  },
  {
    id: 'pro-500',
    name: 'Pro',
    description: {
      en: 'For growing businesses',
      fr: 'Pour les entreprises en croissance'
    },
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: {
      en: [
        '1,000 analyzed products',
        '500 AI SEO optimizations / month',
        '5 AI articles / month',
        '3 automatic AI campaigns / month'
      ],
      fr: [
        '1 000 produits analysés',
        '500 optimisations SEO IA / mois',
        '5 articles IA / mois',
        '3 campagnes IA automatiques / mois'
      ]
    },
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    maxOptimizations: 500
  },
  {
    id: 'pro-1000',
    name: 'Enterprise',
    description: {
      en: 'For large-scale operations',
      fr: 'Pour les opérations à grande échelle'
    },
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: {
      en: [
        'Unlimited products',
        '2,000 AI SEO optimizations / month',
        '20 AI articles / month',
        '10 automatic AI campaigns / month'
      ],
      fr: [
        'Produits illimités',
        '2 000 optimisations SEO IA / mois',
        '20 articles IA / mois',
        '10 campagnes IA automatiques / mois'
      ]
    },
    icon: Building2,
    color: 'from-amber-500 to-orange-500',
    maxOptimizations: 2000
  }
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
  onUpgradeComplete,
  isTrialing = false
}: ShopifyUpgradeDialogProps) {
  const { t, language } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Filter plans that are upgrades from current plan
  // Si en trial → montrer TOUS les plans (pour activer le plan actuel ou upgrader)
  const availablePlans = SHOPIFY_PLANS.filter(plan => {
    if (!currentPlanId || currentPlanId === 'free' || currentPlanId === 'trial') return true;
    
    // Si utilisateur en TRIAL → montrer tous les plans
    if (isTrialing) return true;
    
    // Sinon, logique normale : montrer uniquement les plans supérieurs
    const planOrder = ['starter', 'pro-500', 'pro-1000'];
    const currentIndex = planOrder.indexOf(currentPlanId);
    const planIndex = planOrder.indexOf(plan.id);
    
    return planIndex > currentIndex;
  });

  const handleSelectPlan = async (planId: string) => {
    if (!shopDomain) {
      toast.error(language === 'fr' ? "Domaine Shopify manquant" : "Shop domain missing");
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      console.log("[ShopifyUpgradeDialog] Creating upgrade subscription:", { planId, billingCycle, shopDomain });

      const { data, error } = await supabase.functions.invoke("shopify-upgrade-subscription", {
        body: {
          newPlanId: planId,
          billingCycle,
        },
      });

      if (error) throw error;

      console.log("[ShopifyUpgradeDialog] Subscription response:", data);

      if (data?.confirmationUrl) {
        if (onUpgradeComplete) {
          onUpgradeComplete();
        }
        
        // Redirect to Shopify Billing
        if (window.top && window.top !== window) {
          window.top.location.href = data.confirmationUrl;
        } else {
          window.location.href = data.confirmationUrl;
        }
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("[ShopifyUpgradeDialog] Error:", err);
      toast.error(
        language === 'fr' ? "Erreur" : "Error",
        {
          description: err instanceof Error ? err.message : (language === 'fr' ? "Impossible de créer l'abonnement" : "Could not create subscription"),
        }
      );
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const limitTitle = t.dialogs.limit.limitTypes[limitType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {language === 'fr' ? "Mettre à niveau votre plan" : "Upgrade Your Plan"}
          </DialogTitle>
        </DialogHeader>

        {/* Current limit info */}
        {usage !== undefined && limit !== undefined && (
          <>
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
              <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                {t.dialogs.upgrade.youReachedLimit}
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                {limitTitle}: {usage} / {limit}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Label 
            htmlFor="billing-toggle-upgrade" 
            className={`cursor-pointer transition-colors ${billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {language === 'fr' ? "Mensuel" : "Monthly"}
          </Label>
          <Switch
            id="billing-toggle-upgrade"
            checked={billingCycle === "yearly"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
          />
          <Label 
            htmlFor="billing-toggle-upgrade" 
            className={`cursor-pointer transition-colors flex items-center gap-2 ${billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {language === 'fr' ? "Annuel" : "Yearly"}
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              -20%
            </Badge>
          </Label>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availablePlans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const features = plan.features[language];
            const isSelected = selectedPlan === plan.id;
            const isLoading = loading && isSelected;
            const isCurrent = currentPlanId === plan.id;

            return (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular 
                    ? "border-2 border-primary shadow-md" 
                    : "border hover:border-primary/50"
                } ${isCurrent ? "opacity-50" : ""}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {language === 'fr' ? "Populaire" : "Popular"}
                    </Badge>
                  </div>
                )}

                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${plan.color}`} />

                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-12 h-12 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {plan.description[language]}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-sm">
                        {language === 'fr' ? "/mois" : "/month"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'fr' ? "facturé annuellement" : "billed yearly"}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className={`w-full ${plan.popular ? "bg-gradient-to-r " + plan.color + " hover:opacity-90" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading || (isCurrent && !isTrialing)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'fr' ? "Traitement..." : "Processing..."}
                      </>
                    ) : isCurrent && !isTrialing ? (
                      language === 'fr' ? "Plan actuel" : "Current Plan"
                    ) : isCurrent && isTrialing ? (
                      language === 'fr' ? `Activer ${plan.name}` : `Activate ${plan.name}`
                    ) : (
                      language === 'fr' ? "Sélectionner" : "Select"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availablePlans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'fr' 
              ? "Vous êtes déjà sur le plan le plus élevé" 
              : "You are already on the highest plan"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
