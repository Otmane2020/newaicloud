import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { toast } from "sonner";
import { useState } from "react";

const ShopifyInstallGuide = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shop = searchParams.get("shop");
  const [installing, setInstalling] = useState(false);

  const handleInstallApp = async () => {
    if (!shop) {
      toast.error("Shop parameter missing");
      return;
    }

    setInstalling(true);
    try {
      console.log("[GUIDE] Initiating pre-auth OAuth for:", shop);
      
      const response = await fetch(
        `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shopName: shop,
            commercialName: shop,
            preAuth: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initiate OAuth");
      }

      const data = await response.json();
      
      if (data.authUrl) {
        console.log("[GUIDE] Redirecting to Shopify:", data.authUrl);
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL received");
      }
    } catch (error) {
      console.error("[GUIDE] Install error:", error);
      toast.error("Failed to start installation. Please try again.");
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <ShoppingBag className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl">{t.integration.installGuide.title}</CardTitle>
              <CardDescription className="text-base">
                {t.integration.installGuide.subtitle}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {shop && (
                <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">{t.integration.installGuide.storeDetected}</p>
                  <p className="font-semibold text-lg text-primary">{shop}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.integration.installGuide.autoFilled}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t.integration.installGuide.step1.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.integration.installGuide.step1.description}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t.integration.installGuide.step2.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.integration.installGuide.step2.description}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t.integration.installGuide.step3.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.integration.installGuide.step3.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                {shop && (
                  <Button
                    onClick={handleInstallApp}
                    className="w-full"
                    size="lg"
                    disabled={installing}
                  >
                    {installing ? "Installation en cours..." : "🚀 Installer l'app maintenant"}
                    {!installing && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                )}
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate(`/auth?mode=signup&redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={installing}
                >
                  {t.integration.installGuide.createAccount}
                </Button>
                
                <Button
                  onClick={() => navigate(`/auth?mode=login&redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  variant="ghost"
                  className="w-full"
                  size="lg"
                  disabled={installing}
                >
                  {t.integration.installGuide.alreadyHaveAccount}
                </Button>
              </div>

              <div className="bg-gradient-subtle rounded-lg p-4 text-center border">
                <p className="text-xs text-muted-foreground">
                  {t.integration.installGuide.secureConnection}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstallGuide;
