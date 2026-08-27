import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ExternalLink, HelpCircle, Key, Loader2 } from "lucide-react";
import { ShopifyTokenGuide } from "./ShopifyTokenGuide";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import shopifyLogo from "@/assets/shopify-logo.svg";
import { useShopifySync } from "@/hooks/useShopifySync";
import { useAuth } from "@/contexts/AuthContext";

// Email autorisé à tester OAuth pendant la validation Shopify
const OAUTH_TEST_EMAIL = 'sweet.deco.meubles@gmail.com';
const SHOPIFY_APP_STORE_URL = 'https://apps.shopify.com/newai-seo-and-marketing-scale';
const SHOPIFY_SHOP_STORAGE_KEY = 'newai_shopify_shop';
const SHOPIFY_CLIENT_ID_STORAGE_KEY = 'newai_shopify_client_id';
const SHOPIFY_CLIENT_SECRET_SESSION_KEY = 'newai_shopify_client_secret';

const readStorage = (storage: 'local' | 'session', key: string) => {
  if (typeof window === 'undefined') return '';
  return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key) || '';
};
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
  const { user } = useAuth();
  
  // Seul l'utilisateur test peut utiliser OAuth
  const canUseOAuth = user?.email === OAUTH_TEST_EMAIL;

  const [view, setView] = useState<'initial' | 'oauth' | 'api'>('initial');
  const [shopName, setShopName] = useState(() => readStorage('local', SHOPIFY_SHOP_STORAGE_KEY));
  const [apiKey, setApiKey] = useState(() => readStorage('local', SHOPIFY_CLIENT_ID_STORAGE_KEY));
  const [apiSecret, setApiSecret] = useState(() => readStorage('session', SHOPIFY_CLIENT_SECRET_SESSION_KEY));
  const [manualLoading, setManualLoading] = useState(false);

  const handleAppInstall = () => {
    window.location.assign(SHOPIFY_APP_STORE_URL);
  };

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

    // Keep the form open and populated until the connection succeeds.
    const savedShopName = shopName.trim();
    const savedApiKey = apiKey.trim();
    const savedApiSecret = apiSecret.trim();

    setManualLoading(true);
    const loadingToastId = toast.loading(t.shopifyConnection.connecting);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.dismiss(loadingToastId);
        toast.error(t.wizards.shopify.mustBeConnected);
        return;
      }

      // Vérification directe du nombre réel de boutiques dans la base
      const { data: currentStores, error: countError } = await supabase
        .from("shopify_connections")
        .select("id", { count: 'exact' })
        .eq("user_id", currentUser.id);

      if (countError) {
        console.error('Error counting stores:', countError);
        toast.dismiss(loadingToastId);
        toast.error(t.wizards.shopify.manualConnectionError);
        return;
      }

      const currentStoreCount = currentStores?.length || 0;
      const maxStores = limits?.limits?.max_shopify_stores || 1;

      // Vérifier la limite du plan
      if (!limits?.canAddShopifyStore || currentStoreCount >= maxStores) {
        toast.dismiss(loadingToastId);
        toast.error(t.wizards.shopify.storeLimit, {
          description: `${t.wizards.shopify.storeLimitDescription} (${currentStoreCount}/${maxStores})`,
        });
        return;
      }

      // 1. Vérifier si le store n'existe pas déjà
      const { data: existingStore } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("api_key", savedApiKey)
        .maybeSingle();

      if (existingStore) {
        toast.dismiss(loadingToastId);
        toast.error(t.wizards.shopify.storeAlreadyConnected);
        return;
      }

      // 2. Tester les credentials via edge function (pour éviter CORS)
      // The Edge Function accepts a store slug, myshopify.com domain, or admin.shopify.com/store URL.
      const shopDomain = savedShopName;

      console.log('📞 Testing credentials for:', shopDomain);
      
      const { data: testData, error: testError } = await supabase.functions.invoke('test-shopify-credentials', {
        body: {
          shopDomain,
          clientId: savedApiKey,
          clientSecret: savedApiSecret
        }
      });
      
      if (testError || !testData?.success) {
        console.error('❌ Credential test failed:', testError || testData?.error);
        toast.dismiss(loadingToastId);
        toast.error(testData?.error || t.wizards.shopify.invalidCredentials, {
          description: testData?.details || undefined,
          duration: 10000,
        });
        return;
      }

      console.log('✅ Credentials valid for shop:', testData.shop?.name);
      const verifiedShopDomain = testData.shop?.domain || shopDomain;
      const commercialShopName = testData.shop?.name || savedShopName;

      if (!testData.accessToken) {
        toast.dismiss(loadingToastId);
        toast.error('Shopify did not return an access token');
        return;
      }

      // Encrypt the Client secret before it is persisted.
      const { data: encryptedSecret, error: encryptionError } = await supabase.functions.invoke('encrypt-shopify-token', {
        body: { action: 'encrypt', token: savedApiSecret }
      });

      if (encryptionError || !encryptedSecret?.encrypted || !encryptedSecret?.iv) {
        console.error('❌ Client secret encryption failed:', encryptionError);
        toast.dismiss(loadingToastId);
        toast.error('Impossible de sécuriser le Client secret');
        return;
      }

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
          user_id: currentUser.id,
          store_url: verifiedShopDomain,
          store_name: commercialShopName,
          api_key: savedApiKey,
          access_token: testData.accessToken,
          encrypted_token: encryptedSecret.encrypted,
          token_iv: encryptedSecret.iv,
          is_encrypted: true,
          connection_type: "client_credentials",
          available_scopes: {
            ...permissions,
            auth_type: "client_credentials",
            token_expires_at: new Date(Date.now() + (testData.expiresIn || 86399) * 1000).toISOString()
          },
        })
        .select()
        .single();

      if (insertError) {
        toast.dismiss(loadingToastId);
        toast.error(t.shopifyConnection.connectionFailed);
        return;
      }

      // Dismiss loading toast et afficher succès
      toast.dismiss(loadingToastId);

      // Show warning if permissions are missing
      if (missingPermissions.length > 0) {
        toast.warning(t.shopifyConnection.limitedPermissions, {
          description: t.shopifyConnection.missingAccess.replace('{{permissions}}', missingPermissions.join(', ')),
          duration: 8000
        });
      }

      toast.success(t.shopifyConnection.storeConnectedSuccess);
      toast.info(t.shopifyConnection.autoSyncStarted, { duration: 5000 });

      setShopName("");
      setApiKey("");
      setApiSecret("");
      window.localStorage.removeItem(SHOPIFY_SHOP_STORAGE_KEY);
      window.localStorage.removeItem(SHOPIFY_CLIENT_ID_STORAGE_KEY);
      window.sessionStorage.removeItem(SHOPIFY_CLIENT_SECRET_SESSION_KEY);
      setView('initial');
      onOpenChange(false);

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
    } catch (error: any) {
      console.error("Error during manual connection:", error);
      toast.dismiss(loadingToastId);
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
                onClick={handleAppInstall}
                className="w-full h-14 text-lg bg-[#008060] text-white hover:bg-[#006e52] rounded-lg"
                size="lg"
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Install the Shopify app
              </Button>

              {canUseOAuth && (
                <Button
                  onClick={() => setView('oauth')}
                  variant="outline"
                  className="w-full h-14 text-lg border-2 rounded-lg"
                  size="lg"
                >
                  {t.shopifyConnection.connectStore} (OAuth)
                </Button>
              )}

              <Button
                onClick={() => setView('api')}
                variant="ghost"
                className="w-full h-12 text-base rounded-lg"
                size="lg"
              >
                Dev Dashboard credentials
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Installing the app securely connects the store with Shopify OAuth and makes it appear here automatically.
              </p>
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
                    onChange={(e) => {
                      const value = e.target.value;
                      setShopName(value);
                      window.localStorage.setItem(SHOPIFY_SHOP_STORAGE_KEY, value);
                    }}
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
                Client ID & Secret
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
                    onChange={(e) => {
                      const value = e.target.value;
                      setShopName(value);
                      window.localStorage.setItem(SHOPIFY_SHOP_STORAGE_KEY, value);
                    }}
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
                  2️⃣ Client ID
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Copiez le Client ID depuis Dev Dashboard → Settings
                </p>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const value = e.target.value;
                    setApiKey(value);
                    window.localStorage.setItem(SHOPIFY_CLIENT_ID_STORAGE_KEY, value);
                  }}
                  placeholder="Client ID"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret" className="text-base font-semibold">
                  3️⃣ Client secret
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Copiez le Secret depuis Dev Dashboard → Settings
                </p>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => {
                    const value = e.target.value;
                    setApiSecret(value);
                    window.sessionStorage.setItem(SHOPIFY_CLIENT_SECRET_SESSION_KEY, value);
                  }}
                  placeholder="Client secret"
                />
              </div>
            </div>

            <Button
              onClick={handleManualConnect}
              disabled={manualLoading}
              className="w-full"
            >
              {manualLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              {manualLoading ? t.shopifyConnection.connectionInProgress : 'Connecter avec Client ID & Secret'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
