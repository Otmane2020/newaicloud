import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shopFromUrl = searchParams.get("shop");

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
