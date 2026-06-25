import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

// Clear ONLY Supabase auth keys from localStorage.
// Important: do NOT wipe the whole localStorage, otherwise we can break other app state (and even editor state).
const clearSupabaseAuthStorage = () => {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // supabase-js v2 default key format: sb-<project-ref>-auth-token
      if (/^sb-.*-auth-token$/.test(key)) {
        keysToRemove.push(key);
        continue;
      }

      // legacy / custom keys seen in codebase
      if (key === 'supabase.auth.token' || key.startsWith('supabase.auth.')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[Auth] Failed to clear auth storage safely:', err);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  serverStatus: 'online' | 'offline' | 'checking';
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithFacebook: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  markManualSignOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const navigate = useNavigate();
  const manualSignOutRef = useRef(false);

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
          const wasManualSignOut = manualSignOutRef.current;
          manualSignOutRef.current = false;

          setSession(null);
          setUser(null);
          setLoading(false);

          // Clear ONLY auth-related data (avoid wiping unrelated local storage)
          clearSupabaseAuthStorage();

          if (!wasManualSignOut) {
            const message = getTranslatedMessage(fr.auth.sessionExpired, en.auth.sessionExpired);
            toast.error(message);
            navigate('/auth');
          }

          return;
        }

        if (session) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        // No session and no special event - stop loading
        setLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // ✅ FIX: Removed 'loading' to prevent infinite re-runs

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
    
    const redirectPath = redirectParams.toString()
      ? `/onboarding?${redirectParams.toString()}`
      : '/dashboard';
    const redirectUrl = `${window.location.origin}${redirectPath}`;
    
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
      // L'utilisateur connecté sera redirigé vers le dashboard par la page Auth.
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      setServerStatus('online');
      
      if (error) {
        toast.error(error.message);
      } else {
        const lang = localStorage.getItem('app-language') || 'en';
        const message = lang === 'fr' ? fr.auth.loginSuccess : en.auth.loginSuccess;
        toast.success(message);
      }

      return { error };
    } catch (err: any) {
      const errorMsg = err?.message || '';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('timeout') || errorMsg.includes('NetworkError')) {
        setServerStatus('offline');
        toast.error("Serveur indisponible", {
          description: "Impossible de joindre le serveur. Réessayez dans quelques minutes."
        });
      }
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/aeo-setup`;
    
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

  const signInWithFacebook = async () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl,
        scopes: 'public_profile,email'
      }
    });

    if (error) {
      toast.error(error.message);
    }

    return { error };
  };

  const signOut = async () => {
    manualSignOutRef.current = true;

    const { error } = await supabase.auth.signOut();

    const message = getTranslatedMessage(fr.auth.logoutSuccess, en.auth.logoutSuccess);

    // Clear only auth keys (do not wipe all local storage)
    clearSupabaseAuthStorage();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(message);
    }

    // Force a complete page reload to clear all state
    window.location.href = '/';
  };

  const markManualSignOut = () => {
    manualSignOutRef.current = true;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, serverStatus, signUp, signIn, signInWithGoogle, signInWithFacebook, signOut, markManualSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[Auth] useAuth called outside of AuthProvider');
    // Provide a safe fallback instead of throwing to avoid breaking the whole app
    return {
      user: null,
      session: null,
      loading: true,
      serverStatus: 'checking',
      signUp: async () => ({ error: new Error('Auth not initialized') }),
      signIn: async () => ({ error: new Error('Auth not initialized') }),
      signInWithGoogle: async () => ({ error: new Error('Auth not initialized') }),
      signInWithFacebook: async () => ({ error: new Error('Auth not initialized') }),
      signOut: async () => {
        console.warn('[Auth] signOut called while AuthProvider is not mounted');
      },
      markManualSignOut: () => {},
    } satisfies AuthContextType;
  }
  return context;
}