import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminNavigation } from "@/components/SuperAdminNavigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SuperAdminLayoutProps {
  children: (props: { activeTab: string; setActiveTab: (tab: string) => void }) => React.ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isOAuthPopup, setIsOAuthPopup] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);

  // Détecter immédiatement si c'est une popup OAuth Google Ads
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Si c'est une popup avec un code OAuth
    if (code && window.opener) {
      setIsOAuthPopup(true);
      setOauthProcessing(true);
      
      // Envoyer le code à la fenêtre parente
      window.opener.postMessage({
        type: 'GOOGLE_ADS_ADMIN_OAUTH_CODE',
        code: code,
      }, window.location.origin);
      
      // Fermer la popup après un court délai
      setTimeout(() => window.close(), 500);
      return;
    }
    
    // Si c'est la fenêtre principale avec un code OAuth (pas de popup)
    if (code && !window.opener && (state === 'google_ads_admin' || state?.includes('/superadmin'))) {
      setOauthProcessing(true);
      
      const processOAuthCallback = async () => {
        try {
          console.log('🔑 [SUPERADMIN] Processing OAuth callback directly');
          const redirectUri = `${window.location.origin}/superadmin`;
          
          const { data, error } = await supabase.functions.invoke('google-oauth-token', {
            body: {
              code: code,
              state: redirectUri
            },
          });
          
          if (error || !data?.success) {
            console.error('❌ [SUPERADMIN] Token exchange failed:', error, data);
          } else {
            console.log('✅ [SUPERADMIN] Token exchange successful');
          }
        } catch (err) {
          console.error('❌ [SUPERADMIN] OAuth callback error:', err);
        } finally {
          // Nettoyer l'URL et continuer le chargement normal
          window.history.replaceState({}, document.title, window.location.pathname);
          setOauthProcessing(false);
        }
      };
      
      processOAuthCallback();
    }
  }, []);

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

  // Afficher un écran de chargement minimal pour la popup OAuth
  if (isOAuthPopup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Connexion en cours...</p>
        <p className="text-sm text-muted-foreground mt-2">Cette fenêtre va se fermer automatiquement</p>
      </div>
    );
  }

  if (loading || checking || oauthProcessing) {
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
