import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface SubscriptionGuardState {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus: "active" | "trialing" | "expired" | "none";
  currentPlanId: string | null;
  billingProvider: "shopify" | "stripe" | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
  usage: {
    optimizations: { used: number; max: number; remaining: number };
    articles: { used: number; max: number; remaining: number };
    products: { used: number; max: number; remaining: number };
  };
  limits: {
    canOptimize: boolean;
    canCreateArticle: boolean;
    canAddProduct: boolean;
  };
  needsUpgrade: boolean;
  upgradeReason: string | null;
}

const initialState: SubscriptionGuardState = {
  isLoading: true,
  isAuthenticated: false,
  hasActiveSubscription: false,
  subscriptionStatus: "none",
  currentPlanId: null,
  billingProvider: null,
  trialEndsAt: null,
  trialDaysRemaining: null,
  usage: {
    optimizations: { used: 0, max: 0, remaining: 0 },
    articles: { used: 0, max: 0, remaining: 0 },
    products: { used: 0, max: 0, remaining: 0 },
  },
  limits: {
    canOptimize: false,
    canCreateArticle: false,
    canAddProduct: false,
  },
  needsUpgrade: false,
  upgradeReason: null,
};

export function useShopifySubscriptionGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useTranslation();
  const [state, setState] = useState<SubscriptionGuardState>(initialState);

  // Fetch subscription and usage data
  const checkSubscriptionAndUsage = useCallback(async () => {
    if (!user) {
      setState({ ...initialState, isLoading: false });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status, current_plan_id, trial_ends_at, billing_provider")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("[SubscriptionGuard] Profile error:", profileError);
        throw profileError;
      }

      // Get usage limits from edge function
      const { data: { session } } = await supabase.auth.getSession();
      const { data: usageData, error: usageError } = await supabase.functions.invoke(
        "check-usage-limits",
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (usageError) {
        console.error("[SubscriptionGuard] Usage error:", usageError);
        throw usageError;
      }

      // Calculate trial days remaining
      let trialDaysRemaining: number | null = null;
      if (profile?.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        const diffMs = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Determine subscription status
      const subscriptionStatus = profile?.subscription_status as "active" | "trialing" | "expired" | "none" || "none";
      const hasActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "trialing";

      // Calculate usage
      const usage = {
        optimizations: {
          used: usageData?.usage?.optimizations_count || 0,
          max: usageData?.limits?.max_optimizations || 0,
          remaining: Math.max(0, (usageData?.limits?.max_optimizations || 0) - (usageData?.usage?.optimizations_count || 0)),
        },
        articles: {
          used: usageData?.usage?.articles_count || 0,
          max: usageData?.limits?.max_articles || 0,
          remaining: Math.max(0, (usageData?.limits?.max_articles || 0) - (usageData?.usage?.articles_count || 0)),
        },
        products: {
          used: usageData?.usage?.products_count || 0,
          max: usageData?.limits?.max_products || 0,
          remaining: Math.max(0, (usageData?.limits?.max_products || 0) - (usageData?.usage?.products_count || 0)),
        },
      };

      // Calculate limits
      const limits = {
        canOptimize: usageData?.canUseOptimizations || false,
        canCreateArticle: usageData?.canUseArticles || false,
        canAddProduct: usageData?.canAddProducts || false,
      };

      // Determine if upgrade needed and why
      let needsUpgrade = false;
      let upgradeReason: string | null = null;

      if (!hasActiveSubscription) {
        needsUpgrade = true;
        upgradeReason = language === "fr" 
          ? "Aucun abonnement actif. Choisissez un plan pour continuer."
          : "No active subscription. Choose a plan to continue.";
      } else if (subscriptionStatus === "trialing" && trialDaysRemaining !== null && trialDaysRemaining <= 2) {
        needsUpgrade = true;
        upgradeReason = language === "fr"
          ? `Votre essai expire dans ${trialDaysRemaining} jour(s). Passez à un plan payant.`
          : `Your trial expires in ${trialDaysRemaining} day(s). Upgrade to a paid plan.`;
      } else if (!limits.canOptimize && !limits.canCreateArticle) {
        needsUpgrade = true;
        upgradeReason = language === "fr"
          ? "Vous avez atteint vos limites mensuelles. Passez à un plan supérieur."
          : "You've reached your monthly limits. Upgrade to a higher plan.";
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        hasActiveSubscription,
        subscriptionStatus,
        currentPlanId: profile?.current_plan_id || null,
        billingProvider: (profile?.billing_provider as "shopify" | "stripe" | null) || null,
        trialEndsAt: profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null,
        trialDaysRemaining,
        usage,
        limits,
        needsUpgrade,
        upgradeReason,
      });

    } catch (error) {
      console.error("[SubscriptionGuard] Error:", error);
      setState({
        ...initialState,
        isLoading: false,
        isAuthenticated: !!user,
      });
    }
  }, [user, language]);

  useEffect(() => {
    checkSubscriptionAndUsage();
  }, [checkSubscriptionAndUsage]);

  // Guard function - returns true if action is allowed, false if blocked
  const guardAction = useCallback((
    action: "optimize" | "article" | "product",
    options?: { showToast?: boolean; redirectToUpgrade?: boolean }
  ): boolean => {
    const { showToast = true, redirectToUpgrade = false } = options || {};

    if (state.isLoading) return false;

    // Check subscription first
    if (!state.hasActiveSubscription) {
      if (showToast) {
        toast.error(
          language === "fr" ? "Abonnement requis" : "Subscription required",
          {
            description: language === "fr"
              ? "Vous devez avoir un abonnement actif pour effectuer cette action."
              : "You need an active subscription to perform this action.",
          }
        );
      }
      if (redirectToUpgrade) {
        navigateToUpgrade();
      }
      return false;
    }

    // Check specific action limits
    const actionLimitMap = {
      optimize: state.limits.canOptimize,
      article: state.limits.canCreateArticle,
      product: state.limits.canAddProduct,
    };

    const canDoAction = actionLimitMap[action];

    if (!canDoAction) {
      if (showToast) {
        const usageMap = {
          optimize: state.usage.optimizations,
          article: state.usage.articles,
          product: state.usage.products,
        };
        const usage = usageMap[action];
        
        toast.error(
          language === "fr" ? "Limite atteinte" : "Limit reached",
          {
            description: language === "fr"
              ? `Vous avez utilisé ${usage.used}/${usage.max}. Passez à un plan supérieur pour continuer.`
              : `You've used ${usage.used}/${usage.max}. Upgrade to continue.`,
          }
        );
      }
      if (redirectToUpgrade) {
        navigateToUpgrade();
      }
      return false;
    }

    return true;
  }, [state, language]);

  // Navigate to appropriate upgrade page based on billing provider
  const navigateToUpgrade = useCallback(() => {
    if (state.billingProvider === "shopify") {
      navigate("/app/setup-wizard");
    } else {
      navigate("/onboarding");
    }
  }, [state.billingProvider, navigate]);

  // Show upgrade dialog/toast
  const promptUpgrade = useCallback((reason?: string) => {
    const message = reason || state.upgradeReason;
    
    toast.info(
      language === "fr" ? "Mise à niveau recommandée" : "Upgrade recommended",
      {
        description: message,
        action: {
          label: language === "fr" ? "Voir les plans" : "View plans",
          onClick: () => navigateToUpgrade(),
        },
        duration: 10000,
      }
    );
  }, [state.upgradeReason, language, navigateToUpgrade]);

  return {
    ...state,
    guardAction,
    navigateToUpgrade,
    promptUpgrade,
    refresh: checkSubscriptionAndUsage,
  };
}
