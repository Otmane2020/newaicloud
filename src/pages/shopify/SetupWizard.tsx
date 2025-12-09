import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopifyBilling } from "@/hooks/useShopifyBilling";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get shopDomain from hook (database) as fallback if not in URL
  const { shopDomain: hookShopDomain, loading: shopifyLoading } = useShopifyBilling();

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shopFromUrl = searchParams.get("shop");
  // Use shop from URL first, then fallback to hook (from database)
  const shop = shopFromUrl || hookShopDomain;

  const t = {
    settingUp: language === "fr" ? "Configuration de votre compte..." : "Setting up your account...",
    errorTitle: language === "fr" ? "Erreur" : "Error",
    errorMessage: language === "fr" 
      ? "Une erreur est survenue lors de la configuration" 
      : "An error occurred during setup",
    retry: language === "fr" ? "Réessayer" : "Retry",
  };

  // Process pending token on mount
  useEffect(() => {
    const processToken = async () => {
      // If no pending token, wait for shopifyLoading to get shop from database
      if (!pendingToken) {
        if (shopifyLoading) return; // Wait for hook to load
        setIsProcessing(false);
        return;
      }
      
      // Need shop for authentication (either from URL or hook)
      if (!shop) {
        if (shopifyLoading) return; // Wait for hook to load
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
  }, [pendingToken, shop, shopifyLoading]);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center p-8 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-2">{t.errorTitle}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
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

  // Main pricing UI using the new component
  return (
    <div className="min-h-screen bg-background py-12">
      <ShopifyPricingPlans 
        shopDomain={shop || ""} 
        language={language as "fr" | "en"}
      />
    </div>
  );
}
