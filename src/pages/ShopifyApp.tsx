import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { DEMO_CONFIG } from "@/lib/demoConfig";
import { ConnectionTimeoutAlert } from "@/components/ServerStatusAlert";

// Demo store domain - bypass payment for this store
const DEMO_STORE_DOMAIN = "store-demo-20240334.myshopify.com";

// Helper: detect server error
const isServerError = (error: any): boolean => {
  const msg = error?.message || String(error) || '';
  return msg.includes('Failed to fetch') || 
         msg.includes('timeout') || 
         msg.includes('NetworkError') ||
         msg.includes('522') ||
         msg.includes('503');
};

// Helper: query with retry and exponential backoff
const queryWithRetry = async <T,>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<{ data: T | null; error: any }> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await queryFn();
      if (!result.error) return result;
      
      // Si erreur de connexion, retry
      const errorMsg = result.error?.message || '';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('timeout')) {
        if (i < maxRetries - 1) {
          console.log(`[ShopifyApp] Retry ${i + 1}/${maxRetries} after connection error`);
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
      }
      return result;
    } catch (err: any) {
      if (i === maxRetries - 1) return { data: null, error: err };
      console.log(`[ShopifyApp] Retry ${i + 1}/${maxRetries} after exception`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return { data: null, error: new Error('Max retries exceeded') };
};

export default function ShopifyApp() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "processed" | "server_offline">("loading");
  const { t, language } = useTranslation();

  useEffect(() => {
    // Éviter les exécutions multiples
    if (status === "processed") return;

    const processPendingToken = async () => {
      const rawShop = params.get("shop");
      const pendingToken = params.get("pending_token");
      const host = params.get("host");

      // Normaliser le shop domain (ajouter .myshopify.com si absent)
      const shop = rawShop 
        ? (rawShop.includes('.myshopify.com') ? rawShop : `${rawShop}.myshopify.com`)
        : null;

      console.log('🔍 [ShopifyApp] Params:', { rawShop, shop, pendingToken: !!pendingToken, host: !!host });

      const isDemoStore = shop === DEMO_STORE_DOMAIN;

      // Si "Open app" depuis Shopify (host présent mais pas de pending_token)
      if (host && !pendingToken && shop) {
        console.log('🔄 [ShopifyApp] Open app detected');
        
        // 🚀 OPTIMIZATION: Vérifier session ET connection en parallèle avec retry
        const [sessionResult, connectionResult] = await Promise.all([
          supabase.auth.getSession(),
          queryWithRetry<{ user_id: string }>(async () => {
            const result = await supabase
              .from("shopify_connections")
              .select("user_id")
              .eq("store_url", shop)
              .eq("is_active", true)
              .single();
            return { data: result.data as { user_id: string } | null, error: result.error };
          })
        ]);
        
        const session = sessionResult.data?.session;
        const connection = connectionResult.data;
        
        // Si session active → dashboard immédiat
        if (session?.user) {
          console.log('✅ [ShopifyApp] User authenticated, redirecting to dashboard');
          setStatus("processed");
          navigate("/dashboard", { replace: true });
          return;
        }
        
        // Si connection trouvée → vérifier subscription et quick-login
        if (connection?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", connection.user_id)
            .single();
          
          const subscriptionStatus = profile?.subscription_status;
          if (isDemoStore || subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
            console.log('🔑 [ShopifyApp] Quick-login for active user');
            
            try {
              const { data: authData, error: authError } = await supabase.functions.invoke("shopify-quick-login", {
                body: { shop, user_id: connection.user_id },
              });
              
              if (!authError && authData?.access_token) {
                await supabase.auth.setSession({
                  access_token: authData.access_token,
                  refresh_token: authData.refresh_token,
                });
                await new Promise(resolve => setTimeout(resolve, 200));
                setStatus("processed");
                navigate("/dashboard", { replace: true });
                return;
              }
            } catch (err) {
              console.error('⚠️ [ShopifyApp] Quick-login failed:', err);
            }
          }
        }
        
        // Pas de connexion ou quick-login échoué → setup-wizard (standalone)
        setStatus("processed");
        sessionStorage.setItem('shopify_auth_redirect', 'true');
        navigate(`/app/setup-wizard?shop=${shop}`, { replace: true });
        return;
      }

      // Mode installation avec pending_token
      if (!shop || !pendingToken) {
        // Si pas de shop mais pas de pending_token, c'est probablement un accès direct - rediriger
        if (!pendingToken && !shop) {
          console.log('⚠️ [ShopifyApp] No shop or pending_token, redirecting to home');
          setStatus("processed");
          navigate("/", { replace: true });
          return;
        }
        setStatus("error");
        toast.error(t.shopifyApp?.installationError || "Installation error", {
          description: t.shopifyApp?.missingParams || "Missing Shopify connection parameters.",
        });
        return;
      }
      
      setStatus("processed");

      try {
        // Call the edge function to claim the pending token
        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: { shop, pending_token: pendingToken },
        });

        if (error) {
          setStatus("error");
          toast.error(t.shopifyApp?.authFailed || "Authentication failed", { description: error.message });
          return;
        }

        // Auto-login using session tokens returned
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          setStatus("error");
          toast.error(t.shopifyApp?.loginFailed || "Login failed", { description: sessionError.message });
          return;
        }
        
        // Réduire le délai de propagation au minimum (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Message différent selon si c'est un nouvel utilisateur ou un utilisateur existant
        if (data.is_returning_user) {
          toast.success(t.shopifyApp?.welcomeBack || "Welcome back!", {
            description: t.shopifyApp?.connectedToStore || "You are now connected to your store.",
          });
        } else {
          // Nouveau message: pas de trial auto, doit choisir un plan
          toast.success(t.shopifyApp?.welcome || "Welcome!", {
            description: language === "fr" 
              ? "Choisissez votre plan pour commencer." 
              : "Choose your plan to get started.",
          });
        }

        // Store pending sync SEULEMENT si un import a été déclenché
        if (data.import_triggered) {
          sessionStorage.setItem('pending_sync', shop);
        }

        // 🔧 CRITICAL FIX: TOUJOURS rediriger vers SetupWizard pour Shopify Billing
        // Même les utilisateurs existants doivent passer par SetupWizard s'ils n'ont pas de subscription active
        // ⚠️ Important: On ne passe PAS le pending_token car l'auth est déjà faite ci-dessus
        const redirectParams = new URLSearchParams({ shop });
        
        console.log('🎯 [ShopifyApp] Auth complete, user_id:', data.user_id, 'is_returning:', data.is_returning_user);
        
        // Set flag to prevent ProtectedLayout redirect to /auth
        sessionStorage.setItem('shopify_auth_redirect', 'true');
        
        if (data.is_returning_user) {
          // Vérifier si l'utilisateur a déjà un abonnement actif
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status, billing_provider")
            .eq("id", data.user_id)
            .single();
          
          if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
            console.log('✅ [ShopifyApp] Returning user with active subscription, redirecting to dashboard');
            navigate("/dashboard", { replace: true });
          } else {
            console.log('🔄 [ShopifyApp] Returning user without subscription, redirecting to SetupWizard');
            navigate(`/app/setup-wizard?shop=${shop}`, { replace: true });
          }
        } else {
          // Nouvel utilisateur → toujours SetupWizard pour Shopify Billing (standalone)
          console.log('🆕 [ShopifyApp] New user, redirecting to SetupWizard for Shopify Billing');
          navigate(`/app/setup-wizard?shop=${shop}`, { replace: true });
        }
      } catch (err: any) {
        if (isServerError(err)) {
          setStatus("server_offline");
          toast.error(
            language === 'fr' ? 'Serveur indisponible' : 'Server unavailable',
            { description: language === 'fr' ? 'Réessayez dans quelques minutes.' : 'Please try again in a few minutes.' }
          );
        } else {
          setStatus("error");
          toast.error(t.shopifyApp?.unexpectedError || "Unexpected error");
        }
      }
    };

    processPendingToken();
  }, [params, navigate, t, status]);

  if (status === "server_offline") {
    return <ConnectionTimeoutAlert />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.shopifyApp?.installFailed || "Installation failed"}</h1>
          <p className="text-muted-foreground mt-2">{t.shopifyApp?.somethingWrong || "Something went wrong during installation."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto" />
        <h1 className="text-xl font-bold mt-4">{t.shopifyApp?.settingUp || "Setting up your app..."}</h1>
        <p className="text-muted-foreground mt-2">
          {language === "fr" 
            ? "Préparation de votre espace de travail..." 
            : "Preparing your workspace..."}
        </p>
      </div>
    </div>
  );
}
