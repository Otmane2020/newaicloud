import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";

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
  const { language } = useTranslation();

  // Generate recommendations based on stats
  const recommendations: Recommendation[] = [];

  // SEO produits
  const optimizationRate = stats.productsCount > 0 
    ? (stats.optimizedCount / stats.productsCount) * 100 
    : 0;

  if (optimizationRate < 50 && stats.productsCount > 0) {
    recommendations.push({
      id: 'optimize-products',
      title: language === 'fr' ? 'Optimiser les produits non-SEO' : 'Optimize non-SEO products',
      description: language === 'fr' 
        ? `${stats.productsCount - stats.optimizedCount} produits nécessitent une optimisation SEO pour améliorer leur visibilité.`
        : `${stats.productsCount - stats.optimizedCount} products need SEO optimization to improve visibility.`,
      priority: 'high',
      category: 'seo',
      action: {
        label: language === 'fr' ? 'Optimiser maintenant' : 'Optimize now',
        route: '/seo?filter=poor',
      },
      impact: language === 'fr' ? '+30% de trafic organique estimé' : '+30% estimated organic traffic',
    });
  }

  // Alt texts manquants
  if (stats.productsWithoutAlt > 0) {
    recommendations.push({
      id: 'add-alt-texts',
      title: language === 'fr' ? 'Ajouter des textes alternatifs aux images' : 'Add alt texts to images',
      description: language === 'fr'
        ? `${stats.productsWithoutAlt} images sans texte alternatif. Cela nuit à votre référencement et à l'accessibilité.`
        : `${stats.productsWithoutAlt} images without alt text. This hurts your SEO and accessibility.`,
      priority: 'high',
      category: 'seo',
      action: {
        label: language === 'fr' ? 'Générer les alt texts' : 'Generate alt texts',
        route: '/seo',
      },
      impact: language === 'fr' ? '+15% de visibilité dans Google Images' : '+15% visibility in Google Images',
    });
  }

  // Score SEO
  if (stats.seoScore < 70) {
    recommendations.push({
      id: 'improve-seo-score',
      title: language === 'fr' ? 'Améliorer le score SEO global' : 'Improve global SEO score',
      description: language === 'fr'
        ? `Votre score SEO actuel est de ${stats.seoScore}/100. Des améliorations sont possibles pour mieux performer.`
        : `Your current SEO score is ${stats.seoScore}/100. Improvements are possible to perform better.`,
      priority: 'medium',
      category: 'seo',
      action: {
        label: language === 'fr' ? 'Voir le rapport SEO' : 'View SEO report',
        route: '/seo',
      },
      impact: language === 'fr' ? 'Meilleur positionnement dans les résultats de recherche' : 'Better ranking in search results',
    });
  }

  // Contenu blog
  if (stats.articlesCount < 5) {
    recommendations.push({
      id: 'create-blog-content',
      title: language === 'fr' ? 'Créer du contenu blog régulier' : 'Create regular blog content',
      description: language === 'fr'
        ? `Vous avez ${stats.articlesCount} article(s). Publier régulièrement améliore votre autorité et génère du trafic.`
        : `You have ${stats.articlesCount} article(s). Publishing regularly improves your authority and generates traffic.`,
      priority: 'medium',
      category: 'content',
      action: {
        label: language === 'fr' ? 'Générer des articles' : 'Generate articles',
        route: '/blog',
      },
      impact: language === 'fr' ? '+50% de sessions organiques sur 3 mois' : '+50% organic sessions over 3 months',
    });
  }

  // Performance produits
  if (stats.productsCount > 100 && optimizationRate > 80) {
    recommendations.push({
      id: 'optimize-performance',
      title: language === 'fr' ? 'Excellent travail SEO !' : 'Excellent SEO work!',
      description: language === 'fr'
        ? `${optimizationRate.toFixed(0)}% de vos produits sont optimisés. Continuez sur cette lancée en automatisant vos synchros.`
        : `${optimizationRate.toFixed(0)}% of your products are optimized. Keep it up by automating your syncs.`,
      priority: 'low',
      category: 'performance',
      action: {
        label: language === 'fr' ? 'Activer l\'automatisation' : 'Enable automation',
        route: '/account',
      },
      impact: language === 'fr' ? 'Gain de temps et cohérence maximale' : 'Time savings and maximum consistency',
    });
  }

  // If everything is good
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-good',
      title: language === 'fr' ? 'Votre boutique est bien optimisée !' : 'Your store is well optimized!',
      description: language === 'fr'
        ? 'Continuez à publier du contenu régulièrement et à surveiller vos performances.'
        : 'Keep publishing content regularly and monitoring your performance.',
      priority: 'low',
      category: 'performance',
      impact: language === 'fr' ? 'Maintenir votre excellence SEO' : 'Maintain your SEO excellence',
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
        <h3 className="font-semibold text-lg">{language === 'fr' ? 'Recommandations IA' : 'AI Recommendations'}</h3>
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
