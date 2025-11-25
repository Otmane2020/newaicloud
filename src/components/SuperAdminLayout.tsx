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
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    const timeout = setTimeout(() => {
      if (checking) {
        console.error('Admin check timeout');
        setIsAdmin(false);
        setChecking(false);
      }
    }, 10000);

    checkAdminRole();
    
    return () => clearTimeout(timeout);
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

  return (
    <div className="min-h-screen bg-background flex">
      <SuperAdminNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-16 md:ml-64 transition-all duration-300 p-8">
        {children({ activeTab, setActiveTab })}
      </main>
    </div>
  );
}
