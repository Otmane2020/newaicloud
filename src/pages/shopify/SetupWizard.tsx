import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ShopifyPricingPlans from "@/components/shopify/ShopifyPricingPlans";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";

// Demo store domain - bypass payment for this store
const DEMO_STORE_DOMAIN = "store-demo-20240334.myshopify.com";

// Shopify Polaris colors
const SHOPIFY_GREEN = "#008060";
const SHOPIFY_DARK = "#1a1a1a";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

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
      fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      position: "sticky",
      top: 0,
      zIndex: 50
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

    {shopName && (
      <div style={{
        color: "rgba(255,255,255,0.8)",
        fontSize: "14px"
      }}>
        {shopName.replace('.myshopify.com', '')}
      </div>
    )}

    <div style={{ width: "150px" }} />
  </header>
);

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function SetupWizard() {
  const [searchParams] = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true); // Start with loading
  const navigate = useNavigate();
  const checkedRef = useRef(false);
  const authAttemptedRef = useRef(false);
  
  // Get usage limits for trial/exhausted status
  const { limits: usageLimits } = useUsageLimits();

  // Detect language from browser
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  const language = browserLang;

  const pendingToken = searchParams.get("pending_token");
  const shopFromUrl = searchParams.get("shop");
  
  // Normalize shop domain (lowercase for case-insensitive matching)
  const normalizedShop = shopFromUrl 
    ? (shopFromUrl.includes('.myshopify.com') 
        ? shopFromUrl.toLowerCase() 
        : `${shopFromUrl}.myshopify.com`.toLowerCase())
    : null;

  const t = {
    errorTitle: language === "fr" ? "Erreur de connexion" : "Connection Error",
    retry: language === "fr" ? "Réessayer" : "Retry",
    connecting: language === "fr" ? "Connexion en cours..." : "Connecting...",
    connected: language === "fr" ? "Connexion réussie !" : "Connected successfully!",
    retrying: language === "fr" ? "Nouvelle tentative..." : "Retrying...",
  };

  // Check existing subscription and session (NON-BLOCKING)
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkSessionAndSubscription = async () => {
      // Demo store detection
      if (normalizedShop === DEMO_STORE_DOMAIN || shopFromUrl === 'store-demo-20240334') {
        console.log('🎭 [SetupWizard] Demo store detected');
      }

      try {
        // If no pending token, check if user has session
        if (!pendingToken && normalizedShop) {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            // No session and no pending token - redirect to /app to restart OAuth
            console.log('⚠️ [SetupWizard] No session and no pending_token, redirecting to /app');
            navigate(`/app?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
            return;
          }
        }

        if (!normalizedShop) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

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
            .select("subscription_status, current_plan_id")
            .eq("id", connection.user_id)
            .single();

          // Store current plan for display
          if (profile?.current_plan_id) {
            setCurrentPlanId(profile.current_plan_id);
          }

          if (profile?.subscription_status === 'active') {
            console.log('✅ [SetupWizard] Active subscription found, redirecting');
            navigate("/dashboard-light", { replace: true });
            return; // Don't set isCheckingSubscription to false - we're navigating away
          }
          // Note: trialing users stay on setup-wizard to see "Activate Full Plan" if quota exhausted
        }
      } catch (err) {
        console.log('[SetupWizard] Background check error (ignored):', err);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSessionAndSubscription();
  }, [shopFromUrl, normalizedShop, navigate, pendingToken]);

  // Auth function with retry logic
  const attemptAuth = async (attempt: number = 0): Promise<boolean> => {
    try {
      console.log(`[SetupWizard] Auth attempt ${attempt + 1}/${MAX_RETRIES}`);
      
      const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
        body: { 
          shop: shopFromUrl,
          pending_token: pendingToken 
        },
      });

      if (error) {
        console.error(`[SetupWizard] Auth attempt ${attempt + 1} failed:`, error);
        throw error;
      }

      if (data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        console.log("[SetupWizard] ✅ Session set successfully");
        toast.success(t.connected);
        return true;
      }
      
      throw new Error("No session tokens received");
    } catch (err) {
      // If we have more retries, try again
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_DELAYS[attempt] || 4000;
        console.log(`[SetupWizard] Retrying in ${delayMs}ms...`);
        setRetryCount(attempt + 1);
        toast.loading(t.retrying, { id: "auth-retry" });
        await delay(delayMs);
        return attemptAuth(attempt + 1);
      }
      
      // All retries exhausted
      throw err;
    }
  };

  // Process pending token with retry (NON-BLOCKING for UI)
  useEffect(() => {
    if (!pendingToken || !shopFromUrl || authAttemptedRef.current) return;
    authAttemptedRef.current = true;
    
    const processToken = async () => {
      setIsAuthenticating(true);
      setAuthError(null);
      toast.loading(t.connecting, { id: "auth-progress" });
      
      try {
        await attemptAuth(0);
        toast.dismiss("auth-progress");
        toast.dismiss("auth-retry");
      } catch (err) {
        console.error("[SetupWizard] All auth attempts failed:", err);
        toast.dismiss("auth-progress");
        toast.dismiss("auth-retry");
        // Only set error after ALL retries failed - don't block UI
        setAuthError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setIsAuthenticating(false);
        setRetryCount(0);
      }
    };

    processToken();
  }, [pendingToken, shopFromUrl]);

  // Manual retry handler
  const handleRetry = async () => {
    authAttemptedRef.current = false;
    setAuthError(null);
    setIsAuthenticating(true);
    toast.loading(t.connecting, { id: "auth-progress" });
    
    try {
      await attemptAuth(0);
      toast.dismiss("auth-progress");
    } catch (err) {
      toast.dismiss("auth-progress");
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Show loading screen while checking subscription status
  if (isCheckingSubscription) {
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
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: SHOPIFY_GREEN }} />
            <p style={{ color: "#6b7280", fontSize: "16px" }}>
              {language === "fr" ? "Vérification de votre abonnement..." : "Checking your subscription..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ALWAYS show pricing - auth errors are non-blocking
  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        backgroundColor: "#f6f6f7", 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" 
      }}
    >
      <ShopifyHeader shopName={normalizedShop || undefined} />
      
      {/* Auth status banner - non-blocking */}
      {authError && (
        <div 
          style={{
            backgroundColor: "#fff4f4",
            borderBottom: "1px solid #fecaca",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}
        >
          <span style={{ color: "#dc2626", fontSize: "14px" }}>
            {language === "fr" ? "Erreur de connexion" : "Connection error"}: {authError}
          </span>
          <button
            onClick={handleRetry}
            disabled={isAuthenticating}
            style={{
              backgroundColor: SHOPIFY_GREEN,
              color: "white",
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: isAuthenticating ? "not-allowed" : "pointer",
              opacity: isAuthenticating ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {isAuthenticating && <Loader2 size={14} className="animate-spin" />}
            {t.retry}
          </button>
        </div>
      )}

      {/* Authenticating indicator - subtle */}
      {isAuthenticating && !authError && (
        <div 
          style={{
            backgroundColor: "#f0fdf4",
            borderBottom: "1px solid #bbf7d0",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: SHOPIFY_GREEN }} />
          <span style={{ color: "#166534", fontSize: "13px" }}>
            {t.connecting} {retryCount > 0 && `(${language === "fr" ? "tentative" : "attempt"} ${retryCount + 1}/${MAX_RETRIES})`}
          </span>
        </div>
      )}
      
      <div className="flex-1 py-12">
        <ShopifyPricingPlans
          shopDomain={shopFromUrl || ""} 
          language={language as "fr" | "en"}
          isAuthenticating={isAuthenticating}
          currentPlanId={currentPlanId}
          isTrialing={usageLimits?.isTrialing || false}
          usageExhausted={usageLimits?.limitReached?.optimizations || false}
        />
      </div>
    </div>
  );
}
