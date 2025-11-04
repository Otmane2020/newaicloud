import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'seo' | 'content' | 'performance' | 'marketing';
  action?: {
    label: string;
    route: string;
  };
  impact: string;
}

interface AIRecommendationsProps {
  stats: {
    productsCount: number;
    optimizedCount: number;
    articlesCount: number;
    seoScore: number;
    productsWithImages: number;
    productsWithoutAlt: number;
  };
}

export function AIRecommendations({ stats }: AIRecommendationsProps) {
  const navigate = useNavigate();

  // Générer recommandations basées sur les stats
  const recommendations: Recommendation[] = [];

  // SEO produits
  const optimizationRate = stats.productsCount > 0 
    ? (stats.optimizedCount / stats.productsCount) * 100 
    : 0;

  if (optimizationRate < 50 && stats.productsCount > 0) {
    recommendations.push({
      id: 'optimize-products',
      title: 'Optimiser les produits non-SEO',
      description: `${stats.productsCount - stats.optimizedCount} produits nécessitent une optimisation SEO pour améliorer leur visibilité.`,
      priority: 'high',
      category: 'seo',
      action: {
        label: 'Optimiser maintenant',
        route: '/seo?filter=poor',
      },
      impact: '+30% de trafic organique estimé',
    });
  }

  // Alt texts manquants
  if (stats.productsWithoutAlt > 0) {
    recommendations.push({
      id: 'add-alt-texts',
      title: 'Ajouter des textes alternatifs aux images',
      description: `${stats.productsWithoutAlt} images sans texte alternatif. Cela nuit à votre référencement et à l'accessibilité.`,
      priority: 'high',
      category: 'seo',
      action: {
        label: 'Générer les alt texts',
        route: '/seo',
      },
      impact: '+15% de visibilité dans Google Images',
    });
  }

  // Score SEO
  if (stats.seoScore < 70) {
    recommendations.push({
      id: 'improve-seo-score',
      title: 'Améliorer le score SEO global',
      description: `Votre score SEO actuel est de ${stats.seoScore}/100. Des améliorations sont possibles pour mieux performer.`,
      priority: 'medium',
      category: 'seo',
      action: {
        label: 'Voir le rapport SEO',
        route: '/seo',
      },
      impact: 'Meilleur positionnement dans les résultats de recherche',
    });
  }

  // Contenu blog
  if (stats.articlesCount < 5) {
    recommendations.push({
      id: 'create-blog-content',
      title: 'Créer du contenu blog régulier',
      description: `Vous avez ${stats.articlesCount} article(s). Publier régulièrement améliore votre autorité et génère du trafic.`,
      priority: 'medium',
      category: 'content',
      action: {
        label: 'Générer des articles',
        route: '/blog',
      },
      impact: '+50% de sessions organiques sur 3 mois',
    });
  }

  // Performance produits
  if (stats.productsCount > 100 && optimizationRate > 80) {
    recommendations.push({
      id: 'optimize-performance',
      title: 'Excellent travail SEO !',
      description: `${optimizationRate.toFixed(0)}% de vos produits sont optimisés. Continuez sur cette lancée en automatisant vos synchros.`,
      priority: 'low',
      category: 'performance',
      action: {
        label: 'Activer l\'automatisation',
        route: '/account',
      },
      impact: 'Gain de temps et cohérence maximale',
    });
  }

  // Si tout est bon
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-good',
      title: 'Votre boutique est bien optimisée !',
      description: 'Continuez à publier du contenu régulièrement et à surveiller vos performances.',
      priority: 'low',
      category: 'performance',
      impact: 'Maintenir votre excellence SEO',
    });
  }

  const priorityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  const priorityIcons = {
    high: AlertCircle,
    medium: TrendingUp,
    low: CheckCircle,
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Recommandations IA</h3>
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((rec) => {
          const Icon = priorityIcons[rec.priority];
          return (
            <div
              key={rec.id}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge variant={priorityColors[rec.priority] as any} className="text-xs">
                        {rec.priority === 'high' ? 'Urgent' : rec.priority === 'medium' ? 'Important' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <TrendingUp className="h-3 w-3" />
                      <span>{rec.impact}</span>
                    </div>
                  </div>
                </div>
                {rec.action && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(rec.action!.route)}
                    className="shrink-0"
                  >
                    {rec.action.label}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
