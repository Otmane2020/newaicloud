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
  const { t } = useTranslation();

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
        
        // Si pas de session, rediriger vers l'auth
        console.log('⚠️ [ShopifyApp] No session, redirecting to auth');
        navigate("/auth", { replace: true });
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
          toast.success(t.shopifyApp?.welcome || "Welcome!", {
            description: t.shopifyApp?.trialActivated || "Your 14-day trial is now active.",
          });
        }

        // Store pending sync SEULEMENT si un import a été déclenché
        if (data.import_triggered) {
          sessionStorage.setItem('pending_sync', shop);
        }

        navigate("/dashboard", { replace: true });
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
        <p className="text-muted-foreground mt-2">{t.shopifyApp?.activatingTrial || "Your free trial is being activated."}</p>
      </div>
    </div>
  );
}
