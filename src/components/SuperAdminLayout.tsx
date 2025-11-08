import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminNavigation } from "@/components/SuperAdminNavigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SuperAdminLayoutProps {
  children: (props: { activeTab: string; setActiveTab: (tab: string) => void }) => React.ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) throw error;
        setIsAdmin(data);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminRole();
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SuperAdminNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-16 md:ml-64 transition-all duration-300 p-8">
        {children({ activeTab, setActiveTab })}
      </main>
    </div>
  );
}
