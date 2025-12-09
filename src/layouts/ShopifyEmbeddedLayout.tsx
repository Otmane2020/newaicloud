import React from "react";
import { Outlet } from "react-router-dom";
import { ShopifyAppBridgeProvider } from "@/components/ShopifyAppBridgeProvider";
import { Toaster } from "@/components/ui/sonner";

export const ShopifyEmbeddedLayout: React.FC = () => {
  return (
    <ShopifyAppBridgeProvider>
      <div className="min-h-screen bg-background">
        <Outlet />
        <Toaster />
      </div>
    </ShopifyAppBridgeProvider>
  );
};
