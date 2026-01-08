import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Sparkles, Loader2, Check, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiImagesIsEmbedded } from "@/components/ai-images/AiImagesAppBridgeProvider";
import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

// App colors
const PRIMARY_COLOR = "#0891b2"; // Cyan-600
const DARK_BG = "#0f172a";

// Hybrid pricing model - single plan
const HYBRID_PLAN = {
  id: "hybrid",
  name: "AI Product Image Shot",
  basePrice: 2.99,
  usagePrice: 0.15,
  cappedAmount: 2000, // $2000/month cap
  freeCredits: 5,
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Header component
const AppHeader = ({ shopName }: { shopName?: string }) => (
  <header 
    style={{ 
      backgroundColor: DARK_BG, 
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
          background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #06b6d4)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Camera size={18} color="white" />
        </div>
        <span>AI Product Image Shot</span>
      </div>
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

export default function AiImagesSetupWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEmbedded = useAiImagesIsEmbedded();
  const hostParam = searchParams.get("host");
  
  // Debug: Log all URL params for embedded app troubleshooting
  useEffect(() => {
    console.log("[AiImagesSetupWizard] 🔍 URL params debug:", {
      host: hostParam,
      shop: searchParams.get("shop"),
      embedded: searchParams.get("embedded"),
      pending_token: searchParams.get("pending_token") ? "present" : "missing",
      isEmbedded,
      fullUrl: window.location.href,
    });
  }, [hostParam, searchParams, isEmbedded]);
  
  // Initialize App Bridge v3 for billing redirects (required by Shopify security)
  const appBridge = useMemo(() => {
    if (!hostParam) {
      console.warn("[AiImagesSetupWizard] ⚠️ No host param - App Bridge cannot initialize. Billing redirect will use fallback.");
      return null;
    }
    
    try {
      const app = createApp({
        apiKey: "47fe9e78f7a16bb0ffe6f31929c7a44e", // AI Images Client ID
        host: hostParam,
        forceRedirect: true,
      });
      console.log("[AiImagesSetupWizard] ✅ App Bridge initialized successfully");
      return app;
    } catch (err) {
      console.error("[AiImagesSetupWizard] ❌ App Bridge init error:", err);
      return null;
    }
  }, [hostParam]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const authAttemptedRef = useRef(false);

  // Language detection
  const isFr = navigator.language?.startsWith("fr");
  
  const shopFromUrl = searchParams.get("shop");
  const pendingToken = searchParams.get("pending_token");
  
  // Normalize shop domain
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
    title: isFr ? "Commencez à générer des images" : "Start Generating Images",
    subtitle: isFr 
      ? "Créez des images produit professionnelles avec l'IA. Payez uniquement ce que vous utilisez."
      : "Create professional product images with AI. Pay only for what you use.",
    freeCredits: isFr ? "5 crédits gratuits inclus" : "5 free credits included",
    monthlyBase: isFr ? "Base mensuelle" : "Monthly base",
    perImage: isFr ? "par image générée" : "per generated image",
    monthlyCap: isFr ? "Plafond mensuel" : "Monthly cap",
    startNow: isFr ? "Commencer maintenant" : "Start Now",
    skipFree: isFr ? "Utiliser mes 5 crédits gratuits" : "Use my 5 free credits",
    features: isFr ? [
      "5 crédits gratuits pour commencer",
      "Paiement à l'usage : $0.15 / image",
      "Plafond mensuel de $2000",
      "Images HD professionnelles",
      "Tous types de produits",
      "Annulez quand vous voulez"
    ] : [
      "5 free credits to start",
      "Pay-as-you-go: $0.15 / image",
      "Monthly cap of $2,000",
      "Professional HD images",
      "All product types",
      "Cancel anytime"
    ]
  };

  // Auth function with retry logic (like NewAI)
  const attemptAuth = async (attempt: number = 0): Promise<boolean> => {
    try {
      console.log(`[AiImagesSetupWizard] Auth attempt ${attempt + 1}/${MAX_RETRIES}`);
      
      const { data, error } = await supabase.functions.invoke("ai-images-auto-auth", {
        body: { 
          shop: normalizedShop,
          pending_token: pendingToken 
        },
      });

      if (error) {
        console.error(`[AiImagesSetupWizard] Auth attempt ${attempt + 1} failed:`, error);
        throw error;
      }

      if (data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        console.log("[AiImagesSetupWizard] ✅ Session set successfully");
        toast.success(t.connected);
        return true;
      }
      
      throw new Error("No session tokens received");
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_DELAYS[attempt] || 4000;
        console.log(`[AiImagesSetupWizard] Retrying in ${delayMs}ms...`);
        setRetryCount(attempt + 1);
        toast.loading(t.retrying, { id: "auth-retry" });
        await delay(delayMs);
        return attemptAuth(attempt + 1);
      }
      throw err;
    }
  };

  // Process pending_token (like NewAI SetupWizard)
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
        console.error("[AiImagesSetupWizard] All auth attempts failed:", err);
        toast.dismiss("auth-progress");
        toast.dismiss("auth-retry");
        
        // Detect expired/invalid token errors
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

  // If no pending_token, check existing session
  useEffect(() => {
    if (pendingToken) return; // Let pending_token flow handle it

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ [AiImagesSetupWizard] Already authenticated");
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
          console.log("✅ Active subscription found, redirecting to dashboard");
          navigate(`/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
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

  const handleSubscribe = async () => {
    if (!normalizedShop) {
      toast.error(isFr ? "Boutique non trouvée" : "Shop not found");
      return;
    }

    setIsLoading(true);

    try {
      console.log(`[AiImagesSetupWizard] Creating hybrid subscription`);
      
      const { data, error } = await supabase.functions.invoke('ai-images-create-subscription', {
        body: {
          planId: "hybrid",
          shopDomain: normalizedShop,
        }
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        console.log("🔗 Redirecting to Shopify billing:", data.confirmationUrl);
        console.log("[AiImagesSetupWizard] Redirect context:", { isEmbedded, hasAppBridge: !!appBridge, hostParam });
        
        // Use App Bridge v3 Redirect for embedded apps (required by Shopify security)
        if (isEmbedded && appBridge) {
          console.log("[AiImagesSetupWizard] ✅ Using App Bridge Redirect.Action.REMOTE");
          const redirect = Redirect.create(appBridge);
          redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
        } else if (isEmbedded && !appBridge) {
          // Embedded but no App Bridge - try window.top fallback
          console.warn("[AiImagesSetupWizard] ⚠️ Embedded but no App Bridge - trying window.top redirect");
          try {
            // This may fail due to cross-origin restrictions
            window.top!.location.href = data.confirmationUrl;
          } catch (e) {
            console.error("[AiImagesSetupWizard] ❌ window.top redirect blocked, falling back to window.location");
            window.location.href = data.confirmationUrl;
          }
        } else {
          // Non-embedded - direct redirect
          console.log("[AiImagesSetupWizard] Using direct window.location redirect (non-embedded)");
          window.location.href = data.confirmationUrl;
        }
      } else if (data?.status === 'ACTIVE') {
        toast.success(isFr ? "Abonnement déjà actif !" : "Subscription already active!");
        navigate(`/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      // Simple user-friendly error without technical details
      toast.error(isFr ? "Erreur de connexion. Veuillez réessayer." : "Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Skip pricing and go directly to dashboard (for free trial with credits)
  const handleSkipToDashboard = () => {
    if (normalizedShop) {
      navigate(`/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
    }
  };

  // Loading state
  if (isCheckingSubscription) {
    return (
      <div 
        className="min-h-screen flex flex-col" 
        style={{ backgroundColor: "#f6f6f7" }}
      >
        <AppHeader shopName={normalizedShop || undefined} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
            <p style={{ color: "#6b7280", fontSize: "16px" }}>
              {isFr ? "Vérification de votre compte..." : "Checking your account..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ backgroundColor: "#f6f6f7" }}
    >
      <AppHeader shopName={normalizedShop || undefined} />
      
      {/* Auth error - Full screen for expired tokens */}
      {authError && authError.includes(isFr ? "expiré" : "expired") && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md p-8 text-center shadow-lg">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {isFr ? "Lien d'installation expiré" : "Installation Link Expired"}
            </h2>
            <p className="text-gray-600 mb-6">
              {authError}
            </p>
            <Button
              onClick={() => {
                const shopName = normalizedShop?.replace('.myshopify.com', '');
                if (shopName) {
                  window.open(`https://admin.shopify.com/store/${shopName}/apps`, '_top');
                }
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              {isFr ? "Réinstaller l'application" : "Reinstall Application"}
            </Button>
          </Card>
        </div>
      )}

      {/* Auth error banner (for other errors) */}
      {authError && !authError.includes(isFr ? "expiré" : "expired") && (
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
            {isFr ? "Erreur de connexion" : "Connection error"}: {authError}
          </span>
          <button
            onClick={handleRetry}
            disabled={isAuthenticating}
            style={{
              backgroundColor: PRIMARY_COLOR,
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

      {/* Authenticating indicator */}
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
          <Loader2 size={14} className="animate-spin" style={{ color: PRIMARY_COLOR }} />
          <span style={{ color: "#166534", fontSize: "13px" }}>
            {t.connecting} {retryCount > 0 && `(${isFr ? "tentative" : "attempt"} ${retryCount + 1}/${MAX_RETRIES})`}
          </span>
        </div>
      )}
      
      <div className="flex-1 py-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles size={14} />
              {t.freeCredits}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {t.title}
            </h1>
            <p className="text-gray-600">
              {t.subtitle}
            </p>
          </div>

          {/* Single Hybrid Pricing Card */}
          <Card className="p-8 shadow-lg border-2 border-cyan-500 relative overflow-hidden">
            <Badge className="absolute -top-0 right-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-3 py-1">
              {isFr ? "Recommandé" : "Recommended"}
            </Badge>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{HYBRID_PLAN.name}</h2>
            </div>

            {/* Pricing breakdown */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{t.monthlyBase}</span>
                <span className="text-2xl font-bold text-gray-900">${HYBRID_PLAN.basePrice}<span className="text-sm font-normal text-gray-500">/mo</span></span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                <span className="text-cyan-700 font-medium">{t.perImage}</span>
                <span className="text-2xl font-bold text-cyan-700">${HYBRID_PLAN.usagePrice}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{t.monthlyCap}</span>
                <span className="text-lg font-semibold text-gray-700">${HYBRID_PLAN.cappedAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3 mb-8">
              {t.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-cyan-600" />
                  </div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg"
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isFr ? "Redirection..." : "Redirecting..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.startNow}
                </>
              )}
            </Button>
          </Card>

          {/* Skip option */}
          <div className="text-center mt-6">
            <button
              onClick={handleSkipToDashboard}
              className="text-sm text-gray-500 hover:text-cyan-600 transition-colors"
            >
              {t.skipFree} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
