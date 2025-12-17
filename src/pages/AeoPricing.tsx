import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { 
  Zap, Check, ArrowRight, Target, FileText, MessageSquare, 
  Star, Rocket, Crown, Shield, Sparkles 
} from "lucide-react";

export default function AeoPricing() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: language === 'fr' ? "9€" : "$9",
      period: language === 'fr' ? "/mois" : "/mo",
      description: language === 'fr' ? "Pour démarrer avec l'AEO" : "Get started with AEO",
      icon: Rocket,
      color: "blue",
      features: [
        { label: language === 'fr' ? "Crédits AEO" : "AEO Credits", value: "30" },
        { label: language === 'fr' ? "Articles AEO" : "AEO Articles", value: "10" },
        { label: language === 'fr' ? "Réponses IA" : "AI Responses", value: "50" },
        { label: "LLMs.txt", value: true },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: language === 'fr' ? "29€" : "$29",
      period: language === 'fr' ? "/mois" : "/mo",
      description: language === 'fr' ? "Pour les créateurs de contenu" : "For content creators",
      icon: Zap,
      color: "violet",
      popular: true,
      features: [
        { label: language === 'fr' ? "Crédits AEO" : "AEO Credits", value: "100" },
        { label: language === 'fr' ? "Articles AEO" : "AEO Articles", value: "30" },
        { label: language === 'fr' ? "Réponses IA" : "AI Responses", value: "200" },
        { label: "LLMs.txt", value: true },
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: language === 'fr' ? "99€" : "$99",
      period: language === 'fr' ? "/mois" : "/mo",
      description: language === 'fr' ? "Pour les équipes et agences" : "For teams and agencies",
      icon: Crown,
      color: "amber",
      bestValue: true,
      features: [
        { label: language === 'fr' ? "Crédits AEO" : "AEO Credits", value: language === 'fr' ? "Illimité" : "Unlimited" },
        { label: language === 'fr' ? "Articles AEO" : "AEO Articles", value: language === 'fr' ? "Illimité" : "Unlimited" },
        { label: language === 'fr' ? "Réponses IA" : "AI Responses", value: language === 'fr' ? "Illimité" : "Unlimited" },
        { label: "LLMs.txt", value: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/20">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Aeoreply
            </span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate('/auth?mode=login')}>
              {language === 'fr' ? 'Connexion' : 'Sign in'}
            </Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
              onClick={() => navigate('/auth?mode=signup')}
            >
              {language === 'fr' ? 'Commencer' : 'Get started'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Title */}
        <div className="text-center mb-16">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Tarification simple' : 'Simple pricing'}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
            {language === 'fr' ? 'Des crédits AEO pour chaque besoin' : 'AEO Credits for every need'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'fr' 
              ? 'Commencez gratuitement, puis évoluez selon vos besoins.' 
              : 'Start free, then scale as you grow.'}
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`p-8 relative transition-all hover:shadow-xl ${
                plan.popular 
                  ? 'border-2 border-violet-500 shadow-lg shadow-violet-500/10' 
                  : plan.bestValue 
                    ? 'border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white'
                    : 'border border-slate-200 bg-white hover:border-violet-300'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500">
                  {language === 'fr' ? 'Populaire' : 'Popular'}
                </Badge>
              )}
              {plan.bestValue && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500">
                  {language === 'fr' ? 'Meilleur rapport' : 'Best value'}
                </Badge>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  plan.color === 'violet' ? 'bg-violet-100' :
                  plan.color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <plan.icon className={`w-6 h-6 ${
                    plan.color === 'violet' ? 'text-violet-500' :
                    plan.color === 'amber' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {feature.label === "LLMs.txt" ? (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-muted-foreground">LLMs.txt</span>
                        <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                      </>
                    ) : (
                      <>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          feature.label.includes('Crédit') || feature.label.includes('Credit') ? 'bg-violet-100' :
                          feature.label.includes('Article') ? 'bg-blue-100' : 'bg-cyan-100'
                        }`}>
                          {feature.label.includes('Crédit') || feature.label.includes('Credit') ? (
                            <Target className="w-4 h-4 text-violet-500" />
                          ) : feature.label.includes('Article') ? (
                            <FileText className="w-4 h-4 text-blue-500" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-cyan-500" />
                          )}
                        </div>
                        <span className="text-muted-foreground">{feature.label}</span>
                        <span className="ml-auto font-semibold">{feature.value}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600' 
                    : plan.bestValue
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : ''
                }`}
                variant={plan.popular || plan.bestValue ? "default" : "outline"}
                onClick={() => navigate('/auth?mode=signup')}
              >
                {language === 'fr' ? 'Commencer' : 'Get started'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Free Trial Banner */}
        <Card className="p-8 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-violet-500/10 border-violet-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-6 h-6 text-violet-500" />
            <h3 className="text-2xl font-bold">
              {language === 'fr' ? 'Essai gratuit de 7 jours' : '7-day free trial'}
            </h3>
          </div>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {language === 'fr' 
              ? 'Testez Aeoreply gratuitement avec 10 crédits AEO, 3 articles et 20 réponses IA.' 
              : 'Try Aeoreply for free with 10 AEO credits, 3 articles, and 20 AI responses.'}
          </p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
            onClick={() => navigate('/auth?mode=signup')}
          >
            {language === 'fr' ? 'Démarrer l\'essai gratuit' : 'Start free trial'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>

        {/* Trust */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Paiement sécurisé' : 'Secure payment'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Sans engagement' : 'No commitment'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Annulez à tout moment' : 'Cancel anytime'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
