import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import PricingComparison from "@/components/PricingComparison";
import { AnnouncementBar } from "@/components/AnnouncementBar";

import { ReferralSystem } from "@/components/dashboard/ReferralSystem";
import { ContactForm } from "@/components/ContactForm";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol } from "@/lib/formatUtils";
import { useEffect, useState } from "react";
import { AIAssistant } from "@/components/AIAssistant";
import { 
  Zap, 
  ShoppingBag, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Globe,
  CreditCard,
  Star,
  ImageIcon,
  Search,
  Tags,
  TrendingUp,
  Play
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AnnouncementBar />
      <PublicHeader />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4 py-24">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-6 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              {t.landing.hero.badge}
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white max-w-4xl leading-tight px-4">
              {t.landing.hero.title}{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                {t.landing.hero.titleHighlight}
              </span>{" "}
              {t.landing.hero.titleEnd}
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl text-gray-300 px-4">
              {t.landing.hero.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 w-full sm:w-auto px-4">
              <Button size="lg" className="group bg-success hover:bg-success/90 shadow-glow text-success-foreground w-full sm:w-auto" onClick={() => navigate('/auth?mode=signup&plan=trial')}>
                {t.trial.ctaPrimary}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 w-full sm:w-auto">
                <Play className="mr-2 w-5 h-5" />
                {t.landing.hero.ctaSecondary}
              </Button>
            </div>
            
            <div className="flex flex-col items-center gap-3 pt-4 px-4">
              <Badge variant="outline" className="border-success text-success bg-success/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm">
                {t.trial.noCreditCard}
              </Badge>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span>{t.landing.hero.setupTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span>{t.trial.trustBanner.cancelAnytime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />
      </section>

      {/* Referral Section - Only for authenticated users */}
      {user && (
        <section className="container mx-auto px-4 py-12">
          <ReferralSystem />
        </section>
      )}

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16 space-y-4 px-4">
          <Badge variant="outline" className="border-primary text-primary text-xs sm:text-sm">{t.landing.howItWorks.badge}</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t.landing.howItWorks.title}</h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t.landing.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {t.landing.howItWorks.steps.map((step: any, index: number) => (
            <div key={index} className="relative">
              <div className="text-center space-y-4 px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center shadow-glow">
                  {index === 0 && <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-white" />}
                  {index === 1 && <Search className="w-7 h-7 sm:w-8 sm:h-8 text-white" />}
                  {index === 2 && <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />}
                  {index === 3 && <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-white" />}
                </div>
                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs sm:text-sm">
                    {index + 1}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
              </div>
              {index < 3 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 sm:py-24 bg-gradient-subtle">
          <div className="text-center mb-12 sm:mb-16 space-y-4 px-4">
            <Badge variant="outline" className="border-primary text-primary text-xs sm:text-sm">{t.landing.features.badge}</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t.landing.features.title}</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              {t.landing.features.subtitle}
            </p>
          </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {t.landing.features.items.map((feature: any, index: number) => {
            const icons = [Search, ImageIcon, FileText, Tags, BarChart3, Sparkles];
            const FeatureIcon = icons[index];
            return (
              <Card 
                key={index}
                className="p-5 sm:p-6 hover:shadow-primary transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 bg-card"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-3 sm:mb-4 shadow-glow">
                  <FeatureIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16 space-y-4 px-4">
          <Badge variant="outline" className="border-success text-success text-xs sm:text-sm">{t.landing.testimonials.badge}</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t.landing.testimonials.title}</h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t.landing.testimonials.subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {t.landing.testimonials.items.map((testimonial: any, index: number) => (
            <Card key={index} className="p-5 sm:p-6 space-y-3 sm:space-y-4 border-2 hover:border-primary/30 transition-colors">
              <div className="flex gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground italic text-sm sm:text-base">"{testimonial.quote}"</p>
              <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {testimonial.author[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">{testimonial.author}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-16 sm:py-24 bg-gradient-subtle">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-4 sm:space-y-6 px-4">
            <Badge variant="outline" className="border-success text-success text-xs sm:text-sm">{t.landing.benefits.badge}</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              {t.landing.benefits.title}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t.landing.benefits.subtitle}
            </p>
            
            <div className="space-y-3 sm:space-y-4 pt-4">
              {t.landing.benefits.items.map((benefit: any, index: number) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-success flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div>
                    <p className="font-semibold text-sm sm:text-base">{benefit.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-4 sm:mt-6 w-full sm:w-auto" onClick={() => navigate('/auth?mode=signup')}>
              {t.landing.benefits.cta}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="relative px-4">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
            <Card className="relative p-6 sm:p-8 space-y-4 sm:space-y-6 border-2 border-primary/20">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {t.landing.benefits.stats.map((stat: any, index: number) => (
                  <div key={index} className="space-y-1 sm:space-y-2">
                    <p className="text-3xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16 space-y-4 px-4">
          <Badge variant="outline" className="border-primary text-primary text-xs sm:text-sm">
            <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            {t.landing.pricing.badge}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t.landing.pricing.title}</h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t.landing.pricing.subtitle}
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.landing.pricing.monthly}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.landing.pricing.yearly}
              <Badge className="absolute -top-2 -right-2 bg-success text-[10px] sm:text-xs px-1 sm:px-2">{t.landing.pricing.yearlyDiscount}</Badge>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto mb-12 sm:mb-16">
          {[
            { key: 'trial', priceMonthly: 0, priceYearly: 0, yearlyTotal: 0, icon: "🎁", featured: false, isTrial: true, hasPromo: false },
            { key: 'starter', priceMonthly: 9.99, priceYearly: 7.99, yearlyTotal: 95.88, icon: "🟢", featured: false, hasPromo: false },
            { key: 'pro', priceMonthly: 39, priceYearly: 31.20, originalMonthly: 49, originalYearly: 39, yearlyTotal: 374.40, icon: "🟠", featured: true, hasPromo: true, discount: 20 },
            { key: 'enterprise', priceMonthly: 139, priceYearly: 111.20, originalMonthly: 199, originalYearly: 159, yearlyTotal: 1334.40, icon: "🔵", featured: false, hasPromo: true, discount: 30 }
          ].map((planConfig, index) => {
            const plan = t.landing.pricing.plans[planConfig.key as 'trial' | 'starter' | 'pro' | 'enterprise'];
            const price = billingCycle === 'monthly' ? planConfig.priceMonthly : planConfig.priceYearly;
            const originalPrice = billingCycle === 'monthly' ? planConfig.originalMonthly : planConfig.originalYearly;
            
            return (
              <Card 
                key={index}
                className={`p-8 relative ${planConfig.featured ? 'border-2 border-primary shadow-primary scale-105' : 'border-2 border-transparent'}`}
              >
                {plan.badge && (
                  <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${planConfig.featured ? 'bg-primary' : 'bg-gradient-primary'}`}>
                    {plan.badge}
                  </Badge>
                )}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold">{planConfig.icon} {plan.name}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                  </div>
                  
                  <div>
                    {planConfig.hasPromo && originalPrice ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-semibold text-muted-foreground line-through">
                            {getCurrencySymbol(language)}{originalPrice.toFixed(2)}
                          </span>
                          <Badge variant="destructive" className="ml-2">
                            -{planConfig.discount}%
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-5xl font-bold text-primary">{getCurrencySymbol(language)}{price}</span>
                          <span className="text-muted-foreground">{t.landing.pricing.perMonth}</span>
                        </div>
                        <p className="text-xs text-success mt-2 font-medium">
                          {language === 'fr' ? '✨ Réduction de 20% déjà incluse' : '✨ 20% discount already included'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        {planConfig.isTrial ? (
                          <>
                            <span className="text-5xl font-bold">{getCurrencySymbol(language)}0</span>
                            <span className="text-muted-foreground">{t.landing.pricing.perMonth}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-5xl font-bold">{getCurrencySymbol(language)}{price}</span>
                            <span className="text-muted-foreground">{t.landing.pricing.perMonth}</span>
                          </>
                        )}
                      </div>
                    )}
                    {!planConfig.isTrial && billingCycle === 'yearly' && (
                      <p className="text-sm text-success mt-1">
                        {t.landing.pricing.billedAnnually.replace('{{currency}}', getCurrencySymbol(language)).replace('{{total}}', String(planConfig.yearlyTotal))}
                      </p>
                    )}
                    {planConfig.isTrial && (
                      <p className="text-sm text-success mt-1 font-semibold">
                        {t.trial.duration}
                      </p>
                    )}
                    {plan.promo && (
                      <div className="mt-2 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-800">
                        <p className="text-sm font-medium">
                          <span className="text-pink-600 dark:text-pink-400">
                            {plan.promo.split('avec')[0]}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                            {plan.promo.split('avec')[1]}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={planConfig.featured ? "default" : "outline"}
                    size="lg"
                    onClick={() => navigate(planConfig.isTrial ? '/auth?mode=signup&plan=trial' : '/auth?mode=signup')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  {plan.highlight && (
                    <p className="text-sm text-muted-foreground italic">
                      💡 {plan.highlight}
                    </p>
                  )}

                  <div className="space-y-3 pt-6 border-t">
                    <p className="font-semibold text-sm">Included in the plan:</p>
                    {plan.features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Detailed Pricing Comparison */}
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">{t.landing.pricing.comparisonTitle || "Compare Plans in Detail"}</h3>
            <p className="text-muted-foreground">{t.landing.pricing.comparisonSubtitle || "See all features side by side"}</p>
          </div>
          <PricingComparison />
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="container mx-auto px-4 py-24">
        <ContactForm />
      </section>

      {/* Referral Section - Before Footer */}
      <section className="container mx-auto px-4 py-16">
        <ReferralSystem />
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              {t.landing.cta.title}
            </h2>
            <p className="text-xl text-gray-300">
              {t.landing.cta.subtitle}
            </p>
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90" onClick={() => navigate('/auth?mode=signup')}>
              {t.landing.cta.button}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
      <Footer />
      
      {/* AI Assistant - Floating button */}
      <AIAssistant />
    </div>
  );
};

// All content is now sourced from translations

export default Index;