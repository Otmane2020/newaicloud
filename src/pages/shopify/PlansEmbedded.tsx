import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyEmbeddedPricing from "@/components/shopify/ShopifyEmbeddedPricing";

/**
 * Page Plans EMBEDDED dans Shopify Admin
 * Design noir & blanc style Shopify natif
 * Cette page est affichée DANS l'iframe Shopify Admin après installation
 */
export default function PlansEmbedded() {
  const [searchParams] = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);

  const shop = searchParams.get("shop");
  const host = searchParams.get("host");
  const pendingToken = searchParams.get("pending_token");

  // Detect language
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";

  // Vérifier qu'on est bien dans un contexte embedded (host requis)
  const isEmbedded = !!host;

  // Process pending token for background auth
  useEffect(() => {
    const processToken = async () => {
      if (!pendingToken || !shop) return;

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
      }
    };

    processToken();
  }, [pendingToken, shop]);

  // Si pas de host, afficher un message d'erreur (page doit être embedded)
  if (!isEmbedded) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div 
          className="max-w-md text-center p-8 rounded-lg"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <h2 
            className="text-xl font-semibold mb-2"
            style={{ color: '#DC2626' }}
          >
            {browserLang === "fr" ? "Accès non autorisé" : "Unauthorized Access"}
          </h2>
          <p style={{ color: '#6B7280' }}>
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
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div 
          className="max-w-md text-center p-8 rounded-lg"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <h2 
            className="text-xl font-semibold mb-2"
            style={{ color: '#DC2626' }}
          >
            {browserLang === "fr" ? "Erreur" : "Error"}
          </h2>
          <p className="mb-4" style={{ color: '#6B7280' }}>{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
          >
            {browserLang === "fr" ? "Réessayer" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ShopifyEmbeddedPricing
      shopDomain={shop || ""}
      language={browserLang as "fr" | "en"}
    />
  );
}
