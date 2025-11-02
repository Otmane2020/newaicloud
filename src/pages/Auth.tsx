import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const referralCode = searchParams.get('ref');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { signIn, signUp, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="p-8 shadow-elegant">
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
              disabled={loading}
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