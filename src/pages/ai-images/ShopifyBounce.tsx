import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * ShopifyBounce - Intermediate page for OAuth redirect
 * 
 * Shopify blocks direct redirects to admin.shopify.com from external edge functions.
 * This page receives the OAuth callback, then redirects to Shopify Admin with the
 * proper origin (ai-images.newai.sale), which Shopify trusts.
 */
const ShopifyBounce = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pendingToken = searchParams.get("pending_token");
    const shop = searchParams.get("shop");
    const host = searchParams.get("host");

    console.log("[ShopifyBounce] Received params:", { pendingToken, shop, host });

    if (!shop) {
      console.error("[ShopifyBounce] Missing shop parameter");
      return;
    }

    // Build the Shopify Admin URL for the embedded app
    const appHandle = "ai-product-image-shot";
    const adminUrl = `https://${shop}/admin/apps/${appHandle}?pending_token=${pendingToken || ""}`;

    console.log("[ShopifyBounce] Redirecting to Shopify Admin:", adminUrl);
    
    // Use window.location.replace for a cleaner redirect (no back button)
    window.location.replace(adminUrl);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting to Shopify...</p>
        <p className="text-sm text-muted-foreground mt-2">Connexion à Shopify en cours...</p>
      </div>
    </div>
  );
};

export default ShopifyBounce;
