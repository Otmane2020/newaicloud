import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";

const ShopifyInstall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleInstall = async () => {
      console.group("🧩 [ShopifyInstall]");
      console.log("➡️ Current URL:", window.location.href);

      const hmac = searchParams.get("hmac");
      const host = searchParams.get("host");
      const shop = searchParams.get("shop");
      const timestamp = searchParams.get("timestamp");

      console.log("[ShopifyInstall] URL params:", { hmac, host, shop, timestamp });

      if (!shop || !hmac || !timestamp) {
        console.error("[ShopifyInstall] ❌ Paramètres manquants");
        setStatus("error");
        setErrorMessage("Paramètres d'installation manquants. Veuillez relancer depuis Shopify.");
        console.groupEnd();
        return;
      }

      try {
        console.log("[ShopifyInstall] 🚀 Appel de la fonction Edge shopify-install...");

        const { data, error } = await supabase.functions.invoke("shopify-install", {
          body: {
            hmac,
            host,
            shop,
            timestamp,
            allParams: Object.fromEntries(searchParams.entries()),
          },
        });

        console.log("[ShopifyInstall] ✅ Réponse Edge:", { data, error });

        if (error) {
          console.error("[ShopifyInstall] ❌ Erreur Supabase:", error);
          setStatus("error");
          setErrorMessage(error.message || "Erreur lors de l'appel au module d'installation.");
          console.groupEnd();
          return;
        }

        if (!data || !data.authUrl) {
          console.error("[ShopifyInstall] ⚠️ Pas d'URL OAuth reçue:", data);
          setStatus("error");
          setErrorMessage("URL d'autorisation manquante. Le serveur n'a pas renvoyé de lien Shopify.");
          console.groupEnd();
          return;
        }

        // Tout est bon → redirection vers Shopify
        console.log("[ShopifyInstall] 🌍 Redirection vers Shopify OAuth:", data.authUrl);
        setStatus("success");

        // Laisse 1s pour montrer le message
        setTimeout(() => {
          window.location.href = data.authUrl;
        }, 1000);
      } catch (err) {
        console.error("[ShopifyInstall] 💥 Exception attrapée:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue pendant l'installation.");
      } finally {
        console.groupEnd();
      }
    };

    handleInstall();
  }, [searchParams, navigate]);

  // 🧱 UI -------------------------------------------------
  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">Vérification des paramètres d'installation...</p>
          </div>
        );
      case "error":
        return (
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium mb-2">Erreur</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <div className="mt-4 text-center">
              <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
                Réessayer
              </button>
            </div>
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-success mb-4" />
            <p className="text-sm text-muted-foreground text-center">Redirection vers Shopify pour autorisation...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Installation Shopify</CardTitle>
              <CardDescription className="text-center">
                {status === "loading" && "Préparation de l'installation..."}
                {status === "error" && "Erreur d'installation"}
                {status === "success" && "Redirection en cours..."}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderContent()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstall;
