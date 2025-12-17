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
         * ✅ SOURCE DE VÉRITÉ #1: profiles.billing_provider
         * Si billing_provider est explicitement défini, l'utiliser
         */
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("billing_provider")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("[useShopifyBilling] Profile error:", profileError);
        }

        // Si billing_provider est explicitement 'stripe', utiliser Stripe (même si shopify_connections existe)
        if (profile?.billing_provider === 'stripe') {
          console.log("[useShopifyBilling] Profile has billing_provider=stripe, using Stripe billing");
          setState({ isShopifyUser: false, shopDomain: null, billingProvider: "stripe", loading: false });
          return;
        }

        /**
         * ✅ SOURCE DE VÉRITÉ #2: shopify_connections (pour OAuth users)
         * Seulement si billing_provider n'est pas 'stripe'
         */
        const { data: connection, error: connError } = await supabase
          .from("shopify_connections")
          .select("store_url, connection_type")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (connError) throw connError;

        // Si billing_provider est 'shopify' OU si c'est une connexion OAuth, utiliser Shopify Billing
        if (profile?.billing_provider === 'shopify' || (connection && connection.connection_type === 'oauth')) {
          setState({
            isShopifyUser: true,
            shopDomain: connection?.store_url || null,
            billingProvider: "shopify",
            loading: false,
          });
          return;
        }

        // Si connexion API_keys uniquement (pour sync), utiliser Stripe
        if (connection && connection.connection_type !== 'oauth') {
          console.log("[useShopifyBilling] API keys connection only, using Stripe billing");
          setState({ isShopifyUser: false, shopDomain: connection.store_url, billingProvider: "stripe", loading: false });
          return;
        }

        // Par défaut: Stripe
        setState({ isShopifyUser: false, shopDomain: null, billingProvider: "stripe", loading: false });
      } catch (e) {
        console.error("[useShopifyBilling]", e);
        setState({ isShopifyUser: false, shopDomain: null, billingProvider: null, loading: false });
      }
    };

    loadShopContext();
  }, [user]);

  /**
   * ✅ SAFE: checks existing subscription before creating one
   * @param forceUpgrade - Set to true when trialing user wants to activate full plan (same plan)
   */
  const createShopifySubscription = useCallback(
    async (planId: string, billingCycle: "monthly" | "yearly", forceUpgrade: boolean = false) => {
      if (!state.shopDomain) {
        toast.error("No Shopify store connected");
        return null;
      }

      try {
        // Skip check if forceUpgrade is true (trialing user activating full plan)
        if (!forceUpgrade) {
          // 1️⃣ CHECK EXISTING SUBSCRIPTION
          const { data: existing } = await supabase.functions.invoke(
            "shopify-check-subscription",
            { body: { shopDomain: state.shopDomain } }
          );

          if (existing?.status === "ACTIVE") {
            toast.success("Subscription already active");
            return existing;
          }
        }

        // 2️⃣ CREATE SUBSCRIPTION (with forceUpgrade to replace trial)
        const { data, error } = await supabase.functions.invoke(
          "shopify-create-subscription",
          {
            body: {
              shopDomain: state.shopDomain,
              planId,
              billingCycle,
              forceUpgrade,
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
