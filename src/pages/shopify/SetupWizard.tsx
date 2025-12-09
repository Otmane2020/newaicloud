import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Zap, Crown, Rocket, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  priceYearly: number;
  features: string[];
  featuresEn: string[];
  icon: React.ElementType;
  popular?: boolean;
  trial?: number;
  isFree?: boolean;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    nameEn: "Starter",
    price: 9.99,
    priceYearly: 7.99,
    trial: 7,
    icon: Zap,
    features: [
      "100 optimisations SEO/mois",
      "Synchronisation Shopify",
      "Textes alternatifs IA",
      "Support email",
    ],
    featuresEn: [
      "100 SEO optimizations/month",
      "Shopify sync",
      "AI alt texts",
      "Email support",
    ],
  },
  {
    id: "pro-500",
    name: "Pro",
    nameEn: "Pro",
    price: 49,
    priceYearly: 39.20,
    icon: Crown,
    popular: true,
    features: [
      "500 optimisations SEO/mois",
      "Import jusqu'à 500 produits",
      "Landing pages IA",
      "Blog automatique",
      "Google Shopping",
      "Support prioritaire",
    ],
    featuresEn: [
      "500 SEO optimizations/month",
      "Import up to 500 products",
      "AI landing pages",
      "Automatic blog",
      "Google Shopping",
      "Priority support",
    ],
  },
  {
    id: "pro-1000",
    name: "Enterprise",
    nameEn: "Enterprise",
    price: 98,
    priceYearly: 78.40,
    icon: Rocket,
    features: [
      "1000 optimisations SEO/mois",
      "Import jusqu'à 1000 produits",
      "Toutes les fonctionnalités Pro",
      "API access",
      "Support dédié",
      "Formations personnalisées",
    ],
    featuresEn: [
      "1000 SEO optimizations/month",
      "Import up to 1000 products",
      "All Pro features",
      "API access",
      "Dedicated support",
      "Custom training",
    ],
  },
];

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shop = searchParams.get("shop");

  const t = {
    title: language === "fr" ? "Choisissez votre plan" : "Choose your plan",
    subtitle: language === "fr" 
      ? "Sélectionnez le plan qui correspond à vos besoins" 
      : "Select the plan that fits your needs",
    monthly: language === "fr" ? "Mensuel" : "Monthly",
    yearly: language === "fr" ? "Annuel" : "Yearly",
    save: language === "fr" ? "Économisez 20%" : "Save 20%",
    selectPlan: language === "fr" ? "Sélectionner" : "Select",
    startTrial: language === "fr" ? "Démarrer l'essai" : "Start Trial",
    processing: language === "fr" ? "Traitement en cours..." : "Processing...",
    popular: language === "fr" ? "Populaire" : "Popular",
    trial: language === "fr" ? "Essai gratuit" : "Free trial",
    perMonth: language === "fr" ? "/mois" : "/month",
    days: language === "fr" ? "jours" : "days",
    free: language === "fr" ? "Gratuit" : "Free",
    settingUp: language === "fr" ? "Configuration de votre compte..." : "Setting up your account...",
    errorTitle: language === "fr" ? "Erreur" : "Error",
    errorMessage: language === "fr" 
      ? "Une erreur est survenue lors de la configuration" 
      : "An error occurred during setup",
  };

  // Process pending token on mount
  useEffect(() => {
    const processToken = async () => {
      // Need both pending_token AND shop for authentication
      if (!pendingToken || !shop) {
        setIsProcessing(false);
        return;
      }

      try {
        console.log("[SetupWizard] Calling shopify-auto-auth with:", { shop, pending_token: pendingToken });
        
        // Call shopify-auto-auth to authenticate - MUST send both shop and pending_token
        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: { 
            shop: shop,
            pending_token: pendingToken 
          },
        });

        if (error) throw error;

        console.log("[SetupWizard] shopify-auto-auth response:", data);

        if (data?.access_token && data?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          console.log("[SetupWizard] Session set successfully");
        }

        setIsProcessing(false);
      } catch (err) {
        console.error("[SetupWizard] Error processing token:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsProcessing(false);
      }
    };

    processToken();
  }, [pendingToken, shop]);

  const handleSelectPlan = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const { data, error } = await supabase.functions.invoke("shopify-create-subscription", {
        body: {
          planId,
          billingCycle,
          shopDomain: shop, // Corrected: use shopDomain instead of shop
        },
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        // Redirect to Shopify billing confirmation
        window.location.href = data.confirmationUrl;
      } else if (data?.success && planId === "free-trial") {
        // Free trial activated without Shopify billing
        window.location.href = `/dashboard?trial=activated`;
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      toast.error(t.errorTitle, {
        description: err instanceof Error ? err.message : t.errorMessage,
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">{t.settingUp}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t.errorTitle}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-muted p-1 rounded-lg">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              {t.monthly}
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                billingCycle === "yearly" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingCycle("yearly")}
            >
              {t.yearly}
              <Badge variant="secondary" className="text-xs">
                {t.save}
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = plan.isFree ? 0 : (billingCycle === "yearly" ? plan.priceYearly : plan.price);
            const features = language === "fr" ? plan.features : plan.featuresEn;
            const planName = language === "fr" ? plan.name : plan.nameEn;
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular ? "border-primary shadow-lg" : ""
                } ${plan.isFree ? "border-success/50 bg-success/5" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t.popular}
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${plan.isFree ? "bg-success/10" : "bg-primary/10"}`}>
                    <Icon className={`h-6 w-6 ${plan.isFree ? "text-success" : "text-primary"}`} />
                  </div>
                  <CardTitle className="text-xl">{planName}</CardTitle>
                  <div className="mt-2">
                    {plan.isFree ? (
                      <span className="text-4xl font-bold text-success">{t.free}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price.toFixed(2)}</span>
                        <span className="text-muted-foreground">{t.perMonth}</span>
                      </>
                    )}
                  </div>
                  {plan.trial && (
                    <Badge variant="outline" className={`mt-2 ${plan.isFree ? "border-success text-success" : ""}`}>
                      {plan.trial} {t.days} {t.trial}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.isFree ? "text-success" : "text-primary"}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${plan.isFree ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
                    variant={plan.popular ? "default" : plan.isFree ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading}
                  >
                    {isSelected && loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.processing}
                      </span>
                    ) : (
                      plan.isFree ? t.startTrial : t.selectPlan
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
