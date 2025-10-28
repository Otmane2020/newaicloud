import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Info, HelpCircle } from "lucide-react";

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
            Connexion OAuth sécurisée - Aucune configuration manuelle requise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleOpenDialog} 
            disabled={loading} 
            className="w-full" 
            size="lg"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Connecter ma boutique Shopify
          </Button>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
              <HelpCircle className="w-4 h-4" />
              Comment trouver le nom de ma boutique ?
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold">Où trouver le nom de votre boutique :</p>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-medium">1.</span>
                        <span>Connectez-vous à votre <strong>Admin Shopify</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">2.</span>
                        <span>Regardez la <strong>barre d'adresse</strong> de votre navigateur</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">3.</span>
                        <span>L'URL ressemble à : <code className="bg-muted px-1.5 py-0.5 rounded text-xs">https://admin.shopify.com/store/<strong className="text-primary">MON-NOM-BOUTIQUE</strong></code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">4.</span>
                        <span>Copiez uniquement <strong className="text-primary">MON-NOM-BOUTIQUE</strong> (la partie après <code>/store/</code>)</span>
                      </li>
                    </ol>
                    
                    <div className="bg-muted p-3 rounded-lg mt-3">
                      <p className="text-xs font-semibold mb-1">💡 Exemple :</p>
                      <p className="text-xs">
                        Si votre URL est <code className="bg-background px-1 py-0.5 rounded">admin.shopify.com/store/ma-super-boutique</code>
                      </p>
                      <p className="text-xs mt-1">
                        Alors le nom de votre boutique est : <strong className="text-primary">ma-super-boutique</strong>
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
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
