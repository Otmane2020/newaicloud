import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { TrialWarningBanner } from "@/components/TrialWarningBanner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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
            <TrialWarningBanner />
            <div className="border-b bg-background">
              <div className="flex h-16 items-center px-4">
                <SidebarTrigger />
              </div>
            </div>
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}
