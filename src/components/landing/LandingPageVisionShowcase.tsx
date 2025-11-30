import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { 
  Sparkles, 
  ArrowRight, 
  Eye, 
  Zap,
  Image,
  MousePointerClick,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";

export const LandingPageVisionShowcase = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [showAfter, setShowAfter] = useState(false);

  const labels = {
    badge: language === 'fr' ? 'Vision AI Landing Pages' : 'Vision AI Landing Pages',
    title: language === 'fr' 
      ? 'Des Landing Pages qui convertissent' 
      : 'Landing Pages that Convert',
    subtitle: language === 'fr'
      ? "Notre IA analyse visuellement vos produits pour créer des pages de vente ultra-personnalisées"
      : "Our AI visually analyzes your products to create ultra-personalized sales pages",
    before: language === 'fr' ? 'Avant' : 'Before',
    after: language === 'fr' ? 'Après Vision AI' : 'After Vision AI',
    cta: language === 'fr' ? 'Créer ma Landing Page' : 'Create my Landing Page',
    features: language === 'fr' ? [
      'Analyse visuelle des produits',
      'Design responsive automatique',
      'Optimisé pour la conversion',
      'Publication Shopify en 1 clic'
    ] : [
      'Visual product analysis',
      'Automatic responsive design',
      'Optimized for conversion',
      'One-click Shopify publish'
    ]
  };

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/30 rounded-full blur-3xl animate-pulse delay-700" />
      
      <div className="container relative mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 space-y-4">
          <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-4 py-2 text-sm">
            <Eye className="w-4 h-4 mr-2" />
            {labels.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            {labels.title}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-gray-300">
            {labels.subtitle}
          </p>
        </div>

        {/* Before/After Visual Comparison */}
        <div className="max-w-5xl mx-auto">
          <div 
            className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setShowAfter(!showAfter)}
          >
            {/* Before State - Generic Product Page */}
            <div 
              className={`transition-all duration-700 ease-in-out ${showAfter ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              style={{ display: showAfter ? 'none' : 'block' }}
            >
              <div className="bg-white p-6 sm:p-10">
                {/* Generic Product Page Mockup */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-48" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                      <Image className="w-16 h-16 text-gray-300" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded" />
                        <div className="h-3 bg-gray-100 rounded w-5/6" />
                        <div className="h-3 bg-gray-100 rounded w-4/6" />
                      </div>
                      <div className="h-10 bg-gray-200 rounded-lg w-32 mt-6" />
                    </div>
                  </div>
                </div>
                
                {/* Before Label */}
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-gray-800/80 text-white px-3 py-1.5">
                    {labels.before}
                  </Badge>
                </div>
              </div>
            </div>

            {/* After State - Vision AI Enhanced Landing Page */}
            <div 
              className={`transition-all duration-700 ease-in-out ${showAfter ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ display: showAfter ? 'block' : 'none' }}
            >
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10">
                {/* AI Enhanced Landing Page Mockup */}
                <div className="space-y-6">
                  {/* Hero Section with gradient */}
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent" />
                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="space-y-4">
                        <Badge className="bg-primary/80 text-white border-0">
                          <Sparkles className="w-3 h-3 mr-1" /> Premium
                        </Badge>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">
                          Lampe Designer Premium
                        </h3>
                        <p className="text-gray-300 text-sm">
                          Éclairage d'ambiance sophistiqué avec détection automatique de luminosité
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-success text-success bg-success/10 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Eco-friendly
                          </Badge>
                          <Badge variant="outline" className="border-primary text-primary bg-primary/10 text-xs">
                            <Zap className="w-3 h-3 mr-1" /> LED
                          </Badge>
                        </div>
                        <Button className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30">
                          Acheter maintenant
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                      <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20" />
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 blur-sm opacity-80" />
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-white/20 text-white text-[10px] backdrop-blur-sm">
                            <Eye className="w-3 h-3 mr-1" /> Vision AI
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {['🎨 Design unique', '📦 Livraison express', '⭐ Garantie 2 ans'].map((feature, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-white text-xs sm:text-sm">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* After Label */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-3 py-1.5 shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
                    {labels.after}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Interactive Hover Overlay */}
            <div 
              className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isHovered && !showAfter ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/80 flex items-center justify-center animate-pulse">
                  <MousePointerClick className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-semibold">
                  {language === 'fr' ? 'Cliquez pour voir la magie' : 'Click to see the magic'}
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <div className="flex justify-center mt-6">
            <Button 
              variant={showAfter ? "default" : "outline"}
              size="lg"
              onClick={() => setShowAfter(!showAfter)}
              className={showAfter 
                ? "bg-gradient-to-r from-primary to-accent text-white border-0" 
                : "border-white/30 text-white hover:bg-white/10"
              }
            >
              {showAfter ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Voir Avant' : 'See Before'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'fr' ? 'Activer Vision AI' : 'Activate Vision AI'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {labels.features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-white/5 border-white/10 p-4 text-center hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-white text-sm">{feature}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10 sm:mt-12">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
            onClick={() => navigate('/auth?mode=signup&plan=trial')}
          >
            {labels.cta}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};
