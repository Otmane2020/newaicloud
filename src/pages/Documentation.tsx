import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen,
  Rocket,
  ShoppingBag,
  Search,
  FileText,
  MessageSquare,
  Zap,
  Globe,
  Settings,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Link2,
  BarChart3,
  Image,
  Tag,
  Sparkles,
  Play,
  ChevronRight,
  Package,
  Store,
  TrendingUp,
  Hash,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4 py-16">
          <div className="flex flex-col items-center text-center space-y-6">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-6 py-2">
              <BookOpen className="w-4 h-4 mr-2" />
              Complete Documentation
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white max-w-4xl leading-tight">
              NewAI{" "}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl">
              Everything you need to know to optimize your Shopify store with AI-powered tools
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-16">
        <Tabs defaultValue="getting-started" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2">
            <TabsTrigger value="getting-started" className="gap-2">
              <Rocket className="w-4 h-4" />
              <span className="hidden sm:inline">Getting Started</span>
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Demo & Guides</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Integration</span>
            </TabsTrigger>
            <TabsTrigger value="guides" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Guides</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
          </TabsList>

          {/* Demo & Guides */}
          <TabsContent value="demo" className="space-y-8">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Play className="w-8 h-8 text-primary" />
                Démo Complète & Guides Pas-à-Pas
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Découvrez toutes les fonctionnalités de NewAI avec des guides détaillés et des exemples pratiques.
              </p>
            </Card>

            {/* Google Merchant Center */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Google Merchant Center</h3>
                  <p className="text-muted-foreground">
                    Créez et gérez automatiquement votre flux XML Google Shopping pour augmenter votre visibilité.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Étape 1 : Configuration des Paramètres
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>Google Shopping</strong> dans le menu puis <strong>Paramètres</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Renseignez le <strong>nom de votre boutique</strong>, la <strong>devise</strong> (EUR, USD, etc.) et le <strong>code pays</strong> (FR, US, etc.)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Configurez la <strong>marque par défaut</strong> et la <strong>condition des produits</strong> (neuf, reconditionné, occasion)</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Étape 2 : Optimisation des Produits
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans l'onglet <strong>Produits</strong> pour voir tous vos articles</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Sélectionnez les produits à optimiser et cliquez sur <strong>Générer GTINs</strong> pour créer automatiquement les codes barres</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Utilisez <strong>Générer Catégories AI</strong> pour que l'intelligence artificielle attribue les bonnes catégories Google Shopping</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Remplissez manuellement les champs manquants (MPN, condition) si nécessaire</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Étape 3 : Génération et Test du Flux XML
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Retournez à l'onglet <strong>Flux XML</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Générer le Flux</strong> pour créer votre fichier XML</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Copiez l'URL du flux : <code className="bg-background px-2 py-1 rounded">https://newai.sale/shoppingfeed/votre-boutique/xml</code></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Testez le flux avec le bouton <strong>Tester le Flux</strong> avant de l'envoyer à Google</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Étape 4 : Synchronisation Automatique
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans l'onglet <strong>Synchronisation</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Activez la <strong>Synchronisation automatique</strong> pour mettre à jour le flux depuis Shopify</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Choisissez la <strong>fréquence</strong> : manuelle, horaire, quotidienne ou hebdomadaire</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Utilisez <strong>Synchroniser maintenant</strong> pour une mise à jour immédiate</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Résultat Final
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Votre flux XML est maintenant prêt à être importé dans Google Merchant Center. Tous vos produits sont optimisés avec les bonnes catégories, GTINs et informations requises pour Google Shopping.
                  </p>
                </div>
              </div>
            </Card>

            {/* SEO Optimization */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Optimisation SEO</h3>
                  <p className="text-muted-foreground">
                    Optimisez automatiquement vos fiches produits, collections et pages pour le référencement naturel.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Optimisation des Produits
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>SEO → Produits</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Sélectionnez les produits à optimiser et cliquez sur <strong>Optimiser avec AI</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">L'IA génère automatiquement les <strong>méta-titres</strong>, <strong>méta-descriptions</strong> et <strong>mots-clés</strong> optimisés</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Synchronisez vers Shopify avec le bouton <strong>Sync to Shopify</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Optimisation des Collections
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>SEO → Collections</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Importez vos collections depuis Shopify si ce n'est pas déjà fait</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Sélectionnez les collections et cliquez sur <strong>Optimiser la Collection</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'IA optimise le <strong>titre</strong>, la <strong>description</strong> et les <strong>balises méta</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Optimisez aussi les <strong>images des collections</strong> avec alt text</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Optimisation des Pages Shopify
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>SEO → Pages</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Importez vos pages personnalisées depuis Shopify (À propos, Contact, etc.)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Optimisez chaque page avec <strong>Optimiser avec AI</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Synchronisez les modifications vers Shopify en un clic</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Optimisation de la Page d'Accueil
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>SEO → Page d'Accueil</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Optimisez le <strong>titre SEO</strong> et la <strong>meta description</strong> de votre homepage</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Lancez un <strong>Audit Homepage</strong> pour identifier les opportunités d'amélioration</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Importez et optimisez les <strong>images de la homepage</strong> avec Vision AI</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Synchronisez tout vers Shopify avec <strong>Sync to Shopify</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Optimisation des Images (Alt Text)
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Dans chaque fiche produit, cliquez sur l'icône <strong>image</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Utilisez <strong>Analyser avec Vision AI</strong> pour générer des textes alternatifs descriptifs</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">L'IA analyse l'image et crée un alt text optimisé pour le SEO et l'accessibilité</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Optimisez en masse plusieurs images en même temps</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Génération et Optimisation des Tags
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Dans la liste des produits, sélectionnez plusieurs articles</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Optimiser les Tags</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">L'IA analyse vos produits et génère des <strong>tags pertinents</strong> automatiquement</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Les tags améliorent la navigation et le référencement de vos produits</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Audit SEO Complet
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>SEO → Audit</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Lancez un <strong>Audit Complet</strong> pour analyser votre boutique</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Consultez les <strong>recommandations</strong> et les <strong>scores</strong> par catégorie (produits, collections, blog, images, technique)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Visualisez votre <strong>score SEO global</strong> sur 100 et suivez sa progression</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Exportez le rapport en <strong>PDF</strong> pour le partager avec votre équipe</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Blog AI */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Blog AI Automatique</h3>
                  <p className="text-muted-foreground">
                    Générez automatiquement des articles de blog SEO-optimisés liés à vos produits.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Créer un Article Unique
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Blog AI → Articles</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Générer un Article</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Choisissez un <strong>sujet</strong> et sélectionnez les <strong>produits</strong> à mettre en avant</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'IA génère un article complet avec structure SEO, liens produits et méta-données</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Éditez si nécessaire et <strong>publiez sur Shopify</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Créer une Campagne Automatique
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Blog AI → Campagnes</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Créez une nouvelle campagne et définissez la <strong>fréquence</strong> (quotidienne, hebdomadaire, mensuelle)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Activez <strong>Publication automatique</strong> si vous souhaitez publier directement sur Shopify</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'IA génère automatiquement des articles selon votre planning</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Opportunités de Contenu AI
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Consultez <strong>Blog AI → Opportunités</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">L'IA analyse vos produits et suggère des <strong>sujets d'articles</strong> pertinents</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Chaque opportunité affiche le <strong>score SEO</strong> et la <strong>difficulté</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Générez l'article en un clic depuis une opportunité</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Netlinking Automatique
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Blog AI → Netlinking</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">L'IA extrait automatiquement les <strong>liens internes</strong> de vos articles</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Visualisez les liens vers vos <strong>produits</strong>, <strong>collections</strong> et <strong>pages</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Suivez le <strong>score SEO</strong> de chaque lien et optimisez votre maillage interne</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Surveillez les <strong>clics</strong> pour identifier les liens les plus performants</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Product Management */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Gestion des Produits</h3>
                  <p className="text-muted-foreground">
                    Importez, enrichissez et gérez votre catalogue produits avec l'IA.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Importer les Produits depuis Shopify
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Produits</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Importer les Produits</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Sélectionnez votre <strong>boutique Shopify connectée</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'import se fait automatiquement avec toutes les <strong>images</strong>, <strong>variantes</strong> et <strong>informations</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Suivez la progression dans la barre de progression</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Enrichir les Produits avec Vision AI
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Enrichissement Produit</strong> dans le menu</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Sélectionnez un produit à enrichir</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Cliquez sur <strong>Analyser avec Vision AI</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'IA analyse les images et extrait les <strong>attributs visuels</strong> : couleur, matière, style, finition, motif, texture, forme, etc.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Les informations sont ajoutées automatiquement pour chaque <strong>variante</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">6</div>
                      <p className="text-sm">Éditez manuellement si besoin et <strong>sauvegardez</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Générer des Tags Automatiquement
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Dans la liste des produits, sélectionnez plusieurs articles</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Générer Tags</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">L'IA analyse le titre, la description et les images pour créer des <strong>tags pertinents</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Les tags sont ajoutés automatiquement et peuvent être synchronisés vers Shopify</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Recherche de Produits Intelligente
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>Recherche Produits</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Utilisez la recherche par <strong>attributs visuels</strong> (couleur, matière, style)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Filtrez par <strong>prix</strong>, <strong>disponibilité</strong> ou <strong>statut SEO</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Trouvez rapidement les produits à optimiser ou à enrichir</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Ads Campaigns */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Campagnes Publicitaires</h3>
                  <p className="text-muted-foreground">
                    Créez des landing pages optimisées pour vos campagnes Google Ads et Facebook Ads.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Créer une Campagne Publicitaire
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Google Shopping → Campagnes Ads</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Créer une Campagne</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Choisissez le <strong>type de campagne</strong> (produits spécifiques ou collections)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Sélectionnez les <strong>produits ou collections</strong> à promouvoir</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Définissez le <strong>message principal</strong>, le <strong>sous-titre</strong> et le <strong>CTA</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Générer la Landing Page avec AI
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Choisissez un <strong>style de design</strong> (moderne, minimaliste, élégant)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Ajoutez des <strong>points forts</strong> de vos produits (3-5 arguments)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Cliquez sur <strong>Générer la Landing Page</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">L'IA crée une page HTML complète optimisée pour la conversion</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">5</div>
                      <p className="text-sm">Prévisualisez et <strong>publiez sur Shopify</strong></p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Gérer vos Campagnes
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Consultez toutes vos campagnes dans la liste</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Voir le <strong>statut</strong> (brouillon, actif, terminé)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Accédez à l'<strong>URL Shopify</strong> de la landing page publiée</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Utilisez l'URL dans vos campagnes Google Ads ou Facebook Ads</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Chat AI */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Assistant Chat AI</h3>
                  <p className="text-muted-foreground">
                    Un chatbot intelligent pour aider vos clients et recommander vos produits 24/7.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Configuration du Chat
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Chat → Paramètres</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Personnalisez le <strong>style de l'assistant</strong> (amical, professionnel, décontracté)</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Définissez le <strong>ton</strong> et la <strong>longueur des réponses</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Ajoutez des <strong>instructions personnalisées</strong> pour adapter le comportement</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Intégrer le Widget sur votre Site
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Dans les paramètres, activez <strong>Widget intégrable</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Personnalisez la <strong>position</strong> (coin inférieur droit/gauche) et la <strong>couleur primaire</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Définissez le <strong>texte du bouton</strong> et le <strong>message de bienvenue</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Copiez le code d'intégration et ajoutez-le à votre site Shopify</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Utiliser le Chat
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>Chat → Robot</strong> pour tester l'assistant</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Posez des questions sur vos produits : l'IA recherche dans votre catalogue</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">L'assistant recommande des produits pertinents avec images et liens</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Consultez l'<strong>historique</strong> dans Chat → Historique</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Dashboard & Analytics */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Tableau de Bord & Analytics</h3>
                  <p className="text-muted-foreground">
                    Suivez vos performances et gérez votre abonnement depuis un tableau de bord centralisé.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Vue d'Ensemble du Dashboard
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez au <strong>Dashboard</strong> depuis le menu principal</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Visualisez vos <strong>métriques clés</strong> : produits totaux, optimisés, santé SEO</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Consultez les <strong>actions rapides</strong> pour accéder aux fonctionnalités principales</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Suivez la <strong>timeline d'activité</strong> des dernières optimisations</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Connexion Shopify
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Allez dans <strong>Intégration</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Cliquez sur <strong>Connecter une boutique Shopify</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Renseignez l'<strong>URL de votre boutique</strong> et le <strong>token d'accès</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Complétez les <strong>métadonnées</strong> (nom, catégorie, description) pour personnaliser l'intégration</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    Gestion de l'Abonnement
                  </h4>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                      <p className="text-sm">Accédez à <strong>Compte → Abonnement</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                      <p className="text-sm">Consultez votre <strong>plan actuel</strong> et les <strong>limites d'utilisation</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                      <p className="text-sm">Changez de plan avec <strong>Changer de Plan</strong> ou gérez via le <strong>Portail Stripe</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                      <p className="text-sm">Suivez votre <strong>utilisation</strong> pour optimiser votre plan</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Prêt à Commencer ?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Toutes ces fonctionnalités sont disponibles dès maintenant. Commencez votre essai gratuit de 14 jours et transformez votre boutique Shopify avec l'intelligence artificielle.
              </p>
              <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="group">
                Démarrer l'Essai Gratuit
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </TabsContent>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-8">
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Rocket className="w-8 h-8 text-primary" />
                Getting Started with NewAI
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-4">Quick Start Guide</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Create Your Account</h4>
                        <p className="text-muted-foreground">
                          Sign up for a free trial account. No credit card required for the first 14 days.
                        </p>
                        <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/auth?mode=signup')}>
                          Sign Up Now <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Connect Your Shopify Store</h4>
                        <p className="text-muted-foreground">
                          Link your Shopify store using our secure integration. You'll need your store URL and access token.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Import Your Products</h4>
                        <p className="text-muted-foreground">
                          Automatically sync your product catalog. Our AI will analyze and prepare them for optimization.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Start Optimizing</h4>
                        <p className="text-muted-foreground">
                          Use our AI tools to optimize SEO, generate content, and improve product descriptions automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Pro Tip
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Start with SEO optimization for your best-selling products. This will give you immediate visibility improvements while you explore other features.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Product Management</h3>
                    <p className="text-muted-foreground mb-4">
                      Comprehensive product catalog management with AI-powered enhancements.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Bulk product import and sync</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Variant management</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">GTIN generation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Product enrichment with AI</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">SEO Optimization</h3>
                    <p className="text-muted-foreground mb-4">
                      Advanced AI-powered SEO tools to improve search rankings.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Meta title & description optimization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Keyword research and integration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Image alt text generation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Auto-sync to Shopify</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">AI Blog Generation</h3>
                    <p className="text-muted-foreground mb-4">
                      Create SEO-optimized blog content automatically with AI.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Topic generation based on products</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">SEO-optimized content</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Automatic product links</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Campaign scheduling</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">AI Chat Assistant</h3>
                    <p className="text-muted-foreground mb-4">
                      Intelligent chatbot for customer support and product recommendations.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Product recommendations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">24/7 automated support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Embeddable widget</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Conversation history</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Google Merchant Center</h3>
                    <p className="text-muted-foreground mb-4">
                      Automated product feed generation for Google Shopping.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">XML feed generation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Auto category matching</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">GTIN validation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Continuous sync</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Analytics & Automation</h3>
                    <p className="text-muted-foreground mb-4">
                      Track performance and automate repetitive tasks.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Performance monitoring</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Scheduled optimizations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Usage reports</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Automated workflows</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Integration */}
          <TabsContent value="integration" className="space-y-8">
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Link2 className="w-8 h-8 text-primary" />
                Shopify Integration Guide
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-4">Prerequisites</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Active Shopify store (any plan)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Store admin access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>NewAI account (free trial available)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4">Connection Methods</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card className="p-6 border-2 border-primary/20">
                      <Badge className="mb-3">Recommended</Badge>
                      <h4 className="text-xl font-semibold mb-3">OAuth Connection</h4>
                      <p className="text-muted-foreground mb-4">
                        Secure one-click connection using Shopify's OAuth system. No manual token required.
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Most secure method</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Automatic setup</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Easy to revoke</span>
                        </li>
                      </ul>
                    </Card>

                    <Card className="p-6 border-2 border-border">
                      <Badge variant="outline" className="mb-3">Manual</Badge>
                      <h4 className="text-xl font-semibold mb-3">Custom App Token</h4>
                      <p className="text-muted-foreground mb-4">
                        Create a custom app in Shopify and use the API token for connection.
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Full control over permissions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Works for all stores</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>More setup steps</span>
                        </li>
                      </ul>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4">Step-by-Step: OAuth Connection</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm">
                          1
                        </div>
                        <div>
                          <p className="font-medium mb-1">Go to Integration page</p>
                          <p className="text-sm text-muted-foreground">Navigate to Settings → Integration in your NewAI dashboard</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm">
                          2
                        </div>
                        <div>
                          <p className="font-medium mb-1">Click "Connect with OAuth"</p>
                          <p className="text-sm text-muted-foreground">Enter your Shopify store URL (e.g., mystore.myshopify.com)</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm">
                          3
                        </div>
                        <div>
                          <p className="font-medium mb-1">Authorize the connection</p>
                          <p className="text-sm text-muted-foreground">Review permissions and click "Install" on the Shopify page</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm">
                          4
                        </div>
                        <div>
                          <p className="font-medium mb-1">Start importing products</p>
                          <p className="text-sm text-muted-foreground">You'll be redirected back and can immediately import your products</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-yellow-600" />
                    Required Shopify Permissions
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    NewAI requires the following permissions to function properly:
                  </p>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                    <li>• Read and write products</li>
                    <li>• Read and write product listings</li>
                    <li>• Read and write inventory</li>
                    <li>• Read and write blog posts</li>
                    <li>• Read shop information</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Guides */}
          <TabsContent value="guides" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <Tag className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">SEO Optimization Guide</h3>
                <p className="text-muted-foreground mb-4">
                  Learn how to optimize your products for better search engine rankings.
                </p>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Meta Titles & Descriptions</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>AI generates optimized meta titles (50-60 characters) and descriptions (150-160 characters) that include relevant keywords while remaining natural and compelling.</p>
                        <p className="font-semibold">Best practices:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Include primary keyword near the beginning</li>
                          <li>Make it descriptive and actionable</li>
                          <li>Stay within character limits</li>
                          <li>Be unique for each product</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Image Alt Text</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>AI analyzes product images to generate descriptive alt text that improves accessibility and SEO.</p>
                        <p className="font-semibold">What to include:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Product name and main features</li>
                          <li>Color, size, or variant details</li>
                          <li>Relevant keywords naturally integrated</li>
                          <li>Context when helpful (e.g., "in use", "close-up")</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Keyword Research</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Our AI analyzes your products and competitors to suggest high-value keywords.</p>
                        <p className="font-semibold">How it works:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Identifies long-tail opportunities</li>
                          <li>Considers search volume and competition</li>
                          <li>Suggests related terms</li>
                          <li>Integrates naturally into content</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="p-6">
                <FileText className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">Blog Content Guide</h3>
                <p className="text-muted-foreground mb-4">
                  Create SEO-optimized blog articles that drive traffic to your products.
                </p>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Topic Generation</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>AI analyzes your product catalog to suggest relevant blog topics that naturally link to your products.</p>
                        <p className="font-semibold">Topic types:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>How-to guides featuring your products</li>
                          <li>Comparison articles</li>
                          <li>Buying guides</li>
                          <li>Industry trends and insights</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Content Structure</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Articles are structured for maximum SEO impact and readability:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Compelling H1 with target keyword</li>
                          <li>Introduction with clear value proposition</li>
                          <li>H2 and H3 subheadings for structure</li>
                          <li>Natural product mentions and links</li>
                          <li>Conclusion with call-to-action</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Publishing & Scheduling</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Create campaigns to automate your content strategy:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Set frequency (daily, weekly, monthly)</li>
                          <li>Choose preferred publishing times</li>
                          <li>Auto-publish or save as drafts</li>
                          <li>Track performance over time</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="p-6">
                <MessageSquare className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">AI Chat Setup Guide</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your intelligent chatbot for customer support and sales.
                </p>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Chat Customization</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Personalize your chat widget to match your brand:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Choose position (bottom-right, bottom-left)</li>
                          <li>Set primary color to match your brand</li>
                          <li>Customize welcome message</li>
                          <li>Configure button text</li>
                          <li>Set assistant personality (friendly, professional, etc.)</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Product Recommendations</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>AI automatically recommends products based on customer queries:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Understands natural language questions</li>
                          <li>Searches product catalog in real-time</li>
                          <li>Provides relevant suggestions with images</li>
                          <li>Includes price and availability</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Embedding on Your Site</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Add the chat widget to your Shopify store:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Enable embed in Chat Settings</li>
                          <li>Copy the provided embed code</li>
                          <li>Paste in Shopify theme settings</li>
                          <li>Widget appears automatically on all pages</li>
                        </ol>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="p-6">
                <Globe className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">Google Shopping Guide</h3>
                <p className="text-muted-foreground mb-4">
                  Set up and optimize your Google Merchant Center feed.
                </p>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Feed Generation</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Automatic XML feed generation for Google Shopping:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Generates compliant XML format</li>
                          <li>Includes all required fields (GTIN, brand, etc.)</li>
                          <li>Auto-updates when products change</li>
                          <li>Provides feed URL for Google Merchant Center</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Category Matching</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>AI automatically matches products to Google's product taxonomy:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Analyzes product title and description</li>
                          <li>Suggests best-fit categories</li>
                          <li>Considers industry standards</li>
                          <li>Improves ad placement accuracy</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>GTIN & Product IDs</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>Ensure your products have valid identifiers:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Auto-generate GTINs for products without them</li>
                          <li>Validate existing GTINs</li>
                          <li>Support for UPC, EAN, ISBN</li>
                          <li>Required for most Google Shopping ads</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-8">
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-primary" />
                Frequently Asked Questions
              </h2>

              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="faq-1">
                  <AccordionTrigger className="text-lg font-semibold">
                    How long does the free trial last?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      The free trial lasts 14 days and includes access to all features with usage limits based on the Starter plan. 
                      No credit card is required to start your trial. You can upgrade to a paid plan at any time.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2">
                  <AccordionTrigger className="text-lg font-semibold">
                    Can I connect multiple Shopify stores?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Yes! The number of stores you can connect depends on your plan:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>Starter: 1 store</li>
                      <li>Pro: Up to 3 stores</li>
                      <li>Enterprise: Up to 10 stores</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3">
                  <AccordionTrigger className="text-lg font-semibold">
                    What happens if I exceed my monthly limits?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      We offer automatic pay-as-you-go pricing for overages. You'll only pay for what you use beyond your plan limits:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>SEO Optimization: $0.01 per optimization</li>
                      <li>AI Article: $2.00 per article</li>
                      <li>AI Search: $0.05 per search</li>
                      <li>Chat Response: $0.02 per response</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Billing is calculated at the end of the month, so you never experience service interruptions.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4">
                  <AccordionTrigger className="text-lg font-semibold">
                    Is my Shopify data secure?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Absolutely. We take security seriously:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>All connections use OAuth 2.0 or encrypted API tokens</li>
                      <li>Data is encrypted in transit (TLS) and at rest</li>
                      <li>We only request the minimum permissions needed</li>
                      <li>You can revoke access at any time from your Shopify admin</li>
                      <li>We never sell or share your data with third parties</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-5">
                  <AccordionTrigger className="text-lg font-semibold">
                    How does AI content generation work?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Our AI uses advanced language models trained on e-commerce best practices:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>Analyzes your product catalog and store context</li>
                      <li>Generates SEO-optimized, natural-sounding content</li>
                      <li>Follows industry best practices for meta tags, descriptions, and articles</li>
                      <li>Includes relevant keywords without keyword stuffing</li>
                      <li>You can always edit generated content before publishing</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-6">
                  <AccordionTrigger className="text-lg font-semibold">
                    Can I cancel my subscription anytime?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Yes, you can cancel your subscription at any time from your account settings. 
                      There are no cancellation fees or long-term commitments. 
                      You'll retain access to your plan until the end of your current billing period.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-7">
                  <AccordionTrigger className="text-lg font-semibold">
                    Does NewAI work with Shopify Plus?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Yes! NewAI is fully compatible with all Shopify plans, including Shopify Plus. 
                      Enterprise customers often benefit from our custom solutions and dedicated account management. 
                      Contact us for a tailored proposal.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-8">
                  <AccordionTrigger className="text-lg font-semibold">
                    What languages are supported?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      NewAI supports 10 languages:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>English</li>
                      <li>Français (French)</li>
                      <li>Español (Spanish)</li>
                      <li>Deutsch (German)</li>
                      <li>Italiano (Italian)</li>
                      <li>Português (Portuguese)</li>
                      <li>Nederlands (Dutch)</li>
                      <li>日本語 (Japanese)</li>
                      <li>中文 (Chinese)</li>
                      <li>العربية (Arabic)</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      The interface automatically adapts to your preferred language, and AI content can be generated in your target market's language.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-9">
                  <AccordionTrigger className="text-lg font-semibold">
                    How do I get support?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      We offer multiple support channels:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>Email support: support@newai.com (all plans)</li>
                      <li>Priority support: 24/7 for Pro and Enterprise plans</li>
                      <li>Dedicated account manager: Enterprise plan only</li>
                      <li>Documentation and guides: Available to everyone</li>
                      <li>In-app chat: Coming soon</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Average response time is under 2 hours for priority support and 24 hours for standard support.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-10">
                  <AccordionTrigger className="text-lg font-semibold">
                    Will this work with my existing SEO strategy?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Yes! NewAI is designed to complement your existing SEO efforts:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>Review and edit all AI suggestions before applying</li>
                      <li>Set custom keywords and preferences</li>
                      <li>Choose which products to optimize</li>
                      <li>Works alongside other SEO tools and plugins</li>
                      <li>Follows Google's latest SEO best practices</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Still have questions?</h3>
                <p className="text-muted-foreground">
                  Our team is here to help. Contact us for personalized assistance.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => window.location.href = 'mailto:support@newai.com'}>
                    Contact Support
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/auth?mode=signup')}>
                    Start Free Trial
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Footer />
    </div>
  );
};

export default Documentation;
