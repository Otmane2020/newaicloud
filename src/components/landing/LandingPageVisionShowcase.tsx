import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { 
  Sparkles, 
  ArrowRight, 
  Eye, 
  Truck,
  Shield,
  Star,
  CheckCircle2
} from "lucide-react";
import sofaImage from "@/assets/sofa-product.jpg";
import sofaWithBgImage from "@/assets/sofa-with-background.jpg";

export const LandingPageVisionShowcase = () => {
  const navigate = useNavigate();
  const { language } = useTranslation();

  const labels = {
    badge: 'Vision AI Landing Pages',
    title: language === 'fr' 
      ? 'Transformez vos descriptions produits' 
      : 'Transform your product descriptions',
    subtitle: language === 'fr'
      ? "Notre IA analyse visuellement vos produits et génère des descriptions HTML optimisées pour la conversion"
      : "Our AI visually analyzes your products and generates conversion-optimized HTML descriptions",
    before: language === 'fr' ? 'Avant' : 'Before',
    after: language === 'fr' ? 'Après Vision AI' : 'After Vision AI',
    cta: language === 'fr' ? 'Essayer gratuitement' : 'Try for free',
    rawDesc: language === 'fr' 
      ? 'Canapé 3 places en velours gris. Dimensions: 220x90x85cm. Pieds en bois. Confortable.'
      : 'Gray velvet 3-seater sofa. Dimensions: 220x90x85cm. Wooden legs. Comfortable.',
    productTitle: language === 'fr' ? 'Canapé Velours Premium' : 'Premium Velvet Sofa',
    productSubtitle: language === 'fr' 
      ? 'Design scandinave moderne' 
      : 'Modern Scandinavian design',
    feature1: language === 'fr' ? 'Livraison gratuite' : 'Free shipping',
    feature2: language === 'fr' ? 'Garantie 5 ans' : '5-year warranty',
    feature3: language === 'fr' ? 'Retour 30 jours' : '30-day returns',
    descHtml: language === 'fr'
      ? 'Sublimez votre intérieur avec ce canapé d\'exception en velours premium. Son design épuré aux lignes scandinaves apporte une touche d\'élégance à votre salon.'
      : 'Elevate your interior with this exceptional premium velvet sofa. Its clean Scandinavian-inspired design brings a touch of elegance to your living room.',
    buyNow: language === 'fr' ? 'Acheter maintenant' : 'Buy now',
    whiteBackground: language === 'fr' ? 'Fond blanc / studio' : 'White / Studio background',
    generatedBackground: language === 'fr' ? 'Fond généré IA' : 'AI Generated background'
  };

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 space-y-3">
          <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 px-3 py-1.5 text-xs sm:text-sm">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            {labels.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {labels.title}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {labels.subtitle}
          </p>
        </div>

        {/* Side by Side Comparison */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* BEFORE - Raw Text Description */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <Badge variant="secondary" className="bg-muted text-muted-foreground border shadow-sm text-xs">
                  {labels.before}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full">
                {/* Product Image - White/Studio Background */}
                <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                  <img 
                    src={sofaImage} 
                    alt="Product" 
                    className="w-full h-full object-cover grayscale opacity-80"
                  />
                  {/* White Background Label */}
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge variant="secondary" className="bg-white/90 text-muted-foreground text-[10px] backdrop-blur-sm shadow border">
                      {labels.whiteBackground}
                    </Badge>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {labels.productTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {labels.productSubtitle}
                    </p>
                  </div>
                  
                  {/* Price + Button FIRST */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">1 299 €</span>
                    <Button size="sm" variant="secondary" className="shadow-sm">
                      {labels.buyNow}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  {/* Raw description - plain text AFTER */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground text-sm font-mono bg-muted/50 p-3 rounded-lg leading-relaxed">
                      {labels.rawDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AFTER - Styled HTML Description */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-lg text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {labels.after}
                </Badge>
              </div>
              <div className="rounded-xl border-2 border-primary/30 bg-card shadow-xl overflow-hidden h-full ring-4 ring-primary/10">
                {/* Product Image - Generated Background */}
                <div className="aspect-[16/10] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
                  <img 
                    src={sofaWithBgImage} 
                    alt="Premium Velvet Sofa with AI generated background" 
                    className="w-full h-full object-cover"
                  />
                  {/* Generated Background Label */}
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] backdrop-blur-sm shadow border-0">
                      <Sparkles className="w-3 h-3 mr-1" /> {labels.generatedBackground}
                    </Badge>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-2">
                      <Sparkles className="w-3 h-3 mr-1" /> Premium
                    </Badge>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {labels.productTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {labels.productSubtitle}
                    </p>
                  </div>
                  
                  {/* Price + Button FIRST */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">1 299 €</span>
                    <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow">
                      {labels.buyNow}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  {/* Styled HTML Description AFTER */}
                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-foreground text-sm leading-relaxed">
                      {labels.descHtml}
                    </p>
                    
                    {/* Feature badges inside description */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <Truck className="w-3 h-3" /> {labels.feature1}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" /> {labels.feature2}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" /> {labels.feature3}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow indicator for mobile */}
          <div className="flex justify-center my-4 lg:hidden">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>{labels.before}</span>
              <ArrowRight className="w-5 h-5 text-primary" />
              <span className="text-primary font-medium">{labels.after}</span>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {(language === 'fr' ? [
              'Analyse visuelle IA',
              'HTML optimisé SEO',
              'Conversion +40%',
              'Sync Shopify'
            ] : [
              'AI Visual Analysis',
              'SEO-optimized HTML',
              '+40% Conversion',
              'Shopify Sync'
            ]).map((feature, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm text-xs sm:text-sm">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-10">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:shadow-xl transition-all"
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