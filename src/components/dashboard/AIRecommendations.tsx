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
  const { t } = useTranslation();

  // Generate recommendations based on stats
  const recommendations: Recommendation[] = [];

  // SEO produits
  const optimizationRate = stats.productsCount > 0 
    ? (stats.optimizedCount / stats.productsCount) * 100 
    : 0;

  if (optimizationRate < 50 && stats.productsCount > 0) {
    recommendations.push({
      id: 'optimize-products',
      title: t.dashboard.recommendations.optimizeNonSeo.title,
      description: t.dashboard.recommendations.optimizeNonSeo.description.replace('{{count}}', String(stats.productsCount - stats.optimizedCount)),
      priority: 'high',
      category: 'seo',
      action: {
        label: t.dashboard.recommendations.optimizeNonSeo.action,
        route: '/seo?filter=poor',
      },
      impact: t.dashboard.recommendations.optimizeNonSeo.impact,
    });
  }

  // Alt texts manquants
  if (stats.productsWithoutAlt > 0) {
    recommendations.push({
      id: 'add-alt-texts',
      title: t.dashboard.recommendations.addAltTexts.title,
      description: t.dashboard.recommendations.addAltTexts.description.replace('{{count}}', String(stats.productsWithoutAlt)),
      priority: 'high',
      category: 'seo',
      action: {
        label: t.dashboard.recommendations.addAltTexts.action,
        route: '/seo',
      },
      impact: t.dashboard.recommendations.addAltTexts.impact,
    });
  }

  // Score SEO
  if (stats.seoScore < 70) {
    recommendations.push({
      id: 'improve-seo-score',
      title: t.dashboard.recommendations.improveSeoScore.title,
      description: t.dashboard.recommendations.improveSeoScore.description.replace('{{score}}', String(stats.seoScore)),
      priority: 'medium',
      category: 'seo',
      action: {
        label: t.dashboard.recommendations.improveSeoScore.action,
        route: '/seo',
      },
      impact: t.dashboard.recommendations.improveSeoScore.impact,
    });
  }

  // Contenu blog
  if (stats.articlesCount < 5) {
    recommendations.push({
      id: 'create-blog-content',
      title: t.dashboard.recommendations.createBlogContent.title,
      description: t.dashboard.recommendations.createBlogContent.description.replace('{{count}}', String(stats.articlesCount)),
      priority: 'medium',
      category: 'content',
      action: {
        label: t.dashboard.recommendations.createBlogContent.action,
        route: '/blog',
      },
      impact: t.dashboard.recommendations.createBlogContent.impact,
    });
  }

  // Performance produits
  if (stats.productsCount > 100 && optimizationRate > 80) {
    recommendations.push({
      id: 'optimize-performance',
      title: t.dashboard.recommendations.excellentWork.title,
      description: t.dashboard.recommendations.excellentWork.description.replace('{{percent}}', optimizationRate.toFixed(0)),
      priority: 'low',
      category: 'performance',
      action: {
        label: t.dashboard.recommendations.excellentWork.action,
        route: '/account',
      },
      impact: t.dashboard.recommendations.excellentWork.impact,
    });
  }

  // If everything is good
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-good',
      title: t.dashboard.recommendations.allGood.title,
      description: t.dashboard.recommendations.allGood.description,
      priority: 'low',
      category: 'performance',
      impact: t.dashboard.recommendations.allGood.impact,
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
        <h3 className="font-semibold text-lg">{t.dashboard.recommendations.title}</h3>
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
                        {t.dashboard.recommendations.priority[rec.priority]}
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
