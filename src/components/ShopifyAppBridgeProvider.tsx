import React, { useEffect, useMemo, useState, createContext, useContext } from "react";

type ShopifyGlobal = {
  config?: { shop?: string; host?: string };
  toast?: (opts: { message: string; isError?: boolean }) => void;
};

interface ShopifyAppBridgeContextValue {
  shopify: ShopifyGlobal | null;
  isEmbedded: boolean;
  host: string | null;
  shop: string | null;
  ready: boolean;
}

const ShopifyAppBridgeContext = createContext<ShopifyAppBridgeContextValue>({
  shopify: null,
  isEmbedded: false,
  host: null,
  shop: null,
  ready: false,
});

interface Props {
  children: React.ReactNode;
}

/**
 * ✅ Shopify App Bridge v4 compliant provider
 *
 * Goals:
 * - Detect embedded context via `embedded=1` OR being inside an iframe
 * - If embedded but missing `host`, perform a SINGLE OAuth bounce to restore host
 * - Wait for `window.shopify` to exist (poll briefly) before marking ready
 * - Never "render standalone" by accident when Shopify is trying to load embedded
 */
export const ShopifyAppBridgeProvider: React.FC<Props> = ({ children }) => {
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
        // Cross-origin access throws => we're in an iframe
        return true;
      }
    })();

  const [shopify, setShopify] = useState<ShopifyGlobal | null>(null);
  const [ready, setReady] = useState(false);

  // 1) If Shopify is trying to load embedded but host is missing -> bounce to install/auth once
  useEffect(() => {
    if (!isEmbedded) return;

    // If host is missing, we must bounce through our backend (OAuth) to get host back.
    if (!host) {
      const bounced = sessionStorage.getItem("shopify_host_bounce_done");

      // Prevent infinite loop: bounce only once per tab/session
      if (bounced === "1") {
        console.warn("[ShopifyAppBridge] Embedded but missing host AFTER bounce. Rendering anyway.");
        setReady(true);
        return;
      }

      // We need shop to restart OAuth. If shop is missing too, we can't recover.
      if (!shop) {
        console.warn("[ShopifyAppBridge] Embedded but missing both host and shop. Cannot recover.");
        setReady(true);
        return;
      }

      sessionStorage.setItem("shopify_host_bounce_done", "1");

      // ✅ Redirect to OAuth entry to get host param restored
      const oauthUrl = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-oauth?shop=${encodeURIComponent(
        shop
      )}&return_to=${encodeURIComponent(window.location.pathname + window.location.search)}`;

      // Use top-level redirect to escape iframe restrictions in some cases
      try {
        window.top!.location.href = oauthUrl;
      } catch {
        window.location.href = oauthUrl;
      }
      return;
    }

    // If we have host, we can proceed
  }, [isEmbedded, host, shop]);

  // 2) Wait for App Bridge v4 global to exist
  useEffect(() => {
    if (!isEmbedded) {
      // Standalone mode: no App Bridge needed
      setReady(true);
      return;
    }

    // Embedded mode but host exists:
    // Wait up to ~2s for window.shopify to appear
    let cancelled = false;
    const startedAt = Date.now();

    const tick = () => {
      if (cancelled) return;

      const w = window as any;
      if (w.shopify) {
        setShopify(w.shopify as ShopifyGlobal);
        setReady(true);
        return;
      }

      if (Date.now() - startedAt > 2000) {
        console.warn("[ShopifyAppBridge] window.shopify not found after timeout. Continuing.");
        setReady(true);
        return;
      }

      setTimeout(tick, 50);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [isEmbedded, host]);

  // While bouncing / initializing, render nothing to avoid guards redirecting and creating loops
  if (isEmbedded && !ready) return null;

  return (
    <ShopifyAppBridgeContext.Provider value={{ shopify, isEmbedded, host, shop, ready }}>
      {children}
    </ShopifyAppBridgeContext.Provider>
  );
};

// Hooks
export const useShopifyAppBridge = () => useContext(ShopifyAppBridgeContext).shopify;
export const useIsEmbeddedShopify = () => useContext(ShopifyAppBridgeContext).isEmbedded;
export const useShopifyHost = () => useContext(ShopifyAppBridgeContext).host;
export const useShopifyShop = () => useContext(ShopifyAppBridgeContext).shop;
export const useShopifyBridgeReady = () => useContext(ShopifyAppBridgeContext).ready;

// Legacy alias for compatibility
export const useIsInShopifyAdmin = useIsEmbeddedShopify;
export const useSafeAppBridge = useShopifyAppBridge;
