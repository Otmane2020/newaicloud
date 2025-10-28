import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, ShoppingBag, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const [oauthShopName, setOauthShopName] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleOAuthConnect = async () => {
    if (!oauthShopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }

    try {
      setOauthLoading(true);

      const { data, error } = await supabase.functions.invoke("shopify-oauth", {
        body: {
          shopName: oauthShopName.trim(),
        },
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Connecter une boutique Shopify
          </DialogTitle>
          <DialogDescription>Connexion OAuth sécurisée</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Connexion Shopify</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Connectez votre boutique Shopify via OAuth sécurisé
            </p>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
