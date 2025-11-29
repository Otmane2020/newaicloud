import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Calendar, Clock, ArrowRight, Search, User, Share2, BookOpen } from "lucide-react";
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
        <AnnouncementBar />
        <PublicHeader />
        <main className="flex-1">
          {/* Hero Header */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="container mx-auto px-4 py-16 relative z-10">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/blog-newai')}
                className="mb-8 text-white/80 hover:text-white hover:bg-white/10"
              >
                ← {t.blogPage.backToArticles}
              </Button>
              
              <div className="max-w-4xl mx-auto text-center">
                <Badge className="mb-6 bg-primary/20 text-primary-foreground border-primary/30">
                  {selectedArticle.category}
                </Badge>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  {selectedArticle.title}
                </h1>
                
                <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                  {selectedArticle.excerpt}
                </p>
                
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>NewAI Team</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(selectedArticle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{selectedArticle.readTime} {t.blogPage.minRead}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{selectedArticle.views} views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Featured Image */}
          <div className="container mx-auto px-4 -mt-8 relative z-20">
            <div className="max-w-5xl mx-auto">
              <img 
                src={selectedArticle.image} 
                alt={selectedArticle.title}
                className="w-full h-[400px] md:h-[500px] object-cover rounded-2xl shadow-2xl"
              />
            </div>
          </div>
          
          {/* Article Content */}
          <article className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl mx-auto">
              {/* Article Body with Magazine Styling */}
              <div 
                className="article-content prose prose-lg md:prose-xl max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:mt-12 prose-h1:mb-6
                  prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-l-4 prose-h2:border-primary prose-h2:pl-4
                  prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-ul:my-6 prose-ul:pl-6 prose-li:text-muted-foreground prose-li:mb-2
                  prose-ol:my-6 prose-ol:pl-6
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-foreground/80
                  prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                  prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                  prose-pre:bg-slate-900 prose-pre:rounded-xl prose-pre:shadow-lg
                "
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }} 
              />
              
              {/* Share Section */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">Share this article</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(selectedArticle.title)}`, '_blank')}>
                      Twitter
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}>
                      LinkedIn
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="mt-12 p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">{t.blogPage.ctaTitle}</h3>
                <p className="text-muted-foreground mb-6 text-lg">
                  {t.blogPage.ctaDescription}
                </p>
                <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/auth?mode=signup')}>
                  {t.blogPage.startTrial}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar />
      <PublicHeader />
      
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
