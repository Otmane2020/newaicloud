import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { translations as fr } from '@/lib/translations/fr';
import { translations as en } from '@/lib/translations/en';

// Helper function to get translated message based on stored language
const getTranslatedMessage = (frMessage: string, enMessage: string): string => {
  const lang = localStorage.getItem('app-language') || 'en';
  return lang === 'fr' ? frMessage : enMessage;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;
    
    // Safety timeout to prevent infinite loading
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('[Auth] Event:', event, 'Session:', !!session);
        
        // Handle session expiration and sign-out events
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          setSession(null);
          setUser(null);
          setLoading(false);
          
          // Clear all auth-related data
          localStorage.clear();
          
          if (event === 'SIGNED_OUT' || !session) {
            const lang = localStorage.getItem('app-language') || 'en';
            const message = lang === 'fr' ? fr.auth.sessionExpired : en.auth.sessionExpired;
            toast.error(message);
            navigate('/auth');
          }
        } else if (session) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } else {
          // No session and no special event - stop loading
          setLoading(false);
        }
      }
    );

    // THEN check for existing session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('[Auth] Session check error:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      if (!mounted) return;
      console.error('[Auth] Session check failed:', err);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [navigate, loading]);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    // Préserver les paramètres URL actuels (comme shopify_pending)
    const currentParams = new URLSearchParams(window.location.search);
    const redirectParams = new URLSearchParams();
    
    // Copier shopify_pending et shop si présents
    if (currentParams.has('shopify_pending')) {
      redirectParams.set('shopify_pending', currentParams.get('shopify_pending')!);
    }
    if (currentParams.has('shop')) {
      redirectParams.set('shop', currentParams.get('shop')!);
    }
    
    const redirectUrl = `${window.location.origin}/onboarding${redirectParams.toString() ? '?' + redirectParams.toString() : ''}`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          ...(referralCode && { referral_code: referralCode })
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Send welcome email with user's language preference
      try {
        const language = (localStorage.getItem('app-language') || 'en') as 'fr' | 'en';
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, fullName, language }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
      const lang = localStorage.getItem('app-language') || 'en';
      const message = lang === 'fr' ? fr.auth.registrationSuccess : en.auth.registrationSuccess;
      toast.success(message);
      // Ne pas rediriger, l'utilisateur restera sur la page onboarding après connexion
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error(error.message);
    } else {
      const lang = localStorage.getItem('app-language') || 'en';
      const message = lang === 'fr' ? fr.auth.loginSuccess : en.auth.loginSuccess;
      toast.success(message);
      // Ne pas rediriger automatiquement - SubscriptionGuard gèrera la redirection
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/onboarding`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      toast.error(error.message);
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    // Get lang before clearing localStorage
    const lang = localStorage.getItem('app-language') || 'en';
    const message = lang === 'fr' ? fr.auth.logoutSuccess : en.auth.logoutSuccess;
    
    // Clear all local storage to remove stale tokens
    localStorage.clear();
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(message);
    }
    
    // Force a complete page reload to clear all state
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}