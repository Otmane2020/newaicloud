import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";

export function OAuthConnectionForm() {
  const [showDialog, setShowDialog] = useState(false);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenDialog = () => {
    setShowDialog(true);
  };

  const handleOAuthConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("shopify-oauth", {
        body: { shopName: shopName.trim() },
      });

      if (error) throw error;

      if (data?.authUrl) {
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
    <>
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
        <CardContent>
          <Button 
            onClick={handleOpenDialog} 
            disabled={loading} 
            className="w-full" 
            size="lg"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Connecter ma boutique Shopify
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connecter votre boutique</DialogTitle>
            <DialogDescription>
              Entrez le nom de votre boutique Shopify pour vous connecter
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleOAuthConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name-dialog">
                Nom de votre boutique
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="shop-name-dialog"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="mon-magasin"
                  className="flex-1"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">.myshopify.com</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Vous trouverez le nom de votre boutique dans l'URL de votre admin Shopify
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Continuer"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
