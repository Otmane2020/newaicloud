import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ShopifyBillingState {
  isShopifyUser: boolean;
  shopDomain: string | null;
  billingProvider: "shopify" | "stripe" | null;
  loading: boolean;
}

export function useShopifyBilling() {
  const { user } = useAuth();
  const [state, setState] = useState<ShopifyBillingState>({
    isShopifyUser: false,
    shopDomain: null,
    billingProvider: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ isShopifyUser: false, shopDomain: null, billingProvider: null, loading: false });
      return;
    }

    const checkShopifyConnection = async () => {
      try {
        // 🔧 CRITICAL FIX: Detect Shopify user by email pattern FIRST (fastest check)
        // shopify-auto-auth creates users with email format: {shop_handle}@shopify.newai.sale
        const isShopifyEmailPattern = user.email?.endsWith('@shopify.newai.sale') || false;
        
        if (isShopifyEmailPattern) {
          console.log("[useShopifyBilling] Detected Shopify user via email pattern:", user.email);
          // Extract shop domain from email: store-name@shopify.newai.sale → store-name.myshopify.com
          const shopHandle = user.email?.split('@')[0] || '';
          setState({
            isShopifyUser: true,
            shopDomain: `${shopHandle}.myshopify.com`,
            billingProvider: 'shopify',
            loading: false,
          });
          return;
        }

        // Fallback: Check if user has a Shopify connection in database
        const { data: connections, error: connError } = await supabase
          .from("shopify_connections")
          .select("store_url, connection_type")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1);

        if (connError) {
          console.error("[useShopifyBilling] Error checking connections:", connError);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        // Check user's billing provider from profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("billing_provider")
          .eq("id", user.id)
          .single();

        const isOAuthUser = connections && connections.length > 0 && 
          connections[0].connection_type === "oauth";
        
        const billingProvider = profile?.billing_provider as "shopify" | "stripe" | null || 
          (isOAuthUser ? "shopify" : "stripe");

        setState({
          isShopifyUser: isOAuthUser,
          shopDomain: connections?.[0]?.store_url || null,
          billingProvider,
          loading: false,
        });
      } catch (error) {
        console.error("[useShopifyBilling] Error:", error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    checkShopifyConnection();
  }, [user]);

  const createShopifySubscription = useCallback(async (
    planId: string, 
    billingCycle: "monthly" | "yearly"
  ) => {
    if (!state.shopDomain) {
      toast.error("No Shopify store connected");
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke("shopify-create-subscription", {
        body: {
          planId,
          billingCycle,
          shopDomain: state.shopDomain,
        },
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        // For embedded apps: open payment in new tab to avoid X-Frame-Options blocking
        // Shopify admin pages cannot be displayed in iframes
        window.open(data.confirmationUrl, '_blank');
        toast.success(
          "Fenêtre de paiement Shopify ouverte",
          { description: "Complétez le paiement dans le nouvel onglet, puis revenez ici." }
        );
        return data;
      }

      throw new Error("No confirmation URL received");
    } catch (error: any) {
      console.error("[useShopifyBilling] Error creating subscription:", error);
      toast.error("Failed to create subscription", {
        description: error.message,
      });
      return null;
    }
  }, [state.shopDomain]);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("shopify-check-subscription");
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("[useShopifyBilling] Error checking subscription:", error);
      return null;
    }
  }, []);

  return {
    ...state,
    createShopifySubscription,
    checkSubscription,
  };
}
