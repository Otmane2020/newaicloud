import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronRight, X, Sparkles, Target, Zap, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/language';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  route: string;
  completed: boolean;
  quickWin?: boolean;
}

const SNOOZE_KEY = 'onboarding_tour_snoozed_until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    setSteps([
      {
        id: 'connect_shopify',
        title: t.onboardingTour.steps.connectShopify.title,
        description: t.onboardingTour.steps.connectShopify.description,
        icon: Target,
        action: t.onboardingTour.steps.connectShopify.action,
        route: '/integration',
        completed: false,
        quickWin: true,
      },
      {
        id: 'optimize_first_product',
        title: t.onboardingTour.steps.optimizeProduct.title,
        description: t.onboardingTour.steps.optimizeProduct.description,
        icon: Sparkles,
        action: t.onboardingTour.steps.optimizeProduct.action,
        route: '/seo',
        completed: false,
        quickWin: true,
      },
      {
        id: 'generate_article',
        title: t.onboardingTour.steps.createArticle.title,
        description: t.onboardingTour.steps.createArticle.description,
        icon: FileText,
        action: t.onboardingTour.steps.createArticle.action,
        route: '/blog',
        completed: false,
      },
      {
        id: 'setup_automation',
        title: t.onboardingTour.steps.enableAutoOptimizations.title,
        description: t.onboardingTour.steps.enableAutoOptimizations.description,
        icon: Zap,
        action: t.onboardingTour.steps.enableAutoOptimizations.action,
        route: '/seo',
        completed: false,
      },
      {
        id: 'view_analytics',
        title: t.onboardingTour.steps.viewStatistics.title,
        description: t.onboardingTour.steps.viewStatistics.description,
        icon: BarChart3,
        action: t.onboardingTour.steps.viewStatistics.action,
        route: '/dashboard',
        completed: false,
      },
    ]);
  }, [t]);

  useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }

    if (localStorage.getItem('onboarding_completed') === 'true') {
      setShow(false);
      return;
    }

    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (snoozedUntil > Date.now()) {
      setShow(false);
      return;
    }
    if (snoozedUntil) localStorage.removeItem(SNOOZE_KEY);

    void checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const [connectionsResult, optimizedResult, articlesResult] = await Promise.all([
        supabase
          .from('shopify_connections')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('seo_optimized', true),
        supabase
          .from('blog_articles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
      ]);

      const hasConnection = Boolean(connectionsResult.data?.length);
      const optimizedCount = optimizedResult.count ?? 0;
      const hasArticle = Boolean(articlesResult.data?.length);

      setSteps(prev => prev.map(step => {
        if (step.id === 'connect_shopify') return { ...step, completed: hasConnection };
        if (step.id === 'optimize_first_product') return { ...step, completed: optimizedCount > 0 };
        if (step.id === 'generate_article') return { ...step, completed: hasArticle };
        if (step.id === 'setup_automation') return { ...step, completed: optimizedCount >= 5 };
        if (step.id === 'view_analytics') return { ...step, completed: true };
        return step;
      }));

      setShow(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShow(true);
    }
  };

  const completedCount = steps.filter(step => step.completed).length;
  const progressPercent = steps.length ? (completedCount / steps.length) * 100 : 0;
  const quickWins = steps.filter(step => step.quickWin && !step.completed);
  const isComplete = steps.length > 0 && completedCount === steps.length;

  const handleDismiss = () => {
    setShow(false);

    if (isComplete) {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.removeItem(SNOOZE_KEY);
      toast({
        title: t.onboardingTour.onboardingCompleted,
        description: t.onboardingTour.accessGuides,
      });
      return;
    }

    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  };

  if (!show || steps.length === 0) return null;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </span>
              {t.onboardingTour.welcome}
            </CardTitle>
            <CardDescription className="max-w-xl leading-relaxed">
              {t.onboardingTour.followSteps}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-9 w-9 rounded-full" aria-label="Close onboarding tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.onboardingTour.progress}</span>
            <span className="font-medium tabular-nums">{completedCount}/{steps.length} {t.onboardingTour.completed}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-5 sm:p-6">
        {quickWins.length > 0 && (
          <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t.onboardingTour.quickWins}</span>
              <Badge variant="secondary" className="text-xs">{t.onboardingTour.recommended}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t.onboardingTour.startWithThese}</p>
          </div>
        )}

        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-all sm:flex-row sm:items-center ${
                step.completed
                  ? 'border-border/50 bg-muted/35'
                  : step.quickWin
                    ? 'border-primary/20 bg-primary/[0.035]'
                    : 'border-border/70 bg-background hover:border-primary/20'
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  {step.quickWin && !step.completed && <Badge variant="secondary" className="text-[10px]">Quick Win</Badge>}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>

              {!step.completed && (
                <Button
                  size="sm"
                  variant={step.quickWin ? 'default' : 'outline'}
                  onClick={() => navigate(step.route)}
                  className="w-full flex-shrink-0 rounded-lg sm:w-auto"
                >
                  {step.action}
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}

        {isComplete && (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-semibold">{t.onboardingTour.congratulations}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.onboardingTour.onboardingComplete}</p>
            <Button onClick={handleDismiss} className="mt-3 rounded-xl" size="sm">
              {t.onboardingTour.startOptimization}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
