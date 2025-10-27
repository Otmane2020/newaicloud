import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Shield, HelpCircle, ChevronDown } from "lucide-react";

export function OAuthConnectionForm() {
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleOAuthConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("shopify-oauth-start", {
        body: { shopName: shopName.trim() },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Shopify OAuth in same window
        toast.success("Redirection vers Shopify pour autorisation...");
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error("OAuth error:", error);
      toast.error(error.message || "Erreur lors de la connexion OAuth");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Connexion OAuth (Recommandé)
        </CardTitle>
        <CardDescription>
          Connectez votre boutique Shopify de manière sécurisée via OAuth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleOAuthConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oauth-shop-name" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Nom de la boutique
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="oauth-shop-name"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="mon-magasin"
                className="flex-1"
              />
              <span className="text-muted-foreground">.myshopify.com</span>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Se connecter avec Shopify
              </>
            )}
          </Button>
        </form>

        <Collapsible open={showHelp} onOpenChange={setShowHelp}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <HelpCircle className="w-4 h-4 mr-2" />
              Comment configurer OAuth ?
              <ChevronDown className="w-4 h-4 ml-auto transition-transform" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Alert className="mt-4">
              <AlertTitle>Guide OAuth Shopify</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal ml-4 space-y-2 mt-2 text-sm">
                  <li>
                    Allez sur{" "}
                    <a
                      href="https://partners.shopify.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Shopify Partners
                    </a>
                  </li>
                  <li>Créez une application (Custom ou Public)</li>
                  <li>
                    Configurez les permissions (scopes) :
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• read_products, write_products</li>
                      <li>• read_orders, read_content, write_content</li>
                    </ul>
                  </li>
                  <li>Notez le Client ID et Client Secret</li>
                  <li>
                    Ajoutez l'URL de redirection dans votre app Shopify Partners
                  </li>
                  <li>
                    Contactez l'administrateur pour configurer les secrets OAuth
                  </li>
                </ol>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
