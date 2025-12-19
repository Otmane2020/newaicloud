import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAeoCredits } from "@/hooks/useAeoCredits";
import { AeoOnboardingWizard } from "@/components/aeo/AeoOnboardingWizard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Globe,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Link,
  Settings,
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";

// AI Platforms targeted by AEO
const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

export default function AeoDashboard() {
  const { language } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  const { credits, loading: creditsLoading, getUsagePercentage, isLimitReached } = useAeoCredits();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [answersStats, setAnswersStats] = useState({
    total: 0,
    published: 0,
    highCitation: 0,
    avgScore: 0,
  });

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // Show onboarding if not completed
        if (!profile?.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user]);

  // Fetch answers stats
  useEffect(() => {
    const fetchAnswersStats = async () => {
      if (!user) return;

      try {
        // Get all answers for this user
        const { data: answers } = await supabase
          .from('ai_answers')
          .select('id, is_published, citation_potential')
          .eq('user_id', user.id);

        if (answers) {
          const total = answers.length;
          const published = answers.filter(a => a.is_published).length;
          const highCitation = answers.filter(a => (a.citation_potential || 0) >= 80).length;
          const avgScore = total > 0 
            ? Math.round(answers.reduce((sum, a) => sum + (a.citation_potential || 0), 0) / total)
            : 0;

          setAnswersStats({ total, published, highCitation, avgScore });
        }
      } catch (error) {
        console.error('Error fetching answers stats:', error);
      }
    };

    fetchAnswersStats();
  }, [user]);

  const stats = [
    { 
      label: language === 'fr' ? "Réponses AEO actives" : "Active AEO Answers",
      sublabel: language === 'fr' ? `${answersStats.total} générées` : `${answersStats.total} generated`,
      value: `${answersStats.published}`, 
      icon: MessageSquare,
      color: "from-violet-500 to-purple-500"
    },
    { 
      label: language === 'fr' ? "Haute citation" : "High Citation",
      sublabel: language === 'fr' ? "Score ≥ 80%" : "Score ≥ 80%",
      value: answersStats.highCitation.toString(), 
      icon: Target,
      color: "from-emerald-500 to-teal-500"
    },
    { 
      label: language === 'fr' ? "Score AEO moyen" : "Avg AEO Score",
      sublabel: language === 'fr' ? "Potentiel de citation" : "Citation potential",
      value: answersStats.avgScore > 0 ? `${answersStats.avgScore}%` : "—", 
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      label: language === 'fr' ? "Plateformes IA ciblées" : "AI Platforms Targeted",
      sublabel: AI_PLATFORMS.slice(0, 3).join(' · '),
      value: AI_PLATFORMS.length.toString(), 
      icon: Globe,
      color: "from-orange-500 to-amber-500"
    },
  ];

  const quickActions = [
    {
      title: language === 'fr' ? "Assistant AEO" : "AEO Wizard",
      description: language === 'fr' ? "Générer des opportunités de citation" : "Generate citation opportunities",
      icon: Lightbulb,
      url: "/wizard",
      color: "from-violet-500 to-purple-500"
    },
    {
      title: language === 'fr' ? "Opportunités" : "Opportunities",
      description: language === 'fr' ? "Voir vos opportunités AEO" : "View your AEO opportunities",
      icon: Sparkles,
      url: "/opportunities",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: language === 'fr' ? "Intégrations" : "Integrations",
      description: language === 'fr' ? "Connecter vos plateformes" : "Connect your platforms",
      icon: Link,
      url: "/integrations",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: language === 'fr' ? "Paramètres" : "Settings",
      description: language === 'fr' ? "Configurer LLMs.txt" : "Configure LLMs.txt",
      icon: Settings,
      url: "/settings",
      color: "from-orange-500 to-amber-500"
    },
  ];

  const usageItems = [
    {
      label: language === 'fr' ? "Optimisations AEO" : "AEO Optimizations",
      used: credits.optimizations.used,
      limit: credits.optimizations.limit,
      percentage: getUsagePercentage('optimizations'),
      isLimited: isLimitReached('optimizations'),
    },
    {
      label: language === 'fr' ? "Articles AEO" : "AEO Articles",
      used: credits.articles.used,
      limit: credits.articles.limit,
      percentage: getUsagePercentage('articles'),
      isLimited: isLimitReached('articles'),
    },
    {
      label: language === 'fr' ? "Réponses AEO actives" : "Active AEO Answers",
      used: answersStats.published,
      limit: credits.answers.limit,
      percentage: credits.answers.limit > 0 ? (answersStats.published / credits.answers.limit) * 100 : 0,
      isLimited: answersStats.published >= credits.answers.limit,
    },
  ];

  const anyLimitReached = usageItems.some(item => item.isLimited);

  return (
    <div className="space-y-8">
      {/* Onboarding Wizard */}
      <AeoOnboardingWizard 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t.dashboard.title}</h1>
        <p className="text-white/60 mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* Usage Banner */}
      <Card className={`p-6 ${anyLimitReached ? 'bg-red-500/10 border-red-500/30' : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-500/20'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${anyLimitReached ? 'bg-red-500/20' : 'bg-gradient-to-br from-violet-500 to-blue-500'}`}>
              {anyLimitReached ? (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              ) : (
                <Zap className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {anyLimitReached 
                  ? (language === 'fr' ? "Limite atteinte" : "Limit reached")
                  : (language === 'fr' ? "Utilisation mensuelle" : "Monthly usage")}
              </h3>
              <p className="text-sm text-white/60">
                {anyLimitReached
                  ? (language === 'fr' ? "Passez à un plan supérieur pour continuer" : "Upgrade your plan to continue")
                  : (language === 'fr' ? "Crédits AEO utilisés ce mois" : "AEO credits used this month")}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 flex-1 max-w-2xl">
            {usageItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">{item.label}</span>
                  <span className={`text-xs font-medium ${item.isLimited ? 'text-red-400' : 'text-white'}`}>
                    {item.used} / {item.limit}
                  </span>
                </div>
                <Progress 
                  value={item.percentage} 
                  className={`h-2 ${item.isLimited ? 'bg-red-500/20' : 'bg-slate-700'}`}
                />
              </div>
            ))}
          </div>

          {anyLimitReached && (
            <Button 
              onClick={() => navigate('/subscription')}
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
            >
              {language === 'fr' ? "Upgrade" : "Upgrade"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="bg-slate-900/50 border-violet-500/20 p-6 hover:border-violet-500/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/50">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                {stat.sublabel && (
                  <p className="text-xs text-white/40 mt-1">{stat.sublabel}</p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          {language === 'fr' ? "Actions rapides" : "Quick actions"}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="bg-slate-900/50 border-violet-500/20 p-6 hover:border-violet-500/40 transition-all cursor-pointer group"
              onClick={() => navigate(action.url)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-1">{action.title}</h3>
              <p className="text-sm text-white/50 mb-4">{action.description}</p>
              <div className="flex items-center text-violet-400 text-sm font-medium">
                {language === 'fr' ? "Accéder" : "Go"}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20 p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === 'fr' ? "Prêt à être cité par l'IA ?" : "Ready to be cited by AI?"}
            </h2>
            <p className="text-white/60">
              {language === 'fr' 
                ? "Commencez par générer vos premières opportunités AEO avec l'assistant."
                : "Start by generating your first AEO opportunities with the wizard."}
            </p>
          </div>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg shadow-violet-500/25"
            onClick={() => navigate('/wizard')}
          >
            {language === 'fr' ? "Lancer l'assistant" : "Start wizard"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
