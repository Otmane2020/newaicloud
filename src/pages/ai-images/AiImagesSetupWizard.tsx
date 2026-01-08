import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Hybrid pricing model
const HYBRID_PLAN = {
  basePrice: 2.99,
  freeCredits: 5,
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Shopify-style fonts
const SHOPIFY_FONT = "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

export default function AiImagesSetupWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const authAttemptedRef = useRef(false);

  const isFr = navigator.language?.startsWith("fr");
  
  const shopFromUrl = searchParams.get("shop");
  const pendingToken = searchParams.get("pending_token");
  
  const normalizedShop = shopFromUrl 
    ? (shopFromUrl.includes('.myshopify.com') 
        ? shopFromUrl.toLowerCase() 
        : `${shopFromUrl}.myshopify.com`.toLowerCase())
    : null;

  const t = {
    connecting: isFr ? "Connexion en cours..." : "Connecting...",
    connected: isFr ? "Connexion réussie !" : "Connected successfully!",
    retrying: isFr ? "Nouvelle tentative..." : "Retrying...",
    retry: isFr ? "Réessayer" : "Retry",
    yourNextBill: isFr ? "Votre prochaine facture" : "Your next bill",
    subtotal: isFr ? "Sous-total*" : "Subtotal*",
    plusTaxes: isFr ? "plus taxes applicables" : "plus any applicable taxes",
    total: isFr ? "Total" : "Total",
    dueToday: isFr ? "Dû aujourd'hui" : "Due today",
    disclaimer: isFr 
      ? "*Ce sous-total ne comprend que vos frais d'abonnement. Vous serez également facturé en fonction de l'utilisation, qui est variable et apparaîtra sur vos factures."
      : "*This subtotal contains only your subscription fee. You will also be charged based on usage, which is variable and will appear on your invoices.",
    approve: isFr ? "Approuver" : "Approve",
    skipFree: isFr ? "Utiliser mes 5 crédits gratuits →" : "Use my 5 free credits →",
    checkingAccount: isFr ? "Vérification de votre compte..." : "Checking your account...",
  };

  // Auth function with retry logic
  const attemptAuth = async (attempt: number = 0): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-images-auto-auth", {
        body: { shop: normalizedShop, pending_token: pendingToken },
      });

      if (error) throw error;

      if (data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        toast.success(t.connected);
        return true;
      }
      
      throw new Error("No session tokens received");
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_DELAYS[attempt] || 4000;
        setRetryCount(attempt + 1);
        toast.loading(t.retrying, { id: "auth-retry" });
        await delay(delayMs);
        return attemptAuth(attempt + 1);
      }
      throw err;
    }
  };

  // Process pending_token
  useEffect(() => {
    if (!pendingToken || !normalizedShop || authAttemptedRef.current) return;
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
        toast.dismiss("auth-progress");
        toast.dismiss("auth-retry");
        
        const errorMsg = err instanceof Error ? err.message : "Authentication failed";
        if (errorMsg.includes("expired") || errorMsg.includes("Invalid") || errorMsg.includes("not found")) {
          setAuthError(isFr 
            ? "Le lien d'installation a expiré. Veuillez réinstaller l'application depuis Shopify."
            : "Installation link has expired. Please reinstall the app from Shopify."
          );
        } else {
          setAuthError(errorMsg);
        }
      } finally {
        setIsAuthenticating(false);
        setRetryCount(0);
        setIsCheckingSubscription(false);
      }
    };

    processToken();
  }, [pendingToken, normalizedShop]);

  // Check existing session if no pending_token
  useEffect(() => {
    if (pendingToken) return;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ Already authenticated");
      }
      setIsCheckingSubscription(false);
    };

    checkSession();
  }, [pendingToken]);

  // Check if user already has active subscription
  useEffect(() => {
    if (isCheckingSubscription || !normalizedShop) return;
    
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-images-check-subscription', {
          body: { shopDomain: normalizedShop }
        });

        if (!error && data?.status === 'ACTIVE') {
          navigate(`/app/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
        }
      } catch (err) {
        console.log("Subscription check failed (non-blocking):", err);
      }
    };

    checkSubscription();
  }, [isCheckingSubscription, normalizedShop, navigate]);

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

  // Subscribe handler
  const handleSubscribe = async () => {
    if (!normalizedShop) {
      toast.error(isFr ? "Boutique non trouvée" : "Shop not found");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-images-create-subscription', {
        body: { planId: "hybrid", shopDomain: normalizedShop },
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else if (data?.status === 'ACTIVE') {
        toast.success(isFr ? "Abonnement déjà actif !" : "Subscription already active!");
        navigate(`/app/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      toast.error(isFr ? "Erreur de connexion. Veuillez réessayer." : "Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToDashboard = () => {
    if (normalizedShop) {
      navigate(`/app/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
    }
  };

  // Get today's date formatted
  const today = new Date();
  const formattedDate = today.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  // Loading state
  if (isCheckingSubscription) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        fontFamily: SHOPIFY_FONT
      }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 
            size={40} 
            style={{ 
              animation: "spin 1s linear infinite",
              color: "#000",
              marginBottom: "16px"
            }} 
          />
          <p style={{ color: "#6b7280", fontSize: "14px" }}>{t.checkingAccount}</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f6f6f7",
      fontFamily: SHOPIFY_FONT,
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Shopify-style header banner */}
      <div style={{
        backgroundColor: "white",
        borderBottom: "1px solid #e1e3e5",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "8px",
          backgroundColor: "#5E35B1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <span style={{ 
          fontSize: "16px", 
          fontWeight: 600, 
          color: "#1a1a1a"
        }}>
          AI Product Image Shot
        </span>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>

      {/* Auth error - Expired token */}
      {authError && authError.includes(isFr ? "expiré" : "expired") && (
        <div style={{
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "32px",
          textAlign: "center"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 16px",
            borderRadius: "50%",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111", marginBottom: "8px" }}>
            {isFr ? "Lien d'installation expiré" : "Installation Link Expired"}
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>{authError}</p>
          <button
            onClick={() => {
              const shopName = normalizedShop?.replace('.myshopify.com', '');
              if (shopName) {
                window.open(`https://admin.shopify.com/store/${shopName}/apps`, '_top');
              }
            }}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#111",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            {isFr ? "Réinstaller l'application" : "Reinstall Application"}
          </button>
        </div>
      )}

      {/* Auth error banner (other errors) */}
      {authError && !authError.includes(isFr ? "expiré" : "expired") && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fef2f2",
          borderBottom: "1px solid #fecaca",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          zIndex: 100
        }}>
          <span style={{ color: "#dc2626", fontSize: "14px" }}>
            {isFr ? "Erreur de connexion" : "Connection error"}: {authError}
          </span>
          <button
            onClick={handleRetry}
            disabled={isAuthenticating}
            style={{
              backgroundColor: "#111",
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
            {isAuthenticating && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {t.retry}
          </button>
        </div>
      )}

      {/* Authenticating indicator */}
      {isAuthenticating && !authError && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#f0fdf4",
          borderBottom: "1px solid #bbf7d0",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          zIndex: 100
        }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#166534" }} />
          <span style={{ color: "#166534", fontSize: "13px" }}>
            {t.connecting} {retryCount > 0 && `(${isFr ? "tentative" : "attempt"} ${retryCount + 1}/${MAX_RETRIES})`}
          </span>
        </div>
      )}

      {/* Main billing card - Shopify style */}
      {!authError?.includes(isFr ? "expiré" : "expired") && (
        <div style={{
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden"
        }}>
          {/* Card content */}
          <div style={{ padding: "24px" }}>
            <h2 style={{ 
              fontSize: "16px", 
              fontWeight: 600, 
              color: "#111",
              marginBottom: "20px"
            }}>
              {t.yourNextBill}
            </h2>

            {/* Subtotal row */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              marginBottom: "4px"
            }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
                {t.subtotal}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
                ${HYBRID_PLAN.basePrice.toFixed(2)}
              </span>
            </div>
            <p style={{ 
              fontSize: "13px", 
              color: "#6b7280",
              marginBottom: "16px"
            }}>
              {t.plusTaxes}
            </p>

            {/* Total row */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              marginBottom: "4px"
            }}>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111", display: "block" }}>
                  {t.total}
                </span>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  {t.dueToday.replace("today", formattedDate).replace("aujourd'hui", formattedDate)}
                </span>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>
                ${HYBRID_PLAN.basePrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ 
            height: "1px", 
            backgroundColor: "#e5e7eb",
            margin: "0 24px"
          }} />

          {/* Disclaimer + Button */}
          <div style={{ padding: "20px 24px 24px" }}>
            <p style={{ 
              fontSize: "12px", 
              color: "#6b7280",
              lineHeight: 1.5,
              marginBottom: "20px"
            }}>
              {t.disclaimer}
            </p>

            {/* Approve button - Shopify dark style */}
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background-color 0.15s ease"
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = "#333")}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = "#1a1a1a")}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  {isFr ? "Redirection..." : "Redirecting..."}
                </>
              ) : (
                t.approve
              )}
            </button>
          </div>
        </div>
      )}

      {/* Skip option */}
      {!authError?.includes(isFr ? "expiré" : "expired") && (
        <button
          onClick={handleSkipToDashboard}
          style={{
            marginTop: "20px",
            background: "none",
            border: "none",
            fontSize: "13px",
            color: "#6b7280",
            cursor: "pointer",
            padding: "8px 16px"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
        >
          {t.skipFree}
        </button>
      )}
      </div>
    </div>
  );
}
