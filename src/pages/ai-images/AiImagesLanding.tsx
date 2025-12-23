import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Image,
  Wand2,
  Zap,
  Star,
  Camera,
  Layers,
  Clock,
  CreditCard,
  Play,
} from "lucide-react";

// Shopify Logo
const ShopifyLogo = () => (
  <svg viewBox="0 0 109 124" className="w-6 h-6">
    <path
      fill="#95BF47"
      d="M95.6 28.4c-.1-.6-.6-1-1.1-1-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.8-.8-2.3-.5-2.9-.4-.1 0-1.5.5-4 1.2-2.4-6.9-6.6-13.2-14-13.2h-.6c-2.1-2.8-4.7-4-7-4-17.3 0-25.6 21.6-28.2 32.6-6.8 2.1-11.6 3.6-12.2 3.8-3.8 1.2-3.9 1.3-4.4 4.9-.4 2.7-10.3 79.4-10.3 79.4l77.7 14.6 42-9.1S95.7 29 95.6 28.4z"
    />
    <path
      fill="#5E8E3E"
      d="M94.5 27.4c-.5 0-10.7-.7-10.7-.7s-7.1-6.9-7.9-7.7c-.3-.3-.7-.4-1.1-.5l-5.9 120.1 42-9.1S95.7 29 95.6 28.4c-.1-.6-.6-1-1.1-1z"
    />
    <path
      fill="#FFF"
      d="M58 45.8l-5 14.9s-4.4-2.3-9.8-2.3c-7.9.1-8.3 5-8.3 6.2 0 6.8 17.8 9.4 17.8 25.4 0 12.6-8 20.7-18.7 20.7-12.9 0-19.5-8-19.5-8l3.5-11.4s6.8 5.8 12.5 5.8c3.7 0 5.2-2.9 5.2-5.1 0-8.9-14.6-9.3-14.6-23.9 0-12.3 8.8-24.2 26.6-24.2 6.9.1 10.3 1.9 10.3 1.9z"
    />
  </svg>
);

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Background Removal",
    titleFr: "Suppression de fond IA",
    description: "Remove backgrounds instantly and replace them with professional studio settings",
    descriptionFr: "Supprimez les fonds instantanément et remplacez-les par des décors studio professionnels",
  },
  {
    icon: Image,
    title: "Studio-Quality Images",
    titleFr: "Images Qualité Studio",
    description: "Generate product photos in living rooms, bedrooms, kitchens, and more",
    descriptionFr: "Générez des photos produits dans des salons, chambres, cuisines et plus",
  },
  {
    icon: Layers,
    title: "Multiple Variants",
    titleFr: "Variantes Multiples",
    description: "Create multiple scene variations for A/B testing and marketing campaigns",
    descriptionFr: "Créez plusieurs variations de scènes pour tests A/B et campagnes marketing",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    titleFr: "Génération en Masse",
    description: "Process hundreds of products at once with our intelligent batch system",
    descriptionFr: "Traitez des centaines de produits à la fois avec notre système de batch intelligent",
  },
];

const PRICING = {
  name: "Image Pack",
  nameFr: "Pack Images",
  price: 9.99,
  credits: 30,
  features: [
    { en: "30 AI Image Credits", fr: "30 Crédits Images IA" },
    { en: "3 credits per generation", fr: "3 crédits par génération" },
    { en: "HD 1:1 Square Format", fr: "Format Carré HD 1:1" },
    { en: "Background Removal", fr: "Suppression de Fond" },
    { en: "Scene Customization", fr: "Personnalisation de Scène" },
    { en: "Shopify Direct Sync", fr: "Sync Direct Shopify" },
  ],
};

