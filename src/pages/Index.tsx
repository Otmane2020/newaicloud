import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { 
  Zap, 
  ShoppingBag, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

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
              AI-Powered Shopify Optimization
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight">
              Optimisez votre boutique avec{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                NewAI
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl text-gray-300">
              Automatisez le SEO, gérez vos produits, créez du contenu et boostez vos ventes avec des outils IA intelligents pour l'e-commerce moderne.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="group" onClick={() => window.location.href = '/auth?mode=signup'}>
                Commencer Gratuitement
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                Voir la Démo
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
            <Badge variant="outline" className="border-primary text-primary">Fonctionnalités</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils puissants pour les vendeurs Shopify qui veulent grandir plus vite
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
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.tags.map((tag, i) => (
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
            <Badge variant="outline" className="border-success text-success">Résultats</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Des résultats prouvés pour boutiques Shopify
            </h2>
            <p className="text-muted-foreground text-lg">
              Rejoignez des centaines de vendeurs qui ont transformé leur boutique avec l'optimisation IA
            </p>
            
            <div className="space-y-4 pt-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-6" onClick={() => window.location.href = '/auth?mode=signup'}>
              Commencer maintenant
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
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
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
          <Badge variant="outline" className="border-primary text-primary">Tarification</Badge>
          <h2 className="text-4xl md:text-5xl font-bold">Des plans pour chaque boutique</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Commencez gratuitement et évoluez au rythme de votre croissance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={`p-8 relative ${plan.featured ? 'border-2 border-primary shadow-primary' : 'border-2 border-transparent'}`}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary">
                  Plus Populaire
                </Badge>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">/ {plan.period}</span>}
                </div>

                <Button 
                  className={plan.featured ? "w-full" : "w-full"} 
                  variant={plan.featured ? "default" : "outline"}
                  onClick={() => window.location.href = '/auth?mode=signup'}
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3 pt-6 border-t">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Prêt à transformer votre boutique ?
            </h2>
            <p className="text-xl text-gray-300">
              Commencez gratuitement aujourd'hui. Aucune carte bancaire requise.
            </p>
            <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90" onClick={() => window.location.href = '/auth?mode=signup'}>
              Commencer Gratuitement
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
    title: "Gestion Produits",
    description: "Gérez produits avec variantes, génération GTIN et intégration Google Shopping",
    tags: ["Multi-vendeur", "Variantes", "Google"]
  },
  {
    icon: BarChart3,
    title: "Google Merchant Center",
    description: "Génération automatique de flux XML et synchronisation Google Shopping",
    tags: ["Flux XML", "Auto-sync"]
  },
  {
    icon: FileText,
    title: "Blog SEO AI",
    description: "Création automatique d'articles SEO optimisés avec liens produits",
    tags: ["Contenu AI", "Auto-post"]
  },
  {
    icon: Zap,
    title: "Optimisation SEO",
    description: "Optimisation IA des meta tags, descriptions et mots-clés",
    tags: ["Meta Tags", "Mots-clés"]
  },
  {
    icon: MessageSquare,
    title: "Chat Intelligent",
    description: "Assistant IA pour recommandations produits et support client",
    tags: ["Chat IA", "Support"]
  },
  {
    icon: Sparkles,
    title: "Automatisation Campagnes",
    description: "Planification et automatisation de création de contenu",
    tags: ["Automatisation", "Planning"]
  }
];

const benefits = [
  {
    title: "3x Plus rapide",
    description: "Automatisez la saisie et l'optimisation produits"
  },
  {
    title: "50% Plus de trafic",
    description: "SEO optimisé IA attire des visiteurs qualifiés"
  },
  {
    title: "10h+ économisées",
    description: "Création et gestion de contenu automatisées"
  },
  {
    title: "Meilleur classement Google",
    description: "Données structurées et flux optimisés"
  }
];

const stats = [
  { value: "10K+", label: "Produits Optimisés" },
  { value: "500+", label: "Vendeurs Actifs" },
  { value: "95%", label: "Taux Satisfaction" },
  { value: "24/7", label: "Support IA" }
];

const pricingPlans = [
  {
    name: "Starter",
    description: "Pour les petites boutiques qui débutent",
    price: "Gratuit",
    period: "",
    cta: "Commencer",
    featured: false,
    features: [
      "Jusqu'à 50 produits",
      "Optimisation SEO de base",
      "1 article de blog / mois",
      "Support par email",
      "Intégration Shopify"
    ]
  },
  {
    name: "Pro",
    description: "Pour les boutiques en croissance",
    price: "49€",
    period: "mois",
    cta: "Essayer gratuitement",
    featured: true,
    features: [
      "Produits illimités",
      "Optimisation SEO avancée",
      "10 articles de blog / mois",
      "Google Merchant Center",
      "Chat IA intelligent",
      "Automatisation complète",
      "Support prioritaire 24/7"
    ]
  },
  {
    name: "Enterprise",
    description: "Pour les grandes boutiques",
    price: "Sur mesure",
    period: "",
    cta: "Nous contacter",
    featured: false,
    features: [
      "Tout du plan Pro",
      "Articles illimités",
      "Multi-boutiques",
      "API personnalisée",
      "Account manager dédié",
      "Formation personnalisée",
      "SLA garanti"
    ]
  }
];

export default Index;
