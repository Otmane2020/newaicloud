import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AiImagesProtectedLayoutProps {
  children: React.ReactNode;
}

export function AiImagesProtectedLayout({ children }: AiImagesProtectedLayoutProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndAutoLogin = async () => {
      try {
        // First check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('✅ AI Images - Already authenticated');
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Not authenticated - check if this is post-installation (has shop param)
        const params = new URLSearchParams(window.location.search);
        const shop = params.get("shop");
        const installed = params.get("installed");

        console.log('🔐 AI Images - Auth check:', { shop, installed, hasSession: !!session });

        if (shop && installed === "true" && !autoLoginAttempted) {
          setAutoLoginAttempted(true);
          console.log('🔄 AI Images - Post-install detected, attempting auto-login for shop:', shop);
          
          // Call quick-login edge function to create session
          const { data, error } = await supabase.functions.invoke('ai-images-quick-login', {
            body: { shop }
          });

          if (error) {
            console.error('❌ AI Images - Auto-login failed:', error);
          } else if (data?.session) {
            console.log('✅ AI Images - Auto-login successful');
            // Set the session
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
        }

        setIsAuthenticated(false);
      } catch (err) {
        console.error("Auth check error:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndAutoLogin();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 AI Images - Auth state changed:', event);
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [autoLoginAttempted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve shop param in redirect - use AI Images auth page
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const installed = params.get("installed");
    const credits = params.get("credits");
    
    // Build redirect URL with all params
    const searchParams = new URLSearchParams();
    if (shop) searchParams.set("shop", shop);
    if (installed) searchParams.set("installed", installed);
    if (credits) searchParams.set("credits", credits);
    
    const queryString = searchParams.toString();
    const authUrl = `/auth${queryString ? `?${queryString}` : ""}`;
    
    console.log('🔒 AI Images - Redirecting to auth:', authUrl);
    return <Navigate to={authUrl} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
