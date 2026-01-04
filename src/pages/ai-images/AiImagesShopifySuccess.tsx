import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AI Images Shopify Success Page
 * Displayed after successful OAuth installation
 */
const AiImagesShopifySuccess = () => {
  const [countdown, setCountdown] = useState(3);
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const host = params.get("host");

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to embedded dashboard or Shopify admin
          if (host) {
            // Embedded redirect
            const decodedHost = atob(host);
            window.location.href = `https://${decodedHost}/apps/ai-product-image-shot`;
          } else if (shop) {
            // Fallback to Shopify admin
            window.location.href = `https://${shop}/admin/apps`;
          } else {
            // Fallback to landing
            window.location.href = "/";
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [host, shop]);

  const handleContinue = () => {
    if (host) {
      const decodedHost = atob(host);
      window.location.href = `https://${decodedHost}/apps/ai-product-image-shot`;
    } else if (shop) {
      window.location.href = `https://${shop}/admin/apps`;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md p-6">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Installation Complete!</h1>
        
        <p className="text-muted-foreground mb-6">
          AI Product Image Shot has been successfully installed on your store.
          {shop && (
            <span className="block mt-1 font-medium text-foreground">
              {shop.replace('.myshopify.com', '')}
            </span>
          )}
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting in {countdown}s...</span>
        </div>

        <Button onClick={handleContinue} className="w-full">
          Open Dashboard Now
        </Button>
      </div>
    </div>
  );
};

export default AiImagesShopifySuccess;
