import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function AuthOnlyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resolvingShopify, setResolvingShopify] = useState(false);
  const shopifyReturnHandledRef = useRef(false);

  const shopifyPending = searchParams.get("shopify_pending");
  const shopFromUrl = searchParams.get("shop");

  useEffect(() => {
    if (loading || !user || !shopifyPending || shopifyReturnHandledRef.current) return;

    shopifyReturnHandledRef.current = true;
    setResolvingShopify(true);

    const continueShopifyOAuthFlow = async () => {
      try {
        console.log("[AuthOnlyLayout] Shopify login return detected, claiming pending OAuth connection...");

        // The OAuth callback created a pending connection before login.
        // Once the merchant is authenticated, attach that OAuth connection to
        // the logged-in account. The edge function returns the canonical shop URL.
        const { data, error } = await supabase.functions.invoke("claim-shopify-connection", {
          body: { pendingToken: shopifyPending },
        });

        const resolvedShop = data?.shop || shopFromUrl;

        if (error && !resolvedShop) {
          throw error;
        }

        if (!resolvedShop) {
          throw new Error("Unable to resolve Shopify store after login");
        }

        console.log("[AuthOnlyLayout] Shopify connection linked, returning to setup wizard:", resolvedShop);

        // Do not forward the pending token here: it has just been claimed for
        // this authenticated user. SetupWizard can now use the active session
        // + shop connection and display Shopify Billing plans normally.
        navigate(`/app/setup-wizard?shop=${encodeURIComponent(resolvedShop)}`, {
          replace: true,
        });
      } catch (error) {
        console.error("[AuthOnlyLayout] Failed to continue Shopify OAuth flow after login:", error);

        // If the original URL still contains the shop, preserve the merchant's
        // position in the Shopify flow instead of falling back to /dashboard.
        if (shopFromUrl) {
          navigate(`/app/setup-wizard?shop=${encodeURIComponent(shopFromUrl)}`, {
            replace: true,
          });
          return;
        }

        // /app knows how to restart the Shopify OAuth flow when required.
        navigate("/app", { replace: true });
      } finally {
        setResolvingShopify(false);
      }
    };

    continueShopifyOAuthFlow();
  }, [loading, user, shopifyPending, shopFromUrl, navigate]);

  if (loading || resolvingShopify || (user && shopifyPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Preserve the Shopify OAuth handoff through the login page. Previously
    // /onboarding?shopify_pending=... was reduced to /auth and the token was lost.
    if (shopifyPending) {
      const authParams = new URLSearchParams();
      authParams.set("shopify_pending", shopifyPending);
      if (shopFromUrl) authParams.set("shop", shopFromUrl);
      if (searchParams.get("checkout") === "success") authParams.set("checkout", "success");

      return <Navigate to={`/auth?${authParams.toString()}`} replace />;
    }

    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
