import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, ShoppingBag, Shield, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShopifyTokenGuide } from "./ShopifyTokenGuide";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const [oauthShopName, setOauthShopName] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  
  const [manualStoreName, setManualStoreName] = useState("");
  const [manualApiKey, setManualApiKey] = useState("");
  const [manualApiSecret, setManualApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const handleOAuthConnect = async () => {
    if (!oauthShopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }

    try {
      setOauthLoading(true);

      // Nettoyer le nom de la boutique
      let cleanShopName = oauthShopName.trim()
        .replace(/^https?:\/\//, '') // Enlever http:// ou https://
        .replace(/\.myshopify\.com.*$/, '') // Enlever .myshopify.com et ce qui suit
        .replace(/\/$/, ''); // Enlever le slash final si présent

      const { data, error } = await supabase.functions.invoke("shopify-oauth", {
        body: {
          shopName: cleanShopName,
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

  const handleManualConnect = async () => {
    if (!manualStoreName.trim() || !manualApiKey.trim() || !manualApiSecret.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setManualLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Nettoyer le nom de la boutique (enlever .myshopify.com, https://, etc.)
      let cleanStoreName = manualStoreName.trim()
        .replace(/^https?:\/\//, '') // Enlever http:// ou https://
        .replace(/\.myshopify\.com.*$/, '') // Enlever .myshopify.com et ce qui suit
        .replace(/\/$/, ''); // Enlever le slash final si présent

      console.log('Cleaned store name:', cleanStoreName);

      // Vérifier si une connexion existe déjà
      const { data: existing } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_name', cleanStoreName)
        .single();

      if (existing) {
        toast.error("Cette boutique est déjà connectée");
        return;
      }

      // Créer la connexion avec les clés API (API Key + API Secret)
      const storeUrl = `${cleanStoreName}.myshopify.com`;

      const { error: insertError } = await supabase
        .from('shopify_connections')
        .insert({
          user_id: user.id,
          store_name: cleanStoreName,
          store_url: storeUrl,
          api_key: manualApiKey.trim(),
          access_token: manualApiSecret.trim(),
          connection_type: 'manual',
          is_active: true,
          connected_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      toast.success("Boutique connectée avec succès ! 🎉");
      onOpenChange(false);
      
      // Reset form
      setManualStoreName("");
      setManualApiKey("");
      setManualApiSecret("");

      // Set flag for auto-import
      localStorage.setItem('shopify_just_connected', 'true');
      
      // Refresh page to show new connection and trigger auto-import
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Manual connection error:", error);
      toast.error(error.message || "Erreur lors de la connexion manuelle");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingBag className="w-5 h-5" />
            Connecter une boutique Shopify
          </DialogTitle>
          <DialogDescription className="text-sm">Choisissez votre méthode de connexion</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6">
          <div className="space-y-6 pb-6">
            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  OAuth (Recommandé)
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Clés API
                </TabsTrigger>
              </TabsList>

              {/* OAuth Tab */}
              <TabsContent value="oauth" className="space-y-4 mt-4">
                <div className="space-y-4 p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base">Connexion OAuth Sécurisée</h3>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Méthode recommandée : connexion rapide et sécurisée via OAuth
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="oauth-shop-name" className="text-sm">Nom de votre boutique</Label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Input
                          id="oauth-shop-name"
                          placeholder="qnxv91-2w"
                          value={oauthShopName}
                          onChange={(e) => setOauthShopName(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap text-center sm:text-left">
                          .myshopify.com
                        </span>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Trouvez le nom dans l'URL :{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                          admin.shopify.com/store/<strong>qnxv91-2w</strong>
                        </code>
                      </AlertDescription>
                    </Alert>

                    <Button onClick={handleOAuthConnect} disabled={oauthLoading} className="w-full text-sm">
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
              </TabsContent>

              {/* Manual API Keys Tab */}
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-4 p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base">Connexion avec Clés API</h3>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Utilisez vos clés API Shopify pour une connexion directe avec tous les accès
                  </p>

                  {/* Guide étape par étape */}
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                    <h4 className="font-medium text-xs sm:text-sm mb-2">Guide rapide :</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>1.</strong> Allez dans Shopify Admin → <strong>Apps</strong> → <strong>Develop apps</strong>
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>2.</strong> Créez une nouvelle app ou sélectionnez une app existante
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>3.</strong> Dans <strong>Configuration</strong>, configurez les scopes nécessaires (Products, Content, etc.)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>4.</strong> Dans <strong>API credentials</strong>, révélez votre <strong>Admin API access token</strong> (commence par <code className="bg-background px-1 py-0.5 rounded">shpat_</code>)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>5.</strong> Copiez aussi votre <strong>API key</strong> (32 caractères hexadécimaux)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          <strong>6.</strong> Collez les informations ci-dessous et connectez votre boutique
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="manual-store-name" className="text-sm">Nom de la boutique</Label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Input
                          id="manual-store-name"
                          placeholder="qnxv91-2w"
                          value={manualStoreName}
                          onChange={(e) => setManualStoreName(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap text-center sm:text-left">
                          .myshopify.com
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-api-key" className="text-sm">Clé API (API Key)</Label>
                      <Input
                        id="manual-api-key"
                        type="password"
                        placeholder="da237524e4e1252a740b204af962acdf"
                        value={manualApiKey}
                        onChange={(e) => setManualApiKey(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <p className="text-xs text-muted-foreground">32 caractères hexadécimaux</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-api-secret" className="text-sm">Admin API Access Token</Label>
                      <Input
                        id="manual-api-secret"
                        type="password"
                        placeholder="shpat_xxxxxxxxxxxxxxxx"
                        value={manualApiSecret}
                        onChange={(e) => setManualApiSecret(e.target.value)}
                        className="text-sm font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Commence par shpat_ (trouvé dans Shopify Admin → Apps → Develop apps)</p>
                    </div>

                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                        <strong>Avantage :</strong> Cette méthode donne un accès complet à toutes les fonctionnalités (tags, scripts, contenus, etc.)
                      </AlertDescription>
                    </Alert>

                    <Button onClick={handleManualConnect} disabled={manualLoading} className="w-full text-sm">
                      {manualLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Connecter avec les clés API
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Guide détaillé */}
                <ShopifyTokenGuide />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}