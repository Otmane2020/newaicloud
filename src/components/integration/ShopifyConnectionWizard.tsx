import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Store, Key, Zap } from "lucide-react";
import { ShopifyTokenGuide } from "./ShopifyTokenGuide";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUsageLimits } from "@/hooks/useUsageLimits";

interface ShopifyConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionWizard({ open, onOpenChange }: ShopifyConnectionWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const { limits, refresh: refreshLimits } = useUsageLimits();

  // Step 1 data
  const [commercialName, setCommercialName] = useState("");
  const [shopifyCode, setShopifyCode] = useState("");

  // Step 2 data (Manual)
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Step 2 data (OAuth)
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleNext = () => {
    if (!commercialName.trim()) {
      toast.error("Le nom commercial est requis");
      return;
    }
    if (!shopifyCode.trim()) {
      toast.error("Le code Shopify est requis");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleOAuthConnect = async () => {
    if (!limits?.canAddShopifyStore) {
      toast.error('Limite de boutiques atteinte', {
        description: `Vous avez atteint le maximum (${limits?.usage.shopify_stores_count}/${limits?.limits.max_shopify_stores}). Passez à un forfait supérieur.`,
      });
      return;
    }

    setOauthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté");
        return;
      }

      const cleanShopifyCode = shopifyCode.trim().replace('.myshopify.com', '');
      const shopifyUrl = `${cleanShopifyCode}.myshopify.com`;

      const { data, error } = await supabase.functions.invoke('shopify-oauth', {
        body: { 
          shopName: shopifyUrl,
          commercialName: commercialName.trim()
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("URL d'authentification non reçue");
      }
    } catch (error: any) {
      console.error("OAuth connection error:", error);
      toast.error(error.message || "Erreur lors de la connexion OAuth");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleManualConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!limits?.canAddShopifyStore) {
      toast.error('Limite de boutiques atteinte', {
        description: `Vous avez atteint le maximum (${limits?.usage.shopify_stores_count}/${limits?.limits.max_shopify_stores}). Passez à un forfait supérieur.`,
      });
      return;
    }

    setManualLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      const cleanShopifyCode = shopifyCode.trim().replace('.myshopify.com', '');
      const storeUrl = `${cleanShopifyCode}.myshopify.com`;

      // Validate credentials and fetch shop info
      const shopInfoResponse = await fetch(`https://${storeUrl}/admin/api/2025-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': apiSecret.trim(),
          'Content-Type': 'application/json',
        },
      });

      if (!shopInfoResponse.ok) {
        toast.error("Identifiants invalides. Vérifiez vos clés API.");
        return;
      }

      const shopInfo = await shopInfoResponse.json();
      const publicDomain = shopInfo.shop?.domain || null;

      // Check if store already exists
      const { data: existing } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_url', storeUrl)
        .single();

      if (existing) {
        toast.error("Cette boutique est déjà connectée");
        return;
      }

      const { error: insertError } = await supabase
        .from('shopify_connections')
        .insert({
          user_id: user.id,
          store_url: storeUrl,
          public_domain: publicDomain,
          store_name: commercialName.trim(),
          api_key: apiKey.trim(),
          access_token: apiSecret.trim(),
          is_active: true,
          connection_type: "manual",
          connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'shopify_stores_count',
        p_increment: 1
      });

      toast.success("Boutique connectée avec succès ! 🎉");
      await refreshLimits();
      
      onOpenChange(false);
      resetForm();

      localStorage.setItem('shopify_just_connected', 'true');
      localStorage.setItem('shopify_store_name', commercialName.trim());
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Manual connection error:", error);
      toast.error(error.message || "Erreur lors de la connexion manuelle");
    } finally {
      setManualLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCommercialName("");
    setShopifyCode("");
    setApiKey("");
    setApiSecret("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Connecter une boutique Shopify" : "Configuration des accès"}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors",
            step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            1
          </div>
          <div className="w-16 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors",
            step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            2
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="commercialName">
                Nom commercial <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commercialName"
                placeholder="Decora Home, Ma Boutique..."
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Le nom qui apparaîtra dans l'interface
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopifyCode">
                Code technique Shopify <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="shopifyCode"
                  placeholder="qnxv91-2w"
                  value={shopifyCode}
                  onChange={(e) => setShopifyCode(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .myshopify.com
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Trouvez-le dans l'URL : admin.shopify.com/store/<strong>qnxv91-2w</strong>
              </p>
            </div>

            <Button onClick={handleNext} className="w-full" size="lg">
              Étape suivante
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{commercialName}</p>
                  <p className="text-sm text-muted-foreground">
                    {shopifyCode}.myshopify.com
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Choisissez votre méthode de connexion :
            </p>

            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">
                  <Zap className="w-4 h-4 mr-2" />
                  OAuth (Recommandé)
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Key className="w-4 h-4 mr-2" />
                  Clés API
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Connexion rapide en 1 clic ⚡</p>
                  <p className="text-xs text-muted-foreground">
                    Pas besoin de créer des clés API manuellement. Shopify gérera l'authentification de manière sécurisée.
                  </p>
                </div>

                <Button 
                  onClick={handleOAuthConnect} 
                  disabled={oauthLoading}
                  className="w-full"
                  size="lg"
                >
                  {oauthLoading ? "Redirection..." : "Connecter avec Shopify OAuth"}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Votre API Key Shopify"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">Admin API Access Token</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      placeholder="shpat_..."
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                    />
                  </div>

                  <ShopifyTokenGuide />

                  <Button 
                    onClick={handleManualConnect}
                    disabled={manualLoading}
                    className="w-full"
                    size="lg"
                  >
                    {manualLoading ? "Connexion..." : "Connecter la boutique"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Button variant="ghost" onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
