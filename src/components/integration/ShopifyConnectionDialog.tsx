import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingBag, Shield, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/language";

// Shopify App Store URL - OAuth flow is the ONLY supported method per Shopify requirements
const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/newai-ai-seo-and-marketing";

interface ShopifyConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectionDialog({ open, onOpenChange }: ShopifyConnectionDialogProps) {
  const { t } = useTranslation();

  // OAuth via Shopify App Store - the ONLY allowed method per Shopify App Store requirements
  const handleInstallFromAppStore = () => {
    window.open(SHOPIFY_APP_STORE_URL, "_blank");
    toast.success(t.shopifyConnection?.redirectingToAppStore || "Redirecting to Shopify App Store", {
      description: t.shopifyConnection?.installFromAppStoreDesc || "Install the app from there, then return here."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingBag className="w-5 h-5" />
            {t.shopifyConnection?.title || "Connect a Shopify Store"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t.shopifyConnection?.installFromAppStore || "Install via Shopify App Store for secure OAuth connection"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6">
          <div className="space-y-6 pb-6">
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
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t.shopifyConnection?.step1ClickButton || "Click the button below to go to Shopify App Store"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t.shopifyConnection?.step2InstallApp || "Click 'Install' on the app page"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t.shopifyConnection?.step3Authorize || "Authorize the app permissions"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Select a plan via Shopify Billing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Access your dashboard and start optimizing</span>
                  </li>
                </ol>

                <Button onClick={handleInstallFromAppStore} className="w-full text-sm" size="lg">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t.shopifyConnection?.goToAppStore || "Go to Shopify App Store"}
                </Button>
              </div>
            </div>

            {/* Important notice about OAuth */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                <strong>Automatic Detection</strong>
                <br />
                Your store is automatically detected via OAuth. No manual URL or token entry required.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
