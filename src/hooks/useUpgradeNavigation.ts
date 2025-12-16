import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopifyBilling } from '@/hooks/useShopifyBilling';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface UseUpgradeNavigationOptions {
  limitType?: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'campaigns';
  onUpgradeComplete?: () => void;
}

interface UseUpgradeNavigationReturn {
  navigateToUpgrade: () => void;
  openShopifyUpgrade: (planId?: string) => Promise<void>;
  isShopifyUser: boolean;
  loading: boolean;
}

/**
 * Hook to handle upgrade navigation - redirects to Shopify Billing for Shopify users
 * and to /subscription for Stripe users
 */
export function useUpgradeNavigation(options: UseUpgradeNavigationOptions = {}): UseUpgradeNavigationReturn {
  const navigate = useNavigate();
  const { isShopifyUser, billingProvider, shopDomain, loading: shopifyLoading } = useShopifyBilling();
  const { language } = useTranslation();
  const [loading, setLoading] = useState(false);

  const openShopifyUpgrade = useCallback(async (planId: string = 'pro-500') => {
    if (!shopDomain) {
      toast.error(language === 'fr' ? "Domaine Shopify manquant" : "Shop domain missing");
      return;
    }

    setLoading(true);
    try {
      console.log("[useUpgradeNavigation] Creating Shopify upgrade subscription:", { planId, shopDomain });

      const { data, error } = await supabase.functions.invoke("shopify-upgrade-subscription", {
        body: {
          newPlanId: planId,
          billingCycle: 'monthly',
        },
      });

      if (error) throw error;

      console.log("[useUpgradeNavigation] Subscription response:", data);

      if (data?.confirmationUrl) {
        if (options.onUpgradeComplete) {
          options.onUpgradeComplete();
        }
        
        // Redirect to Shopify Billing in same page
        window.location.href = data.confirmationUrl;
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("[useUpgradeNavigation] Error:", err);
      toast.error(
        language === 'fr' ? "Erreur" : "Error",
        {
          description: err instanceof Error ? err.message : (language === 'fr' ? "Impossible de créer l'abonnement" : "Could not create subscription"),
        }
      );
    } finally {
      setLoading(false);
    }
  }, [shopDomain, language, options.onUpgradeComplete]);

  const navigateToUpgrade = useCallback(() => {
    // 🛍️ SHOPIFY GUARD: Shopify users ALWAYS go to Shopify Billing, NEVER Stripe
    if (billingProvider === 'shopify' || isShopifyUser) {
      // Redirect to /subscription which now shows ShopifyPricingPlans for Shopify users
      navigate('/subscription');
    } else {
      // For Stripe users, navigate to subscription page
      navigate('/subscription');
    }
  }, [billingProvider, isShopifyUser, navigate]);

  return {
    navigateToUpgrade,
    openShopifyUpgrade,
    isShopifyUser: billingProvider === 'shopify' && isShopifyUser,
    loading: loading || shopifyLoading,
  };
}
