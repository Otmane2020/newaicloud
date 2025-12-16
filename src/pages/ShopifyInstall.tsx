import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { ConnectionTimeoutAlert } from "@/components/ServerStatusAlert";

// Helper: detect server error
const isServerError = (error: any): boolean => {
  const msg = error?.message || String(error) || '';
  return msg.includes('Failed to fetch') || 
         msg.includes('timeout') || 
         msg.includes('NetworkError') ||
         msg.includes('522') ||
         msg.includes('503');
};

const ShopifyInstall = () => {
  const { t, language } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "server_offline">("loading");

  useEffect(() => {
    const initOAuth = async () => {
      const shop = searchParams.get("shop");
      
      if (!shop) {
        toast.error("Shop parameter missing");
        setStatus("error");
        return;
      }

      try {
        console.log("[SHOPIFY-INSTALL] Initiating OAuth for shop:", shop);
        
        // Appeler l'edge function en mode pre-auth (sans authentification)
        const response = await fetch(
          `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              shopName: shop,
              commercialName: shop,
              preAuth: true, // Mode pre-auth
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to initiate OAuth");
        }

        const data = await response.json();
        
        if (data.authUrl) {
          console.log("[SHOPIFY-INSTALL] Redirecting to Shopify OAuth:", data.authUrl);
          // Rediriger vers Shopify pour l'autorisation
          window.location.href = data.authUrl;
        } else {
          throw new Error("No auth URL received");
        }
      } catch (error: any) {
        console.error("[SHOPIFY-INSTALL] Error:", error);
        if (isServerError(error)) {
          setStatus("server_offline");
          toast.error(
            language === 'fr' ? 'Serveur indisponible' : 'Server unavailable',
            { description: language === 'fr' ? 'Réessayez dans quelques minutes.' : 'Please try again in a few minutes.' }
          );
        } else {
          toast.error("Failed to initiate Shopify connection");
          setStatus("error");
          // Fallback: rediriger vers le guide
          setTimeout(() => {
            navigate(`/shopify/guide?shop=${encodeURIComponent(shop)}`, { replace: true });
          }, 2000);
        }
      }
    };

    initOAuth();
  }, [searchParams, navigate]);

  if (status === "server_offline") {
    return <ConnectionTimeoutAlert />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {status === "loading" ? t.shopifyInstall.title : t.shopifyInstall.errorTitle}
              </CardTitle>
              <CardDescription className="text-center">
                {status === "loading" 
                  ? t.shopifyInstall.connecting
                  : t.shopifyInstall.redirecting}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  {status === "loading"
                    ? t.shopifyInstall.waitingAuth
                    : t.shopifyInstall.redirecting}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstall;
