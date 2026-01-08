import React, { useEffect, useMemo, useState, createContext, useContext, useCallback } from "react";

type ShopifyGlobal = {
  config?: { shop?: string; host?: string };
  toast?: (opts: { message: string; isError?: boolean }) => void;
  idToken?: () => Promise<string>;
};

interface AiImagesAppBridgeContextValue {
  shopify: ShopifyGlobal | null;
  isEmbedded: boolean;
  host: string | null;
  shop: string | null;
  ready: boolean;
  getSessionToken: () => Promise<string | null>;
}

const AiImagesAppBridgeContext = createContext<AiImagesAppBridgeContextValue>({
  shopify: null,
  isEmbedded: false,
  host: null,
  shop: null,
  ready: false,
  getSessionToken: async () => null,
});

interface Props {
  children: React.ReactNode;
}

/**
 * ✅ AI Images - Shopify App Bridge v4 compliant provider
 * Uses AI_IMAGES specific credentials and OAuth endpoints
 */
export const AiImagesAppBridgeProvider: React.FC<Props> = ({ children }) => {
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const host = search.get("host");
  const shop = search.get("shop");

  // embedded=1 is the explicit indicator; iframe check covers some edge cases
  const isEmbedded =
    search.get("embedded") === "1" ||
    (() => {
      try {
        return window.top !== window.self;
      } catch {
        return true;
      }
    })();

  const [shopify, setShopify] = useState<ShopifyGlobal | null>(null);
  const [ready, setReady] = useState(false);

  // 1) If Shopify is trying to load embedded but host is missing -> bounce to install/auth once
  useEffect(() => {
    console.log("[AI-Images-AppBridge] Init check:", { isEmbedded, host, shop });
    
    if (!isEmbedded) {
      console.log("[AI-Images-AppBridge] Not embedded, setting ready");
      setReady(true);
      return;
    }

    // If host is missing, we must bounce through our backend (OAuth) to get host back.
    if (!host) {
      const bounced = sessionStorage.getItem("ai_images_host_bounce_done");

      // Prevent infinite loop: bounce only once per tab/session
      if (bounced === "1") {
        console.warn("[AI-Images-AppBridge] Embedded but missing host AFTER bounce. Rendering anyway.");
        setReady(true);
        return;
      }

      // We need shop to restart OAuth. If shop is missing too, we can't recover.
      if (!shop) {
        console.warn("[AI-Images-AppBridge] Embedded but missing both host and shop. Cannot recover.");
        setReady(true);
        return;
      }

      sessionStorage.setItem("ai_images_host_bounce_done", "1");

      // ✅ Redirect to AI Images OAuth entry to get host param restored
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const oauthUrl = `${supabaseUrl}/functions/v1/ai-images-shopify-install?shop=${encodeURIComponent(shop)}`;

      console.log("[AI-Images-AppBridge] Bouncing to OAuth:", oauthUrl);

      // Use top-level redirect to escape iframe restrictions
      try {
        window.top!.location.href = oauthUrl;
      } catch {
        window.location.href = oauthUrl;
      }
      return;
    }

    // If we have host, proceed to wait for App Bridge
    console.log("[AI-Images-AppBridge] Host found, waiting for window.shopify...");
  }, [isEmbedded, host, shop]);

  // 2) Wait for App Bridge v4 global to exist
  useEffect(() => {
    if (!isEmbedded) {
      setReady(true);
      return;
    }

    // Embedded mode with host: wait for window.shopify
    let cancelled = false;
    const startedAt = Date.now();

    const tick = () => {
      if (cancelled) return;

      const w = window as any;
      if (w.shopify) {
        console.log("[AI-Images-AppBridge] window.shopify found!");
        setShopify(w.shopify as ShopifyGlobal);
        setReady(true);
        return;
      }

      if (Date.now() - startedAt > 2000) {
        console.warn("[AI-Images-AppBridge] window.shopify not found after timeout. Continuing.");
        setReady(true);
        return;
      }

      setTimeout(tick, 50);
    };

    if (host) {
      tick();
    }

    return () => {
      cancelled = true;
    };
  }, [isEmbedded, host]);

  // Session token getter using App Bridge v4 idToken()
  const getSessionToken = useCallback(async (): Promise<string | null> => {
    if (!shopify?.idToken) {
      console.warn("[AI-Images-AppBridge] No idToken() available - not in embedded context or App Bridge not ready");
      return null;
    }
    
    try {
      const token = await shopify.idToken();
      console.log("[AI-Images-AppBridge] ✅ Session token obtained");
      return token;
    } catch (err) {
      console.error("[AI-Images-AppBridge] ❌ Failed to get session token:", err);
      return null;
    }
  }, [shopify]);

  // While bouncing / initializing, render a loading state
  if (isEmbedded && !ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading AI Product Image Shot...</p>
        </div>
      </div>
    );
  }

  return (
    <AiImagesAppBridgeContext.Provider value={{ shopify, isEmbedded, host, shop, ready, getSessionToken }}>
      {children}
    </AiImagesAppBridgeContext.Provider>
  );
};

// Hooks
export const useAiImagesAppBridge = () => useContext(AiImagesAppBridgeContext).shopify;
export const useAiImagesIsEmbedded = () => useContext(AiImagesAppBridgeContext).isEmbedded;
export const useAiImagesHost = () => useContext(AiImagesAppBridgeContext).host;
export const useAiImagesShop = () => useContext(AiImagesAppBridgeContext).shop;
export const useAiImagesBridgeReady = () => useContext(AiImagesAppBridgeContext).ready;
export const useAiImagesSessionToken = () => useContext(AiImagesAppBridgeContext).getSessionToken;
