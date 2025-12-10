import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";

// Demo store domain - bypass payment for this store
const DEMO_STORE_DOMAIN = "store-demo-20240334.myshopify.com";

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const navigate = useNavigate();
  const checkedRef = useRef(false);

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shopFromUrl = searchParams.get("shop");

  // Check if user already has an active subscription → redirect to dashboard
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkExistingSubscription = async () => {
      try {
        // Demo store bypass direct
        if (shopFromUrl === DEMO_STORE_DOMAIN) {
          console.log('🎭 [SetupWizard] Demo store detected, bypassing to dashboard');
          navigate("/dashboard", { replace: true });
          return;
        }

        if (!shopFromUrl) {
          setCheckingSubscription(false);
          return;
        }

        // Check if shop has an active connection with subscription
        const { data: connection } = await supabase
          .from("shopify_connections")
          .select("user_id")
          .eq("store_url", shopFromUrl)
          .eq("is_active", true)
          .single();

        if (connection?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", connection.user_id)
            .single();

          if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
            console.log('✅ [SetupWizard] User already has active subscription, redirecting to dashboard');
            navigate("/dashboard", { replace: true });
            return;
          }
        }
      } catch (err) {
        console.log('[SetupWizard] Subscription check error (non-blocking):', err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkExistingSubscription();
  }, [shopFromUrl, navigate]);

  const t = {
    errorTitle: language === "fr" ? "Erreur" : "Error",
    retry: language === "fr" ? "Réessayer" : "Retry",
  };

  // Process pending token ONLY if present (background auth, non-blocking)
  useEffect(() => {
    const processToken = async () => {
      if (!pendingToken || !shopFromUrl) return;
      
      setIsAuthenticating(true);
      try {
        console.log("[SetupWizard] Background auth with:", { shop: shopFromUrl });
        
        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: { 
            shop: shopFromUrl,
            pending_token: pendingToken 
          },
        });

        if (error) throw error;

        if (data?.access_token && data?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          console.log("[SetupWizard] Session set successfully");
        }
      } catch (err) {
        console.error("[SetupWizard] Auth error:", err);
        setAuthError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsAuthenticating(false);
      }
    };

    processToken();
  }, [pendingToken, shopFromUrl]);

  // Error state (only show if auth failed)
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center p-8 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-2">{t.errorTitle}</h2>
          <p className="text-muted-foreground mb-4">{authError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  // Loading state while checking subscription
  if (checkingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // INSTANT display of pricing plans - no loading screen!
  return (
    <div className="min-h-screen bg-background py-12">
      <ShopifyPricingPlans
        shopDomain={shopFromUrl || ""} 
        language={language as "fr" | "en"}
        isAuthenticating={isAuthenticating}
      />
    </div>
  );
}
