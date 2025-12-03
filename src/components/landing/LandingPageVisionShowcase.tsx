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
import sofaWhiteBgImage from "@/assets/sofa-white-background.jpg";
import sofaWithBgImage from "@/assets/sofa-with-background.jpg";

export const LandingPageVisionShowcase = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 space-y-3">
          <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 px-3 py-1.5 text-xs sm:text-sm">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            {t.landingShowcase.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {t.landingShowcase.title}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {t.landingShowcase.subtitle}
          </p>
        </div>

        {/* Side by Side Comparison */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* BEFORE - Raw Text Description */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <Badge variant="secondary" className="bg-muted text-muted-foreground border shadow-sm text-xs">
                  {t.landingShowcase.before}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full">
                {/* Product Image - White/Studio Background */}
                <div className="aspect-[16/10] bg-white overflow-hidden relative">
                  <img 
                    src={sofaWhiteBgImage} 
                    alt="Product on white background" 
                    className="w-full h-full object-cover"
                  />
                  {/* White Background Label */}
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge variant="secondary" className="bg-white/90 text-muted-foreground text-[10px] backdrop-blur-sm shadow border">
                      {t.landingShowcase.whiteBackground}
                    </Badge>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {t.landingShowcase.productTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t.landingShowcase.productSubtitle}
                    </p>
                  </div>
                  
                  {/* Price + Button FIRST */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">1 299 €</span>
                    <Button size="sm" variant="secondary" className="shadow-sm">
                      {t.landingShowcase.buyNow}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  {/* Raw description - plain text AFTER */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground text-sm font-mono bg-muted/50 p-3 rounded-lg leading-relaxed">
                      {t.landingShowcase.rawDesc}
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
                  {t.landingShowcase.after}
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
                      <Sparkles className="w-3 h-3 mr-1" /> {t.landingShowcase.generatedBackground}
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
                      {t.landingShowcase.productTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t.landingShowcase.productSubtitle}
                    </p>
                  </div>
                  
                  {/* Price + Button FIRST */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">1 299 €</span>
                    <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow">
                      {t.landingShowcase.buyNow}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  {/* Styled HTML Description AFTER */}
                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-foreground text-sm leading-relaxed">
                      {t.landingShowcase.descHtml}
                    </p>
                    
                    {/* Feature badges inside description */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <Truck className="w-3 h-3" /> {t.landingShowcase.feature1}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" /> {t.landingShowcase.feature2}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" /> {t.landingShowcase.feature3}
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
              <span>{t.landingShowcase.before}</span>
              <ArrowRight className="w-5 h-5 text-primary" />
              <span className="text-primary font-medium">{t.landingShowcase.after}</span>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {(t.landingShowcase.features as string[]).map((feature, i) => (
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
            {t.landingShowcase.cta}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};
