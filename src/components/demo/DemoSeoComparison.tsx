import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";
import { 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Zap
} from "lucide-react";

export const DemoSeoComparison = () => {
  const { t, language } = useTranslation();

  const beforeScore = 23;
  const afterScore = 91;
  const improvement = afterScore - beforeScore;

  const beforeIssues = language === 'fr' 
    ? ["Meta descriptions manquantes", "Pas de textes ALT", "Mauvais tags produits"]
    : ["Missing meta descriptions", "No image ALT texts", "Poor product tagging"];

  const afterBenefits = language === 'fr'
    ? ["Meta optimisées pour tous les produits", "Textes ALT générés par IA", "Tags produits intelligents"]
    : ["Optimized meta for all products", "AI-generated ALT texts", "Smart product tags"];

  const handleTryDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary text-primary px-4 py-1">
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'fr' ? "Voyez la différence" : "See the Difference"}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {language === 'fr' ? "Avant & Après NewAI" : "Before & After NewAI"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {language === 'fr' 
              ? "Découvrez comment NewAI transforme vos scores SEO en quelques minutes"
              : "See how NewAI transforms your SEO scores in minutes"}
          </p>
        </div>

        {/* Comparison Visual */}
        <div className="max-w-4xl mx-auto">
          <div className="relative flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
            
            {/* Before */}
            <div className="flex-1 relative">
              <div className="bg-card border border-border rounded-2xl md:rounded-r-none p-8 h-full">
                <div className="absolute -top-3 left-6">
                  <span className="bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                    {language === 'fr' ? "Avant" : "Before"}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col items-center">
                  {/* Score Circle */}
                  <div className="relative w-32 h-32 mb-6">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${beforeScore * 3.51} 351`}
                        className="text-destructive"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-destructive">{beforeScore}%</span>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-6">
                    {language === 'fr' ? "Score SEO Global" : "Global SEO Score"}
                  </p>
                  
                  {/* Issues List */}
                  <div className="space-y-3 w-full">
                    {beforeIssues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="hidden md:flex items-center justify-center z-10 -mx-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <ArrowRight className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div className="flex md:hidden items-center justify-center py-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg rotate-90">
                <ArrowRight className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>

            {/* After */}
            <div className="flex-1 relative">
              <div className="bg-gradient-to-br from-primary/10 via-card to-success/10 border-2 border-primary/30 rounded-2xl md:rounded-l-none p-8 h-full shadow-lg shadow-primary/10">
                <div className="absolute -top-3 left-6">
                  <span className="bg-gradient-to-r from-primary to-success text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    {language === 'fr' ? "Après NewAI" : "After NewAI"}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col items-center">
                  {/* Score Circle */}
                  <div className="relative w-32 h-32 mb-6">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${afterScore * 3.51} 351`}
                        className="text-success"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-success">{afterScore}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <span className="text-success font-semibold">+{improvement}%</span>
                  </div>
                  
                  {/* Benefits List */}
                  <div className="space-y-3 w-full">
                    {afterBenefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="group px-8"
            onClick={handleTryDemo}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {language === 'fr' ? "Réserver une démo" : "Book a Demo"}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            {language === 'fr' ? "Sans carte bancaire • Accès instantané" : "No credit card required • Instant access"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default DemoSeoComparison;
