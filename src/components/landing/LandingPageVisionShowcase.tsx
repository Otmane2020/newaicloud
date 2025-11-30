import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { 
  Sparkles, 
  ArrowRight, 
  Eye, 
  Zap,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import sofaImage from "@/assets/sofa-product.jpg";

export const LandingPageVisionShowcase = () => {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const [showAfter, setShowAfter] = useState(false);

  const labels = {
    badge: language === 'fr' ? 'Vision AI Landing Pages' : 'Vision AI Landing Pages',
    title: language === 'fr' 
      ? 'Landing Pages qui convertissent' 
      : 'Landing Pages that Convert',
    subtitle: language === 'fr'
      ? "Notre IA analyse visuellement vos produits pour créer des pages de vente ultra-personnalisées"
      : "Our AI visually analyzes your products to create ultra-personalized sales pages",
    before: language === 'fr' ? 'Avant' : 'Before',
    after: language === 'fr' ? 'Après Vision AI' : 'After Vision AI',
    cta: language === 'fr' ? 'Créer ma Landing Page' : 'Create my Landing Page',
    productTitle: language === 'fr' ? 'Canapé Velours Premium' : 'Premium Velvet Sofa',
    productDesc: language === 'fr' 
      ? 'Design scandinave moderne avec coussin moelleux extra-confort'
      : 'Modern Scandinavian design with extra-comfort plush cushions',
    features: language === 'fr' ? [
      'Analyse visuelle IA',
      'Design responsive auto',
      'Optimisé conversion',
      '1-clic Shopify'
    ] : [
      'AI Visual Analysis',
      'Auto Responsive',
      'Conversion Ready',
      '1-click Shopify'
    ],
    priceTag: '1 299 €',
    badge1: language === 'fr' ? 'Livraison gratuite' : 'Free shipping',
    badge2: language === 'fr' ? 'Garantie 5 ans' : '5-year warranty'
  };

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header - Mobile First */}
        <div className="text-center mb-8 sm:mb-12 space-y-3 sm:space-y-4">
          <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 px-3 py-1.5 text-xs sm:text-sm">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            {labels.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            {labels.title}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto px-2">
            {labels.subtitle}
          </p>
        </div>

        {/* Before/After Comparison - Mobile First */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-xl bg-card">
            
            {/* Toggle Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setShowAfter(false)}
                className={`flex-1 py-3 sm:py-4 px-4 text-sm sm:text-base font-medium transition-all ${
                  !showAfter 
                    ? 'bg-muted text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {labels.before}
              </button>
              <button
                onClick={() => setShowAfter(true)}
                className={`flex-1 py-3 sm:py-4 px-4 text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-2 ${
                  showAfter 
                    ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-b-2 border-primary' 
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {labels.after}
              </button>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[400px] sm:min-h-[450px]">
              {/* Before State - Basic Product Display */}
              <div 
                className={`transition-all duration-500 ${showAfter ? 'opacity-0 absolute inset-0' : 'opacity-100'}`}
              >
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                    {/* Product Image - Plain */}
                    <div className="w-full md:w-1/2">
                      <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={sofaImage} 
                          alt="Sofa product" 
                          className="w-full h-full object-cover grayscale-[30%] opacity-90"
                        />
                      </div>
                    </div>
                    
                    {/* Basic Product Info - Skeleton */}
                    <div className="w-full md:w-1/2 space-y-3 sm:space-y-4">
                      <div className="h-5 sm:h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                        <div className="h-3 bg-muted rounded w-4/6"></div>
                      </div>
                      <div className="pt-2">
                        <div className="h-10 sm:h-12 bg-muted rounded-lg w-28 sm:w-32"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* After State - AI Enhanced Landing Page */}
              <div 
                className={`transition-all duration-500 ${showAfter ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
              >
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                    {/* Enhanced Product Image */}
                    <div className="w-full md:w-1/2">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10"></div>
                        <img 
                          src={sofaImage} 
                          alt="Premium Velvet Sofa" 
                          className="w-full h-full object-cover"
                        />
                        {/* Vision AI Badge */}
                        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
                          <Badge className="bg-background/90 text-foreground text-[10px] sm:text-xs backdrop-blur-sm shadow-lg">
                            <Eye className="w-3 h-3 mr-1 text-primary" /> Vision AI
                          </Badge>
                        </div>
                        <div className="absolute inset-0 ring-2 ring-primary/20 rounded-xl"></div>
                      </div>
                    </div>
                    
                    {/* Enhanced Product Info */}
                    <div className="w-full md:w-1/2 space-y-3 sm:space-y-4">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" /> Premium
                      </Badge>
                      
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                        {labels.productTitle}
                      </h3>
                      
                      <p className="text-muted-foreground text-sm sm:text-base">
                        {labels.productDesc}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {labels.badge1}
                        </Badge>
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> {labels.badge2}
                        </Badge>
                      </div>
                      
                      <div className="text-2xl sm:text-3xl font-bold text-foreground">
                        {labels.priceTag}
                      </div>
                      
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                        {language === 'fr' ? 'Acheter maintenant' : 'Buy now'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Feature highlights */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                    {['🎨', '📦', '⭐'].map((emoji, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-2 sm:p-3 text-center">
                        <span className="text-lg sm:text-xl">{emoji}</span>
                        <p className="text-foreground text-[10px] sm:text-xs mt-1">
                          {language === 'fr' 
                            ? ['Design unique', 'Express', 'Garantie'][i]
                            : ['Unique design', 'Express', 'Warranty'][i]
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Pills - Mobile Optimized */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
            {labels.features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                <span className="text-foreground text-xs sm:text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-12">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-xl transition-all text-sm sm:text-base px-6 sm:px-8"
            onClick={() => navigate('/auth?mode=signup&plan=trial')}
          >
            {labels.cta}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};