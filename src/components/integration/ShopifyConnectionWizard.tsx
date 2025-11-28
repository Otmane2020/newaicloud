import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, HelpCircle, Key, Loader2 } from "lucide-react";
import { ShopifyTokenGuide } from "./ShopifyTokenGuide";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import shopifyLogo from "@/assets/shopify-logo.svg";
import { useShopifySync } from "@/hooks/useShopifySync";

interface ShopifyConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShopifyConnectionWizard({ open, onOpenChange, onSuccess }: ShopifyConnectionWizardProps) {
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { refreshStores } = useStore();
  const { t } = useTranslation();
  const { syncShopifyStore } = useShopifySync();

  const [view, setView] = useState<'initial' | 'oauth' | 'api'>('initial');
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const handleOAuthConnect = async () => {
    if (!shopName.trim()) {
      toast.error(t.shopifyConnection.enterStoreName);
      return;
    }

    try {
      setManualLoading(true);
      
      const cleanShopName = shopName.trim().replace('.myshopify.com', '');
      
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t.shopifyConnection.pleaseLogin);
        setManualLoading(false);
        return;
      }
      
      console.log('[SHOPIFY-WIZARD] Calling shopify-oauth edge function for:', cleanShopName);
      
      // Call shopify-oauth to generate OAuth URL
      const { data, error } = await supabase.functions.invoke('shopify-oauth', {
        body: {
          shopName: `${cleanShopName}.myshopify.com`,
          commercialName: cleanShopName,
          preAuth: false  // User is already authenticated
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error || !data?.authUrl) {
        console.error('Failed to generate OAuth URL:', error);
        toast.error(t.shopifyConnection.connectionFailed);
        setManualLoading(false);
        return;
      }
      
      console.log('[SHOPIFY-WIZARD] Redirecting to OAuth URL:', data.authUrl);
      
      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting with Shopify:', error);
      toast.error(t.shopifyConnection.anErrorOccurred);
      setManualLoading(false);
    }
  };

  const handleManualConnect = async () => {
    if (!shopName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error(t.wizards.shopify.fillAllFields);
      return;
    }

    setManualLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t.wizards.shopify.mustBeConnected);

      // Vérification directe du nombre réel de boutiques dans la base
      const { data: currentStores, error: countError } = await supabase
        .from("shopify_connections")
        .select("id", { count: 'exact' })
        .eq("user_id", user.id);

      if (countError) {
        console.error('Error counting stores:', countError);
        throw new Error(t.wizards.shopify.manualConnectionError);
      }

      const currentStoreCount = currentStores?.length || 0;
      const maxStores = limits?.limits?.max_shopify_stores || 1;

      // Vérifier la limite du plan
      if (!limits?.canAddShopifyStore || currentStoreCount >= maxStores) {
        toast.error(t.wizards.shopify.storeLimit, {
          description: `${t.wizards.shopify.storeLimitDescription} (${currentStoreCount}/${maxStores})`,
        });
        setManualLoading(false);
        return;
      }

      // 1. Vérifier si le store n'existe pas déjà
      const { data: existingStore } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("api_key", apiKey)
        .maybeSingle();

      if (existingStore) {
        toast.error(t.wizards.shopify.storeAlreadyConnected);
        setManualLoading(false);
        return;
      }

      // 2. Tester les credentials via edge function (pour éviter CORS)
      const cleanShopName = shopName.trim().replace('.myshopify.com', '');
      const shopDomain = `${cleanShopName}.myshopify.com`;
      
      console.log('📞 Testing credentials for:', shopDomain);
      
      const { data: testData, error: testError } = await supabase.functions.invoke('test-shopify-credentials', {
        body: {
          shopDomain,
          apiKey,
          accessToken: apiSecret
        }
      });
      
      if (testError || !testData?.success) {
        console.error('❌ Credential test failed:', testError || testData?.error);
        throw new Error(testData?.error || t.wizards.shopify.invalidCredentials);
      }

      console.log('✅ Credentials valid for shop:', testData.shop?.name);
      const verifiedShopDomain = testData.shop?.domain || shopDomain;
      const commercialShopName = testData.shop?.name || shopName;

      // Check permissions
      const permissions = testData.permissions || {};
      const missingPermissions: string[] = [];
      
      if (!permissions.products) missingPermissions.push('Produits');
      if (!permissions.collections) missingPermissions.push('Collections');
      if (!permissions.pages) missingPermissions.push('Pages');
      if (!permissions.articles) missingPermissions.push('Articles');

