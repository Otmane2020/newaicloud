import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { aeoTranslations } from '@/lib/translations/aeo';

export default function AeoAuth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (user && !isRedirectingRef.current) {
      isRedirectingRef.current = true;
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName);
        if (!result.error) {
          toast.success(language === 'fr' ? "Compte créé avec succès !" : "Account created successfully!");
        }
      } else {
        const result = await signIn(email, password);
        if (result?.error) {
          toast.error(language === 'fr' ? "Identifiants incorrects" : "Invalid credentials");
        }
      }
    } catch (error: any) {
      toast.error(language === 'fr' ? "Une erreur est survenue" : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50 flex items-center justify-center px-4 py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl border-violet-200/50 shadow-xl shadow-violet-500/5 relative z-10">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Aeoreply
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
          {mode === 'login' ? t.auth.login : t.auth.signup}
        </h1>
        <p className="text-center text-slate-500 mb-8">
          {mode === 'login' ? t.auth.loginSubtitle : t.auth.signupSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700">
                {language === 'fr' ? 'Nom complet' : 'Full name'}
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-slate-700">
                {language === 'fr' ? 'Mot de passe' : 'Password'}
              </Label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-xs text-violet-600 hover:underline"
                >
                  {language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg shadow-violet-500/25"
            disabled={loading || googleLoading}
          >
            {loading
              ? (language === 'fr' ? 'Chargement...' : 'Loading...')
              : mode === 'login'
              ? t.auth.login
              : t.auth.signup}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <Separator className="flex-1 bg-slate-200" />
          <span className="text-sm text-slate-400">
            {language === 'fr' ? 'ou' : 'or'}
          </span>
          <Separator className="flex-1 bg-slate-200" />
        </div>

        <Button
          variant="outline"
          className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-violet-300"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {language === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
        </Button>

        <p className="mt-8 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              {language === 'fr' ? "Pas encore de compte ?" : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-violet-600 hover:underline font-medium"
              >
                {language === 'fr' ? "S'inscrire" : "Sign up"}
              </button>
            </>
          ) : (
            <>
              {language === 'fr' ? "Déjà un compte ?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-violet-600 hover:underline font-medium"
              >
                {language === 'fr' ? "Se connecter" : "Sign in"}
              </button>
            </>
          )}
        </p>
      </Card>
    </div>
  );
}
