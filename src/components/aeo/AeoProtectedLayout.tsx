import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AeoSidebar } from "./AeoSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { LimitWarningBanner } from "@/components/LimitWarningBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Zap, Coins, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AeoProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { limits } = useUsageLimits();
  const { language } = useTranslation();
  
  // Global timeout state
  const [globalTimeout, setGlobalTimeout] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Safe calculation of remaining credits
  const maxOpts = Number(limits?.limits?.max_optimizations) || 0;
  const usedOpts = Number(limits?.usage?.optimizations_count) || 0;
  const remainingCredits = Math.max(0, maxOpts - usedOpts);
  
  // Global 10-second timeout
  useEffect(() => {
    if (loading && !globalTimeout) {
      timeoutRef.current = setTimeout(() => {
        console.error('⏰ [AeoProtectedLayout] Global timeout reached (10s)');
        setGlobalTimeout(true);
      }, 10000);
    } else if (!loading) {
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
  }, [loading, globalTimeout]);
  
  const handleRetry = () => {
    setIsRetrying(true);
    setGlobalTimeout(false);
    window.location.reload();
  };

  // Show server error alert if timeout
  if (globalTimeout) {
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
                className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-500"
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
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-background to-blue-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center animate-pulse shadow-lg shadow-violet-500/25">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?mode=signup&redirect=${redirect}`} replace />;
  }

  return (
    <SubscriptionGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-950 via-background to-slate-950 overflow-x-hidden">
          <AeoSidebar />
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
            {/* Sticky Header - Premium Aeoreply Design */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-violet-500/20">
              <div className="flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <SidebarTrigger className="flex-shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent truncate">
                      Aeoreply
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-full border border-violet-500/30">
                    <Coins className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                      {String(remainingCredits)}
                    </span>
                  </div>
                  <LanguageSwitcher />
                  <NotificationCenter />
                </div>
              </div>
            </div>
            <LimitWarningBanner />
            <div className="p-4 md:p-6 lg:p-8 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
