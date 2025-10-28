import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Info, Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const [storeName, setStoreName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim() || !accessToken.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const storeUrl = `${storeName.trim()}.myshopify.com`;

      const { data: encryptedData, error: encryptError } = await supabase.functions.invoke("encrypt-shopify-token", {
        body: { accessToken: accessToken.trim() },
      });

      if (encryptError) throw encryptError;

      const { error: insertError } = await supabase
        .from("shopify_connections")
        .insert({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Connecter une boutique Shopify
          </DialogTitle>
          <DialogDescription>
            Entrez les informations de votre boutique pour la connecter
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Name Field */}
          <div className="space-y-2">
            <Label htmlFor="store-name">Nom de la boutique</Label>
            <div className="flex items-center gap-2">
              <Input
                id="store-name"
                placeholder="qnxv91-2w"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                .myshopify.com
              </span>
            </div>
          </div>

          {/* Access Token Field */}
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

          <Separator />

          {/* Simple Guide */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">Où trouver ces informations ?</p>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">1. Nom de la boutique :</p>
                    <p className="text-muted-foreground">
                      Dans l'URL de votre admin : <code className="bg-muted px-1 py-0.5 rounded">admin.shopify.com/store/<strong>qnxv91-2w</strong></code>
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-medium">2. Token API :</p>
                    <p className="text-muted-foreground">
                      Settings → Apps → Develop apps → Create app → API credentials → Storefront API access token
                    </p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              "Connecter la boutique"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
