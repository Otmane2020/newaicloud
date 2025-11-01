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
      name: 'Homepage', 
      description: 'Titre et description de votre page d\'accueil',
      value: Math.round(categoryScores.homepage), 
      max: 100, 
      link: '/seo?tab=homepage'
    },
    { 
      name: 'Produits', 
      description: 'Titres SEO, descriptions et tags optimisés',
      value: Math.round(categoryScores.products), 
      max: 100,
      link: '/seo?tab=products'
    },
    { 
      name: 'Collections', 
      description: 'Descriptions et images de vos collections',
      value: Math.round(categoryScores.collections), 
      max: 100,
      link: '/seo?tab=collections'
    },
    { 
      name: 'Contenu', 
      description: 'Articles de blog et pages Shopify optimisés',
      value: Math.round(categoryScores.content), 
      max: 100,
      link: '/seo?tab=articles'
    },
    { 
      name: 'Images', 
      description: 'Textes alternatifs (alt text) des images',
      value: Math.round(categoryScores.images), 
      max: 100,
      link: '/seo?tab=alt'
    },
    { 
      name: 'Technique', 
      description: 'Synchronisation et configuration Shopify',
      value: Math.round(categoryScores.technical), 
      max: 100,
      link: '/integration'
    },
  ];

  return (
    <Card className="col-span-full border-2 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-24 -translate-x-24" />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${getScoreGradient()} backdrop-blur-sm shadow-lg border border-white/20`}>
              {getScoreIcon()}
            </div>
            <div>
              <CardTitle className="text-2xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Score SEO Global
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Analyse complète de votre visibilité en ligne
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${getScoreColor()} border-2 border-current px-5 py-2.5 text-lg font-bold shadow-lg`}
          >
            {getScoreLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 relative z-10">
        {/* Score principal avec gauge circulaire ultra stylisé */}
        <div className="flex items-center justify-center relative py-12">
          <div className="relative">
            {/* Glow effect background */}
            <div className={`absolute inset-0 rounded-full blur-2xl ${
              score >= 80 ? 'bg-success/30' : score >= 60 ? 'bg-warning/30' : 'bg-destructive/30'
            } animate-pulse`} />
            
            {/* Cercle de fond avec gradient */}
            <svg className="w-56 h-56 transform -rotate-90 relative z-10">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} />
                  <stop offset="100%" stopColor={score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="hsl(var(--muted))"
                strokeWidth="16"
                fill="none"
                opacity="0.3"
              />
              {/* Progress circle avec gradient et animation */}
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${(score / 100) * 628} 628`}
                strokeLinecap="round"
                className="transition-all duration-1500 ease-out"
                style={{ 
                  filter: 'drop-shadow(0 0 12px currentColor)',
                }}
              />
            </svg>
            
            {/* Texte au centre avec animation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative">
                <span className={`text-7xl font-black ${getScoreColor()} animate-scale-in`}>
                  {score}
                </span>
                <span className="text-2xl text-muted-foreground font-bold">/100</span>
              </div>
              <div className="mt-3 px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg">
                <span className="text-xs font-semibold text-muted-foreground">SCORE ACTUEL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown des catégories - Cliquables avec design premium */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-bold text-foreground">6 Catégories SEO</h4>
            <Badge variant="outline" className="text-xs">
              {categories.filter(c => c.value >= 80).length}/6 Excellentes
            </Badge>
          </div>
          {categories.map((cat, idx) => (
            <a 
              key={idx}
              href={cat.link}
              className="block space-y-3 p-4 rounded-xl hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all duration-300 cursor-pointer group border border-transparent hover:border-border hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      cat.value >= 80 ? 'bg-success' : 
                      cat.value >= 60 ? 'bg-warning' : 
                      'bg-destructive'
                    } animate-pulse`} />
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">{cat.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${
                    cat.value >= 80 ? 'text-success' : 
                    cat.value >= 60 ? 'text-warning' : 
                    'text-destructive'
                  }`}>
                    {cat.value}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/100</span>
                </div>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out shadow-lg ${
                    cat.value >= 80 ? 'bg-gradient-to-r from-success to-success/80' : 
                    cat.value >= 60 ? 'bg-gradient-to-r from-warning to-warning/80' : 
                    'bg-gradient-to-r from-destructive to-destructive/80'
                  }`}
                  style={{
                    width: `${(cat.value / cat.max) * 100}%`,
                    boxShadow: cat.value >= 80 ? '0 0 10px hsl(var(--success))' : 
                               cat.value >= 60 ? '0 0 10px hsl(var(--warning))' : 
                               '0 0 10px hsl(var(--destructive))'
                  }}
                />
              </div>
            </a>
          ))}
        </div>

        {/* Recommandations premium basées sur la catégorie la plus faible */}
        {score < 80 && (
          <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h5 className="text-base font-bold text-foreground mb-2">💡 Recommandation Prioritaire</h5>
                <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                  {(() => {
                    const lowestCategory = categories.reduce((min, cat) => 
                      cat.value < min.value ? cat : min
                    , categories[0]);
                    
                    if (lowestCategory.name.includes('Homepage')) {
                      return "Optimisez votre page d'accueil avec un titre et une description SEO accrocheurs. C'est la vitrine de votre boutique et peut améliorer votre score de +20 points !";
                    } else if (lowestCategory.name.includes('Produits')) {
                      return "Enrichissez vos fiches produits avec des titres SEO optimisés et des descriptions détaillées. Chaque produit optimisé peut booster votre visibilité et votre score global de +20 points.";
                    } else if (lowestCategory.name.includes('Collections')) {
                      return "Ajoutez des descriptions SEO complètes à vos collections pour améliorer leur référencement. Les collections bien optimisées attirent plus de trafic qualifié.";
                    } else if (lowestCategory.name.includes('Contenu')) {
                      return "Créez et publiez des articles de blog optimisés SEO pour attirer du trafic organique. Le contenu de qualité est la clé d'une stratégie SEO réussie !";
                    } else if (lowestCategory.name.includes('Images')) {
                      return "Ajoutez des textes alternatifs (alt text) descriptifs à toutes vos images. C'est rapide, facile et peut améliorer votre score de +15 points tout en rendant votre site accessible.";
                    } else {
                      return "Vérifiez votre configuration technique et assurez-vous que la synchronisation avec Shopify fonctionne correctement. Une base technique solide est essentielle !";
                    }
                  })()}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-primary font-semibold">
                  <span>Impact potentiel :</span>
                  <Badge className="bg-primary text-primary-foreground">
                    +{categories.reduce((min, cat) => cat.value < min.value ? cat : min, categories[0]).name.includes('Produits') ? '20' : 
                      categories.reduce((min, cat) => cat.value < min.value ? cat : min, categories[0]).name.includes('Images') ? '15' : 
                      categories.reduce((min, cat) => cat.value < min.value ? cat : min, categories[0]).name.includes('Homepage') ? '20' : '10'} points
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
