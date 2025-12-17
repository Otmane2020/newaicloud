import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

export default function AeoDashboard() {
  const { language } = useTranslation();
  const navigate = useNavigate();
  const t = aeoTranslations[language] || aeoTranslations.fr;

  const stats = [
    { 
      label: t.dashboard.stats.totalResponses, 
      value: "0", 
      icon: MessageSquare,
      color: "from-violet-500 to-purple-500"
    },
    { 
      label: t.dashboard.stats.totalArticles, 
      value: "0", 
      icon: FileText,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      label: t.dashboard.stats.avgCitationScore, 
      value: "—", 
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500"
    },
    { 
      label: t.dashboard.stats.platforms, 
      value: "5", 
      icon: Globe,
      color: "from-orange-500 to-amber-500"
    },
  ];

  const quickActions = [
    {
      title: language === 'fr' ? "Assistant AEO" : "AEO Wizard",
      description: language === 'fr' ? "Générer des opportunités de citation" : "Generate citation opportunities",
      icon: Lightbulb,
      url: "/assistant",
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t.dashboard.title}</h1>
        <p className="text-white/60 mt-1">{t.dashboard.subtitle}</p>
      </div>

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
            onClick={() => navigate('/assistant')}
          >
            {language === 'fr' ? "Lancer l'assistant" : "Start wizard"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
