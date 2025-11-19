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

interface ShopifyConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShopifyConnectionWizard({ open, onOpenChange, onSuccess }: ShopifyConnectionWizardProps) {
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { refreshStores } = useStore();
  const { t } = useTranslation();

  const [showApiForm, setShowApiForm] = useState(false);
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const handleConnectWithShopify = () => {
    const shopifyDevUrl = "https://admin.shopify.com/?organization_id=171858626&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D2b48b327b99e7d7c8eb589c5dee9ef55";
    
    console.log("[SHOPIFY-WIZARD] Redirecting to Shopify OAuth");
    window.location.href = shopifyDevUrl;
  };

  const handleManualConnect = async () => {
    if (!shopName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error(t.wizards.shopify.fillAllFields);
      return;
    }

    if (!limits?.canAddShopifyStore) {
      toast.error(t.wizards.shopify.storeLimit, {
        description: t.wizards.shopify.storeLimitDescription,
      });
      return;
    }

    setManualLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t.wizards.shopify.mustBeConnected);

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

      // Check permissions
      const permissions = testData.permissions || {};
      const missingPermissions: string[] = [];
      
      if (!permissions.products) missingPermissions.push('Produits');
      if (!permissions.collections) missingPermissions.push('Collections');
      if (!permissions.pages) missingPermissions.push('Pages');
      if (!permissions.articles) missingPermissions.push('Articles');

      // 3. Insérer la nouvelle connexion avec les permissions
      const { error: insertError } = await supabase.from("shopify_connections").insert({
        user_id: user.id,
        store_url: verifiedShopDomain,
        store_name: verifiedShopDomain?.replace('.myshopify.com', ''),
        api_key: apiKey,
        access_token: apiSecret,
        connection_type: "api_keys",
        available_scopes: permissions,
      });

      if (insertError) throw insertError;

      // Show warning if permissions are missing
      if (missingPermissions.length > 0) {
        toast.warning('Permissions limitées détectées', {
          description: `Accès manquant: ${missingPermissions.join(', ')}. Certaines fonctionnalités seront désactivées. Vérifiez les permissions API dans Shopify Admin.`,
          duration: 8000
        });
      }

      toast.success("Store connected successfully!");

      // 4. Rafraîchir les limites d'usage et le contexte du store
      await refreshLimits();
      await refreshStores();

      onSuccess?.();
      onOpenChange(false);
      
      // Réinitialiser le formulaire
      setShopName("");
      setApiKey("");
      setApiSecret("");
      setShowApiForm(false);
    } catch (error: any) {
      console.error("Error during manual connection:", error);
      toast.error(error.message || "Failed to connect store");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setShowApiForm(false);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showApiForm ? (
          <div className="flex flex-col items-center gap-8 py-8">
            <img 
              src={shopifyLogo} 
              alt="Shopify" 
              className="h-24 w-24"
            />

            <h2 className="text-3xl font-semibold text-center">
              Connectez votre boutique Shopify
            </h2>

            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={handleConnectWithShopify}
                className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                size="lg"
              >
                Connecter votre boutique
              </Button>

              <Button
                onClick={() => setShowApiForm(true)}
                variant="outline"
                className="w-full h-14 text-lg border-2 rounded-lg"
                size="lg"
              >
                Connexion avec clés API
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowApiForm(false)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-xl">
                Connexion avec clés API
              </DialogTitle>
            </div>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                <HelpCircle className="h-4 w-4" />
                Comment générer vos clés API
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <ShopifyTokenGuide />
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-4">
              <div>
                <Label htmlFor="shopName" className="text-base font-semibold">
                  1️⃣ Nom de la boutique
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Entrez le nom de votre boutique Shopify
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
                    Domaine complet: <span className="font-mono font-semibold">{shopName.trim().replace('.myshopify.com', '')}.myshopify.com</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="apiKey" className="text-base font-semibold">
                  2️⃣ API Key
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Votre clé API Shopify
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
                  3️⃣ Admin API Access Token
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Votre token d'accès API Admin
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
                  Connecting...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Connect with API Keys
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
