import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function ShopifyApp() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const { t, language } = useTranslation();

  useEffect(() => {
    const processPendingToken = async () => {
      const shop = params.get("shop");
      const pendingToken = params.get("pending_token");
      const host = params.get("host");

      // Si "Open app" depuis Shopify (host présent mais pas de pending_token)
      // Vérifier si l'utilisateur est déjà connecté et le rediriger vers le dashboard
      if (host && !pendingToken) {
        console.log('🔄 [ShopifyApp] Open app detected (host without pending_token)');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ [ShopifyApp] User already authenticated, redirecting to dashboard');
          navigate("/dashboard", { replace: true });
          return;
        }
        
        // Si pas de session, rediriger vers SetupWizard (pas /auth pour Shopify users)
        console.log('⚠️ [ShopifyApp] No session, redirecting to setup-wizard');
        const redirectParams = new URLSearchParams({ shop: shop || '', host, embedded: '1' });
        navigate(`/app/setup-wizard?${redirectParams.toString()}`, { replace: true });
        return;
      }

      if (!shop || !pendingToken) {
        setStatus("error");
        toast.error(t.shopifyApp?.installationError || "Installation error", {
          description: t.shopifyApp?.missingParams || "Missing Shopify connection parameters.",
        });
        return;
      }

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
        const redirectParams = new URLSearchParams({
          shop,
          host: params.get("host") || "",
          embedded: "1",
        });
        
        console.log('🎯 [ShopifyApp] Auth complete, user_id:', data.user_id, 'is_returning:', data.is_returning_user);
        
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
            navigate(`/app/setup-wizard?${redirectParams.toString()}`, { replace: true });
          }
        } else {
          // Nouvel utilisateur → toujours SetupWizard pour Shopify Billing
          console.log('🆕 [ShopifyApp] New user, redirecting to SetupWizard for Shopify Billing');
          navigate(`/app/setup-wizard?${redirectParams.toString()}`, { replace: true });
        }
      } catch (err) {
        setStatus("error");
        toast.error(t.shopifyApp?.unexpectedError || "Unexpected error");
      }
    };

    processPendingToken();
  }, [params, navigate, t]);

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
