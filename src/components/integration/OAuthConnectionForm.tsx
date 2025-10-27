import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";

export function OAuthConnectionForm() {
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);

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
        // Redirect to Shopify for connection
        toast.success("Connexion à Shopify...");
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Connectez votre boutique Shopify
        </CardTitle>
        <CardDescription>
          Connectez-vous en un clic pour synchroniser vos produits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleOAuthConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oauth-shop-name">
              Nom de votre boutique
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

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Connecter ma boutique
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
