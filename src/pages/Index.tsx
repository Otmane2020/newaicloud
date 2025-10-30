import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import PricingComparison from "@/components/PricingComparison";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from '@/hooks/useTranslation';
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
  CreditCard
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      <PublicHeader />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4 py-24">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-6 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('hero.badge')}
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight">
              {t('hero.title')}{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                NewAI
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl text-gray-300">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="group" onClick={() => navigate('/auth?mode=signup')}>
                {t('hero.cta_start')}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                {t('hero.cta_demo')}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-primary text-primary">{t('nav.features')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">{t('features.title')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-primary transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 bg-card"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t(feature.titleKey)}</h3>
              <p className="text-muted-foreground mb-4">{t(feature.descriptionKey)}</p>
              <div className="flex flex-wrap gap-2">
                {(t(feature.tagsKey, { returnObjects: true }) as string[]).map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-success text-success">{t('benefits.title', 'Résultats')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('benefits.title')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('benefits.subtitle')}
            </p>
            
            <div className="space-y-4 pt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">{t(benefit.titleKey)}</p>
                    <p className="text-sm text-muted-foreground">{t(benefit.descriptionKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-6" onClick={() => navigate('/auth?mode=signup')}>
              {t('benefits.cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
            <Card className="relative p-8 space-y-6 border-2 border-primary/20">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary text-primary">
            <Globe className="w-4 h-4 mr-2" />
            {t('nav.pricing')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">{t('pricing.title')}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('pricing.yearly')}
              <Badge className="absolute -top-2 -right-2 bg-success text-xs">{t('pricing.discount')}</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {pricingPlans.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            
            return (
              <Card 
                key={index}
                className={`p-8 relative ${plan.featured ? 'border-2 border-primary shadow-primary scale-105' : 'border-2 border-transparent'}`}
              >
                {plan.badgeKey && (
                  <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badgeColor || 'bg-gradient-primary'}`}>
                    {t(plan.badgeKey)}
                  </Badge>
                )}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold">{plan.icon} {t(plan.nameKey)}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{t(plan.descriptionKey)}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">${price}</span>
                      <span className="text-muted-foreground">{t('pricing.per_month')}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm text-success mt-1">
                        {t('pricing.billed_yearly')} ${plan.yearlyTotal}{t('pricing.per_year')})
                      </p>
                    )}
                    {plan.trialKey && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(plan.trialKey)}
                      </p>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={plan.featured ? "default" : "outline"}
                    size="lg"
                    onClick={() => navigate('/auth?mode=signup')}
                  >
                    {t(plan.ctaKey)}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>

                  {plan.highlightKey && (
                    <p className="text-sm text-muted-foreground italic">
                      💡 {t(plan.highlightKey)}
                    </p>
                  )}

                  <div className="space-y-3 pt-6 border-t">
                    <p className="font-semibold text-sm">{t('plans.included')}</p>
                    {Array.isArray(t(plan.featuresKey, { returnObjects: true })) 
                      ? (t(plan.featuresKey, { returnObjects: true }) as string[]).map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))
                      : null
                    }
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-2">{t('pricing.comparison_title')}</h3>
            <p className="text-muted-foreground">{t('pricing.comparison_subtitle')}</p>
          </div>
          <PricingComparison />
        </div>

      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-gray-300">
              {t('cta.subtitle')}
            </p>
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90" onClick={() => navigate('/auth?mode=signup')}>
              {t('cta.button')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

const features = [
  {
    icon: ShoppingBag,
    titleKey: "features.products.title",
    descriptionKey: "features.products.description",
    tagsKey: "features.products.tags"
  },
  {
    icon: BarChart3,
    titleKey: "features.merchant.title",
    descriptionKey: "features.merchant.description",
    tagsKey: "features.merchant.tags"
  },
  {
    icon: FileText,
    titleKey: "features.blog.title",
    descriptionKey: "features.blog.description",
    tagsKey: "features.blog.tags"
  },
  {
    icon: Zap,
    titleKey: "features.seo.title",
    descriptionKey: "features.seo.description",
    tagsKey: "features.seo.tags"
  },
  {
    icon: MessageSquare,
    titleKey: "features.chat.title",
    descriptionKey: "features.chat.description",
    tagsKey: "features.chat.tags"
  },
  {
    icon: Sparkles,
    titleKey: "features.automation.title",
    descriptionKey: "features.automation.description",
    tagsKey: "features.automation.tags"
  }
];

const benefits = [
  {
    titleKey: "benefits.speed.title",
    descriptionKey: "benefits.speed.description"
  },
  {
    titleKey: "benefits.traffic.title",
    descriptionKey: "benefits.traffic.description"
  },
  {
    titleKey: "benefits.time.title",
    descriptionKey: "benefits.time.description"
  },
  {
    titleKey: "benefits.ranking.title",
    descriptionKey: "benefits.ranking.description"
  }
];

const stats = [
  { value: "10K+", labelKey: "stats.products" },
  { value: "500+", labelKey: "stats.sellers" },
  { value: "95%", labelKey: "stats.satisfaction" },
  { value: "24/7", labelKey: "stats.support" }
];

const pricingPlans = [
  {
    nameKey: "plans.starter.name",
    icon: "🟢",
    descriptionKey: "plans.starter.description",
    priceMonthly: 9.99,
    priceYearly: 7.99,
    yearlyTotal: 95.88,
    trialKey: "plans.starter.trial",
    ctaKey: "plans.starter.cta",
    featured: false,
    badge: null,
    highlightKey: "plans.starter.highlight",
    featuresKey: "plans.starter.features"
  },
  {
    nameKey: "plans.pro.name",
    icon: "🟠",
    descriptionKey: "plans.pro.description",
    priceMonthly: 49,
    priceYearly: 39,
    yearlyTotal: 468,
    trialKey: null,
    ctaKey: "plans.pro.cta",
    featured: true,
    badgeKey: "plans.pro.badge",
    badgeColor: "bg-primary",
    highlightKey: "plans.pro.highlight",
    featuresKey: "plans.pro.features"
  },
  {
    nameKey: "plans.enterprise.name",
    icon: "🔵",
    descriptionKey: "plans.enterprise.description",
    priceMonthly: 199,
    priceYearly: 159,
    yearlyTotal: 1908,
    trialKey: null,
    ctaKey: "plans.enterprise.cta",
    featured: false,
    badge: null,
    highlightKey: "plans.enterprise.highlight",
    featuresKey: "plans.enterprise.features"
  }
];

export default Index;
