import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Share2, 
  Globe, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Bot,
  Target,
  TrendingUp,
  Users,
  Shield,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";

export default function AeoLanding() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const platforms = [
    { name: "ChatGPT", icon: "🤖", color: "from-green-500 to-emerald-600" },
    { name: "Gemini", icon: "✨", color: "from-blue-500 to-cyan-600" },
    { name: "Claude", icon: "🧠", color: "from-orange-500 to-amber-600" },
    { name: "Copilot", icon: "💡", color: "from-purple-500 to-violet-600" },
    { name: "Perplexity", icon: "🔍", color: "from-pink-500 to-rose-600" },
  ];

  const steps = [
    {
      icon: Target,
      title: language === 'fr' ? "Analysez vos contenus" : "Analyze your content",
      description: language === 'fr' 
        ? "Entrez des URLs, mots-clés ou liens. Notre IA détecte les opportunités AEO."
        : "Enter URLs, keywords or links. Our AI detects AEO opportunities."
    },
    {
      icon: Sparkles,
      title: language === 'fr' ? "Générez des réponses AEO" : "Generate AEO responses",
      description: language === 'fr'
        ? "Créez des réponses directes, citables et optimisées pour les LLM."
        : "Create direct, citable responses optimized for LLMs."
    },
    {
      icon: Share2,
      title: language === 'fr' ? "Publiez partout" : "Publish everywhere",
      description: language === 'fr'
        ? "Diffusez sur votre blog, Shopify, WordPress ou réseaux sociaux."
        : "Distribute on your blog, Shopify, WordPress or social media."
    }
  ];

  const useCases = [
    { icon: "🛒", label: "E-commerce", description: language === 'fr' ? "Produits & collections" : "Products & collections" },
    { icon: "📝", label: "Blogs", description: language === 'fr' ? "Articles & guides" : "Articles & guides" },
    { icon: "💼", label: "SaaS", description: language === 'fr' ? "Documentation & FAQ" : "Documentation & FAQ" },
    { icon: "🎯", label: "Consultants", description: language === 'fr' ? "Expertise & conseils" : "Expertise & advice" },
    { icon: "📰", label: language === 'fr' ? "Médias" : "Media", description: language === 'fr' ? "Actualités & analyses" : "News & analysis" },
    { icon: "🏢", label: language === 'fr' ? "Agences" : "Agencies", description: language === 'fr' ? "Services & portfolio" : "Services & portfolio" },
  ];

  const integrations = [
    { name: "Shopify", logo: "🛍️", status: "active" },
    { name: "WordPress", logo: "📘", status: "soon" },
    { name: "Prestashop", logo: "🛒", status: "soon" },
    { name: "Facebook", logo: "📘", status: "active" },
    { name: "Instagram", logo: "📷", status: "active" },
    { name: "LinkedIn", logo: "💼", status: "active" },
  ];

  const features = [
    {
      icon: Bot,
      title: language === 'fr' ? "Réponses Answer-First" : "Answer-First Responses",
      description: language === 'fr' 
        ? "Générez des réponses directes, courtes et affirmatives que les IA peuvent citer."
        : "Generate direct, short, affirmative responses that AI can cite."
    },
    {
      icon: FileText,
      title: language === 'fr' ? "Articles AEO" : "AEO Articles",
      description: language === 'fr'
        ? "Transformez vos réponses en articles structurés avec Answer Box et FAQ."
        : "Transform your responses into structured articles with Answer Box and FAQ."
    },
    {
      icon: Shield,
      title: "LLMs.txt",
      description: language === 'fr'
        ? "Contrôlez quels assistants IA peuvent accéder à vos contenus."
        : "Control which AI assistants can access your content."
    },
    {
      icon: TrendingUp,
      title: language === 'fr' ? "Score de citation" : "Citation Score",
      description: language === 'fr'
        ? "Mesurez le potentiel de citation de chaque réponse."
        : "Measure the citation potential of each response."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Aeoreply</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              {language === 'fr' ? 'Connexion' : 'Login'}
            </Button>
            <Button onClick={() => navigate('/auth?mode=signup')} className="bg-primary hover:bg-primary/90">
              {language === 'fr' ? 'Démarrer gratuitement' : 'Start for free'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Answer Engine Optimization
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {language === 'fr' 
              ? "Soyez cité par " 
              : "Get cited by "}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
              ChatGPT, Gemini & Claude
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {language === 'fr'
              ? "Aeoreply transforme vos contenus en réponses AEO optimisées pour être reprises par les IA génératives."
              : "Aeoreply transforms your content into AEO responses optimized to be picked up by generative AI."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              {language === 'fr' ? 'Démarrer gratuitement' : 'Start for free'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-lg px-8 py-6"
            >
              {language === 'fr' ? 'Comment ça marche' : 'How it works'}
            </Button>
          </div>

          {/* AI Platforms */}
          <div className="flex flex-wrap justify-center gap-3">
            {platforms.map((platform) => (
              <div 
                key={platform.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
              >
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {language === 'fr' ? '3 étapes simples' : '3 simple steps'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' ? 'Comment ça marche ?' : 'How does it work?'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'fr'
                ? "De l'analyse à la publication, optimisez vos contenus pour les IA en quelques clics."
                : "From analysis to publication, optimize your content for AI in a few clicks."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {index + 1}
                </div>
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {language === 'fr' ? 'Fonctionnalités' : 'Features'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' ? 'Tout pour dominer les réponses IA' : 'Everything to dominate AI responses'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {language === 'fr' ? 'Pour qui ?' : 'For whom?'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' ? 'AEO pour tous les métiers' : 'AEO for all industries'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'fr'
                ? "Aeoreply s'adapte à votre secteur d'activité."
                : "Aeoreply adapts to your industry."}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer group">
                <CardContent className="flex flex-col items-center text-center py-8">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{useCase.icon}</span>
                  <h3 className="font-semibold mb-1">{useCase.label}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              {language === 'fr' ? 'Intégrations' : 'Integrations'}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' ? 'Publiez partout' : 'Publish everywhere'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'fr'
                ? "Connectez vos plateformes préférées et diffusez vos contenus AEO."
                : "Connect your favorite platforms and distribute your AEO content."}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {integrations.map((integration, index) => (
              <Card key={index} className="border-border/50 bg-card/50">
                <CardContent className="flex items-center justify-between py-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{integration.logo}</span>
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  {integration.status === 'active' ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {language === 'fr' ? 'Actif' : 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {language === 'fr' ? 'Bientôt' : 'Soon'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LLMs.txt Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Settings className="w-4 h-4 mr-2" />
              LLMs.txt
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' ? "Contrôlez l'accès IA" : "Control AI access"}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'fr'
                ? "Décidez quels assistants IA peuvent accéder à vos contenus grâce au fichier LLMs.txt."
                : "Decide which AI assistants can access your content with the LLMs.txt file."}
            </p>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-muted-foreground font-mono">llms.txt</span>
              </div>
              <pre className="p-6 text-sm font-mono text-muted-foreground overflow-x-auto">
{`# Aeoreply LLMs.txt
# Generated automatically

User-agent: ChatGPT
Allow: /answers
Allow: /articles

User-agent: Gemini
Allow: /answers
Allow: /articles

User-agent: Claude
Allow: /answers

User-agent: Perplexity
Disallow: /

# Last updated: ${new Date().toISOString().split('T')[0]}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-12 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'fr' 
                ? "Prêt à apparaître dans les réponses IA ?"
                : "Ready to appear in AI responses?"}
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              {language === 'fr'
                ? "Rejoignez les entreprises qui optimisent déjà leurs contenus pour les LLM."
                : "Join companies already optimizing their content for LLMs."}
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              {language === 'fr' ? 'Commencer maintenant' : 'Start now'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {language === 'fr' ? 'Gratuit • Aucune carte requise' : 'Free • No card required'}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Aeoreply</span>
              <span className="text-muted-foreground">by NewAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                {language === 'fr' ? 'Confidentialité' : 'Privacy'}
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                {language === 'fr' ? 'Conditions' : 'Terms'}
              </a>
              <a href="/documentation" className="hover:text-foreground transition-colors">
                Documentation
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aeoreply. {language === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
