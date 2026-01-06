import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Sparkles, Loader2, Check, Zap, Package, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// App colors
const PRIMARY_COLOR = "#0891b2"; // Cyan-600
const DARK_BG = "#0f172a";

// Credit packages for AI Images
const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 9.99,
    description: {
      en: "Perfect for trying out",
      fr: "Parfait pour essayer"
    },
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    trialDays: 7,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 200,
    price: 29.99,
    description: {
      en: "Best value for regular use",
      fr: "Meilleur rapport qualité-prix"
    },
    icon: Package,
    color: "from-purple-500 to-pink-500",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    credits: 500,
    price: 59.99,
    description: {
      en: "For growing stores",
      fr: "Pour les boutiques en croissance"
    },
    icon: Crown,
    color: "from-amber-500 to-orange-500",
  },
];

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authAttemptedRef = useRef(false);

  // Language detection
  const isFr = navigator.language?.startsWith("fr");
  
  const shopFromUrl = searchParams.get("shop");
  const installedParam = searchParams.get("installed");
  
  // Normalize shop domain
  const normalizedShop = shopFromUrl 
    ? (shopFromUrl.includes('.myshopify.com') 
        ? shopFromUrl.toLowerCase() 
        : `${shopFromUrl}.myshopify.com`.toLowerCase())
    : null;

  // Auto-login after OAuth
  useEffect(() => {
    if (!shopFromUrl || authAttemptedRef.current) return;
    
    const attemptAutoLogin = async () => {
      // Check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ [AiImagesSetupWizard] Already authenticated");
        setIsCheckingSubscription(false);
        return;
      }

      // If post-install, attempt quick login
      if (installedParam === "true") {
        authAttemptedRef.current = true;
        setIsAuthenticating(true);
        
        try {
          console.log("🔐 [AiImagesSetupWizard] Attempting auto-login for:", normalizedShop);
          
          const { data, error } = await supabase.functions.invoke('ai-images-quick-login', {
            body: { shop: normalizedShop }
          });

          if (error) {
            console.error("❌ Auto-login failed:", error);
            setAuthError(error.message);
          } else if (data?.session) {
            console.log("✅ Auto-login successful");
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            toast.success(isFr ? "Connexion réussie !" : "Connected successfully!");
          }
        } catch (err) {
          console.error("❌ Auto-login error:", err);
          setAuthError(err instanceof Error ? err.message : "Login failed");
        } finally {
          setIsAuthenticating(false);
          setIsCheckingSubscription(false);
        }
      } else {
        setIsCheckingSubscription(false);
      }
    };

    attemptAutoLogin();
  }, [shopFromUrl, installedParam, normalizedShop, isFr]);

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

  const handleSelectPlan = async (planId: string) => {
    if (!normalizedShop) {
      toast.error(isFr ? "Boutique non trouvée" : "Shop not found");
      return;
    }

    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      console.log(`[AiImagesSetupWizard] Creating subscription for plan: ${planId}`);
      
      const { data, error } = await supabase.functions.invoke('ai-images-create-subscription', {
        body: {
          planId,
          shopDomain: normalizedShop,
          isRecurring: true, // Monthly subscription
        }
      });

      if (error) throw error;

      if (data?.confirmationUrl) {
        console.log("🔗 Redirecting to Shopify billing:", data.confirmationUrl);
        window.location.href = data.confirmationUrl;
      } else if (data?.status === 'ACTIVE') {
        toast.success(isFr ? "Abonnement déjà actif !" : "Subscription already active!");
        navigate(`/dashboard?shop=${encodeURIComponent(normalizedShop)}`, { replace: true });
      } else {
        throw new Error("No confirmation URL received");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      toast.error(isFr ? "Erreur lors de la création de l'abonnement" : "Error creating subscription");
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
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
      
      {/* Auth error banner */}
      {authError && (
        <div 
          style={{
            backgroundColor: "#fff4f4",
            borderBottom: "1px solid #fecaca",
            padding: "12px 20px",
            textAlign: "center"
          }}
        >
          <span style={{ color: "#dc2626", fontSize: "14px" }}>
            {isFr ? "Erreur de connexion" : "Connection error"}: {authError}
          </span>
        </div>
      )}

      {/* Authenticating indicator */}
      {isAuthenticating && (
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
            {isFr ? "Connexion en cours..." : "Connecting..."}
          </span>
        </div>
      )}
      
      <div className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles size={14} />
              {isFr ? "5 crédits gratuits inclus" : "5 free credits included"}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {isFr ? "Choisissez votre forfait" : "Choose Your Plan"}
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              {isFr 
                ? "Générez des images produit professionnelles avec l'IA. Chaque crédit = 1 image générée."
                : "Generate professional product images with AI. Each credit = 1 generated image."
              }
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {CREDIT_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPlan === pkg.id;
              
              return (
                <Card 
                  key={pkg.id}
                  className={`relative p-6 transition-all cursor-pointer hover:shadow-lg ${
                    pkg.popular ? 'ring-2 ring-purple-500 shadow-lg' : ''
                  } ${isSelected ? 'ring-2 ring-cyan-500' : ''}`}
                  onClick={() => !isLoading && handleSelectPlan(pkg.id)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">
                      {isFr ? "Populaire" : "Popular"}
                    </Badge>
                  )}

                  {pkg.trialDays && (
                    <Badge variant="outline" className="absolute -top-3 right-4 bg-white">
                      {isFr ? `${pkg.trialDays}j essai` : `${pkg.trialDays}-day trial`}
                    </Badge>
                  )}

                  <div className="text-center">
                    <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {isFr ? pkg.description.fr : pkg.description.en}
                    </p>

                    <div className="mb-4">
                      <span className="text-3xl font-bold">${pkg.price}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="text-2xl font-bold text-cyan-600">{pkg.credits}</div>
                      <div className="text-sm text-gray-600">
                        {isFr ? "crédits / mois" : "credits / month"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ${(pkg.price / pkg.credits).toFixed(2)} / {isFr ? "image" : "image"}
                      </div>
                    </div>

                    <Button 
                      className={`w-full ${pkg.popular ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      disabled={isLoading}
                    >
                      {isLoading && isSelected ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {isLoading && isSelected 
                        ? (isFr ? "Redirection..." : "Redirecting...") 
                        : (isFr ? "Choisir" : "Select")
                      }
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Skip option */}
          <div className="text-center">
            <button
              onClick={handleSkipToDashboard}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {isFr 
                ? "Continuer avec les 5 crédits gratuits →" 
                : "Continue with 5 free credits →"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
