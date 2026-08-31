import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Gift, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ServerStatusAlert } from '@/components/ServerStatusAlert';
import { CatalogOptimizeLogo } from '@/components/CatalogOptimizeLogo';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode =
    searchParams.get('mode') === 'signup' || searchParams.get('signup') === 'true'
      ? 'signup'
      : 'login';

  const referralCode = searchParams.get('ref');
  const requestedRedirect = searchParams.get('redirect');
  const redirectPath =
    requestedRedirect &&
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    !['/', '/home', '/auth'].includes(requestedRedirect.split('?')[0])
      ? requestedRedirect
      : '/dashboard';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    signIn,
    signUp,
    user,
    serverStatus,
    markManualSignOut,
  } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const isRedirectingRef = useRef(false);
  const isFrench = language === 'fr';

  const copy = isFrench
    ? {
        loginTitle: 'Bon retour',
        loginSubtitle: 'Connectez-vous pour gérer et optimiser votre catalogue produit.',
        signupTitle: 'Créer votre compte',
        signupSubtitle: 'Commencez par connecter votre catalogue et identifier ce qui doit être amélioré.',
        fullName: 'Nom complet',
        fullNamePlaceholder: 'Votre nom',
        email: 'E-mail',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié ?',
        signIn: 'Se connecter',
        createAccount: 'Créer un compte',
        noAccount: "Vous n'avez pas de compte ?",
        haveAccount: 'Vous avez déjà un compte ?',
        signupAction: 'Créer un compte',
        loginAction: 'Se connecter',
        loading: 'Chargement…',
      }
    : {
        loginTitle: 'Welcome back',
        loginSubtitle: 'Sign in to manage and optimize your product catalog.',
        signupTitle: 'Create your account',
        signupSubtitle: 'Connect your catalog, identify issues and start improving product data.',
        fullName: 'Full name',
        fullNamePlaceholder: 'Your name',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot password?',
        signIn: 'Sign in',
        createAccount: 'Create account',
        noAccount: "Don't have an account?",
        haveAccount: 'Already have an account?',
        signupAction: 'Create account',
        loginAction: 'Sign in',
        loading: 'Loading…',
      };

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (!user || isRedirectingRef.current) return;
      isRedirectingRef.current = true;

      try {
        const { data: roleData } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        if (roleData) {
          markManualSignOut();
          await supabase.auth.signOut();
          toast.error(
            isFrench
              ? 'Administrateurs : connectez-vous via /superadmin-login'
              : 'Admins: please sign in via /superadmin-login',
          );
          navigate('/superadmin-login');
          return;
        }

        const isShopifyUser = user.email?.endsWith('@shopify.newai.sale');

        if (isShopifyUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, billing_provider')
            .eq('id', user.id)
            .single();

          if (profile?.subscription_status !== 'active' && profile?.subscription_status !== 'trialing') {
            const shopHandle = user.email?.split('@')[0];
            navigate(`/app/setup-wizard?shop=${shopHandle}.myshopify.com`);
            return;
          }
        }

        const shopifyPending = searchParams.get('shopify_pending');
        const checkoutSuccess = searchParams.get('checkout') === 'success';

        if (shopifyPending) {
          navigate(
            checkoutSuccess
              ? `/onboarding?checkout=success&shopify_pending=${shopifyPending}`
              : `/onboarding?shopify_pending=${shopifyPending}`,
          );
        } else {
          navigate(redirectPath, { replace: true });
        }
      } catch (error: any) {
        isRedirectingRef.current = false;
        const errorMsg = error?.message || '';

        if (
          errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('522')
        ) {
          setServerOffline(true);
          toast.error(isFrench ? 'Serveur indisponible' : 'Server unavailable', {
            description: isFrench
              ? 'Impossible de vérifier votre compte. Réessayez dans quelques minutes.'
              : 'Unable to verify your account. Please try again in a few minutes.',
          });
        } else {
          toast.error(isFrench ? 'Erreur de vérification' : 'Verification error');
        }
      }
    };

    checkUserAndRedirect();
  }, [user, navigate, redirectPath, searchParams, isFrench, markManualSignOut]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    try {
      if (mode === 'signup') {
        signupSchema.parse({ email, password, fullName });
      } else {
        loginSchema.parse({ email, password });
      }
    } catch (error: any) {
      const validationErrors: Record<string, string> = {};
      error.errors?.forEach((validationError: any) => {
        validationErrors[validationError.path[0]] = validationError.message;
      });
      setErrors(validationErrors);
      toast.error(isFrench ? 'Vérifiez les champs du formulaire' : 'Please check the form fields');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName, referralCode || undefined);

        if (!result.error && referralCode) {
          toast.success(
            isFrench
              ? 'Compte créé ! Votre bonus de bienvenue a été ajouté.'
              : 'Account created! Your welcome bonus has been added.',
          );
        }
      } else {
        const result = await signIn(email, password);

        if (result?.error) {
          const errorMsg = result.error.message || '';

          if (
            errorMsg.includes('Failed to fetch') ||
            errorMsg.includes('timeout') ||
            errorMsg.includes('NetworkError') ||
            errorMsg.includes('522')
          ) {
            setServerOffline(true);
            toast.error(isFrench ? 'Serveur indisponible' : 'Server unavailable', {
              description: isFrench
                ? 'Le serveur ne répond pas. Veuillez réessayer dans quelques minutes.'
                : 'The server is not responding. Please try again in a few minutes.',
            });
          } else if (
            searchParams.get('shopify_pending') &&
            (errorMsg.includes('Invalid login credentials') || errorMsg.includes('Email not confirmed'))
          ) {
            toast.error(isFrench ? 'Compte non trouvé' : 'Account not found', {
              description: isFrench
                ? "Ce compte n'existe pas encore. Créez un compte pour associer votre boutique Shopify."
                : "This account doesn't exist yet. Create an account to link your Shopify store.",
            });
            setTimeout(() => setMode('signup'), 1500);
          } else if (errorMsg.includes('Invalid login credentials')) {
            toast.error(isFrench ? 'Identifiants incorrects' : 'Invalid credentials', {
              description: isFrench ? 'E-mail ou mot de passe incorrect.' : 'Incorrect email or password.',
            });
          } else if (errorMsg.includes('Email not confirmed')) {
            toast.error(isFrench ? 'E-mail non confirmé' : 'Email not confirmed', {
              description: isFrench
                ? 'Veuillez confirmer votre e-mail avant de vous connecter.'
                : 'Please confirm your email before signing in.',
            });
          } else {
            toast.error(isFrench ? 'Erreur de connexion' : 'Login error', {
              description: errorMsg || (isFrench ? 'Une erreur est survenue.' : 'An error occurred.'),
            });
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('522')
      ) {
        setServerOffline(true);
      }
      toast.error(isFrench ? 'Une erreur est survenue lors de la connexion' : 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setServerOffline(false);
    window.location.reload();
  };

  const isBusy = loading;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/95">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <CatalogOptimizeLogo />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-start justify-center px-4 py-10 sm:px-6 sm:py-14 lg:items-center lg:py-12">
        <div className="w-full max-w-[430px]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {mode === 'login' ? copy.loginTitle : copy.signupTitle}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {mode === 'login' ? copy.loginSubtitle : copy.signupSubtitle}
            </p>
          </div>

          <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {(serverOffline || serverStatus === 'offline') && (
              <div className="mb-5">
                <ServerStatusAlert onRetry={handleRetry} isRetrying={loading} />
              </div>
            )}

            {searchParams.get('shopify_pending') && (
              <Alert className="mb-5 rounded-xl border-blue-200 bg-blue-50 text-blue-950">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm leading-5">
                  <span className="font-medium">
                    {isFrench ? 'Boutique Shopify prête à être connectée.' : 'Your Shopify store is ready to connect.'}
                  </span>{' '}
                  {isFrench
                    ? 'Connectez-vous ou créez un compte pour continuer.'
                    : 'Sign in or create an account to continue.'}
                </AlertDescription>
              </Alert>
            )}

            {mode === 'signup' && referralCode && (
              <Alert className="mb-5 rounded-xl border-violet-200 bg-violet-50 text-violet-950">
                <Gift className="h-4 w-4 text-violet-600" />
                <AlertDescription className="text-sm leading-5">
                  <span className="font-medium">{isFrench ? 'Bonus de bienvenue activé.' : 'Welcome bonus activated.'}</span>{' '}
                  {isFrench
                    ? 'Il sera ajouté automatiquement après la création du compte.'
                    : 'It will be added automatically after account creation.'}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                    {copy.fullName}
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      if (errors.fullName) setErrors((current) => ({ ...current, fullName: '' }));
                    }}
                    required
                    placeholder={copy.fullNamePlaceholder}
                    className={`h-11 rounded-xl border-slate-200 bg-white ${errors.fullName ? 'border-destructive' : ''}`}
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  {copy.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((current) => ({ ...current, email: '' }));
                  }}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className={`h-11 rounded-xl border-slate-200 bg-white ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    {copy.password}
                  </Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => navigate('/reset-password')}
                      className="text-xs font-medium text-violet-700 transition-colors hover:text-violet-800 hover:underline"
                    >
                      {copy.forgotPassword}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (errors.password) setErrors((current) => ({ ...current, password: '' }));
                    }}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    minLength={6}
                    className={`h-11 rounded-xl border-slate-200 bg-white pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                className="h-11 w-full rounded-xl bg-violet-600 font-medium text-white shadow-none hover:bg-violet-700"
              >
                {loading ? copy.loading : mode === 'login' ? copy.signIn : copy.createAccount}
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === 'login' ? copy.noAccount : copy.haveAccount}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-violet-700 transition-colors hover:text-violet-800 hover:underline"
            >
              {mode === 'login' ? copy.signupAction : copy.loginAction}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
