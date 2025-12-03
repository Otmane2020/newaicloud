import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingBag, Loader2, Settings2, ExternalLink } from "lucide-react";

export function AdminGoogleMerchant() {
  const [connecting, setConnecting] = useState(false);

  const connectGoogleMerchant = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-merchant-oauth", {
        body: { action: "connect" },
      });

      if (error) throw error;

      if (data?.authUrl) {
        const popup = window.open(
          data.authUrl,
          "google_merchant_oauth",
          "width=600,height=700,scrollbars=yes"
        );

        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "google_merchant_oauth_complete") {
            window.removeEventListener("message", handleMessage);
            toast.success("Google Merchant connecté!");
          }
        };
        window.addEventListener("message", handleMessage);
      } else {
        toast.info("Fonctionnalité en cours de développement");
      }
    } catch (error: any) {
      console.error("Error connecting Google Merchant:", error);
      toast.error(error.message || "Erreur de connexion Google Merchant");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-orange-500" />
          Google Merchant Center
        </h2>
        <p className="text-muted-foreground mt-1">
          Gérez vos connexions Google Merchant Center
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                Connexion Merchant
              </CardTitle>
              <CardDescription>
                Connectez votre compte Google Merchant Center pour synchroniser vos produits
              </CardDescription>
            </div>
            <Button onClick={connectGoogleMerchant} disabled={connecting} variant="outline">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings2 className="h-4 w-4 mr-2" />
              )}
              Connecter Google Merchant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <ShoppingBag className="h-12 w-12 text-orange-500 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">
              Connectez votre compte Google Merchant Center pour:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Synchroniser automatiquement vos produits</li>
              <li>• Gérer vos flux de données</li>
              <li>• Surveiller les performances Shopping</li>
            </ul>
            <div className="flex gap-2 justify-center">
              <Button onClick={connectGoogleMerchant} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4 mr-2" />
                )}
                Connecter
              </Button>
              <Button variant="outline" asChild>
                <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Merchant Center
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">À propos de l'intégration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Synchronisation produits</span>
            <Badge variant="outline">Bientôt disponible</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Flux de données</span>
            <Badge variant="outline">Bientôt disponible</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Rapports Performance</span>
            <Badge variant="outline">Bientôt disponible</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminGoogleMerchant;
