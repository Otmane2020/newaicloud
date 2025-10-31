import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { LimitWarningBanner } from "@/components/LimitWarningBanner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

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
        <div className="min-h-screen flex w-full bg-gray-50">
          <AppSidebar />
          <main className="flex-1">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
              <div className="flex h-14 items-center justify-between px-3 sm:px-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="font-bold text-base sm:text-lg">NewAI</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <NotificationCenter />
                </div>
              </div>
            </div>
            <LimitWarningBanner />
            <div className={isMobile ? "p-4" : "p-8"}>
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
