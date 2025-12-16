import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Demo store domain - bypass payment for this store
const DEMO_STORE_DOMAIN = "store-demo-20240334.myshopify.com";

// Shopify Polaris colors
const SHOPIFY_GREEN = "#008060";
const SHOPIFY_DARK = "#1a1a1a";

// Shopify-style header component
const ShopifyHeader = ({ shopName }: { shopName?: string }) => (
  <header 
    style={{ 
      backgroundColor: SHOPIFY_DARK, 
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {/* NewAI Logo */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px",
        color: "white",
        fontWeight: 600,
        fontSize: "18px"
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: `linear-gradient(135deg, ${SHOPIFY_GREEN}, #00a07a)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Sparkles size={18} color="white" />
        </div>
        <span>NewAI</span>
      </div>
      
      {/* Version badge like Shopify */}
      <span style={{
        backgroundColor: "rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.9)",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500
      }}>
        SEO Pro
      </span>
    </div>

    {/* Center - Store name */}
    {shopName && (
      <div style={{
        color: "rgba(255,255,255,0.8)",
        fontSize: "14px"
      }}>
        {shopName.replace('.myshopify.com', '')}
      </div>
    )}

    {/* Right side - placeholder for future elements */}
    <div style={{ width: "150px" }} />
  </header>
);

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const navigate = useNavigate();
  const checkedRef = useRef(false);

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shopFromUrl = searchParams.get("shop");
  
  // Normalize shop domain to always have .myshopify.com
  const normalizedShop = shopFromUrl 
    ? (shopFromUrl.includes('.myshopify.com') ? shopFromUrl : `${shopFromUrl}.myshopify.com`)
    : null;

  // Check if user already has an active subscription → redirect to dashboard (NON-BLOCKING)
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkExistingSubscription = async () => {
      // Show pricing IMMEDIATELY - no blocking
      setCheckingSubscription(false);

      // Demo store detection
      if (normalizedShop === DEMO_STORE_DOMAIN || shopFromUrl === 'store-demo-20240334') {
        console.log('🎭 [SetupWizard] Demo store detected');
      }

      try {
        if (!normalizedShop) return;

        // Timeout after 3 seconds - fail fast
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        // Single optimized query with join-like behavior
        const { data: connection } = await supabase
          .from("shopify_connections")
          .select("user_id, store_url")
          .eq("store_url", normalizedShop)
          .eq("is_active", true)
          .maybeSingle();

        clearTimeout(timeout);

        if (connection?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", connection.user_id)
            .single();

          if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
            console.log('✅ [SetupWizard] Active subscription found, redirecting');
            navigate("/dashboard", { replace: true });
          }
        }
      } catch (err) {
        // Ignore errors - non-blocking check
        console.log('[SetupWizard] Background check error (ignored):', err);
      }
    };

    checkExistingSubscription();
  }, [shopFromUrl, normalizedShop, navigate]);

  const t = {
    errorTitle: language === "fr" ? "Erreur" : "Error",
    retry: language === "fr" ? "Réessayer" : "Retry",
    logout: language === "fr" ? "Déconnexion" : "Logout",
    logoutSuccess: language === "fr" ? "Déconnexion réussie" : "Logged out successfully",
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t.logoutSuccess);
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
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
      <div 
        className="min-h-screen flex flex-col" 
        style={{ 
          backgroundColor: "#f6f6f7", 
          fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" 
        }}
      >
        <ShopifyHeader shopName={normalizedShop || undefined} />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center p-8 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-red-600 mb-2">{t.errorTitle}</h2>
            <p className="text-gray-600 mb-4">{authError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md text-white hover:opacity-90"
              style={{ backgroundColor: SHOPIFY_GREEN }}
            >
              {t.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while checking subscription
  if (checkingSubscription) {
    return (
      <div 
        className="min-h-screen flex flex-col" 
        style={{ 
          backgroundColor: "#f6f6f7", 
          fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" 
        }}
      >
        <ShopifyHeader shopName={normalizedShop || undefined} />
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2" 
            style={{ borderColor: SHOPIFY_GREEN }}
          />
        </div>
      </div>
    );
  }

  // INSTANT display of pricing plans - Shopify Polaris style
  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        backgroundColor: "#f6f6f7", 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" 
      }}
    >
      <ShopifyHeader shopName={normalizedShop || undefined} />
      
      <div className="flex-1 py-12">
        <ShopifyPricingPlans
          shopDomain={shopFromUrl || ""} 
          language={language as "fr" | "en"}
          isAuthenticating={isAuthenticating}
        />
      </div>
    </div>
  );
}
