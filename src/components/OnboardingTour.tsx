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

export function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, tf, language } = useTranslation();
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'connect_shopify',
      title: language === 'fr' ? 'Connectez votre boutique Shopify' : 'Connect your Shopify store',
      description: language === 'fr' ? 'Synchronisez vos produits en 1 clic' : 'Sync your products in 1 click',
      icon: Target,
      action: language === 'fr' ? 'Connecter' : 'Connect',
      route: '/integration',
      completed: false,
      quickWin: true
    },
    {
      id: 'optimize_first_product',
      title: language === 'fr' ? 'Optimisez votre premier produit' : 'Optimize your first product',
      description: language === 'fr' ? 'Améliorez le SEO d\'un produit en 30 secondes' : 'Improve product SEO in 30 seconds',
      icon: Sparkles,
      action: language === 'fr' ? 'Optimiser' : 'Optimize',
      route: '/seo',
      completed: false,
      quickWin: true
    },
    {
      id: 'generate_article',
      title: language === 'fr' ? 'Créez votre premier article de blog' : 'Create your first blog article',
      description: language === 'fr' ? 'Générez du contenu optimisé SEO avec l\'IA' : 'Generate AI-optimized SEO content',
      icon: FileText,
      action: language === 'fr' ? 'Créer' : 'Create',
      route: '/blog',
      completed: false
    },
    {
      id: 'setup_automation',
      title: language === 'fr' ? 'Activez les optimisations automatiques' : 'Enable automatic optimizations',
      description: language === 'fr' ? 'Laissez l\'IA travailler pour vous' : 'Let AI work for you',
      icon: Zap,
      action: language === 'fr' ? 'Activer' : 'Enable',
      route: '/seo',
      completed: false
    },
    {
      id: 'view_analytics',
      title: language === 'fr' ? 'Consultez vos premières statistiques' : 'View your first statistics',
      description: language === 'fr' ? 'Suivez l\'impact de vos optimisations' : 'Track the impact of your optimizations',
      icon: BarChart3,
      action: language === 'fr' ? 'Voir' : 'View',
      route: '/dashboard',
      completed: false
    }
  ]);

  useEffect(() => {
    // Update steps when language changes
    setSteps([
      {
        id: 'connect_shopify',
        title: language === 'fr' ? 'Connectez votre boutique Shopify' : 'Connect your Shopify store',
        description: language === 'fr' ? 'Synchronisez vos produits en 1 clic' : 'Sync your products in 1 click',
        icon: Target,
        action: language === 'fr' ? 'Connecter' : 'Connect',
        route: '/integration',
        completed: steps.find(s => s.id === 'connect_shopify')?.completed || false,
        quickWin: true
      },
      {
        id: 'optimize_first_product',
        title: language === 'fr' ? 'Optimisez votre premier produit' : 'Optimize your first product',
        description: language === 'fr' ? 'Améliorez le SEO d\'un produit en 30 secondes' : 'Improve product SEO in 30 seconds',
        icon: Sparkles,
        action: language === 'fr' ? 'Optimiser' : 'Optimize',
        route: '/seo',
        completed: steps.find(s => s.id === 'optimize_first_product')?.completed || false,
        quickWin: true
      },
      {
        id: 'generate_article',
        title: language === 'fr' ? 'Créez votre premier article de blog' : 'Create your first blog article',
        description: language === 'fr' ? 'Générez du contenu optimisé SEO avec l\'IA' : 'Generate AI-optimized SEO content',
        icon: FileText,
        action: language === 'fr' ? 'Créer' : 'Create',
        route: '/blog',
        completed: steps.find(s => s.id === 'generate_article')?.completed || false
      },
      {
        id: 'setup_automation',
        title: language === 'fr' ? 'Activez les optimisations automatiques' : 'Enable automatic optimizations',
        description: language === 'fr' ? 'Laissez l\'IA travailler pour vous' : 'Let AI work for you',
        icon: Zap,
        action: language === 'fr' ? 'Activer' : 'Enable',
        route: '/seo',
        completed: steps.find(s => s.id === 'setup_automation')?.completed || false
      },
      {
        id: 'view_analytics',
        title: language === 'fr' ? 'Consultez vos premières statistiques' : 'View your first statistics',
        description: language === 'fr' ? 'Suivez l\'impact de vos optimisations' : 'Track the impact of your optimizations',
        icon: BarChart3,
        action: language === 'fr' ? 'Voir' : 'View',
        route: '/dashboard',
        completed: steps.find(s => s.id === 'view_analytics')?.completed || false
      }
    ]);
  }, [language]);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed === 'true') {
      setShow(false);
      return;
    }
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      // Check Shopify connection
      const { data: connections } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Check optimized products
      const { data: optimizedProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('seo_optimized', true)
        .limit(1);

      // Check blog articles
      const { data: articles } = await supabase
        .from('blog_articles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Update steps based on real data
      setSteps(prev => prev.map(step => {
        if (step.id === 'connect_shopify' && connections && connections.length > 0) {
          return { ...step, completed: true };
        }
        if (step.id === 'optimize_first_product' && optimizedProducts && optimizedProducts.length > 0) {
          return { ...step, completed: true };
        }
        if (step.id === 'generate_article' && articles && articles.length > 0) {
          return { ...step, completed: true };
        }
        if (step.id === 'setup_automation') {
          // Check if user has some optimized products (indicates automation usage)
          return { ...step, completed: optimizedProducts && optimizedProducts.length > 5 };
        }
        if (step.id === 'view_analytics') {
          // Consider completed if user has visited dashboard (we're on it now)
          return { ...step, completed: true };
        }
        return step;
      }));

      setShow(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShow(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('onboarding_completed', 'true');
    toast({
      title: "Onboarding terminé",
      description: "Vous pouvez toujours accéder aux guides depuis les paramètres",
    });
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const quickWins = steps.filter(s => s.quickWin && !s.completed);

  if (!show) return null;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {language === 'fr' ? 'Bienvenue sur votre plateforme SEO' : 'Welcome to your SEO platform'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' 
                ? 'Suivez ces étapes pour obtenir vos premiers résultats en moins de 10 minutes'
                : 'Follow these steps to get your first results in less than 10 minutes'
              }
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{language === 'fr' ? 'Progression' : 'Progress'}</span>
            <span className="font-medium">{completedCount}/{steps.length} {language === 'fr' ? 'complétées' : 'completed'}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickWins.length > 0 && (
            <div className="bg-primary/5 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{language === 'fr' ? 'Quick Wins' : 'Quick Wins'}</span>
                <Badge variant="secondary" className="text-xs">{language === 'fr' ? 'Recommandé' : 'Recommended'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'fr' 
                  ? 'Commencez par ces actions pour des résultats immédiats'
                  : 'Start with these actions for immediate results'
                }
              </p>
          </div>
        )}

        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                step.completed
                  ? 'bg-muted/50 border-muted'
                  : step.quickWin
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border hover:border-primary/20'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed ? 'bg-primary' : 'bg-muted'
              }`}>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  {step.quickWin && !step.completed && (
                    <Badge variant="secondary" className="text-xs">Quick Win</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>

              {!step.completed && (
                <Button
                  size="sm"
                  variant={step.quickWin ? "default" : "outline"}
                  onClick={() => navigate(step.route)}
                  className="flex-shrink-0"
                >
                  {step.action}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}

        {completedCount === steps.length && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold">Félicitations ! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Vous avez terminé l'onboarding. Votre boutique est prête à décoller !
            </p>
            <Button onClick={handleDismiss} className="mt-3" size="sm">
              Commencer l'optimisation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
