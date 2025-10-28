import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info, Loader2, Store, ShoppingBag, Key, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const [storeName, setStoreName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [oauthShopName, setOauthShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !accessToken.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const storeUrl = `${storeName.trim()}.myshopify.com`;

      const { data: encryptedData, error: encryptError } = await supabase.functions.invoke("encrypt-shopify-token", {
        body: { accessToken: accessToken.trim() },
      });

      if (encryptError) throw encryptError;

      const { error: insertError } = await supabase.from("shopify_connections").insert({
        user_id: user.id,
        store_url: storeUrl,
        access_token: encryptedData.encryptedToken,
      });

      if (insertError) throw insertError;

      toast.success("Boutique connectée avec succès !");
      setStoreName("");
      setAccessToken("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!oauthShopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }

    try {
      setOauthLoading(true);

      const { data, error } = await supabase.functions.invoke("shopify-oauth", {
        body: { shopName: oauthShopName.trim() },
      });

      if (error) throw error;

      if (data?.authUrl) {
        toast.success("Connexion à Shopify...");
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error("OAuth error:", error);
      toast.error(error.message || "Erreur lors de la connexion OAuth");
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Connecter une boutique Shopify
          </DialogTitle>
          <DialogDescription>Choisissez votre méthode de connexion</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* OAuth Method */}
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Connexion Rapide</h3>
              </div>
              <Badge variant="default">Recommandé</Badge>
            </div>

            <p className="text-sm text-muted-foreground">Connexion OAuth sécurisée en un clic</p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="oauth-shop-name">Nom de votre boutique</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="oauth-shop-name"
                    placeholder="qnxv91-2w"
                    value={oauthShopName}
                    onChange={(e) => setOauthShopName(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.myshopify.com</span>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Trouvez le nom dans l'URL :{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    admin.shopify.com/store/<strong>qnxv91-2w</strong>
                  </code>
                </AlertDescription>
              </Alert>

              <Button onClick={handleOAuthConnect} disabled={oauthLoading} className="w-full">
                {oauthLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Connecter avec OAuth
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Token API Method */}
          <form onSubmit={handleTokenSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Connexion Avancée</h3>
              </div>
              <Badge variant="outline">Token API</Badge>
            </div>

            <p className="text-sm text-muted-foreground">Utilisez votre propre token API Shopify</p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nom de la boutique</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="store-name"
                    placeholder="qnxv91-2w"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.myshopify.com</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-token">Token API</Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxx"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-2">
                  <p className="font-medium">Où trouver le token ?</p>
                  <p>Settings → Apps → Develop apps → Create app → API credentials → Storefront API access token</p>
                </AlertDescription>
              </Alert>

              <Button type="submit" disabled={loading} className="w-full" variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Connecter avec Token
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