      // 3. Insérer la nouvelle connexion avec les permissions
      const { data: newConnection, error: insertError } = await supabase
        .from("shopify_connections")
        .insert({
          user_id: user.id,
          store_url: verifiedShopDomain,
          store_name: commercialShopName,
          api_key: apiKey,
          access_token: apiSecret,
          connection_type: "api_keys",
          available_scopes: permissions,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Show warning if permissions are missing
      if (missingPermissions.length > 0) {
        toast.warning(t.shopifyConnection.limitedPermissions, {
          description: t.shopifyConnection.missingAccess.replace('{{permissions}}', missingPermissions.join(', ')),
          duration: 8000
        });
      }

      toast.success(t.shopifyConnection.storeConnectedSuccess);
      toast.info(t.shopifyConnection.autoSyncStarted, { duration: 5000 });

      // 4. Rafraîchir les limites d'usage et le contexte du store
      await refreshLimits();
      await refreshStores();

      // 5. Déclencher la synchronisation automatique
      if (newConnection) {
        console.log('🔄 [Wizard] Triggering automatic sync for new connection:', newConnection.id);
        try {
          await syncShopifyStore({
            id: newConnection.id,
            store_url: newConnection.store_url,
            store_name: newConnection.store_name || newConnection.store_url,
          });
        } catch (syncError) {
          console.error("❌ [Wizard] Error during auto-sync:", syncError);
        }
      }

      onSuccess?.();
      onOpenChange(false);
      
      // Réinitialiser le formulaire
      setShopName("");
      setApiKey("");
      setApiSecret("");
      setView('initial');
    } catch (error: any) {
      console.error("Error during manual connection:", error);
      toast.error(error.message || t.shopifyConnection.connectionFailed);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setView('initial');
        setShopName("");
        setApiKey("");
        setApiSecret("");
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {view === 'initial' ? (
          <div className="flex flex-col items-center gap-8 py-8">
            <img 
              src={shopifyLogo} 
              alt="Shopify" 
              className="h-24 w-24"
            />

            <h2 className="text-3xl font-semibold text-center">
              {t.shopifyConnection.connectYourStore}
            </h2>

            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={() => setView('oauth')}
                className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                size="lg"
              >
                {t.shopifyConnection.connectStore}
              </Button>

              <Button
                onClick={() => setView('api')}
                variant="outline"
                className="w-full h-14 text-lg border-2 rounded-lg"
                size="lg"
              >
                {t.shopifyConnection.apiKeysConnection}
              </Button>
            </div>
          </div>
        ) : view === 'oauth' ? (
          <div className="space-y-6 p-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('initial')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-xl">
                {t.shopifyConnection.oauthShopifyConnection}
              </DialogTitle>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="oauthShopName" className="text-base font-semibold">
                  {t.shopifyConnection.shopName}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.shopifyConnection.enterShopName}
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    id="oauthShopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="ma-boutique"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && shopName.trim()) {
                        handleOAuthConnect();
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
                    .myshopify.com
                  </span>
                </div>
                {shopName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.shopifyConnection.domain}: <span className="font-mono font-semibold">{shopName.trim().replace('.myshopify.com', '')}.myshopify.com</span>
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleOAuthConnect}
              disabled={manualLoading || !shopName.trim()}
              className="w-full"
              size="lg"
            >
              {manualLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.shopifyConnection.connectionInProgress}
                </>
              ) : (
                t.shopifyConnection.continueToShopify
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 p-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('initial')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-xl">
                {t.shopifyConnection.apiKeysConnection}
              </DialogTitle>
            </div>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                <HelpCircle className="h-4 w-4" />
                {t.shopifyConnection.howToGenerateApiKeys}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <ShopifyTokenGuide />
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-4">
              <div>
                <Label htmlFor="shopName" className="text-base font-semibold">
                  1️⃣ {t.shopifyConnection.shopName}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.shopifyConnection.enterShopName}
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="ma-boutique"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
                    .myshopify.com
                  </span>
                </div>
                {shopName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.shopifyConnection.fullDomain}: <span className="font-mono font-semibold">{shopName.trim().replace('.myshopify.com', '')}.myshopify.com</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="apiKey" className="text-base font-semibold">
                  2️⃣ {t.shopifyConnection.apiKey}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.shopifyConnection.yourApiKey}
                </p>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="abc123def456ghi789jkl012mno345pq"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret" className="text-base font-semibold">
                  3️⃣ {t.shopifyConnection.adminApiAccessToken}
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.shopifyConnection.yourAdminToken}
                </p>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="shpat_xx11yy22zz33aa44bb55cc66dd77ee88"
                />
              </div>
            </div>

            <Button
              onClick={handleManualConnect}
              disabled={manualLoading}
              className="w-full"
            >
              {manualLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.shopifyConnection.connecting}
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  {t.shopifyConnection.connectWithApiKeys}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
