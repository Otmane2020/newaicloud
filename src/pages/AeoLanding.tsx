import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aeoTranslations } from "@/lib/translations/aeo";
import { 
  Zap, ArrowRight, Search, Sparkles, Send, MessageSquare, FileText, 
  Settings, Globe, Target, TrendingUp, Check, Mail, MapPin, 
  ShoppingCart, Briefcase, Newspaper, Building, PenTool, ExternalLink,
  Rocket, Crown, Star
} from "lucide-react";

export default function AeoLanding() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;

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

  const pricingPlans = [
    {
      name: "Starter",
      price: language === 'fr' ? "9€" : "$9",
      credits: "30",
      icon: Rocket,
      color: "blue",
    },
    {
      name: "Pro",
      price: language === 'fr' ? "29€" : "$29",
      credits: "100",
      icon: Zap,
      color: "violet",
      popular: true,
    },
    {
      name: "Enterprise",
      price: language === 'fr' ? "99€" : "$99",
      credits: language === 'fr' ? "Illimité" : "Unlimited",
      icon: Crown,
      color: "amber",
    },
  ];

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
        </div>
        <div className="container mx-auto max-w-6xl relative z-10 text-center space-y-8">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            {t.landing.hero.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
            {t.landing.hero.title}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t.landing.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-8 py-6 shadow-xl shadow-violet-500/25" 
              onClick={() => navigate('/auth?mode=signup')}
            >
              {t.landing.hero.cta}
              <ArrowRight className="ml-2 w-5 h-5" />
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
        </div>
      </section>

      {/* AI Assistants Logos */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-slate-400 mb-8 text-sm uppercase tracking-wider">
            {language === 'fr' ? "Optimisé pour les assistants IA" : "Optimized for AI Assistants"}
          </p>
          <div className="flex justify-center gap-6 flex-wrap">
            {aiPlatforms.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-transform group-hover:scale-110" 
                  style={{ background: p.bg }}
                >
                  {p.icon}
                </div>
                <span className="text-xs text-slate-500">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {valuePropositions.map((prop, i) => (
              <Card key={i} className="bg-white border-slate-200 p-8 hover:border-violet-300 hover:shadow-lg transition-all">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${prop.color} flex items-center justify-center mb-6 shadow-lg`}>
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
            {pricingPlans.map((plan, i) => (
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
                  plan.color === 'violet' ? 'bg-violet-100' :
                  plan.color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <plan.icon className={`w-6 h-6 ${
                    plan.color === 'violet' ? 'text-violet-500' :
                    plan.color === 'amber' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                </div>
                <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-slate-500">/{language === 'fr' ? 'mois' : 'mo'}</span>
                </div>
                <p className="text-slate-600 text-sm">
                  {plan.credits} {language === 'fr' ? 'crédits AEO' : 'AEO credits'}
                </p>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button 
              variant="outline" 
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
              onClick={() => navigate('/pricing')}
            >
              {language === 'fr' ? 'Voir tous les plans' : 'View all plans'}
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
