import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BlogArticle {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
}

const blogArticles: BlogArticle[] = [
  {
    id: 1,
    title: "Comment NewAI Révolutionne le SEO E-commerce en 2025",
    excerpt: "Découvrez comment l'intelligence artificielle transforme l'optimisation SEO pour les boutiques en ligne et multiplie votre visibilité.",
    content: "Le SEO e-commerce n'a jamais été aussi crucial. Avec NewAI, optimisez automatiquement vos fiches produits, collections et pages avec une IA avancée qui comprend les intentions de recherche.",
    category: "SEO",
    readTime: "5 min",
    date: "2025-01-15",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"
  },
  {
    id: 2,
    title: "Google Merchant Center : Optimisez Votre Flux Produits avec l'IA",
    excerpt: "Transformez votre flux Google Shopping en machine à conversions grâce à l'optimisation intelligente de NewAI.",
    content: "Google Merchant Center exige des données parfaites. NewAI génère automatiquement des titres, descriptions et attributs optimisés pour maximiser vos performances Google Shopping.",
    category: "Merchant",
    readTime: "7 min",
    date: "2025-01-12",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"
  },
  {
    id: 3,
    title: "Assistant Commercial IA : Le Futur du Service Client E-commerce",
    excerpt: "Votre chatbot intelligent qui répond 24/7, qualifie les leads et convertit les visiteurs en clients.",
    content: "L'assistant commercial IA de NewAI comprend le contexte, répond aux questions produits et guide vos clients vers l'achat avec une précision humaine.",
    category: "AI Assistant",
    readTime: "6 min",
    date: "2025-01-10",
    image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800"
  },
  {
    id: 4,
    title: "Génération d'Images ALT : Boostez Votre SEO Visuel",
    excerpt: "Les textes alternatifs optimisés automatiquement pour chaque image de votre catalogue produits.",
    content: "Le SEO d'images est souvent négligé. NewAI analyse chaque visuel et génère des balises ALT descriptives et optimisées SEO qui améliorent votre référencement.",
    category: "SEO",
    readTime: "4 min",
    date: "2025-01-08",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800"
  },
  {
    id: 5,
    title: "Automatisation SEO : Gagnez 10h par Semaine sur Votre Boutique",
    excerpt: "Automatisez l'optimisation de milliers de produits en quelques clics et concentrez-vous sur votre croissance.",
    content: "Pourquoi passer des heures sur le SEO manuel ? NewAI optimise automatiquement vos fiches produits, méta descriptions et structures de contenu à grande échelle.",
    category: "Automation",
    readTime: "5 min",
    date: "2025-01-05",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800"
  },
  {
    id: 6,
    title: "Content Marketing IA : Créez un Blog E-commerce qui Convertit",
    excerpt: "Générez des articles de blog optimisés SEO qui attirent du trafic qualifié et génèrent des ventes.",
    content: "Le contenu est roi. NewAI crée des articles de blog personnalisés pour votre niche, intègre vos produits naturellement et optimise chaque mot pour le référencement.",
    category: "Content",
    readTime: "8 min",
    date: "2025-01-03",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800"
  },
  {
    id: 7,
    title: "Intégration Shopify : Synchronisation Automatique et Transparente",
    excerpt: "Connectez votre boutique Shopify en 2 minutes et laissez l'IA optimiser tous vos contenus automatiquement.",
    content: "L'intégration Shopify de NewAI est native et bidirectionnelle. Importez vos produits, optimisez-les avec l'IA et synchronisez les changements en un clic.",
    category: "Integration",
    readTime: "4 min",
    date: "2025-01-01",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"
  },
  {
    id: 8,
    title: "Analyse SEO en Temps Réel : Suivez Vos Performances avec Précision",
    excerpt: "Dashboard analytics complet pour mesurer l'impact de vos optimisations SEO et ajuster votre stratégie.",
    content: "Visualisez vos scores SEO, suivez les améliorations et identifiez les opportunités d'optimisation avec le tableau de bord analytique de NewAI.",
    category: "Analytics",
    readTime: "6 min",
    date: "2024-12-28",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"
  },
  {
    id: 9,
    title: "Netlinking Intelligent : Stratégies de Backlinks Automatisées",
    excerpt: "Identifiez et créez des opportunités de netlinking pour renforcer l'autorité de votre site e-commerce.",
    content: "Le netlinking reste crucial pour le SEO. NewAI analyse votre contenu, suggère des opportunités de liens internes et externes pour booster votre autorité.",
    category: "SEO",
    readTime: "7 min",
    date: "2024-12-25",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"
  },
  {
    id: 10,
    title: "ROI du SEO IA : Cas Clients et Résultats Mesurables",
    excerpt: "Découvrez comment nos clients ont multiplié leur trafic organique et leurs ventes grâce à NewAI.",
    content: "Des chiffres réels : +250% de trafic organique, +180% de conversions, -90% de temps passé sur le SEO. Découvrez les success stories de nos clients e-commerce.",
    category: "Case Study",
    readTime: "9 min",
    date: "2024-12-22",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800"
  }
];

const BlogNewAI = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);

  const categories = Array.from(new Set(blogArticles.map(article => article.category)));

  const filteredArticles = blogArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedArticle) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1">
          <article className="container mx-auto px-4 py-12 max-w-4xl">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedArticle(null)}
              className="mb-6"
            >
              ← Retour aux articles
            </Button>
            
            <img 
              src={selectedArticle.image} 
              alt={selectedArticle.title}
              className="w-full h-96 object-cover rounded-lg mb-8"
            />
            
            <div className="flex items-center gap-4 mb-6 text-muted-foreground">
              <Badge variant="secondary">{selectedArticle.category}</Badge>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(selectedArticle.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{selectedArticle.readTime} de lecture</span>
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6">{selectedArticle.title}</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-xl text-muted-foreground mb-8">{selectedArticle.excerpt}</p>
              <div className="space-y-4 text-foreground">
                {selectedArticle.content.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-12 p-8 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="text-2xl font-bold mb-4">Prêt à Transformer Votre E-commerce ?</h3>
              <p className="text-muted-foreground mb-6">
                Rejoignez des centaines de marchands qui utilisent NewAI pour automatiser leur SEO et multiplier leurs ventes.
              </p>
              <Button size="lg" className="w-full sm:w-auto">
                Démarrer Gratuitement
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h1 className="text-5xl font-bold mb-6">
              Le Blog NewAI
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Découvrez comment l'IA révolutionne le SEO e-commerce, Google Merchant Center et l'assistance commerciale intelligente
            </p>
            
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Categories Filter */}
        <section className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
              >
                Tous les articles
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map(article => (
                <Card 
                  key={article.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-4 left-4">{article.category}</Badge>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{article.readTime}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                    
                    <Button variant="ghost" className="p-0 h-auto font-semibold group-hover:gap-2 transition-all">
                      Lire l'article
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Aucun article ne correspond à votre recherche
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-4xl font-bold mb-6">
              Prêt à Booster Votre E-commerce avec l'IA ?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Rejoignez des centaines de marchands qui automatisent leur SEO et multiplient leurs ventes avec NewAI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary">
                Essayer Gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Voir une Démo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogNewAI;
