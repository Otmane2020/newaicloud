import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface SeoScoreGaugeProps {
  score: number;
  breakdown: {
    structure: number;
    content: number;
    technical: number;
    bonus: number;
  };
}

export function SeoScoreGauge({ score, breakdown }: SeoScoreGaugeProps) {
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
    { name: '🏗️ Structure HTML', value: breakdown.structure, max: 30, color: 'hsl(217 91% 60%)' },
    { name: '📝 Contenu sémantique', value: breakdown.content, max: 30, color: 'hsl(271 91% 65%)' },
    { name: '⚙️ Technique & Qualité', value: breakdown.technical, max: 25, color: 'hsl(38 92% 50%)' },
    { name: '⭐ Bonus SEO', value: breakdown.bonus, max: 15, color: 'hsl(142 71% 45%)' },
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

        {/* Breakdown des catégories */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground/80 mb-3">Détails par catégorie</h4>
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                <span className="text-sm font-bold" style={{ color: cat.color }}>
                  {cat.value}/{cat.max}
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

        {/* Mini recommandations */}
        {score < 80 && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-primary">
              💡 Conseil : {score < 60 
                ? "Optimisez vos titres et descriptions pour améliorer votre score de +20 points"
                : "Ajoutez des images avec alt text pour gagner +5 points supplémentaires"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
