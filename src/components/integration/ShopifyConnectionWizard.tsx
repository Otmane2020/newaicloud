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
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const handleConnectWithShopify = () => {
    const shopifyDevUrl = "https://admin.shopify.com/?organization_id=171858626&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D2b48b327b99e7d7c8eb589c5dee9ef55";
    
    console.log("[SHOPIFY-WIZARD] Redirecting to Shopify OAuth");
    window.location.href = shopifyDevUrl;
  };

  const handleManualConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
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

      // 2. Tester les credentials via l'API Shopify
      const testResponse = await fetch(`https://${apiKey}:${apiSecret}@shopify.com/admin/api/2024-01/shop.json`);
      
      if (!testResponse.ok) {
        throw new Error(t.wizards.shopify.invalidCredentials);
      }

      const testData = await testResponse.json();
      const shopDomain = testData.shop?.myshopify_domain || testData.shop?.domain;

      // 3. Insérer la nouvelle connexion
      const { error: insertError } = await supabase.from("shopify_connections").insert({
        user_id: user.id,
        store_url: shopDomain,
        store_name: shopDomain?.replace('.myshopify.com', ''),
        api_key: apiKey,
        access_token: apiSecret,
        connection_type: "api_keys",
      });

      if (insertError) throw insertError;

      toast.success("Store connected successfully!");

      // 4. Rafraîchir les limites d'usage et le contexte du store
      await refreshLimits();
      await refreshStores();

      onSuccess?.();
      onOpenChange(false);
      
      // Réinitialiser le formulaire
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
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="abc123def456ghi789jkl012mno345pq"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret">Admin API Access Token</Label>
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
