import { useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";

/**
 * AI Images Shopify Install Page
 * Handles the initial Shopify installation redirect to the Edge Function
 */
const AiImagesShopifyInstall = () => {
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const hmac = params.get("hmac");
    const timestamp = params.get("timestamp");
    const host = params.get("host");

    console.log("🔧 AiImagesShopifyInstall - Params:", { shop, hmac: !!hmac, timestamp, host: !!host });

    if (!shop || !hmac || !timestamp) {
      setError("Missing required Shopify parameters. Please try installing from the Shopify App Store.");
      return;
    }

    // Redirect to the Edge Function with all params
    setIsRedirecting(true);
    
    const edgeFunctionUrl = new URL(
      "https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/ai-images-shopify-install"
    );
    
    // Pass all params to edge function
    params.forEach((value, key) => {
      edgeFunctionUrl.searchParams.set(key, value);
    });

    console.log("🔧 Redirecting to Edge Function:", edgeFunctionUrl.toString());
    
    // Redirect to edge function for OAuth
    window.location.href = edgeFunctionUrl.toString();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <Store className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Installation Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="https://apps.shopify.com"
            className="text-primary hover:underline"
          >
            Return to Shopify App Store
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">
          {isRedirecting ? "Connecting to Shopify..." : "Preparing Installation..."}
        </h1>
        <p className="text-muted-foreground">
          Please wait while we set up AI Product Image Shot for your store.
        </p>
      </div>
    </div>
  );
};

export default AiImagesShopifyInstall;
