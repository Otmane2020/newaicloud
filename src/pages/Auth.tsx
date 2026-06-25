import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Gift, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { ServerStatusAlert } from '@/components/ServerStatusAlert';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' || searchParams.get('signup') === 'true' ? 'signup' : 'login';
  const referralCode = searchParams.get('ref');
  const redirectPath = searchParams.get('redirect');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, user, serverStatus, markManualSignOut } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  
  // ✅ Guard pour empêcher multi-exécution du redirect
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // ✅ Guard: éviter les exécutions multiples
      if (!user || isRedirectingRef.current) return;
      isRedirectingRef.current = true;

      try {
        console.log('✅ User authenticated, checking admin status...');
        
        // Check if user is admin - block them from /auth
        const { data: roleData } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (roleData) {
          // Admin detected - sign out and redirect to superadmin login
          console.log('🔒 Admin detected on /auth, redirecting to /superadmin-login');
          markManualSignOut(); // ✅ Prevent "session expired" toast & redirect loop
          await supabase.auth.signOut();
          toast.error(
            language === 'fr'
              ? "Administrateurs : connectez-vous via /superadmin-login"
              : "Admins: please sign in via /superadmin-login"
          );
          navigate('/superadmin-login');
          return;
        }
        
        // Check if this is a Shopify user
        const isShopifyUser = user.email?.endsWith('@shopify.newai.sale');
        
        if (isShopifyUser) {
          // Check subscription status for Shopify user
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, billing_provider')
            .eq('id', user.id)
            .single();
          
          if (profile?.subscription_status !== 'active' && profile?.subscription_status !== 'trialing') {
            // Shopify user without active subscription -> setup-wizard
            const shopHandle = user.email.split('@')[0];
            console.log('🛒 [Auth] Shopify user without subscription, redirecting to setup-wizard');
            navigate(`/app/setup-wizard?shop=${shopHandle}.myshopify.com`);
            return;
          }
        }
        
        // Vérifier s'il y a un pending_token Shopify à associer
        const shopifyPending = searchParams.get('shopify_pending');
        const checkoutSuccess = searchParams.get('checkout') === 'success';
        
        if (shopifyPending) {
          console.log('🔗 Shopify pending token detected, redirecting to onboarding');
          
          // ✅ Si retour de checkout, préserver le paramètre
          if (checkoutSuccess) {
            console.log('💳 Checkout success detected, redirecting with checkout flag');
            navigate(`/onboarding?checkout=success&shopify_pending=${shopifyPending}`);
          } else {
            // Cas normal : pas encore de plan sélectionné
            navigate(`/onboarding?shopify_pending=${shopifyPending}`);
          }
        } else {
          // Redirection normale sans Shopify pending
          const destination = redirectPath || '/dashboard';
          navigate(destination);
        }
      } catch (error: any) {
        console.error('[Auth] Redirect check error:', error);
        isRedirectingRef.current = false; // Reset pour permettre retry
        
        const errorMsg = error?.message || '';
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('timeout') || errorMsg.includes('NetworkError') || errorMsg.includes('522')) {
          setServerOffline(true);
          toast.error(language === 'fr' ? "Serveur indisponible" : "Server unavailable", {
            description: language === 'fr' 
              ? "Impossible de vérifier votre compte. Réessayez dans quelques minutes."
              : "Unable to verify your account. Please try again in a few minutes."
          });
        } else {
          toast.error(language === 'fr' ? "Erreur de vérification" : "Verification error", {
            description: language === 'fr' 
              ? "Une erreur est survenue lors de la vérification de votre compte."
              : "An error occurred while verifying your account."
          });
        }
      }
    };
    
    checkUserAndRedirect();
  }, [user, navigate, redirectPath, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate inputs
    try {
      if (mode === 'signup') {
        signupSchema.parse({ email, password, fullName });
      } else {
        loginSchema.parse({ email, password });
      }
    } catch (error: any) {
      const validationErrors: { [key: string]: string } = {};
      error.errors?.forEach((err: any) => {
        validationErrors[err.path[0]] = err.message;
      });
      setErrors(validationErrors);
      toast.error("Please correct the errors in the form");
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName, referralCode || undefined);
        
        if (!result.error) {
          if (referralCode) {
            toast.success("Compte créé ! Vous avez reçu 100 optimisations de bienvenue ! 🎉");
          }
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } else {
        const result = await signIn(email, password);
        
        // ✅ Gestion des erreurs de connexion
        if (result?.error) {
          const errorMsg = result.error.message || '';
          
          // Erreur serveur (timeout, réseau)
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('timeout') || errorMsg.includes('NetworkError') || errorMsg.includes('522')) {
            setServerOffline(true);
            toast.error(language === 'fr' ? "Serveur indisponible" : "Server unavailable", {
              description: language === 'fr' 
                ? "Le serveur ne répond pas. Veuillez réessayer dans quelques minutes."
                : "The server is not responding. Please try again in a few minutes."
            });
          }
          // Cas Shopify pending - compte inexistant
          else if (searchParams.get('shopify_pending') && (errorMsg.includes('Invalid login credentials') || errorMsg.includes('Email not confirmed'))) {
            toast.error(language === 'fr' ? "Compte non trouvé" : "Account not found", {
              description: language === 'fr' 
                ? "Ce compte n'existe pas encore. Créez un compte pour associer votre boutique Shopify."
                : "This account doesn't exist yet. Create an account to link your Shopify store.",
            });
            setTimeout(() => setMode('signup'), 2000);
          }
          // Identifiants invalides
          else if (errorMsg.includes('Invalid login credentials')) {
            toast.error(language === 'fr' ? "Identifiants incorrects" : "Invalid credentials", {
              description: language === 'fr' 
                ? "Email ou mot de passe incorrect."
                : "Incorrect email or password."
            });
          }
          // Email non confirmé
          else if (errorMsg.includes('Email not confirmed')) {
            toast.error(language === 'fr' ? "Email non confirmé" : "Email not confirmed", {
              description: language === 'fr' 
                ? "Veuillez confirmer votre email avant de vous connecter."
                : "Please confirm your email before logging in."
            });
          }
          // Erreur générique
          else {
            toast.error(language === 'fr' ? "Erreur de connexion" : "Login error", {
              description: errorMsg || (language === 'fr' ? "Une erreur est survenue" : "An error occurred")
            });
          }
        }
      }
    } catch (error: any) {
      console.error('[Auth] handleSubmit error:', error);
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('timeout') || errorMessage.includes('NetworkError') || errorMessage.includes('522')) {
        setServerOffline(true);
        toast.error(language === 'fr' ? "Serveur indisponible" : "Server unavailable", {
          description: language === 'fr' 
            ? "Le serveur ne répond pas. Veuillez réessayer dans quelques minutes."
            : "The server is not responding. Please try again in a few minutes."
        });
      } else {
        toast.error(language === 'fr' ? "Une erreur est survenue lors de la connexion" : "An error occurred during login");
      }
    } finally {
      // ✅ TOUJOURS exécuté - fix "Loading..." bloqué
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setServerOffline(false);
    window.location.reload();
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setFacebookLoading(true);
    await signInWithFacebook();
    setFacebookLoading(false);
  };

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden flex items-center justify-center py-12 px-4">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container mx-auto px-4 max-w-md relative z-10">
        <Card className="p-8 bg-slate-800/60 backdrop-blur-xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 text-slate-100">
          {/* Language Switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="block text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent leading-none">
                  Vendix
                </span>
                <span className="block text-xs text-cyan-200/70 mt-1">Interface Revendeur</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-white">
            {mode === 'login' ? t.auth.login : t.auth.signup}
          </h1>
          <p className="text-center text-slate-300 mb-8">
            {mode === 'login'
              ? t.auth.login
              : referralCode
                ? t.toasts.success.welcomeBonusMessage
                : t.auth.signup}
          </p>


          {/* Server Offline Alert */}
          {(serverOffline || serverStatus === 'offline') && (
            <ServerStatusAlert onRetry={handleRetry} isRetrying={loading} />
          )}

          {searchParams.get('shopify_pending') && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {language === 'fr' ? 'Connexion Shopify en attente' : 'Shopify connection pending'}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {language === 'fr' 
                    ? `Votre boutique ${searchParams.get('shop') || 'Shopify'} sera automatiquement connectée et vos 10 premiers produits importés une fois votre plan sélectionné.`
                    : `Your store ${searchParams.get('shop') || 'Shopify'} will be automatically connected and your first 10 products imported once you select a plan.`}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {mode === 'signup' && referralCode && (
            <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-200 dark:border-purple-800">
              <Gift className="h-5 w-5 text-purple-600" />
              <AlertDescription className="text-sm">
                <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  {t.toasts.success.welcomeBonus}
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  {t.toasts.success.welcomeBonusMessage}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.account.profile.fullName}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: '' });
                  }}
                  required
                  placeholder={t.account.profile.fullNamePlaceholder}
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                required
                placeholder="name@example.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">{t.auth.password}</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => navigate('/reset-password')}
                    className="text-xs text-primary hover:underline"
                  >
                    {t.auth.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || googleLoading || facebookLoading}
            >
              {loading
                ? mode === 'signup'
                  ? t.common.loading
                  : t.common.loading
                : mode === 'login'
                ? t.auth.login
                : t.auth.signup}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading || facebookLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
              </g>
            </svg>
            {googleLoading ? t.common.loading : mode === 'signup' ? t.auth.signUpWithGoogle : t.auth.signInWithGoogle}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 mt-3"
            onClick={handleFacebookSignIn}
            disabled={loading || googleLoading || facebookLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
            </svg>
            {facebookLoading ? t.common.loading : mode === 'signup' ? 'Créer avec Facebook' : 'Continuer avec Facebook'}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-primary hover:underline"
            >
              {mode === 'login'
                ? t.auth.noAccount
                : t.auth.haveAccount}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}