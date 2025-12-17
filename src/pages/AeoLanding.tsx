import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Zap, ArrowRight, Search, Sparkles, Send, MessageSquare, FileText, Settings, ShoppingCart, Briefcase, Newspaper, Building, PenTool, Check, X, Globe, Target, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function AeoLanding() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;

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
            <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => navigate('/auth?mode=login')}>{language === 'fr' ? 'Connexion' : 'Sign in'}</Button>
            <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg shadow-violet-500/25" onClick={() => navigate('/auth?mode=signup')}>{t.landing.hero.cta}</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto max-w-6xl relative z-10 text-center space-y-8">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 px-4 py-2"><Sparkles className="w-4 h-4 mr-2" />{t.landing.hero.badge}</Badge>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">{t.landing.hero.title}</h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">{t.landing.hero.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-8 py-6 shadow-xl shadow-violet-500/25" onClick={() => navigate('/auth?mode=signup')}>{t.landing.hero.cta}<ArrowRight className="ml-2 w-5 h-5" /></Button>
          </div>
          <div className="pt-12 flex justify-center gap-6">
            {[{ bg: "#10A37F", icon: "GPT" }, { bg: "#4285F4", icon: "G" }, { bg: "#D97706", icon: "C" }, { bg: "#1FB8CD", icon: "P" }].map((p, i) => (
              <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: p.bg }}>{p.icon}</div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.howItWorks.title}</h2>
            <p className="text-xl text-white/60">{t.landing.howItWorks.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{ step: t.landing.howItWorks.step1, icon: Search, color: "from-violet-500 to-purple-500" }, { step: t.landing.howItWorks.step2, icon: Sparkles, color: "from-blue-500 to-cyan-500" }, { step: t.landing.howItWorks.step3, icon: Send, color: "from-emerald-500 to-teal-500" }].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-violet-500/20 p-8 hover:border-violet-500/40 transition-all">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}><item.icon className="w-7 h-7 text-white" /></div>
                <div className="text-sm text-violet-400 font-medium mb-2">{language === 'fr' ? `Étape ${i + 1}` : `Step ${i + 1}`}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.step.title}</h3>
                <p className="text-white/60">{item.step.description}</p>
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
            {[{ f: t.landing.features.answerFirst, icon: MessageSquare }, { f: t.landing.features.aeoArticles, icon: FileText }, { f: t.landing.features.llmsTxt, icon: Settings }, { f: t.landing.features.citationScore, icon: TrendingUp }].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-violet-500/20 p-8 hover:border-violet-500/40 transition-all flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0"><item.icon className="w-6 h-6 text-violet-400" /></div>
                <div><h3 className="text-xl font-bold text-white mb-2">{item.f.title}</h3><p className="text-white/60">{item.f.description}</p></div>
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
          <Button size="lg" className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white text-lg px-12 py-6 shadow-xl shadow-violet-500/25" onClick={() => navigate('/auth?mode=signup')}>{t.landing.cta.button}<ArrowRight className="ml-2 w-5 h-5" /></Button>
          <p className="text-sm text-white/40">{t.landing.cta.noCard}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-violet-500/20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-xl text-white">Aeoreply</span>
            </div>
            <p className="text-sm text-white/40">{t.landing.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
