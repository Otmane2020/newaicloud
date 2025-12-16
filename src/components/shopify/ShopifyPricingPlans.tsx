import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Skeleton loader component
const PlanSkeleton = () => (
  <div className="rounded-lg p-6 space-y-4 animate-pulse" style={{ backgroundColor: "white", border: "1px solid #e1e3e5" }}>
    <div className="flex justify-center">
      <div className="w-12 h-12 rounded-full" style={{ backgroundColor: "#f4f6f8" }} />
    </div>
    <div className="space-y-2 text-center">
      <div className="h-6 rounded mx-auto w-24" style={{ backgroundColor: "#f4f6f8" }} />
      <div className="h-4 rounded mx-auto w-32" style={{ backgroundColor: "#f4f6f8" }} />
    </div>
    <div className="h-10 rounded mx-auto w-28" style={{ backgroundColor: "#f4f6f8" }} />
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-4 rounded w-full" style={{ backgroundColor: "#f4f6f8" }} />
      ))}
    </div>
    <div className="h-11 rounded w-full" style={{ backgroundColor: "#f4f6f8" }} />
  </div>
);

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
  isEmbedded?: boolean;
  host?: string;
}

export default function ShopifyPricingPlans({ 
  shopDomain, 
  language = "fr",
  onSubscriptionCreated,
  isAuthenticating = false,
  isEmbedded = false,
  host
}: ShopifyPricingPlansProps) {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);

  // Simulate plans loading for better UX perception
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlansLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const t = {
    title: language === "fr" ? "Choisissez votre plan" : "Choose your plan",
    subtitle: language === "fr" 
      ? "Sélectionnez le plan qui correspond à vos besoins" 
      : "Select the plan that fits your needs",
    loadingTitle: language === "fr" ? "Préparation de votre espace NewAI…" : "Preparing your NewAI workspace...",
    loadingSubtitle: language === "fr" 
      ? "Nous finalisons les plans adaptés à votre boutique" 
      : "Finalizing plans for your store",
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
        
        // Redirect to Shopify Billing page in same window
        console.log("[ShopifyPricingPlans] Redirecting to Shopify Billing:", data.confirmationUrl);
        window.location.href = data.confirmationUrl;
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

  // Show skeleton loading state
  if (plansLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" }}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#008060" }} />
            <h2 className="text-2xl font-semibold" style={{ color: "#202223" }}>
              {t.loadingTitle}
            </h2>
          </div>
          <p className="text-base" style={{ color: "#6d7175" }}>
            {t.loadingSubtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <PlanSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" }}>
      {/* Header - Shopify Polaris style */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: "#202223" }}>
          {t.title}
        </h2>
        <p className="text-lg" style={{ color: "#6d7175" }}>
          {t.subtitle}
        </p>
      </div>

      {/* Billing Toggle - Shopify style */}
      <div className="flex items-center justify-center gap-4 mb-8 p-3 rounded-lg" style={{ backgroundColor: "#f6f6f7" }}>
        <Label 
          htmlFor="billing-toggle" 
          className={`cursor-pointer transition-colors text-sm font-medium ${billingCycle === "monthly" ? "" : ""}`}
          style={{ color: billingCycle === "monthly" ? "#202223" : "#6d7175" }}
        >
          {t.monthly}
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === "yearly"}
          onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
          className="data-[state=checked]:bg-[#008060]"
        />
        <Label 
          htmlFor="billing-toggle" 
          className={`cursor-pointer transition-colors flex items-center gap-2 text-sm font-medium`}
          style={{ color: billingCycle === "yearly" ? "#202223" : "#6d7175" }}
        >
          {t.yearly}
          <Badge className="text-xs font-medium" style={{ backgroundColor: "#008060", color: "white" }}>
            -20%
          </Badge>
        </Label>
      </div>

      {/* Plans Grid - Shopify Polaris style cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const features = plan.features[language];
          const isSelected = selectedPlan === plan.id;
          const isLoading = loading && isSelected;

          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                plan.popular 
                  ? "shadow-lg scale-[1.02] z-10" 
                  : "hover:shadow-md"
              }`}
              style={{ 
                borderRadius: "8px",
                border: plan.popular ? "2px solid #008060" : "1px solid #e1e3e5",
                backgroundColor: "white"
              }}
            >
              {/* Popular Badge - Shopify style */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge 
                    className="rounded-none rounded-bl-lg flex items-center gap-1 text-xs font-medium px-3 py-1"
                    style={{ backgroundColor: "#008060", color: "white" }}
                  >
                    <Sparkles className="h-3 w-3" />
                    {t.popular}
                  </Badge>
                </div>
              )}

              {/* Top border accent */}
              <div className="h-1" style={{ backgroundColor: plan.popular ? "#008060" : "#95bf47" }} />

              <CardHeader className="text-center pb-2 pt-6">
                <div 
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: plan.popular ? "#008060" : "#f4f6f8" }}
                >
                  <Icon className="h-6 w-6" style={{ color: plan.popular ? "white" : "#008060" }} />
                </div>
                <CardTitle className="text-xl font-semibold" style={{ color: "#202223" }}>
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-sm" style={{ color: "#6d7175" }}>
                  {plan.description[language]}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pb-6">
                {/* Price - Shopify style */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold" style={{ color: "#202223" }}>${price.toFixed(2)}</span>
                    <span className="text-sm" style={{ color: "#6d7175" }}>{t.perMonth}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs mt-1" style={{ color: "#6d7175" }}>
                      {t.billedYearly}
                    </p>
                  )}
                  {plan.trialDays && (
                    <Badge 
                      variant="outline" 
                      className="mt-3 text-xs font-medium"
                      style={{ borderColor: "#008060", color: "#008060" }}
                    >
                      {plan.trialDays} {t.days} {t.freeTrial}
                    </Badge>
                  )}
                </div>

                {/* Features - Shopify style */}
                <ul className="space-y-3 pt-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#008060" }} />
                      <span className="text-sm" style={{ color: "#202223" }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button - Dark style #1a1a1a */}
                <Button
                  className="w-full font-medium text-sm h-11 transition-all hover:opacity-90"
                  style={{ 
                    background: "#1a1a1a",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.05)"
                  }}
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