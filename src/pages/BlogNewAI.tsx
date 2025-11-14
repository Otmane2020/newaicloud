import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/language";
import { DemoBookingDialog } from "@/components/DemoBookingDialog";

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  date: string;
  image: string;
  metaDescription: string;
  views: number;
}

const BlogNewAI = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      loadArticleBySlug(slug);
    } else {
      loadArticles();
    }
  }, [slug]);

  const loadArticleBySlug = async (articleSlug: string) => {
    try {
      const { data, error } = await supabase
        .from('promotional_articles')
        .select('*')
        .eq('slug', articleSlug)
        .eq('published', true)
        .single();

      if (error) throw error;

      if (data) {
        // Increment view count
        await supabase
          .from('promotional_articles')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', data.id);

        const article: BlogArticle = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || '',
          content: data.content,
          category: data.category,
          readTime: data.read_time || 5,
          date: data.published_at || data.created_at,
          image: data.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
          metaDescription: data.meta_description || '',
          views: data.views || 0
        };

        setSelectedArticle(article);
        document.title = `${article.title} | NewAI Blog`;
      }
    } catch (error) {
      console.error('Error loading article:', error);
      toast({
        title: t.blogPage.articleNotFound,
        description: t.blogPage.articleNotFoundDesc,
        variant: "destructive"
      });
      navigate('/blog-newai');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_articles')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;

      const formattedArticles: BlogArticle[] = (data || []).map((article: any) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.meta_description || '',
        content: article.content,
        category: article.category,
        readTime: article.read_time || 5,
        date: article.published_at || article.created_at,
        image: article.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        metaDescription: article.meta_description || '',
        views: article.views || 0
      }));

      setBlogArticles(formattedArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({
        title: t.blogPage.errorLoading,
        description: t.blogPage.errorLoadingDesc,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Array.from(new Set(blogArticles.map(article => article.category)));

  const filteredArticles = blogArticles.filter(article => {
    // Fonction pour normaliser le texte (enlever accents, ponctuation, minuscules)
    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return '';
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
        .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
        .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
        .trim();
    };

    // Normaliser le terme de recherche et le diviser en mots-clés
    const searchKeywords = normalizeText(searchTerm).split(' ').filter(k => k.length > 0);
    
    let matchesSearch = true;
    if (searchKeywords.length > 0) {
      // Construire une chaîne de recherche avec tous les champs de l'article
      const searchableText = normalizeText([
        article.title,
        article.excerpt,
        article.category
      ].filter(Boolean).join(' '));

      // Vérifier que tous les mots-clés sont présents
      matchesSearch = searchKeywords.every(keyword => searchableText.includes(keyword));
    }
    
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
              onClick={() => navigate('/blog-newai')}
              className="mb-6"
            >
              ← {t.blogPage.backToArticles}
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
                <span>{new Date(selectedArticle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{selectedArticle.readTime} {t.blogPage.minRead}</span>
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6">{selectedArticle.title}</h1>
            
            <div className="prose prose-lg max-w-none text-foreground">
              <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
            </div>

            <div className="mt-12 p-8 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="text-2xl font-bold mb-4">{t.blogPage.ctaTitle}</h3>
              <p className="text-muted-foreground mb-6">
                {t.blogPage.ctaDescription}
              </p>
              <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/auth?mode=signup')}>
                {t.blogPage.startTrial}
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
              {t.blogPage.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t.blogPage.subtitle}
            </p>

            <Button
              onClick={() => setIsDemoDialogOpen(true)}
              size="lg"
              className="mb-8 bg-primary hover:bg-primary/90"
            >
              Book Demo
            </Button>
            
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.blogPage.searchPlaceholder}
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
                {t.blogPage.allArticles}
              </Button>
              {['SEO', 'Google Merchant', 'AI Assistant', 'E-commerce'].map(category => (
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
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">{t.blogPage.loading}</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredArticles.map(article => (
                    <Card 
                      key={article.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/blog-newai/${article.slug}`)}
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
                            <span>{new Date(article.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{article.readTime} {t.blogPage.min}</span>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {article.excerpt}
                        </p>
                        
                        <Button variant="ghost" className="p-0 h-auto font-semibold group-hover:gap-2 transition-all">
                          {t.blogPage.readArticle}
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredArticles.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {t.blogPage.noArticles}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-4xl font-bold mb-6">
              {t.blogPage.ctaMainTitle}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t.blogPage.ctaMainDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate('/auth?mode=signup')}>
                {t.blogPage.startTrial}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => navigate('/')}>
                {t.blogPage.learnMore}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <DemoBookingDialog 
        open={isDemoDialogOpen} 
        onOpenChange={setIsDemoDialogOpen}
      />
    </div>
  );
};

export default BlogNewAI;
