import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ShopifyApp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const handleAutoAuth = async () => {
      const shop = searchParams.get("shop");
      const pendingToken = searchParams.get("pending_token");

      if (!shop || !pendingToken) {
        toast.error("Paramètres manquants", {
          description: "L'URL ne contient pas les informations nécessaires."
        });
        setStatus("error");
        return;
      }

      try {
        console.log("[SHOPIFY-APP] Auto-authentication pour:", shop);

        // Appeler l'edge function pour auto-créer le compte et login
        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: { shop, pending_token: pendingToken }
        });

        if (error) {
          console.error("[SHOPIFY-APP] Erreur auto-auth:", error);
          toast.error("Erreur d'authentification", {
            description: error.message || "Impossible de créer votre compte automatiquement."
          });
          setStatus("error");
          return;
        }

        if (!data?.access_token || !data?.refresh_token) {
          console.error("[SHOPIFY-APP] Tokens manquants dans la réponse");
          toast.error("Erreur d'authentification", {
            description: "Les tokens de session n'ont pas été reçus."
          });
          setStatus("error");
          return;
        }

        // Auto-login avec les tokens reçus
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          console.error("[SHOPIFY-APP] Erreur de session:", sessionError);
          toast.error("Erreur de connexion", {
            description: sessionError.message
          });
          setStatus("error");
          return;
        }

        console.log("[SHOPIFY-APP] ✅ Auto-login réussi");
        
        toast.success("Bienvenue !", {
          description: "Votre compte a été créé et vous disposez d'un essai gratuit de 14 jours."
        });

        // Rediriger vers le dashboard
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("[SHOPIFY-APP] Exception:", err);
        toast.error("Erreur inattendue", {
          description: err instanceof Error ? err.message : "Une erreur s'est produite."
        });
        setStatus("error");
      }
    };

    handleAutoAuth();
  }, [searchParams, navigate]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Erreur d'installation</h1>
          <p className="text-muted-foreground">
            Une erreur s'est produite lors de l'installation de l'application.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configuration en cours...</h1>
        <p className="text-muted-foreground">
          Nous créons votre compte et activons votre essai gratuit de 14 jours.
        </p>
      </div>
    </div>
  );
};

export default ShopifyApp;
