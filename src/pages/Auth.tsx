import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Gift, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' || searchParams.get('signup') === 'true' ? 'signup' : 'login';
  const referralCode = searchParams.get('ref');
  const redirectPath = searchParams.get('redirect');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log('✅ User authenticated, redirecting...');
      
      // Vérifier s'il y a un pending_token Shopify à associer
      const shopifyPending = searchParams.get('shopify_pending');
      
      if (shopifyPending) {
        console.log('🔗 Claiming Shopify connection with pending token');
        
        // Associer la connexion Shopify au compte
        const claimConnection = async () => {
          try {
            const { data, error } = await supabase.functions.invoke('claim-shopify-connection', {
              body: { pendingToken: shopifyPending }
            });

            if (error) throw error;

            if (data?.success) {
              toast.success("🎉 Boutique Shopify connectée!", {
                description: data.autoImportTriggered 
                  ? "Import des 10 premiers produits en cours... Vous serez redirigé vers le dashboard." 
                  : "Connexion établie avec succès."
              });
              
              // Attendre 2 secondes pour que l'import background démarre
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Rediriger vers le dashboard où les produits importés seront visibles
              navigate('/dashboard');
            } else {
              throw new Error('Failed to claim connection');
            }
          } catch (error) {
            console.error('Failed to claim Shopify connection:', error);
            toast.error("Failed to connect Shopify store. Please try again from the integration page.");
            // Rediriger quand même vers le dashboard
            navigate(redirectPath || '/dashboard');
          }
        };

        claimConnection();
      } else {
        // Redirection normale sans Shopify pending
        const destination = redirectPath || '/dashboard';
        navigate(destination);
      }
    }
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

    if (mode === 'signup') {
      const result = await signUp(email, password, fullName, referralCode || undefined);
      
      if (!result.error) {
        if (referralCode) {
          toast.success("Compte créé ! Vous avez reçu 100 optimisations de bienvenue ! 🎉");
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } else {
      await signIn(email, password);
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="p-8 shadow-elegant">
          {/* Language Switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                NewAI
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">
            {mode === 'login' ? t.auth.login : t.auth.signup}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {mode === 'login'
              ? t.auth.login
              : referralCode 
                ? t.toasts.welcomeBonusMessage
                : t.auth.signup}
          </p>

          {searchParams.get('shopify_pending') && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Connexion Shopify en attente
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Votre boutique {searchParams.get('shop')} sera automatiquement connectée après authentification.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {mode === 'signup' && referralCode && (
            <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-200 dark:border-purple-800">
              <Gift className="h-5 w-5 text-purple-600" />
              <AlertDescription className="text-sm">
                <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  {t.toasts.welcomeBonus}
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  {t.toasts.welcomeBonusMessage}
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                required
                placeholder="••••••••"
                minLength={6}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
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