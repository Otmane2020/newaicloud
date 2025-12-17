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
  ShoppingCart, Briefcase, Newspaper, Building, PenTool, ExternalLink
} from "lucide-react";

export default function AeoLanding() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;

  // AI Platform logos with official colors
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
      color: "from-violet-500 to-purple-500"
    },
    {
      step: 2,
      title: language === 'fr' ? "Générez des opportunités AEO" : "Generate AEO opportunities",
      description: language === 'fr'
        ? "Notre IA identifie les questions que les utilisateurs posent aux assistants."
        : "Our AI identifies the questions users ask AI assistants.",
      icon: Sparkles,
      color: "from-blue-500 to-cyan-500"
    },
    {
      step: 3,
      title: language === 'fr' ? "Créez des réponses & articles AEO" : "Create citable answers & AEO articles",
      description: language === 'fr'
        ? "Générez des réponses optimisées pour être citées par les LLM."
        : "Generate responses optimized to be cited by LLMs.",
      icon: FileText,
      color: "from-emerald-500 to-teal-500"
    },
    {
      step: 4,
      title: language === 'fr' ? "Publiez & partagez" : "Publish & share across platforms",
      description: language === 'fr'
        ? "Diffusez sur votre blog, CMS ou réseaux sociaux."
        : "Distribute on your blog, CMS, or social media.",
      icon: Send,
      color: "from-orange-500 to-amber-500"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-violet-500/20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Aeoreply</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => navigate('/auth?mode=login')}>
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
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto max-w-6xl relative z-10 text-center space-y-8">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            {t.landing.hero.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
            {t.landing.hero.title}
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
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
              className="border-violet-500/50 text-white hover:bg-violet-500/10 text-lg px-8 py-6"
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
          <p className="text-white/40 mb-8 text-sm uppercase tracking-wider">
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
                <span className="text-xs text-white/50">{p.name}</span>
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
              <Card key={i} className="bg-slate-900/50 border-violet-500/20 p-8 hover:border-violet-500/40 transition-all backdrop-blur-sm">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${prop.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <prop.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{prop.title}</h3>
                <p className="text-white/60">{prop.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.howItWorks.title}</h2>
            <p className="text-xl text-white/60">{t.landing.howItWorks.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((item) => (
              <Card key={item.step} className="bg-slate-900/50 border-violet-500/20 p-8 hover:border-violet-500/40 transition-all relative">
                <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {item.step}
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.useCases.title}</h2>
            <p className="text-xl text-white/60">{t.landing.useCases.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((item) => (
              <Card key={item.key} className="bg-slate-900/50 border-violet-500/20 p-6 hover:border-violet-500/40 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-violet-500/30 group-hover:to-blue-500/30 transition-all">
                    <item.icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.data.title}</h3>
                    <p className="text-white/60 text-sm">{item.data.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.features.title}</h2>
            <p className="text-xl text-white/60">{t.landing.features.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { f: t.landing.features.answerFirst, icon: MessageSquare },
              { f: t.landing.features.aeoArticles, icon: FileText },
              { f: t.landing.features.llmsTxt, icon: Settings },
              { f: t.landing.features.citationScore, icon: TrendingUp }
            ].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-violet-500/20 p-8 hover:border-violet-500/40 transition-all flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.f.title}</h3>
                  <p className="text-white/60">{item.f.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-violet-500/10" />
        <div className="container mx-auto max-w-4xl relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">{t.landing.cta.title}</h2>
          <p className="text-xl text-white/60">{t.landing.cta.subtitle}</p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-12 py-6 shadow-xl shadow-violet-500/25" 
            onClick={() => navigate('/auth?mode=signup')}
          >
            {t.landing.cta.button}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-white/40">{t.landing.cta.noCard}</p>
        </div>
      </section>

      {/* Footer with UK Legal Address */}
      <footer className="py-16 px-4 border-t border-violet-500/20 bg-slate-950/80">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">Aeoreply</span>
              </div>
              <p className="text-white/50 text-sm mb-6 max-w-md">
                {t.landing.footer.description}
              </p>
              {/* Company Address */}
              <div className="flex items-start gap-2 text-white/40 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Suite 4, Piccadilly House</p>
                  <p>Manchester, M1 1AB</p>
                  <p>United Kingdom</p>
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t.landing.footer.product}</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-white/50 hover:text-white text-sm transition-colors">{t.landing.footer.features}</a>
                </li>
                <li>
                  <a href="/pricing" className="text-white/50 hover:text-white text-sm transition-colors">{t.landing.footer.pricing}</a>
                </li>
                <li>
                  <a href="#" className="text-white/50 hover:text-white text-sm transition-colors">{t.landing.footer.integrations}</a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t.landing.footer.legal}</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/terms" className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1">
                    {t.landing.footer.terms}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1">
                    {t.landing.footer.privacy}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@aeoreply.com" className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1">
                    <Mail className="w-3 h-3 mr-1" />
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-violet-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">{t.landing.footer.copyright}</p>
            <div className="flex items-center gap-4">
              {aiPlatforms.slice(0, 4).map((p, i) => (
                <div 
                  key={i}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] opacity-50 hover:opacity-100 transition-opacity" 
                  style={{ background: p.bg }}
                >
                  {p.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