export default function AiImagesLanding() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const isFr = language === "fr";

  const handleInstall = () => {
    window.open(
      "https://apps.shopify.com/ai-product-image-shot",
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Product Image Shot - Professional AI Product Photos for Shopify</title>
        <meta name="description" content="Transform your Shopify product photos with AI. Remove backgrounds, add professional studio settings, and generate stunning e-commerce images in seconds." />
        <meta property="og:title" content="AI Product Image Shot - AI Photos for Shopify" />
        <meta property="og:description" content="Transform product photos with AI. Professional backgrounds in seconds." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-images.newai.sale" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://ai-images.newai.sale" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">AI Product Image Shot</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              {isFr ? "Connexion" : "Login"}
            </Button>
            <Button onClick={handleInstall} className="gap-2">
              <ShopifyLogo />
              {isFr ? "Installer sur Shopify" : "Install on Shopify"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {isFr ? "Propulsé par IA" : "AI Powered"}
              </Badge>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-xs text-white/80">{isFr ? "Conçu pour" : "Built for"}</span>
                <ShopifyLogo />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {isFr ? "Photos Produits" : "Product Photos"}{" "}
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
                {isFr ? "Professionnelles" : "Professional"}
              </span>{" "}
              {isFr ? "en Secondes" : "in Seconds"}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
              {isFr
                ? "Transformez vos photos produits avec l'IA. Supprimez les fonds, ajoutez des décors studio, et générez des images e-commerce époustouflantes."
                : "Transform your product photos with AI. Remove backgrounds, add studio settings, and generate stunning e-commerce images."}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="group bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/30 w-full sm:w-auto"
                onClick={handleInstall}
              >
                <ShopifyLogo />
                <span className="ml-2">{isFr ? "Installer Gratuitement" : "Install Free"}</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10 w-full sm:w-auto"
              >
                <Play className="mr-2 w-4 h-4" />
                {isFr ? "Voir Démo" : "Watch Demo"}
              </Button>
            </div>

            {/* Trust */}
            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{isFr ? "Installation 1 minute" : "1-min install"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{isFr ? "Sans engagement" : "No commitment"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{isFr ? "Format 1:1" : "1:1 Format"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-primary text-primary">
              {isFr ? "Fonctionnalités" : "Features"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {isFr ? "Tout ce dont vous avez besoin" : "Everything You Need"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isFr
                ? "Des outils IA puissants pour transformer vos photos produits"
                : "Powerful AI tools to transform your product photos"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/20">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{isFr ? feature.titleFr : feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isFr ? feature.descriptionFr : feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="outline" className="border-primary text-primary">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              {isFr ? "Tarification Simple" : "Simple Pricing"}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {isFr ? "Payez uniquement ce que vous utilisez" : "Pay Only For What You Use"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isFr
                ? "Système de crédits flexible. 3 crédits par génération d'image."
                : "Flexible credit system. 3 credits per image generation."}
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="p-8 border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                {isFr ? "Populaire" : "Popular"}
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{isFr ? PRICING.nameFr : PRICING.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">${PRICING.price}</span>
                  <span className="text-muted-foreground">/{isFr ? "pack" : "pack"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  = {PRICING.credits} {isFr ? "crédits" : "credits"} ({Math.floor(PRICING.credits / 3)} {isFr ? "images" : "images"})
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {PRICING.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">{isFr ? feature.fr : feature.en}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" size="lg" onClick={handleInstall}>
                {isFr ? "Commencer Maintenant" : "Get Started Now"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {isFr ? "Prêt à transformer vos photos ?" : "Ready to Transform Your Photos?"}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {isFr
              ? "Installez AI Product Image Shot et commencez à créer des images professionnelles en quelques secondes."
              : "Install AI Product Image Shot and start creating professional images in seconds."}
          </p>
          <Button size="lg" onClick={handleInstall} className="gap-2">
            <ShopifyLogo />
            {isFr ? "Installer sur Shopify" : "Install on Shopify"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-semibold">AI Product Image Shot</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                {isFr ? "Confidentialité" : "Privacy"}
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                {isFr ? "CGU" : "Terms"}
              </a>
              <span>© 2024 AI Product Image Shot</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
