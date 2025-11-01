import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface SeoScoreGaugeProps {
  score: number;
  categories: {
    homepage: number;
    products: number;
    collections: number;
    content: number;
    images: number;
    technical: number;
  };
}

export function SeoScoreGauge({ score, categories: categoryScores }: SeoScoreGaugeProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreGradient = () => {
    if (score >= 80) return 'from-success/20 to-success/5';
    if (score >= 60) return 'from-warning/20 to-warning/5';
    return 'from-destructive/20 to-destructive/5';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Moyen';
    return 'Faible';
  };

  const getScoreIcon = () => {
    if (score >= 80) return <Target className="w-5 h-5 text-success" />;
    if (score >= 60) return <TrendingUp className="w-5 h-5 text-warning" />;
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const categories = [
    { 
      name: '🏠 Homepage', 
      description: 'Titre et description de votre page d\'accueil',
      value: Math.round(categoryScores.homepage), 
      max: 100, 
      color: 'hsl(217 91% 60%)' 
    },
    { 
      name: '📦 Produits', 
      description: 'Titres SEO, descriptions et tags optimisés',
      value: Math.round(categoryScores.products), 
      max: 100, 
      color: 'hsl(271 91% 65%)' 
    },
    { 
      name: '📁 Collections', 
      description: 'Descriptions et images de vos collections',
      value: Math.round(categoryScores.collections), 
      max: 100, 
      color: 'hsl(38 92% 50%)' 
    },
    { 
      name: '📝 Contenu', 
      description: 'Articles de blog et pages Shopify',
      value: Math.round(categoryScores.content), 
      max: 100, 
      color: 'hsl(192 71% 45%)' 
    },
    { 
      name: '🖼️ Images', 
      description: 'Textes alternatifs (alt text) des images',
      value: Math.round(categoryScores.images), 
      max: 100, 
      color: 'hsl(142 71% 45%)' 
    },
    { 
      name: '⚙️ Technique', 
      description: 'Configuration et synchronisation boutique',
      value: Math.round(categoryScores.technical), 
      max: 100, 
      color: 'hsl(0 71% 55%)' 
    },
  ];

  return (
    <Card className="col-span-full border-2 bg-gradient-to-br from-card to-muted/20 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${getScoreGradient()} backdrop-blur-sm`}>
              {getScoreIcon()}
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Score SEO Global</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Analyse détaillée de votre catalogue</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${getScoreColor()} border-current px-4 py-2 text-base font-semibold`}
          >
            {getScoreLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score principal avec gauge circulaire stylisé */}
        <div className="flex items-center justify-center relative py-8">
          <div className="relative">
            {/* Cercle de fond */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                fill="none"
              />
              {/* Cercle de progression avec gradient */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke={score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(score / 100) * 553} 553`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
              />
            </svg>
            {/* Texte au centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-black ${getScoreColor()}`}>
                {score}
              </span>
              <span className="text-sm text-muted-foreground font-medium mt-1">/100</span>
            </div>
          </div>
        </div>

        {/* Breakdown des catégories - 6 catégories égales = 100% / 6 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground/80">6 Catégories SEO</h4>
            <span className="text-xs text-muted-foreground">Chaque catégorie = 16.7% du score global</span>
          </div>
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                </div>
                <span className="text-sm font-bold ml-3" style={{ color: cat.color }}>
                  {cat.value}/100
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(cat.value / cat.max) * 100}%`,
                    background: `linear-gradient(90deg, ${cat.color}, ${cat.color}dd)`,
                    boxShadow: `0 0 8px ${cat.color}66`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mini recommandations basées sur la catégorie la plus faible */}
        {score < 80 && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-primary">
              💡 Conseil : {(() => {
                const lowestCategory = categories.reduce((min, cat) => 
                  cat.value < min.value ? cat : min
                , categories[0]);
                
                if (lowestCategory.name.includes('Homepage')) {
                  return "Optimisez votre homepage avec titre et description SEO";
                } else if (lowestCategory.name.includes('Produits')) {
                  return "Optimisez vos titres et descriptions produits pour +20 points";
                } else if (lowestCategory.name.includes('Collections')) {
                  return "Ajoutez des descriptions SEO à vos collections";
                } else if (lowestCategory.name.includes('Contenu')) {
                  return "Publiez plus d'articles et de pages optimisés SEO";
                } else if (lowestCategory.name.includes('Images')) {
                  return "Ajoutez des textes alt à vos images pour +15 points";
                } else {
                  return "Vérifiez vos paramètres techniques et synchronisation";
                }
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
