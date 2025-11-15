import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface SeoScoreGaugeProps {
  score: number;
  categories: {
    homepage: number;
    products: number;
    collections: number;
    pages: number;
    articles: number;
    images: number;
    technical: number;
  };
}

export function SeoScoreGauge({ score, categories: categoryScores }: SeoScoreGaugeProps) {
  const { t, tf } = useTranslation();
  
  // Nouvelle palette de couleurs rouge-orange
  const getScoreColor = () => {
    if (score >= 80) return "text-[#22c55e]"; // Vert pour excellent
    if (score >= 60) return "text-[#FF8000]"; // Orange
    return "text-[#FF3333]"; // Rouge
  };

  const getScoreGradient = () => {
    if (score >= 80) return "from-[#22c55e]/20 to-[#22c55e]/5";
    if (score >= 60) return "from-[#FF8000]/20 to-[#FF8000]/5";
    return "from-[#FF3333]/20 to-[#FF3333]/5";
  };

  const getScoreLabel = () => {
    if (score >= 80) return t.seoGauge.scoreLabels.excellent;
    if (score >= 60) return t.seoGauge.scoreLabels.good;
    return t.seoGauge.scoreLabels.needsImprovement;
  };

  const getScoreIcon = () => {
    if (score >= 80) return <Target className="w-5 h-5 text-[#22c55e]" />;
    if (score >= 60) return <TrendingUp className="w-5 h-5 text-[#FF8000]" />;
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
    if (value >= 55)
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
    if (score >= 60)
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
      name: t.seoGauge.categoryNames.products,
      description: t.seoGauge.categoryDescriptions.products,
      value: Math.round(categoryScores.products),
      max: 100,
      link: "/seo?tab=products",
      key: "products" as const
    },
    {
      name: t.seoGauge.categoryNames.collections,
      description: t.seoGauge.categoryDescriptions.collections,
      value: Math.round(categoryScores.collections),
      max: 100,
      link: "/seo?tab=collections",
      key: "collections" as const
    },
    {
      name: t.seoGauge.categoryNames.images,
      description: t.seoGauge.categoryDescriptions.images,
      value: Math.round(categoryScores.images),
      max: 100,
      link: "/seo?tab=alt",
      key: "images" as const
    },
    {
      name: t.seoGauge.categoryNames.pages,
      description: t.seoGauge.categoryDescriptions.pages,
      value: Math.round(categoryScores.pages),
      max: 100,
      link: "/seo?tab=pages",
      key: "pages" as const
    },
    {
      name: t.seoGauge.categoryNames.articles,
      description: t.seoGauge.categoryDescriptions.articles,
      value: Math.round(categoryScores.articles),
      max: 100,
      link: "/seo?tab=articles",
      key: "articles" as const
    },
    {
      name: t.seoGauge.categoryNames.homepage,
      description: t.seoGauge.categoryDescriptions.homepage,
      value: Math.round(categoryScores.homepage),
      max: 100,
      link: "/seo?tab=homepage",
      key: "homepage" as const
    },
  ];

  const gaugeGradient = getGaugeGradient();

  return (
    <Card className="col-span-full border-2 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-24 -translate-x-24" />

      <CardHeader className="pb-3 sm:pb-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div
              className={`p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${getScoreGradient()} backdrop-blur-sm shadow-lg border border-white/20 flex-shrink-0`}
            >
              {getScoreIcon()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl md:text-2xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">
                {t.seoGauge.title}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium truncate">
                {t.seoGauge.subtitle}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getScoreColor()} border-2 border-current px-3 sm:px-5 py-1.5 sm:py-2.5 text-sm sm:text-lg font-bold shadow-lg flex-shrink-0`}
          >
            {getScoreLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 md:space-y-8 relative z-10">
        {/* Score principal avec gauge circulaire ultra stylisée */}
        <div className="flex items-center justify-center relative py-6 sm:py-8 md:py-12">
          <div className="relative">
            {/* Glow effect background */}
            <div className={`absolute inset-0 rounded-full blur-2xl ${gaugeGradient.glow} animate-pulse`} />

            {/* Cercle de fond avec gradient amélioré */}
            <svg className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 transform -rotate-90 relative z-10" viewBox="0 0 224 224">
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
                <span className={`text-4xl sm:text-5xl md:text-7xl font-black ${getScoreColor()} animate-scale-in drop-shadow-lg`}>
                  {score}
                </span>
                <span className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-bold">/100</span>
              </div>
              <div className="mt-2 sm:mt-3 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg">
                <span className="text-xs font-semibold text-muted-foreground">{t.seoGauge.currentScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown des catégories - Cliquables avec design premium */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-4">
            <h4 className="text-sm sm:text-base font-bold text-foreground">6 {t.seoGauge.categories}</h4>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {tf('seoGauge.excellentCount', { count: categories.filter((c) => c.value >= 80).length })}
            </Badge>
          </div>
          {categories.map((cat, idx) => {
            const categoryColor = getCategoryColor(cat.value);
            return (
              <a
                key={idx}
                href={cat.link}
                className="block space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-lg sm:rounded-xl hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all duration-300 cursor-pointer group border border-transparent hover:border-border hover:shadow-lg"
              >
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {cat.name}
                      </div>
                      <div className={`w-2 h-2 rounded-full ${categoryColor.dot} animate-pulse flex-shrink-0`} />
                    </div>
                    <div className="text-xs text-muted-foreground font-medium break-words">{cat.description}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={`text-base sm:text-lg font-black ${categoryColor.text}`}>{cat.value}</span>
                    <span className="text-xs text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
                <div className="relative h-2 sm:h-3 bg-muted rounded-full overflow-hidden shadow-inner">
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
                <h5 className="text-base font-bold text-foreground mb-2">{t.seoGauge.priorityRecommendation}</h5>
                <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                  {(() => {
                    const lowestCategory = categories.reduce(
                      (min, cat) => (cat.value < min.value ? cat : min),
                      categories[0],
                    );

                    const recommendationKey = lowestCategory.key;
                    return t.seoGauge.recommendations[recommendationKey];
                  })()}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-primary font-semibold">
                  <span>{t.seoGauge.potentialImpact}</span>
                  <Badge className="bg-primary text-primary-foreground">
                    +
                    {(() => {
                      const lowestCategory = categories.reduce(
                        (min, cat) => (cat.value < min.value ? cat : min),
                        categories[0]
                      );
                      
                      if (lowestCategory.key === "products" || lowestCategory.key === "homepage") {
                        return "20";
                      } else if (lowestCategory.key === "images") {
                        return "15";
                      } else {
                        return "10";
                      }
                    })()}{" "}
                    {t.seoGauge.points}
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
