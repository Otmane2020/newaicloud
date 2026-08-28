import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CatalogOptimizeSidebar } from "@/components/CatalogOptimizeSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { LimitWarningBanner } from "@/components/LimitWarningBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NoStoreConnectedPrompt } from "@/components/NoStoreConnectedPrompt";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Coins, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAutoSyncProgress } from "@/contexts/AutoSyncContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";
import BlogNewAI from "@/pages/BlogNewAI";
import StudioHub from "@/pages/StudioHub";
import ContentSeoHub from "@/pages/ContentSeoHub";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { stores, loading: storesLoading, serverError: storeServerError } = useStore();
  const { isSyncing } = useAutoSyncProgress();
  const { limits } = useUsageLimits();
  const { language } = useTranslation();
  const { pathname, search } = useLocation();

  const [globalTimeout, setGlobalTimeout] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const maxOpts = Number(limits?.limits?.max_optimizations) || 0;
  const usedOpts = Number(limits?.usage?.optimizations_count) || 0;
  const remainingCredits = Math.max(0, maxOpts - usedOpts);

  const isShopifyAuthInProgress = sessionStorage.getItem("shopify_auth_redirect") === "true";
  const isLoading = loading || storesLoading || isShopifyAuthInProgress;

  useEffect(() => {
    if (isLoading && !globalTimeout) {
      timeoutRef.current = setTimeout(() => {
        console.error("⏰ [ProtectedLayout] Global timeout reached (10s)");
        setGlobalTimeout(true);
      }, 10000);
    } else if (!isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setGlobalTimeout(false);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, globalTimeout]);

  if (pathname === "/blog") {
    return <BlogNewAI />;
  }

  const handleRetry = () => {
    setIsRetrying(true);
    setGlobalTimeout(false);
    window.location.reload();
  };

  if (globalTimeout || storeServerError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold mb-2">
            {language === "fr" ? "Connexion impossible" : "Connection failed"}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-base">
              {language === "fr"
                ? "Le chargement prend trop de temps. Nos serveurs peuvent être temporairement indisponibles."
                : "Loading is taking too long. Our servers may be temporarily unavailable."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleRetry} disabled={isRetrying} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying
                  ? (language === "fr" ? "Rechargement..." : "Reloading...")
                  : (language === "fr" ? "Réessayer" : "Retry")}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://status.supabase.com", "_blank")}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {language === "fr" ? "Voir le statut" : "View status"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    if (isShopifyAuthInProgress && !loading) {
      sessionStorage.removeItem("shopify_auth_redirect");
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const returnTo = `${pathname}${search}`;
    const authUrl = `/auth?redirect=${encodeURIComponent(returnTo)}`;
    return <Navigate to={authUrl} replace />;
  }

  const workspaceContent = pathname === "/ai-creative-studio"
    ? <StudioHub />
    : pathname === "/seo"
      ? <ContentSeoHub />
      : children;

  return (
    <SubscriptionGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-slate-50 overflow-x-hidden">
          <CatalogOptimizeSidebar />
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
            <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
              <div className="flex h-12 sm:h-14 items-center justify-between px-2 sm:px-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                  <SidebarTrigger className="flex-shrink-0" />
                  <div className="sm:hidden min-w-0">
                    <CatalogOptimizeLogo compact />
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                    <Coins className="w-3.5 h-3.5 text-violet-600" />
                    <span className="text-xs font-semibold text-slate-700">{String(remainingCredits)}</span>
                  </div>
                  <LanguageSwitcher />
                  <NotificationCenter />
                </div>
              </div>
            </div>
            <LimitWarningBanner />
            {!storesLoading && !isSyncing && stores.length === 0 && pathname !== "/shopping" && (
              <div className="px-3 sm:px-4 md:px-6 lg:px-8 mt-3">
                <NoStoreConnectedPrompt />
              </div>
            )}
            <div className="catalog-workspace mx-auto max-w-[1600px] p-3 sm:p-4 md:p-5 lg:p-6">
              {workspaceContent}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
