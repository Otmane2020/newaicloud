import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Tag,
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Check,
  Sparkles,
  FileText,
  Share2,
  Eye
} from "lucide-react";
import { toast } from "sonner";

export default function ArticleLanding() {
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  useEffect(() => {
    // Détection de la section active pendant le scroll
    const handleScroll = () => {
      const sections = document.querySelectorAll(".article-section");
      let currentSection = "";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setArticle(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement de l'article");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min`;
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article?.title || "";

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Lien copié !");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Article non trouvé</h2>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux articles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const readingTime = getReadingTime(article.content);

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copié !" : "Partager"}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Menu latéral fixe - Table des matières */}
          <aside className="lg:col-span-3 lg:sticky lg:top-20 h-fit hidden lg:block">
            <Card className="p-5">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Table des matières
              </h3>
              <nav className="space-y-1">
                {[
                  { id: "section-1", label: "1. Introduction" },
                  { id: "section-2", label: "2. Critères essentiels" },
                  { id: "section-3", label: "3. Notre sélection" },
                  { id: "section-4", label: "4. Comparatif" },
                  { id: "section-5", label: "5. Comment choisir" },
                  { id: "section-6", label: "6. Conclusion" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(item.id);
                      if (element) {
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }}
                    className={`block text-sm py-2.5 px-3 rounded-lg transition-all ${
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              
              {/* Infos article */}
              <Separator className="my-4" />
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(article.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {getReadingTime(article.content)} de lecture
                </div>
                {article.keywords && article.keywords.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    {article.keywords.length} mots-clés
                  </div>
                )}
              </div>
            </Card>
          </aside>

          {/* Contenu principal */}
          <main className="lg:col-span-9">
            {/* En-tête article */}
            <Card className="mb-8 overflow-hidden">
              <CardContent className="p-8">
                <div className="mb-4">
                  <Badge variant="outline" className="mb-4">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {article.status === "published" ? "Publié" : "Brouillon"}
                  </Badge>
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                    {article.title}
                  </h1>
                  {article.meta_description && (
                    <p className="text-lg text-muted-foreground mb-6">
                      {article.meta_description}
                    </p>
                  )}
                  
                  {/* Badges et infos mobile */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground lg:hidden mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {getReadingTime(article.content)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(article.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Partage */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground mr-2">Partager :</span>
                    <Button variant="outline" size="sm" onClick={() => handleShare("facebook")}>
                      <Facebook className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare("twitter")}>
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare("linkedin")}>
                      <Linkedin className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contenu avec styles avancés */}
            <Card className="overflow-hidden mb-8">
              <CardContent className="p-8 lg:p-12">
                <style>{`
                  .blog-article {
                    line-height: 1.8;
                  }
                  .blog-article h2 {
                    font-size: 1.875rem;
                    font-weight: 700;
                    margin-top: 3rem;
                    margin-bottom: 1.5rem;
                    scroll-margin-top: 120px;
                    color: hsl(var(--foreground));
                  }
                  .blog-article h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: hsl(var(--foreground));
                  }
                  .blog-article p {
                    margin-bottom: 1.5rem;
                    color: hsl(var(--muted-foreground));
                    font-size: 1.0625rem;
                  }
                  .blog-article ul, .blog-article ol {
                    margin-bottom: 1.5rem;
                    padding-left: 2rem;
                    color: hsl(var(--muted-foreground));
                  }
                  .blog-article li {
                    margin-bottom: 0.75rem;
                  }
                  .blog-article .hero-image {
                    width: 100%;
                    height: auto;
                    max-height: 500px;
                    object-fit: cover;
                    border-radius: 0.75rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                  }
                  .blog-article .comparison-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2rem 0;
                    overflow: hidden;
                    border-radius: 0.5rem;
                  }
                  .blog-article .comparison-table th,
                  .blog-article .comparison-table td {
                    border: 1px solid hsl(var(--border));
                    padding: 1rem;
                    text-align: left;
                  }
                  .blog-article .comparison-table th {
                    background-color: hsl(var(--primary) / 0.1);
                    font-weight: 600;
                    color: hsl(var(--primary));
                  }
                  .blog-article .comparison-table tbody tr:nth-child(even) {
                    background-color: hsl(var(--muted) / 0.3);
                  }
                  .blog-article .article-section {
                    scroll-margin-top: 120px;
                  }
                  .blog-article .article-toc {
                    background: linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1));
                    border-left: 4px solid hsl(var(--primary));
                    padding: 1.5rem;
                    margin: 2rem 0;
                    border-radius: 0.5rem;
                  }
                  .blog-article .article-toc h2 {
                    margin-top: 0;
                    font-size: 1.25rem;
                  }
                  .blog-article .article-toc ol {
                    margin-bottom: 0;
                  }
                  .blog-article .article-toc a {
                    color: hsl(var(--primary));
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.2s;
                  }
                  .blog-article .article-toc a:hover {
                    text-decoration: underline;
                    color: hsl(var(--primary) / 0.8);
                  }
                  .blog-article strong {
                    font-weight: 600;
                    color: hsl(var(--foreground));
                  }
                `}</style>
                <div
                  className="blog-article prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </CardContent>
            </Card>

            {/* Mots-clés */}
            {article.keywords && article.keywords.length > 0 && (
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Mots-clés SEO
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {article.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA final */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-3">
                  Prêt à découvrir nos produits ?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Explorez notre collection complète et trouvez le produit parfait pour vos besoins
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/products">
                    <Button size="lg">
                      <Eye className="w-5 h-5 mr-2" />
                      Voir notre catalogue
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" onClick={handleCopyLink}>
                    <Share2 className="w-5 h-5 mr-2" />
                    Partager l'article
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
