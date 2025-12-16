import { useEffect, useState } from "react";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

// Shopify Polaris colors
const SHOPIFY_GREEN = "#008060";
const SHOPIFY_DARK = "#1a1a1a";

export default function Installing() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop");
  const browserLang = navigator.language?.startsWith("fr") ? "fr" : "en";
  
  const [progress, setProgress] = useState(10);
  const [steps, setSteps] = useState({
    connection: false,
    authorization: false,
    finalizing: true,
  });

  const t = {
    installing: browserLang === "fr" ? "Installation de NewAI en cours…" : "Installing NewAI...",
    connection: browserLang === "fr" ? "Connexion à Shopify" : "Connecting to Shopify",
    authorization: browserLang === "fr" ? "Autorisations validées" : "Permissions validated",
    finalizing: browserLang === "fr" ? "Préparation de votre espace" : "Preparing your workspace",
    patience: browserLang === "fr" 
      ? "Veuillez patienter, cela prend généralement quelques secondes" 
      : "Please wait, this usually takes a few seconds",
  };

  useEffect(() => {
    if (!shop) return;

    let attempts = 0;
    const maxAttempts = 30;

    // Progressive steps animation
    const timer1 = setTimeout(() => {
      setSteps(s => ({ ...s, connection: true }));
      setProgress(30);
    }, 800);
    
    const timer2 = setTimeout(() => {
      setSteps(s => ({ ...s, authorization: true }));
      setProgress(60);
    }, 1800);

    // Fake progress bar for perception
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 85));
    }, 300);

    const interval = setInterval(async () => {
      attempts++;

      try {
        const { data, error } = await supabase.functions.invoke("installation-status", {
          body: { shopDomain: shop },
        });

        if (!error && data?.ready) {
          clearInterval(interval);
          clearInterval(progressInterval);
          setSteps(s => ({ ...s, finalizing: false }));
          setProgress(100);
          
          // Small delay before redirect for smooth UX
          setTimeout(() => {
            window.location.href = `/app/setup-wizard?shop=${encodeURIComponent(shop)}`;
          }, 400);
        }
      } catch (_) {
        // Silently continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        clearInterval(progressInterval);
        // After max attempts, redirect anyway - OAuth should have completed
        window.location.href = `/app/setup-wizard?shop=${encodeURIComponent(shop)}`;
      }
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [shop]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f7" }}>
      {/* Shopify-style header */}
      <header 
        style={{ 
          backgroundColor: SHOPIFY_DARK, 
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 600, fontSize: "18px" }}>
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
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Logo and spinner */}
        <div className="relative">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${SHOPIFY_GREEN}, #00a07a)` }}
          >
            <Sparkles size={40} color="white" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: SHOPIFY_GREEN }} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold" style={{ color: "#202223" }}>
            {t.installing}
          </h1>
          <p className="text-sm" style={{ color: "#6d7175" }}>
            {t.patience}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "#e1e3e5" }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progress}%`,
                backgroundColor: SHOPIFY_GREEN
              }}
            />
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "#6d7175" }}>
            {progress}%
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {steps.connection ? (
              <CheckCircle className="h-5 w-5" style={{ color: SHOPIFY_GREEN }} />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6d7175" }} />
            )}
            <span className="text-sm font-medium" style={{ color: steps.connection ? "#202223" : "#6d7175" }}>
              {t.connection}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {steps.authorization ? (
              <CheckCircle className="h-5 w-5" style={{ color: SHOPIFY_GREEN }} />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6d7175" }} />
            )}
            <span className="text-sm font-medium" style={{ color: steps.authorization ? "#202223" : "#6d7175" }}>
              {t.authorization}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {!steps.finalizing ? (
              <CheckCircle className="h-5 w-5" style={{ color: SHOPIFY_GREEN }} />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6d7175" }} />
            )}
            <span className="text-sm font-medium" style={{ color: !steps.finalizing ? "#202223" : "#6d7175" }}>
              {t.finalizing}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
