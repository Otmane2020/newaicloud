import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { DEMO_CONFIG } from "@/lib/demoConfig";

// Demo store domain - bypass payment for this store
const DEMO_STORE_DOMAIN = "store-demo-20240334.myshopify.com";

export default function ShopifyApp() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "processed">("loading");
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

      // Log demo store detection (but don't bypass - let normal flow handle it)
      if (shop === DEMO_STORE_DOMAIN || rawShop === 'store-demo-20240334') {
        console.log('🎭 [ShopifyApp] Demo store detected, proceeding with normal flow');
      }

      // Si "Open app" depuis Shopify (host présent mais pas de pending_token)
      // Vérifier si l'utilisateur a une connexion et subscription active via le shop domain
      if (host && !pendingToken && shop) {
        console.log('🔄 [ShopifyApp] Open app detected (host without pending_token)');
        setStatus("processed");
        
        // 🎯 DEMO STORE: Bypass direct vers dashboard
        const isDemoStore = shop === DEMO_STORE_DOMAIN;
        if (isDemoStore) {
          console.log('🎭 [ShopifyApp] Demo store detected, bypassing to dashboard');
        }
        
        // D'abord vérifier la session locale
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ [ShopifyApp] User already authenticated, redirecting to dashboard');
          navigate("/dashboard", { replace: true });
          return;
        }
        
        // Pas de session locale - vérifier via shop domain si l'utilisateur existe avec subscription active
        console.log('🔍 [ShopifyApp] No local session, checking shop connection...');
        const { data: connection } = await supabase
          .from("shopify_connections")
          .select("user_id")
          .eq("store_url", shop)
          .eq("is_active", true)
          .single();
        
        if (connection?.user_id) {
          // Vérifier si cet utilisateur a un abonnement actif OU si c'est le demo store
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status, email")
            .eq("id", connection.user_id)
            .single();
          
          // Demo store OU subscription active → auto-login direct
          if (isDemoStore || profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
            console.log('✅ [ShopifyApp] User has active subscription or is demo, auto-login via shopify-auto-auth');
            // Réauthentifier l'utilisateur via shopify-auto-auth sans pending_token
            const { data: authData, error: authError } = await supabase.functions.invoke("shopify-auto-auth", {
              body: { shop, reauth: true },
            });
            
            if (!authError && authData?.access_token) {
              await supabase.auth.setSession({
                access_token: authData.access_token,
                refresh_token: authData.refresh_token,
              });
              navigate("/dashboard", { replace: true });
              return;
            }
          }
        }
        
        // Demo store sans connexion → quand même essayer d'aller au dashboard
        if (isDemoStore) {
          console.log('🎭 [ShopifyApp] Demo store - redirect to dashboard anyway');
          navigate("/dashboard", { replace: true });
          return;
        }
        
        // Sinon, rediriger vers SetupWizard
        console.log('⚠️ [ShopifyApp] No active subscription found, redirecting to setup-wizard');
        const redirectParams = new URLSearchParams({ shop, host, embedded: '1' });
        navigate(`/app/setup-wizard?${redirectParams.toString()}`, { replace: true });
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
  }, [params, navigate, t, status]);

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
