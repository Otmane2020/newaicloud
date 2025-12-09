import React from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

interface ShopifyAppBridgeProviderProps {
  children: React.ReactNode;
}

// In App Bridge v4, the app bridge is automatically initialized
// This component just provides a context wrapper for consistency
export const ShopifyAppBridgeProvider: React.FC<ShopifyAppBridgeProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Custom hook to get App Bridge instance with error handling
export const useShopifyAppBridge = () => {
  try {
    const shopify = useAppBridge();
    return shopify;
  } catch {
    console.warn("[ShopifyAppBridge] Not in Shopify Admin context");
    return null;
  }
};
