import React, { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Shopify-style embedded pricing page
 * Clean black & white design matching Shopify Admin aesthetic
 * Uses App Bridge for redirects in embedded context
 */

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 9.99,
    yearlyPrice: 7.99,
    features: {
      en: ['100 analyzed products', '100 AI SEO optimizations / month', '1 AI article / month'],
      fr: ['100 produits analysés', '100 optimisations SEO IA / mois', '1 article IA / mois']
    },
    trialDays: 7
  },
  {
    id: 'pro-500',
    name: 'Pro',
    monthlyPrice: 49,
    yearlyPrice: 39,
    features: {
      en: ['1,000 analyzed products', '500 AI SEO optimizations / month', '5 AI articles / month', '3 automatic AI campaigns / month'],
      fr: ['1 000 produits analysés', '500 optimisations SEO IA / mois', '5 articles IA / mois', '3 campagnes IA automatiques / mois']
    },
    popular: true
  },
  {
    id: 'pro-1000',
    name: 'Enterprise',
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: {
      en: ['Unlimited products', '2,000 AI SEO optimizations / month', '20 AI articles / month', '10 automatic AI campaigns / month'],
      fr: ['Produits illimités', '2 000 optimisations SEO IA / mois', '20 articles IA / mois', '10 campagnes IA automatiques / mois']
    }
  }
];

interface ShopifyEmbeddedPricingProps {
  shopDomain: string;
  language?: "fr" | "en";
}

export default function ShopifyEmbeddedPricing({ 
  shopDomain, 
  language = "fr"
}: ShopifyEmbeddedPricingProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [shopifyApp, setShopifyApp] = useState<any>(null);

  // Initialize App Bridge from global shopify object (v4 auto-init)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).shopify) {
      setShopifyApp((window as any).shopify);
      console.log("[ShopifyEmbeddedPricing] App Bridge detected");
    }
  }, []);

  const t = {
    title: language === "fr" ? "Choisissez votre plan" : "Choose your plan",
    subtitle: language === "fr" 
      ? "Vous pouvez modifier ou annuler votre plan à tout moment depuis Shopify" 
      : "You can change or cancel your plan anytime from Shopify",
    monthly: language === "fr" ? "Mensuel" : "Monthly",
    yearly: language === "fr" ? "Annuel" : "Yearly",
    save: "-20%",
    select: language === "fr" ? "Sélectionner" : "Select",
    startTrial: language === "fr" ? "Commencer l'essai" : "Start trial",
    processing: language === "fr" ? "Traitement..." : "Processing...",
    recommended: language === "fr" ? "Recommandé" : "Recommended",
    perMonth: "/month",
    freeTrial: language === "fr" ? "Essai gratuit de" : "Free trial",
    days: language === "fr" ? "jours" : "days",
  };

  const handleSelectPlan = async (planId: string) => {
    if (!shopDomain) {
      toast.error("Shop domain missing");
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      const { data, error } = await supabase.functions.invoke("shopify-create-subscription", {
        body: { planId, billingCycle, shopDomain },
      });

      if (error) throw error;

      if (!data?.confirmationUrl) {
        throw new Error("No confirmation URL received");
      }

      console.log("[ShopifyEmbeddedPricing] Redirecting to:", data.confirmationUrl);

      // Use App Bridge Redirect for embedded apps (required by Shopify)
      if (shopifyApp) {
        // App Bridge v4: use open() for external URLs
        window.open(data.confirmationUrl, "_top");
      } else {
        // Fallback: redirect parent frame
        if (window.top) {
          window.top.location.href = data.confirmationUrl;
        } else {
          window.location.href = data.confirmationUrl;
        }
      }
    } catch (err) {
      console.error("[ShopifyEmbeddedPricing] Error:", err);
      toast.error(err instanceof Error ? err.message : "Error creating subscription");
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div 
      className="min-h-screen p-6 md:p-8"
      style={{ 
        backgroundColor: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
      }}
    >
      {/* Logo */}
      <div className="text-center mb-6">
        <span 
          className="text-lg font-semibold tracking-tight"
          style={{ color: '#111111' }}
        >
          NewAI
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-2xl font-semibold mb-2"
          style={{ color: '#111111' }}
        >
          {t.title}
        </h1>
        <p 
          className="text-sm"
          style={{ color: '#6B7280' }}
        >
          {t.subtitle}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setBillingCycle("monthly")}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          style={{
            backgroundColor: billingCycle === "monthly" ? '#111111' : 'transparent',
            color: billingCycle === "monthly" ? '#FFFFFF' : '#6B7280',
            border: billingCycle === "monthly" ? 'none' : '1px solid #E5E7EB'
          }}
        >
          {t.monthly}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          style={{
            backgroundColor: billingCycle === "yearly" ? '#111111' : 'transparent',
            color: billingCycle === "yearly" ? '#FFFFFF' : '#6B7280',
            border: billingCycle === "yearly" ? 'none' : '1px solid #E5E7EB'
          }}
        >
          {t.yearly}
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: billingCycle === "yearly" ? '#22C55E' : '#DCFCE7',
              color: billingCycle === "yearly" ? '#FFFFFF' : '#166534'
            }}
          >
            {t.save}
          </span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const features = plan.features[language];
          const isSelected = selectedPlan === plan.id;
          const isLoading = loading && isSelected;

          return (
            <div
              key={plan.id}
              className="rounded-lg p-5 transition-shadow"
              style={{
                backgroundColor: '#FFFFFF',
                border: plan.popular ? '2px solid #111111' : '1px solid #E5E7EB',
                boxShadow: plan.popular ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {/* Recommended Badge */}
              {plan.popular && (
                <div 
                  className="text-xs font-medium px-2 py-1 rounded mb-3 inline-block"
                  style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
                >
                  {t.recommended}
                </div>
              )}

              {/* Plan Name */}
              <h3 
                className="text-lg font-semibold mb-1"
                style={{ color: '#111111' }}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <span 
                  className="text-3xl font-bold"
                  style={{ color: '#111111' }}
                >
                  {price.toFixed(2)}€
                </span>
                <span 
                  className="text-sm ml-1"
                  style={{ color: '#6B7280' }}
                >
                  {t.perMonth}
                </span>
              </div>

              {/* Trial Badge */}
              {plan.trialDays && (
                <div 
                  className="text-xs px-2 py-1 rounded mb-4 inline-block"
                  style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                >
                  {t.freeTrial} {plan.trialDays} {t.days}
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2 mb-5">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check 
                      className="h-4 w-4 flex-shrink-0 mt-0.5"
                      style={{ color: '#111111' }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: '#374151' }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: plan.popular ? '#111111' : 'transparent',
                  color: plan.popular ? '#FFFFFF' : '#111111',
                  border: plan.popular ? 'none' : '1px solid #111111'
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.processing}
                  </span>
                ) : (
                  plan.trialDays ? t.startTrial : t.select
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <p 
        className="text-center text-xs mt-8"
        style={{ color: '#9CA3AF' }}
      >
        {language === "fr" 
          ? "Paiement sécurisé par Shopify. Aucune carte requise pour l'essai." 
          : "Secure payment by Shopify. No card required for trial."}
      </p>
    </div>
  );
}