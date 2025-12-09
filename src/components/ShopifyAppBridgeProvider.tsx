import React, { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

interface ShopifyAppBridgeProviderProps {
  children: React.ReactNode;
}

/**
 * App Bridge v4 Provider
 * In v4, App Bridge is auto-initialized via the script tag added by Shopify.
 * This component ensures we're in the correct Shopify context.
 */
export const ShopifyAppBridgeProvider: React.FC<ShopifyAppBridgeProviderProps> = ({ children }) => {
  const host = new URLSearchParams(window.location.search).get("host");

  // If not in Shopify context (no host), render children without AppBridge
  if (!host) {
    console.warn("[ShopifyAppBridge] No host parameter - not in Shopify Admin context");
    return <>{children}</>;
  }

  // In App Bridge v4, initialization happens automatically
  // Just render children - the shopify global is available
  return <>{children}</>;
};

// Custom hook to safely use App Bridge v4
export const useShopifyAppBridge = () => {
  const [shopify, setShopify] = useState<any>(null);

  useEffect(() => {
    // In App Bridge v4, shopify is available on window
    if (typeof window !== "undefined" && (window as any).shopify) {
      setShopify((window as any).shopify);
    }
  }, []);

  return shopify;
};

// Hook wrapper for useAppBridge with error handling
export const useSafeAppBridge = () => {
  try {
    const shopify = useAppBridge();
    return shopify;
  } catch {
    console.warn("[ShopifyAppBridge] Not in Shopify Admin context");
    return null;
  }
};
