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
    let isMounted = true;

    const checkAdminRole = async () => {
      // Ne pas vérifier si l'auth est encore en cours de chargement
      if (loading) {
        return;
      }

      if (!user) {
        if (!isMounted) return;
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      // Autoriser l'accès direct pour certains emails spécifiques
      const allowedEmails = ['sweet.deco.meubles@gmail.com'];
      if (allowedEmails.includes(user.email || '')) {
        if (!isMounted) return;
        setIsAdmin(true);
        setChecking(false);
        return;
      }

      const timeout = setTimeout(() => {
        if (!isMounted) return;
        console.error('Admin check timeout');
        // Ne pas forcer isAdmin à false en cas de timeout pour éviter la redirection
        setChecking(false);
      }, 10000);

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        if (!isMounted) return;

        if (error) {
          console.error('Error checking admin role:', error);
          // On garde isAdmin tel quel en cas d'erreur pour ne pas éjecter l'utilisateur
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error checking admin role:', error);
        // Même logique ici : ne pas mettre isAdmin à false automatiquement
      } finally {
        if (!isMounted) return;
        clearTimeout(timeout);
        setChecking(false);
      }
    };

    checkAdminRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email, loading]);

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
