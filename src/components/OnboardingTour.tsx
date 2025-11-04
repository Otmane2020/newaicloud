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
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'connect_shopify',
      title: 'Connectez votre boutique Shopify',
      description: 'Synchronisez vos produits en 1 clic',
      icon: Target,
      action: 'Connecter',
      route: '/integration',
      completed: false,
      quickWin: true
    },
    {
      id: 'optimize_first_product',
      title: 'Optimisez votre premier produit',
      description: 'Améliorez le SEO d\'un produit en 30 secondes',
      icon: Sparkles,
      action: 'Optimiser',
      route: '/seo',
      completed: false,
      quickWin: true
    },
    {
      id: 'generate_article',
      title: 'Créez votre premier article de blog',
      description: 'Générez du contenu optimisé SEO avec l\'IA',
      icon: FileText,
      action: 'Créer',
      route: '/blog',
      completed: false
    },
    {
      id: 'setup_automation',
      title: 'Activez les optimisations automatiques',
      description: 'Laissez l\'IA travailler pour vous',
      icon: Zap,
      action: 'Activer',
      route: '/seo',
      completed: false
    },
    {
      id: 'view_analytics',
      title: 'Consultez vos premières statistiques',
      description: 'Suivez l\'impact de vos optimisations',
      icon: BarChart3,
      action: 'Voir',
      route: '/dashboard',
      completed: false
    }
  ]);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed === 'true') {
      setShow(false);
      return;
    }
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = () => {
    // Simplified - just show the onboarding tour
    setShow(true);
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
              Bienvenue sur votre plateforme SEO
            </CardTitle>
            <CardDescription>
              Suivez ces étapes pour obtenir vos premiers résultats en moins de 10 minutes
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{completedCount}/{steps.length} complétées</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickWins.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Quick Wins</span>
              <Badge variant="secondary" className="text-xs">Recommandé</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Commencez par ces actions pour des résultats immédiats
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
