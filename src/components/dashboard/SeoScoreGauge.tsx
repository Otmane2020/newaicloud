import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";

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
  // Nouvelle palette de couleurs rouge-orange
  const getScoreColor = () => {
    if (score >= 80) return "text-[#22c55e]"; // Vert pour excellent
    if (score >= 50) return "text-[#FF8000]"; // Orange
    return "text-[#FF3333]"; // Rouge
  };

  const getScoreGradient = () => {
    if (score >= 80) return "from-[#22c55e]/20 to-[#22c55e]/5";
    if (score >= 50) return "from-[#FF8000]/20 to-[#FF8000]/5";
    return "from-[#FF3333]/20 to-[#FF3333]/5";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 50) return "Bon";
    return "À améliorer";
  };

  const getScoreIcon = () => {
    if (score >= 80) return <Target className="w-5 h-5 text-[#22c55e]" />;
    if (score >= 50) return <TrendingUp className="w-5 h-5 text-[#FF8000]" />;
    return <AlertTriangle className="w-5 h-5 text-[#FF3333]" />;
  };

  const getCategoryColor = (value: number) => {
    if (value >= 80)
      return {
        text: "text-[#22c55e]",
        bg: "bg-gradient-to-r from-[#22c55e] to-[#16a34a]",
        glow: "0 0 10px #22c55e",
        dot: "bg-[#22c55e]",
      };
    if (value >= 50)
      return {
        text: "text-[#FF8000]",
        bg: "bg-gradient-to-r from-[#FF8000] to-[#FF8000]",
        glow: "0 0 10px #FF8000",
        dot: "bg-[#FF8000]",
      };
    return {
      text: "text-[#FF3333]",
      bg: "bg-gradient-to-r from-[#FF3333] to-[#FF3333]",
      glow: "0 0 10px #FF3333",
      dot: "bg-[#FF3333]",
    };
  };

  const getGaugeGradient = () => {
    if (score >= 80)
      return {
        start: "#22c55e",
        end: "#16a34a",
        glow: "bg-[#22c55e]/30",
      };
    if (score >= 50)
      return {
        start: "#FF8000",
        end: "#FF8000",
        glow: "bg-[#FF8000]/30",
      };
    return {
      start: "#FF3333",
      end: "#FF3333",
      glow: "bg-[#FF3333]/30",
    };
  };

  const categories = [
    {
      name: "Homepage",
      description: "Titre et description de votre page d'accueil",
      value: Math.round(categoryScores.homepage),
      max: 100,
      link: "/seo?tab=homepage",
    },
    {
      name: "Produits",
      description: "Titres SEO, descriptions et tags optimisés",
      value: Math.round(categoryScores.products),
      max: 100,
      link: "/seo?tab=products",
    },
    {
      name: "Collections",
      description: "Descriptions et images de vos collections",
      value: Math.round(categoryScores.collections),
      max: 100,
      link: "/seo?tab=collections",
    },
    {
      name: "Contenu",
      description: "Articles de blog et pages Shopify optimisés",
      value: Math.round(categoryScores.content),
      max: 100,
      link: "/seo?tab=articles",
    },
    {
      name: "Images",
      description: "Textes alternatifs (alt text) des images",
      value: Math.round(categoryScores.images),
      max: 100,
      link: "/seo?tab=alt",
    },
    {
      name: "Technique",
      description: "Synchronisation et configuration Shopify",
      value: Math.round(categoryScores.technical),
      max: 100,
      link: "/integration",
    },
  ];

  const gaugeGradient = getGaugeGradient();

  return (
    <Card className="col-span-full border-2 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-24 -translate-x-24" />

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl bg-gradient-to-br ${getScoreGradient()} backdrop-blur-sm shadow-lg border border-white/20`}
            >
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
        {/* Score principal avec gauge circulaire ultra stylisée */}
        <div className="flex items-center justify-center relative py-12">
          <div className="relative">
            {/* Glow effect background */}
            <div className={`absolute inset-0 rounded-full blur-2xl ${gaugeGradient.glow} animate-pulse`} />

            {/* Cercle de fond avec gradient amélioré */}
            <svg className="w-56 h-56 transform -rotate-90 relative z-10" viewBox="0 0 224 224">
              <defs>
                {/* Gradient principal pour la jauge */}
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gaugeGradient.start} />
                  <stop offset="50%" stopColor={gaugeGradient.end} />
                  <stop offset="100%" stopColor={gaugeGradient.start} stopOpacity="0.8" />
                </linearGradient>

                {/* Ombre portée pour effet 3D */}
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={gaugeGradient.start} floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Background circle avec effet de profondeur */}
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="hsl(var(--muted))"
                strokeWidth="16"
                fill="none"
                opacity="0.3"
                className="drop-shadow-lg"
              />

              {/* Progress circle avec gradient et animation améliorée */}
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${(score / 100) * 628} 628`}
                strokeLinecap="round"
                filter="url(#shadow)"
                className="transition-all duration-2000 ease-out animate-glow"
                style={{
                  animationDelay: "0.5s",
                }}
              />

              {/* Effet de brillance supplémentaire */}
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${(score / 100) * 628} 628`}
                strokeLinecap="round"
                opacity="0.3"
                className="transition-all duration-2000 ease-out"
              />
            </svg>

            {/* Texte au centre avec animation améliorée */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative">
                <span className={`text-7xl font-black ${getScoreColor()} animate-scale-in drop-shadow-lg`}>
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
              {categories.filter((c) => c.value >= 80).length}/6 Excellentes
            </Badge>
          </div>
          {categories.map((cat, idx) => {
            const categoryColor = getCategoryColor(cat.value);
            return (
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
                      <div className={`w-2 h-2 rounded-full ${categoryColor.dot} animate-pulse`} />
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">{cat.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${categoryColor.text}`}>{cat.value}</span>
                    <span className="text-xs text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out shadow-lg ${categoryColor.bg}`}
                    style={{
                      width: `${(cat.value / cat.max) * 100}%`,
                      boxShadow: categoryColor.glow,
                    }}
                  />
                </div>
              </a>
            );
          })}
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
                    const lowestCategory = categories.reduce(
                      (min, cat) => (cat.value < min.value ? cat : min),
                      categories[0],
                    );

                    if (lowestCategory.name.includes("Homepage")) {
                      return "Optimisez votre page d'accueil avec un titre et une description SEO accrocheurs. C'est la vitrine de votre boutique et peut améliorer votre score de +20 points !";
                    } else if (lowestCategory.name.includes("Produits")) {
                      return "Enrichissez vos fiches produits avec des titres SEO optimisés et des descriptions détaillées. Chaque produit optimisé peut booster votre visibilité et votre score global de +20 points.";
                    } else if (lowestCategory.name.includes("Collections")) {
                      return "Ajoutez des descriptions SEO complètes à vos collections pour améliorer leur référencement. Les collections bien optimisées attirent plus de trafic qualifié.";
                    } else if (lowestCategory.name.includes("Contenu")) {
                      return "Créez et publiez des articles de blog optimisés SEO pour attirer du trafic organique. Le contenu de qualité est la clé d'une stratégie SEO réussie !";
                    } else if (lowestCategory.name.includes("Images")) {
                      return "Ajoutez des textes alternatifs (alt text) descriptifs à toutes vos images. C'est rapide, facile et peut améliorer votre score de +15 points tout en rendant votre site accessible.";
                    } else {
                      return "Vérifiez votre configuration technique et assurez-vous que la synchronisation avec Shopify fonctionne correctement. Une base technique solide est essentielle !";
                    }
                  })()}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-primary font-semibold">
                  <span>Impact potentiel :</span>
                  <Badge className="bg-primary text-primary-foreground">
                    +
                    {categories
                      .reduce((min, cat) => (cat.value < min.value ? cat : min), categories[0])
                      .name.includes("Produits")
                      ? "20"
                      : categories
                            .reduce((min, cat) => (cat.value < min.value ? cat : min), categories[0])
                            .name.includes("Images")
                        ? "15"
                        : categories
                              .reduce((min, cat) => (cat.value < min.value ? cat : min), categories[0])
                              .name.includes("Homepage")
                          ? "20"
                          : "10"}{" "}
                    points
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .animate-scale-in {
          animation: scaleIn 0.8s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Card>
  );
}
