import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";

/**
 * Page Plans EMBEDDED dans Shopify Admin
 * Utilise App Bridge v4 (auto-initialisé via script tag Shopify)
 * Cette page est affichée DANS l'iframe Shopify Admin après installation
 */
export default function PlansEmbedded() {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const shop = searchParams.get("shop");
  const host = searchParams.get("host");
  const pendingToken = searchParams.get("pending_token");

  // Detect language
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";

  // Vérifier qu'on est bien dans un contexte embedded (host requis)
  const isEmbedded = !!host;

  useEffect(() => {
    // Log embedded context
    console.log("[PlansEmbedded] Context:", { shop, host, pendingToken, isEmbedded });

    // App Bridge v4 s'auto-initialise via le script tag ajouté par Shopify
    // On vérifie simplement que window.shopify existe
    if (isEmbedded && typeof window !== "undefined") {
      const checkAppBridge = () => {
        if ((window as any).shopify) {
          console.log("[PlansEmbedded] App Bridge v4 detected");
        }
      };
      // Attendre un peu pour l'initialisation
      setTimeout(checkAppBridge, 500);
    }
  }, [shop, host, pendingToken, isEmbedded]);

  // Process pending token for background auth
  useEffect(() => {
    const processToken = async () => {
      if (!pendingToken || !shop) return;

      setIsAuthenticating(true);
      try {
        console.log("[PlansEmbedded] Background auth with:", { shop });

        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: {
            shop: shop,
            pending_token: pendingToken,
          },
        });

        if (error) throw error;

        if (data?.access_token && data?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          console.log("[PlansEmbedded] Session set successfully");
        }
      } catch (err) {
        console.error("[PlansEmbedded] Auth error:", err);
        setAuthError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsAuthenticating(false);
      }
    };

    processToken();
  }, [pendingToken, shop]);

  // Si pas de host, afficher un message d'erreur (page doit être embedded)
  if (!isEmbedded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center p-8 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {browserLang === "fr" ? "Accès non autorisé" : "Unauthorized Access"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {browserLang === "fr"
              ? "Cette page doit être ouverte depuis l'admin Shopify."
              : "This page must be opened from Shopify Admin."}
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center p-8 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            {browserLang === "fr" ? "Erreur" : "Error"}
          </h2>
          <p className="text-muted-foreground mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {browserLang === "fr" ? "Réessayer" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <ShopifyPricingPlans
        shopDomain={shop || ""}
        language={browserLang as "fr" | "en"}
        isAuthenticating={isAuthenticating}
        isEmbedded={true}
        host={host || undefined}
      />
    </div>
  );
}
