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
import { useUsageLimits } from "@/hooks/useUsageLimits";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const { limits, refresh: refreshLimits } = useUsageLimits();
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

    // ✅ Check store limit
    if (!limits?.canAddShopifyStore) {
      toast.error('Store limit reached', {
        description: `You have reached the maximum number of stores (${limits?.usage.shopify_stores_count}/${limits?.limits.max_shopify_stores}). Upgrade your plan to add more stores.`,
      });
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
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setManualLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Clean store name (remove .myshopify.com, https://, etc.)
      let cleanStoreName = manualStoreName.trim()
        .replace(/^https?:\/\//, '') // Remove http:// or https://
        .replace(/\.myshopify\.com.*$/, '') // Remove .myshopify.com and everything after
        .replace(/\/$/, ''); // Remove trailing slash

      console.log('Cleaned store name:', cleanStoreName);

      // ✅ 1. FIRST: Check store limit (before checking if store exists)
      if (!limits?.canAddShopifyStore) {
        toast.error('Store limit reached', {
          description: `You have reached the maximum number of stores (${limits?.usage.shopify_stores_count}/${limits?.limits.max_shopify_stores}). Upgrade your plan to add more stores.`,
        });
        return;
      }

      // ✅ 2. SECOND: Check if this specific store already exists
      const { data: existing } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_name', cleanStoreName)
        .single();

      if (existing) {
        toast.error("This store is already connected");
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

      // ✅ Increment shopify_stores_count
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'shopify_stores_count',
        p_increment: 1
      });

      toast.success("Store connected successfully! 🎉");
      
      // Refresh limits
      await refreshLimits();
      
      onOpenChange(false);
      
      // Reset form
      setManualStoreName("");
      setManualApiKey("");
      setManualApiSecret("");

      // Set flags for import confirmation dialog
      localStorage.setItem('shopify_just_connected', 'true');
      localStorage.setItem('shopify_store_name', cleanStoreName);
      
      // Refresh page to show new connection and trigger import dialog
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
            <Tabs defaultValue="manual" className="w-full">
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
                          placeholder="HBxv99-2F"
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
                          admin.shopify.com/store/<strong>HBxv99-2F</strong>
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
              <TabsContent value="manual" className="space-y-6">
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Nouveau sur Shopify ?</strong> Consultez le guide détaillé ci-dessous pour créer vos clés API en quelques minutes.
                  </AlertDescription>
                </Alert>

                <ShopifyTokenGuide />

                <div className="relative mt-6 p-6 space-y-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg shadow-primary/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Formulaire de connexion</h3>
                      <p className="text-xs text-muted-foreground">Remplissez vos identifiants API</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-shop-name" className="text-sm font-medium">
                      Nom de la boutique
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="manual-shop-name"
                        placeholder="HBxv99-2F"
                        value={manualStoreName}
                        onChange={(e) => setManualStoreName(e.target.value)}
                        disabled={manualLoading}
                        className="flex-1"
                      />
                      <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                        .myshopify.com
                      </div>
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Trouvez le nom dans l'URL :{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                          admin.shopify.com/store/<strong>HBxv99-2F</strong>
                        </code>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-api-key" className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-3.5 h-3.5" />
                      API Key (32 caractères)
                    </Label>
                    <Input
                      id="manual-api-key"
                      type="text"
                      placeholder="da237524e4e1252a740b204af962acdf"
                      value={manualApiKey}
                      onChange={(e) => setManualApiKey(e.target.value)}
                      disabled={manualLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      32 caractères hexadécimaux trouvés dans l'onglet "API credentials"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-api-secret" className="text-sm font-medium flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Admin API Access Token (shpat_)
                    </Label>
                    <Input
                      id="manual-api-secret"
                      type="password"
                      placeholder="shpat_a1b2c3d4e5f6g7h8i9j0"
                      value={manualApiSecret}
                      onChange={(e) => setManualApiSecret(e.target.value)}
                      disabled={manualLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Commence par <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">shpat_</code> - Token révélé une seule fois dans "API credentials"
                    </p>
                  </div>

                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                      <strong>✓ Avantage :</strong> Accès complet à toutes les fonctionnalités (tags, scripts, contenus, etc.)
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleManualConnect}
                    disabled={manualLoading || !manualStoreName || !manualApiKey || !manualApiSecret}
                    className="w-full"
                    size="lg"
                  >
                    {manualLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Connecter avec les clés API
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}