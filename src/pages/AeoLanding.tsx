import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aeoTranslations } from "@/lib/translations/aeo";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/formatUtils";
import { 
  Zap, ArrowRight, Search, Sparkles, Send, MessageSquare, FileText, 
  Settings, Globe, Target, TrendingUp, Check, Mail, MapPin, 
  ShoppingCart, Briefcase, Newspaper, Building, PenTool, ExternalLink,
  Rocket, Crown, Star
} from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  price_monthly: number;
  max_optimizations_monthly: number;
  popular?: boolean;
  best_value?: boolean;
}

export default function AeoLanding() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Load pricing from database
  useEffect(() => {
    const loadPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, name, price_monthly, max_optimizations_monthly, popular, best_value")
        .eq("is_active", true)
        .in("id", ["starter", "pro-500", "enterprise-2000"])
        .order("price_monthly");
      
      if (data) {
        setPricingPlans(data.map(p => ({
          ...p,
          popular: p.id === "pro-500",
          best_value: p.id.startsWith("enterprise")
        })));
      }
    };
    loadPlans();
  }, []);

  // SEO Meta Tags
  useEffect(() => {
    const title = language === 'fr' 
      ? "Aeoreply - Answer Engine Optimization | Soyez cité par ChatGPT, Gemini & Claude"
      : "Aeoreply - Answer Engine Optimization | Get Cited by ChatGPT, Gemini & Claude";
    
    const description = language === 'fr'
      ? "Aeoreply optimise votre contenu pour être cité par les IA comme ChatGPT, Gemini, Claude et Perplexity. Générez des réponses citables et des articles AEO pour augmenter votre visibilité."
      : "Aeoreply optimizes your content to be cited by AI like ChatGPT, Gemini, Claude and Perplexity. Generate citable answers and AEO articles to boost your visibility.";

    document.title = title;
    
    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Open Graph
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://aeoreply.com' },
      { property: 'og:site_name', content: 'Aeoreply' },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Twitter Card
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    twitterTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://aeoreply.com');

  }, [language]);

  const aiPlatforms = [
    { name: "ChatGPT", bg: "#10A37F", icon: "GPT" },
    { name: "Gemini", bg: "#4285F4", icon: "G" },
    { name: "Claude", bg: "#D97706", icon: "C" },
    { name: "Perplexity", bg: "#1FB8CD", icon: "P" },
    { name: "Copilot", bg: "#0078D4", icon: "Co" },
  ];

  const valuePropositions = [
    {
      title: language === 'fr' ? "Answer Engine Optimization" : "Answer Engine Optimization",
      description: language === 'fr' 
        ? "Optimisez pour les réponses IA, pas seulement les liens Google."
        : "Optimize for AI answers, not just Google links.",
      icon: Target,
      color: "from-violet-500 to-purple-500"
    },
    {
      title: language === 'fr' ? "Réponses Citables" : "Citable Responses",
      description: language === 'fr'
        ? "Réponses courtes, factuelles et structurées pour la citation LLM."
        : "Short, factual, structured answers designed for LLM citation.",
      icon: MessageSquare,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: language === 'fr' ? "Multi-plateforme" : "Multi-platform Ready",
      description: language === 'fr'
        ? "Fonctionne avec blogs, SaaS, médias et e-commerce."
        : "Works with blogs, SaaS, media sites and e-commerce.",
      icon: Globe,
      color: "from-emerald-500 to-teal-500"
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: language === 'fr' ? "Entrez une URL ou des mots-clés" : "Enter a URL or keywords",
      description: language === 'fr' 
        ? "Analysez votre contenu existant ou définissez vos sujets cibles."
        : "Analyze your existing content or define your target topics.",
      icon: Search,
    },
    {
      step: 2,
      title: language === 'fr' ? "Générez des opportunités AEO" : "Generate AEO opportunities",
      description: language === 'fr'
        ? "Notre IA identifie les questions que les utilisateurs posent aux assistants."
        : "Our AI identifies the questions users ask AI assistants.",
      icon: Sparkles,
    },
    {
      step: 3,
      title: language === 'fr' ? "Créez des réponses & articles AEO" : "Create citable answers & AEO articles",
      description: language === 'fr'
        ? "Générez des réponses optimisées pour être citées par les LLM."
        : "Generate responses optimized to be cited by LLMs.",
      icon: FileText,
    },
    {
      step: 4,
      title: language === 'fr' ? "Publiez & partagez" : "Publish & share across platforms",
      description: language === 'fr'
        ? "Diffusez sur votre blog, CMS ou réseaux sociaux."
        : "Distribute on your blog, CMS, or social media.",
      icon: Send,
    },
  ];

  const useCases = [
    { key: 'ecommerce', icon: ShoppingCart, data: t.landing.useCases.ecommerce },
    { key: 'saas', icon: Briefcase, data: t.landing.useCases.saas },
    { key: 'blogs', icon: Newspaper, data: t.landing.useCases.blogs },
    { key: 'consulting', icon: Building, data: t.landing.useCases.consulting },
    { key: 'agencies', icon: PenTool, data: t.landing.useCases.agencies },
    { key: 'media', icon: Globe, data: t.landing.useCases.media },
  ];

  const getPlanIcon = (planId: string) => {
    if (planId === "starter") return Rocket;
    if (planId.startsWith("pro")) return Zap;
    return Crown;
  };

  const getPlanColor = (planId: string) => {
    if (planId === "starter") return "blue";
    if (planId.startsWith("pro")) return "violet";
    return "amber";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/20 text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Aeoreply</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900" onClick={() => navigate('/auth?mode=login')}>
              {language === 'fr' ? 'Connexion' : 'Sign in'}
            </Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg shadow-violet-500/25" 
              onClick={() => navigate('/auth?mode=signup')}
            >
              {t.landing.hero.cta}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-100/30 to-blue-100/30 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto max-w-6xl relative z-10 text-center space-y-8">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 px-4 py-2 animate-fade-in">
            <Sparkles className="w-4 h-4 mr-2" />
            {t.landing.hero.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
              {t.landing.hero.title}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {t.landing.hero.subtitle}
          </p>
          
          {/* Key differentiator message */}
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700">
              <span className="font-semibold">SEO</span>
              <span>=</span>
              <span>{language === 'fr' ? 'liens Google' : 'Google links'}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className="font-semibold">AEO</span>
              <span>=</span>
              <span>{language === 'fr' ? 'réponses IA' : 'AI answers'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-8 py-6 shadow-xl shadow-violet-500/25 group" 
              onClick={() => navigate('/onboarding')}
            >
              {t.landing.hero.cta}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50 text-lg px-8 py-6"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t.landing.hero.ctaSecondary}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 pt-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{language === 'fr' ? 'Essai gratuit 7 jours' : '7-day free trial'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{language === 'fr' ? 'Sans carte bancaire' : 'No credit card'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistants Logos */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-slate-500 mb-8 text-sm font-medium uppercase tracking-wider">
            {language === 'fr' ? "Vos contenus cités par" : "Your content cited by"}
          </p>
          <div className="flex justify-center gap-8 flex-wrap">
            {aiPlatforms.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-3 group cursor-pointer">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl" 
                  style={{ background: p.bg }}
                >
                  {p.icon}
                </div>
                <span className="text-sm text-slate-600 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AEO vs SEO Comparison - NEW VISUAL SECTION */}
      <section className="py-24 px-4 bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 mb-4">
              {language === 'fr' ? 'Nouvelle ère' : 'New era'}
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-slate-900">{t.landing.comparison.title}</h2>
            <p className="text-xl text-slate-600">{t.landing.comparison.subtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* SEO Card */}
            <Card className="p-8 border-slate-200 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/50 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
                    <Search className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-700">{t.landing.comparison.seo.title}</h3>
                </div>
                <ul className="space-y-4">
                  {t.landing.comparison.seo.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-slate-600 text-xs">→</span>
                      </div>
                      <span className="text-slate-600">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* AEO Card */}
            <Card className="p-8 border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 relative overflow-hidden shadow-lg shadow-violet-500/10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-200/50 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-200/30 rounded-full" />
              <Badge className="absolute top-4 right-4 bg-emerald-500 text-white border-0">
                {language === 'fr' ? 'Nouveau' : 'New'}
              </Badge>
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{t.landing.comparison.aeo.title}</h3>
                </div>
                <ul className="space-y-4">
                  {t.landing.comparison.aeo.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-800 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {language === 'fr' ? 'Pourquoi Aeoreply ?' : 'Why Aeoreply?'}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {valuePropositions.map((prop, i) => (
              <Card key={i} className="bg-white border-slate-200 p-8 hover:border-violet-300 hover:shadow-xl transition-all group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${prop.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <prop.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{prop.title}</h3>
                <p className="text-slate-600">{prop.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-50/50 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 mb-4">
              <Star className="w-3 h-3 mr-1" />
              {language === 'fr' ? 'Tarifs simples' : 'Simple pricing'}
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              {language === 'fr' ? 'Des crédits AEO pour chaque besoin' : 'AEO Credits for every need'}
            </h2>
            <p className="text-xl text-slate-600">
              {language === 'fr' ? 'Essai gratuit de 7 jours inclus' : '7-day free trial included'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {pricingPlans.map((plan, i) => {
              const PlanIcon = getPlanIcon(plan.id);
              const planColor = getPlanColor(plan.id);
              return (
                <Card 
                  key={i} 
                  className={`p-6 text-center transition-all hover:shadow-lg ${
                    plan.popular 
                      ? 'border-2 border-violet-500 bg-white shadow-lg shadow-violet-500/10' 
                      : 'border-slate-200 bg-white hover:border-violet-300'
                  }`}
                >
                  {plan.popular && (
                    <Badge className="mb-4 bg-violet-500">{language === 'fr' ? 'Populaire' : 'Popular'}</Badge>
                  )}
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                    planColor === 'violet' ? 'bg-violet-100' :
                    planColor === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <PlanIcon className={`w-6 h-6 ${
                      planColor === 'violet' ? 'text-violet-500' :
                      planColor === 'amber' ? 'text-amber-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{formatPrice(plan.price_monthly, language)}</span>
                    <span className="text-slate-500">/{language === 'fr' ? 'mois' : 'mo'}</span>
                  </div>
                  <p className="text-slate-600 text-sm">
                    {plan.max_optimizations_monthly === -1 
                      ? (language === 'fr' ? 'Illimité' : 'Unlimited')
                      : plan.max_optimizations_monthly
                    } {language === 'fr' ? 'crédits AEO' : 'AEO credits'}
                  </p>
                </Card>
              );
            })}
          </div>
          <div className="text-center">
            <Button 
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
              onClick={() => navigate('/onboarding')}
            >
              {language === 'fr' ? 'Commencer gratuitement' : 'Start for free'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">{t.landing.howItWorks.title}</h2>
            <p className="text-xl text-slate-600">{t.landing.howItWorks.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((item) => (
              <Card key={item.step} className="bg-white border-slate-200 p-8 hover:border-violet-300 hover:shadow-lg transition-all relative">
                <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {item.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-6">
                  <item.icon className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">{t.landing.useCases.title}</h2>
            <p className="text-xl text-slate-600">{t.landing.useCases.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((item) => (
              <Card key={item.key} className="bg-white border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-all">
                    <item.icon className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{item.data.title}</h3>
                    <p className="text-slate-600 text-sm">{item.data.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">{t.landing.features.title}</h2>
            <p className="text-xl text-slate-600">{t.landing.features.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { f: t.landing.features.answerFirst, icon: MessageSquare },
              { f: t.landing.features.aeoArticles, icon: FileText },
              { f: t.landing.features.llmsTxt, icon: Settings },
              { f: t.landing.features.citationScore, icon: TrendingUp }
            ].map((item, i) => (
              <Card key={i} className="bg-white border-slate-200 p-8 hover:border-violet-300 hover:shadow-lg transition-all flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.f.title}</h3>
                  <p className="text-slate-600">{item.f.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-100/50 via-blue-100/50 to-violet-100/50" />
        <div className="container mx-auto max-w-4xl relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">{t.landing.cta.title}</h2>
          <p className="text-xl text-slate-600">{t.landing.cta.subtitle}</p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-12 py-6 shadow-xl shadow-violet-500/25" 
            onClick={() => navigate('/auth?mode=signup')}
          >
            {t.landing.cta.button}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-slate-500">{t.landing.cta.noCard}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-slate-200 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900">Aeoreply</span>
              </div>
              <p className="text-slate-500 text-sm mb-6 max-w-md">
                {t.landing.footer.description}
              </p>
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Suite 4, Piccadilly House</p>
                  <p>Manchester, M1 1AB</p>
                  <p>United Kingdom</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">{t.landing.footer.product}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-500 hover:text-violet-600 text-sm transition-colors">{t.landing.footer.features}</a></li>
                <li><a href="/pricing" className="text-slate-500 hover:text-violet-600 text-sm transition-colors">{t.landing.footer.pricing}</a></li>
                <li><a href="#" className="text-slate-500 hover:text-violet-600 text-sm transition-colors">{t.landing.footer.integrations}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">{t.landing.footer.legal}</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/terms" className="text-slate-500 hover:text-violet-600 text-sm transition-colors flex items-center gap-1">
                    {t.landing.footer.terms}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-slate-500 hover:text-violet-600 text-sm transition-colors flex items-center gap-1">
                    {t.landing.footer.privacy}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@aeoreply.com" className="text-slate-500 hover:text-violet-600 text-sm transition-colors flex items-center gap-1">
                    <Mail className="w-3 h-3 mr-1" />
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">{t.landing.footer.copyright}</p>
            <div className="flex items-center gap-4">
              {aiPlatforms.slice(0, 4).map((p, i) => (
                <div 
                  key={i}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
                  style={{ background: p.bg }}
                >
                  {p.icon.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
