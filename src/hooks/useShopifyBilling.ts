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

    const loadShopContext = async () => {
      try {
        /**
         * ✅ SINGLE SOURCE OF TRUTH
         * shopify_connections keyed by store_url (shop domain)
         */
        const { data, error } = await supabase
          .from("shopify_connections")
          .select("store_url")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!data?.store_url) {
          setState({ isShopifyUser: false, shopDomain: null, billingProvider: "stripe", loading: false });
          return;
        }

        setState({
          isShopifyUser: true,
          shopDomain: data.store_url,
          billingProvider: "shopify",
          loading: false,
        });
      } catch (e) {
        console.error("[useShopifyBilling]", e);
        setState({ isShopifyUser: false, shopDomain: null, billingProvider: null, loading: false });
      }
    };

    loadShopContext();
  }, [user]);

  /**
   * ✅ SAFE: checks existing subscription before creating one
   */
  const createShopifySubscription = useCallback(
    async (planId: string, billingCycle: "monthly" | "yearly") => {
      if (!state.shopDomain) {
        toast.error("No Shopify store connected");
        return null;
      }

      try {
        // 1️⃣ CHECK EXISTING SUBSCRIPTION
        const { data: existing } = await supabase.functions.invoke(
          "shopify-check-subscription",
          { body: { shopDomain: state.shopDomain } }
        );

        if (existing?.status === "ACTIVE") {
          toast.success("Subscription already active");
          return existing;
        }

        // 2️⃣ CREATE ONLY IF NOT ACTIVE
        const { data, error } = await supabase.functions.invoke(
          "shopify-create-subscription",
          {
            body: {
              shopDomain: state.shopDomain,
              planId,
              billingCycle,
            },
          }
        );

        if (error) throw error;

        if (data?.confirmationUrl) {
          // For embedded apps: redirect the ENTIRE top-level window to Shopify payment
          if (window.top && window.top !== window) {
            window.top.location.href = data.confirmationUrl;
          } else {
            window.location.href = data.confirmationUrl;
          }
        }

        return data;
      } catch (e: any) {
        console.error("[ShopifyBilling]", e);
        toast.error("Unable to start Shopify billing", {
          description: e.message,
        });
        return null;
      }
    },
    [state.shopDomain]
  );

  const checkSubscription = useCallback(async () => {
    if (!state.shopDomain) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "shopify-check-subscription",
        { body: { shopDomain: state.shopDomain } }
      );
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("[useShopifyBilling] Error checking subscription:", error);
      return null;
    }
  }, [state.shopDomain]);

  return {
    ...state,
    createShopifySubscription,
    checkSubscription,
  };
}
