import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { LimitWarningBanner } from "@/components/LimitWarningBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NoStoreConnectedPrompt } from "@/components/NoStoreConnectedPrompt";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sparkles, Coins } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStore } from "@/contexts/StoreContext";
import { useAutoSyncProgress } from "@/contexts/AutoSyncContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { stores, loading: storesLoading } = useStore();
  const { isSyncing } = useAutoSyncProgress();
  const isMobile = useIsMobile();
  const { limits } = useUsageLimits();
  
  const remainingCredits = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
  // Removed demo store bypass - authentication is required for all stores

  if (loading) {
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
        <div className="min-h-screen flex w-full bg-gray-50 overflow-x-hidden">
          <AppSidebar />
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
              <div className="flex h-12 sm:h-14 items-center justify-between px-2 sm:px-4 gap-2">
                <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                  <SidebarTrigger className="flex-shrink-0" />
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <span className="font-bold text-sm sm:text-lg truncate">NewAI</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-full border border-violet-300/50 dark:border-violet-500/30">
                    <Coins className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                      {remainingCredits}
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
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
