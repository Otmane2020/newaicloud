import { Navigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { LimitWarningBanner } from "@/components/LimitWarningBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NoStoreConnectedPrompt } from "@/components/NoStoreConnectedPrompt";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sparkles, Coins, RefreshCw, ExternalLink, AlertTriangle, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStore } from "@/contexts/StoreContext";
import { useAutoSyncProgress } from "@/contexts/AutoSyncContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { stores, loading: storesLoading, serverError: storeServerError } = useStore();
  const { isSyncing } = useAutoSyncProgress();
  const isMobile = useIsMobile();
  const { limits } = useUsageLimits();
  const { language } = useTranslation();
  const location = useLocation();
  const isRobotMode = location.pathname.startsWith("/vendix-chat");
  
  // ✅ Global 10s timeout state
  const [globalTimeout, setGlobalTimeout] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Safe calculation of remaining credits - prevent NaN/object rendering (React error #300)
  const maxOpts = Number(limits?.limits?.max_optimizations) || 0;
  const usedOpts = Number(limits?.usage?.optimizations_count) || 0;
  const remainingCredits = Math.max(0, maxOpts - usedOpts);

  // Check if Shopify auth redirect is in progress - show loading instead of redirecting to /auth
  const isShopifyAuthInProgress = sessionStorage.getItem('shopify_auth_redirect') === 'true';
  
  const isLoading = loading || storesLoading || isShopifyAuthInProgress;
  
  // ✅ Global 10-second timeout
  useEffect(() => {
    if (isLoading && !globalTimeout) {
      timeoutRef.current = setTimeout(() => {
        console.error('⏰ [ProtectedLayout] Global timeout reached (10s)');
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, globalTimeout]);
  
  const handleRetry = () => {
    setIsRetrying(true);
    setGlobalTimeout(false);
    // Force reload to reset all contexts
    window.location.reload();
  };

  // ✅ Show server error alert if timeout or store error
  if (globalTimeout || storeServerError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold mb-2">
            {language === 'fr' ? 'Connexion impossible' : 'Connection failed'}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-base">
              {language === 'fr' 
                ? 'Le chargement prend trop de temps. Nos serveurs peuvent être temporairement indisponibles.'
                : 'Loading is taking too long. Our servers may be temporarily unavailable.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying 
                  ? (language === 'fr' ? 'Rechargement...' : 'Reloading...')
                  : (language === 'fr' ? 'Réessayer' : 'Retry')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://status.supabase.com', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {language === 'fr' ? 'Voir le statut' : 'View status'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Wait for both auth AND stores to finish loading to prevent "undefined" UUID errors
  if (isLoading) {
    // Clear flag after showing loading (will be set again if needed)
    if (isShopifyAuthInProgress && !loading) {
      sessionStorage.removeItem('shopify_auth_redirect');
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SubscriptionGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-x-hidden relative">
          {/* Background glow effects */}
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "2s" }}
            />
          </div>

          <AppSidebar />
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden relative z-10">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur-xl border-b border-slate-700/50">
              <div className="flex h-12 sm:h-14 items-center justify-between px-2 sm:px-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                  <SidebarTrigger className="flex-shrink-0 text-slate-200 hover:text-white" />
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-sm sm:text-lg truncate text-white">Vendix Admin</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 rounded-full border border-cyan-400/40">
                    <Coins className="w-3.5 h-3.5 text-cyan-300" />
                    <span className="text-xs font-bold text-cyan-200">
                      {String(remainingCredits)}
                    </span>
                  </div>
                  <LanguageSwitcher />
                  <NotificationCenter />
                </div>
              </div>
            </div>

            <LimitWarningBanner />
            {!storesLoading && !isSyncing && stores.length === 0 && (
              <div className="px-3 sm:px-4 md:px-6 lg:px-8 mt-3">
                <NoStoreConnectedPrompt />
              </div>
            )}
            <div className="dark text-foreground p-3 sm:p-4 md:p-6 lg:p-8 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
