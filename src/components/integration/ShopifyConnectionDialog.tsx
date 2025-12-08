import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, ShoppingBag, Shield, Key, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShopifyTokenGuide } from "./ShopifyTokenGuide";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";

// For Shopify App Store installs, manual URL entry is NOT allowed per Shopify requirements
// OAuth flow is initiated automatically via ?shop= parameter from Shopify
const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/newai-ai-seo-and-marketing";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { t } = useTranslation();
  
  // Manual API Keys state (for advanced users outside App Store)
  const [manualStoreName, setManualStoreName] = useState("");
  const [manualCommercialName, setManualCommercialName] = useState("");
  const [manualApiKey, setManualApiKey] = useState("");
  const [manualApiSecret, setManualApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // OAuth via Shopify App Store - no manual URL entry allowed per Shopify requirements
  const handleInstallFromAppStore = () => {
    window.open(SHOPIFY_APP_STORE_URL, "_blank");
    toast.success(t.shopifyConnection?.redirectingToAppStore || "Redirecting to Shopify App Store", {
      description: t.shopifyConnection?.installFromAppStoreDesc || "Install the app from there, then return here."
    });
  };

  const handleManualConnect = async () => {
    if (!manualStoreName.trim() || !manualApiKey.trim() || !manualApiSecret.trim()) {
      toast.error(t.shopifyConnection.fillAllFields);
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

      // Vérification directe du nombre réel de boutiques
      const { data: currentStores, error: countError } = await supabase
        .from("shopify_connections")
        .select("id", { count: 'exact' })
        .eq("user_id", user.id);

      if (countError) {
        console.error('Error counting stores:', countError);
        throw new Error("Error checking store limits");
      }

      const currentStoreCount = currentStores?.length || 0;
      const maxStores = limits?.limits?.max_shopify_stores || 1;

      // ✅ 1. FIRST: Check store limit with real count (before checking if store exists)
      if (!limits?.canAddShopifyStore || currentStoreCount >= maxStores) {
        toast.error(t.shopifyConnection.storeLimitReached, {
          description: t.shopifyConnection.storeLimitDesc.replace('{{current}}', String(currentStoreCount)).replace('{{max}}', String(maxStores)),
        });
        setManualLoading(false);
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
        toast.error(t.shopifyConnection.storeAlreadyConnected);
        return;
      }

      // Créer la connexion avec les clés API (API Key + API Secret)
      const storeUrl = `${cleanStoreName}.myshopify.com`;

      // Validate credentials and fetch shop info to get custom domain
      const shopInfoResponse = await fetch(`https://${storeUrl}/admin/api/2025-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': manualApiSecret.trim(),
          'Content-Type': 'application/json',
        },
      });

      if (!shopInfoResponse.ok) {
        toast.error(t.shopifyConnection.invalidCredentials);
        return;
      }

      // Extract public domain from shop info
      const shopInfo = await shopInfoResponse.json();
      const publicDomain = shopInfo.shop?.domain || null;
      
      console.log('[SHOPIFY-MANUAL] Domaine détecté:', publicDomain);

      const { error: insertError } = await supabase
        .from('shopify_connections')
        .insert({
          user_id: user.id,
          store_name: manualCommercialName.trim() || cleanStoreName,
          store_url: storeUrl,
          public_domain: publicDomain, // Auto-retrieved custom domain
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

      toast.success(t.shopifyConnection.storeConnectedSuccess);
      
      // Refresh limits
      await refreshLimits();
      
      onOpenChange(false);
      
      // Reset form
      setManualStoreName("");
      setManualCommercialName("");
      setManualApiKey("");
      setManualApiSecret("");

      // Set flags for import confirmation dialog
      localStorage.setItem('shopify_just_connected', 'true');
      localStorage.setItem('shopify_store_name', cleanStoreName);
      
      // Refresh page to show new connection and trigger import dialog
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Manual connection error:", error);
      toast.error(error.message || t.shopifyConnection.oauthError);
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

              {/* OAuth Tab - Install from Shopify App Store (no manual URL entry) */}
              <TabsContent value="oauth" className="space-y-4 mt-4">
                <div className="space-y-4 p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      {t.shopifyConnection?.installFromAppStore || "Install from Shopify App Store"}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t.shopifyConnection?.appStoreInstallDesc || "The recommended and secure way to connect your Shopify store is through the Shopify App Store."}
                  </p>

                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                      {t.shopifyConnection?.appStoreSecurityNote || "Installing via the App Store ensures secure OAuth authentication and automatic updates."}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                      <li>{t.shopifyConnection?.step1ClickButton || "Click the button below to go to Shopify App Store"}</li>
                      <li>{t.shopifyConnection?.step2InstallApp || "Click 'Install' on the app page"}</li>
                      <li>{t.shopifyConnection?.step3Authorize || "Authorize the app permissions"}</li>
                      <li>{t.shopifyConnection?.step4AutoConnect || "You'll be automatically connected back here"}</li>
                    </ol>

                    <Button onClick={handleInstallFromAppStore} className="w-full text-sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t.shopifyConnection?.goToAppStore || "Go to Shopify App Store"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Manual API Keys Tab - For advanced users outside App Store */}
              <TabsContent value="manual" className="space-y-6">
                {/* Warning for manual API connection users */}
                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs text-amber-900 dark:text-amber-200">
                    <strong>⚠️ {t.shopifyConnection?.advancedUsersOnly || "Advanced Users Only"}</strong>
                    <br />
                    {t.shopifyConnection?.manualConnectionWarning || "This method is for developers or users who cannot install via the Shopify App Store. For App Store compliance, billing is handled differently."}
                  </AlertDescription>
                </Alert>

                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                    {t.shopifyConnection.newToShopify}
                  </AlertDescription>
                </Alert>

                <ShopifyTokenGuide />

                <div className="relative mt-6 p-6 space-y-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg shadow-primary/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t.shopifyConnection.connectionForm}</h3>
                      <p className="text-xs text-muted-foreground">{t.shopifyConnection.fillCredentials}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-commercial-name" className="text-sm font-medium">
                      {t.shopifyConnection.commercialName}
                    </Label>
                    <Input
                      id="manual-commercial-name"
                      placeholder={t.shopifyConnection.commercialNamePlaceholder}
                      value={manualCommercialName}
                      onChange={(e) => setManualCommercialName(e.target.value)}
                      disabled={manualLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.shopifyConnection.commercialNameHint}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-shop-name" className="text-sm font-medium">
                      {t.shopifyConnection.technicalCode}
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
                        {t.shopifyConnection.findInUrl}{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                          admin.shopify.com/store/<strong>HBxv99-2F</strong>
                        </code>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-api-key" className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-3.5 h-3.5" />
                      {t.shopifyConnection.apiKeyLabel}
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
                      {t.shopifyConnection.apiKeyHint}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-api-secret" className="text-sm font-medium flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      {t.shopifyConnection.adminApiToken}
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
                      {t.shopifyConnection.adminApiTokenHint}
                    </p>
                  </div>

                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                      <strong>✓ {t.shopifyConnection.advantage}</strong> {t.shopifyConnection.fullAccessFeatures}
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
                        {t.shopifyConnection.connectionInProgress}
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        {t.shopifyConnection.connectWithApiKeys}
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