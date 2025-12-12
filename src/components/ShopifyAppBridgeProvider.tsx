import React, { useEffect, useState, createContext, useContext } from "react";

interface ShopifyAppBridgeContextValue {
  shopify: any | null;
  isInShopifyAdmin: boolean;
}

const ShopifyAppBridgeContext = createContext<ShopifyAppBridgeContextValue>({
  shopify: null,
  isInShopifyAdmin: false,
});

interface ShopifyAppBridgeProviderProps {
  children: React.ReactNode;
}

/**
 * App Bridge v4 Provider
 * In v4, App Bridge is auto-initialized via the script tag added by Shopify.
 * This component provides the shopify context to children.
 */
export const ShopifyAppBridgeProvider: React.FC<ShopifyAppBridgeProviderProps> = ({ children }) => {
  const [shopify, setShopify] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  const host = new URLSearchParams(window.location.search).get("host");
  const isInShopifyAdmin = !!host;

  useEffect(() => {
    // Check for shopify global (App Bridge v4)
    const checkShopifyGlobal = () => {
      if (typeof window !== "undefined" && (window as any).shopify) {
        setShopify((window as any).shopify);
      }
      setIsReady(true);
    };

    // Give App Bridge time to initialize
    if (isInShopifyAdmin) {
      const timer = setTimeout(checkShopifyGlobal, 100);
      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
    }
  }, [isInShopifyAdmin]);

  // If not in Shopify context, render children immediately
  if (!isInShopifyAdmin) {
    console.warn("[ShopifyAppBridge] No host parameter - not in Shopify Admin context");
    return (
      <ShopifyAppBridgeContext.Provider value={{ shopify: null, isInShopifyAdmin: false }}>
        {children}
      </ShopifyAppBridgeContext.Provider>
    );
  }

  // Wait for initialization
  if (!isReady) {
    return null;
  }

  return (
    <ShopifyAppBridgeContext.Provider value={{ shopify, isInShopifyAdmin }}>
      {children}
    </ShopifyAppBridgeContext.Provider>
  );
};

// Custom hook to safely use App Bridge v4
export const useShopifyAppBridge = () => {
  const context = useContext(ShopifyAppBridgeContext);
  return context.shopify;
};

// Hook to check if we're in Shopify Admin
export const useIsInShopifyAdmin = () => {
  const context = useContext(ShopifyAppBridgeContext);
  return context.isInShopifyAdmin;
};

// Safe hook that doesn't throw
export const useSafeAppBridge = () => {
  const context = useContext(ShopifyAppBridgeContext);
  return context.shopify;
};
