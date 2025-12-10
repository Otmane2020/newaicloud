import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Plans définis côté frontend - synchronisés avec shopify-create-subscription
const PLANS = [
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
    trialDays: 7
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
    popular: true
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
    color: 'from-amber-500 to-orange-500'
  }
];

interface ShopifyPricingPlansProps {
  shopDomain: string;
  language?: "fr" | "en";
  onSubscriptionCreated?: (confirmationUrl: string) => void;
  isAuthenticating?: boolean;
}

export default function ShopifyPricingPlans({ 
  shopDomain, 
  language = "fr",
  onSubscriptionCreated,
  isAuthenticating = false
}: ShopifyPricingPlansProps) {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const t = {
    title: language === "fr" ? "Choisissez votre plan" : "Choose your plan",
    subtitle: language === "fr" 
      ? "Sélectionnez le plan qui correspond à vos besoins" 
      : "Select the plan that fits your needs",
    monthly: language === "fr" ? "Mensuel" : "Monthly",
    yearly: language === "fr" ? "Annuel" : "Yearly",
    save: language === "fr" ? "Économisez 20%" : "Save 20%",
    selectPlan: language === "fr" ? "Sélectionner" : "Select",
    startTrial: language === "fr" ? "Commencer l'essai" : "Start Trial",
    processing: language === "fr" ? "Traitement..." : "Processing...",
    popular: language === "fr" ? "Populaire" : "Popular",
    perMonth: language === "fr" ? "/mois" : "/month",
    days: language === "fr" ? "jours" : "days",
    freeTrial: language === "fr" ? "Essai gratuit" : "Free trial",
    billedYearly: language === "fr" ? "facturé annuellement" : "billed yearly",
    error: language === "fr" ? "Erreur" : "Error",
    errorDesc: language === "fr" 
      ? "Impossible de créer l'abonnement" 
      : "Could not create subscription",
  };

  const handleSelectPlan = async (planId: string) => {
    if (!shopDomain) {
      toast.error(t.error, { description: "Shop domain missing" });
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      console.log("[ShopifyPricingPlans] Creating subscription:", { planId, billingCycle, shopDomain });

      const { data, error } = await supabase.functions.invoke("shopify-create-subscription", {
        body: {
          planId,
          billingCycle,
          shopDomain,
        },
      });

      if (error) throw error;

      console.log("[ShopifyPricingPlans] Subscription response:", data);

      // Handle both FREE and PAID plans - all return confirmationUrl now

      // Handle PAID plans - redirect to Shopify Billing
      if (data?.confirmationUrl) {
        // Callback optionnel
        if (onSubscriptionCreated) {
          onSubscriptionCreated(data.confirmationUrl);
        }
        // Redirection vers Shopify Billing - MUST use top window for embedded apps
        console.log("[ShopifyPricingPlans] Redirecting to:", data.confirmationUrl);
        if (window.top && window.top !== window) {
          // Inside iframe - redirect the entire Shopify Admin page
          window.top.location.href = data.confirmationUrl;
        } else {
          // Standalone mode
          window.location.href = data.confirmationUrl;
        }
        return;
      }
      
      // If we get here without isFree or confirmationUrl, something went wrong
      throw new Error("No confirmation URL received");
    } catch (err) {
      console.error("[ShopifyPricingPlans] Error:", err);
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.errorDesc,
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-lg">
          {t.subtitle}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Label 
          htmlFor="billing-toggle" 
          className={`cursor-pointer transition-colors ${billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
        >
          {t.monthly}
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === "yearly"}
          onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
        />
        <Label 
          htmlFor="billing-toggle" 
          className={`cursor-pointer transition-colors flex items-center gap-2 ${billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}
        >
          {t.yearly}
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            -20%
          </Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const features = plan.features[language];
          const isSelected = selectedPlan === plan.id;
          const isLoading = loading && isSelected;

          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? "border-2 border-primary shadow-lg scale-105 z-10" 
                  : "border hover:border-primary/50"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t.popular}
                  </Badge>
                </div>
              )}

              {/* Gradient Header */}
              <div className={`h-2 bg-gradient-to-r ${plan.color}`} />

              <CardHeader className="text-center pb-2">
                <div className={`mx-auto w-14 h-14 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-2xl">
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  {plan.description[language]}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${price.toFixed(2)}</span>
                    <span className="text-muted-foreground">{t.perMonth}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.billedYearly}
                    </p>
                  )}
                  {plan.trialDays && (
                    <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                      {plan.trialDays} {t.days} {t.freeTrial}
                    </Badge>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${plan.popular ? "bg-gradient-to-r " + plan.color + " hover:opacity-90" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    plan.trialDays ? t.startTrial : t.selectPlan
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}