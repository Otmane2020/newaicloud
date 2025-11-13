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
import { useTranslation } from "@/lib/language";

interface ShopifyConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialShopDomain?: string;
}

export function ShopifyConnectionWizard({ open, onOpenChange, onSuccess, initialShopDomain }: ShopifyConnectionWizardProps) {
  const [step, setStep] = useState<1 | 2>(initialShopDomain ? 2 : 1);
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { t } = useTranslation();

  // Step 1 data
  const [commercialName, setCommercialName] = useState(
    initialShopDomain 
      ? initialShopDomain.replace('.myshopify.com', '').split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      : ""
  );
  const [shopifyCode, setShopifyCode] = useState(initialShopDomain?.replace('.myshopify.com', '') || "");

  // Step 2 data (Manual)
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Step 2 data (OAuth)
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleNext = () => {
    if (!commercialName.trim()) {
      toast.error(t.wizards.shopify.commercialNameRequired);
      return;
    }
    if (!shopifyCode.trim()) {
      toast.error(t.wizards.shopify.shopifyCodeRequired);
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleOAuthConnect = async () => {
    if (!limits?.canAddShopifyStore) {
      toast.error(t.wizards.shopify.storeLimit, {
        description: t.wizards.shopify.storeLimitDescription,
      });
      return;
    }

    setOauthLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t.wizards.shopify.mustBeConnected);
        return;
      }

      const cleanShopifyCode = shopifyCode.trim().replace(".myshopify.com", "");
      const shopifyUrl = `${cleanShopifyCode}.myshopify.com`;

      const { data, error } = await supabase.functions.invoke("shopify-oauth", {
        body: {
          shopName: shopifyUrl,
          commercialName: commercialName.trim(),
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(t.wizards.shopify.authUrlError);
      }
    } catch (error: any) {
      console.error("OAuth connection error:", error);
      toast.error(error.message || t.wizards.shopify.oauthError);
    } finally {
      setOauthLoading(false);
    }
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
      if (!user) {
        toast.error(t.wizards.shopify.mustBeConnected);
        return;
      }

      const cleanShopifyCode = shopifyCode.trim().replace(".myshopify.com", "");
      const storeUrl = `${cleanShopifyCode}.myshopify.com`;

      console.log("[SHOPIFY-WIZARD] Validating credentials for:", storeUrl);

      // Validate credentials via backend
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        "validate-shopify-credentials",
        {
          body: {
            storeUrl,
            accessToken: apiSecret.trim(),
          },
        }
      );

      console.log("[SHOPIFY-WIZARD] Validation result:", { validationResult, validationError });

      if (validationError) {
        console.error("[SHOPIFY-WIZARD] Validation error:", validationError);
        toast.error(t.wizards.shopify.invalidCredentials, {
          description: validationError.message || "Erreur lors de la validation",
        });
        return;
      }

      if (!validationResult?.success) {
        console.error("[SHOPIFY-WIZARD] Validation failed:", validationResult);
        toast.error(t.wizards.shopify.invalidCredentials, {
          description: validationResult?.error || "Les identifiants sont incorrects",
        });
        return;
      }

      const publicDomain = validationResult.shop?.domain || null;

      // Check if store already exists
      const { data: existing } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_url", storeUrl)
        .single();

      if (existing) {
        toast.error(t.wizards.shopify.storeAlreadyConnected);
        return;
      }

      const { error: insertError } = await supabase.from("shopify_connections").insert({
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

      await supabase.rpc("increment_usage", {
        p_seller_id: user.id,
        p_field: "shopify_stores_count",
        p_increment: 1,
      });

      // Automatically fetch and update public domain from Shopify
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.functions.invoke('refresh-shopify-domains', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        }
      } catch (domainError) {
        console.error('[SHOPIFY-WIZARD] Failed to refresh domain:', domainError);
      }

      toast.success(t.wizards.shopify.storeConnectedSuccess);
      await refreshLimits();

      if (onSuccess) {
        onSuccess();
      } else {
        onOpenChange(false);
        resetForm();
        localStorage.setItem("shopify_just_connected", "true");
        localStorage.setItem("shopify_store_name", commercialName.trim());
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      console.error("Manual connection error:", error);
      toast.error(error.message || t.wizards.shopify.manualConnectionError);
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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 1 ? t.wizards.shopify.title : t.wizards.shopify.configTitle}</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors",
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            1
          </div>
          <div className="w-16 h-0.5 bg-muted" />
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors",
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            2
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="commercialName">
                {t.wizards.shopify.commercialName} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commercialName"
                placeholder={t.wizards.shopify.commercialNamePlaceholder}
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t.wizards.shopify.commercialNameDescription}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopifyCode">
                {t.wizards.shopify.shopifyCode} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="shopifyCode"
                  placeholder={t.wizards.shopify.shopifyCodePlaceholder}
                  value={shopifyCode}
                  onChange={(e) => setShopifyCode(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.myshopify.com</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.wizards.shopify.shopifyCodeDescription}<strong>qbxv98-9w</strong>
              </p>
            </div>

            <Button onClick={handleNext} className="w-full" size="lg">
              {t.wizards.shopify.nextStep}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {initialShopDomain && (
                <div className="text-xs text-primary mb-2 font-medium">
                  ✨ Boutique détectée automatiquement depuis Shopify
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{commercialName}</p>
                  <p className="text-sm text-muted-foreground">{shopifyCode}.myshopify.com</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.wizards.shopify.modify}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{t.wizards.shopify.chooseMethod}</p>

            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">
                  <Zap className="w-4 h-4 mr-2" />
                  {t.wizards.shopify.oauth}
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Key className="w-4 h-4 mr-2" />
                  {t.wizards.shopify.apiKeys}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">{t.wizards.shopify.oauthQuick}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.wizards.shopify.oauthDescription}
                  </p>
                </div>

                <Button onClick={handleOAuthConnect} disabled={oauthLoading} className="w-full" size="lg">
                  {oauthLoading ? t.wizards.shopify.redirecting : t.wizards.shopify.connectWithOAuth}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t.wizards.shopify.apiKey}</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder={t.wizards.shopify.apiKeyPlaceholder}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">{t.wizards.shopify.adminToken}</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      placeholder={t.wizards.shopify.adminTokenPlaceholder}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                    />
                  </div>

                  <ShopifyTokenGuide />

                  <Button onClick={handleManualConnect} disabled={manualLoading} className="w-full" size="lg">
                    {manualLoading ? t.wizards.shopify.connecting : t.wizards.shopify.connectStore}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Button variant="ghost" onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.wizards.shopify.back}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
