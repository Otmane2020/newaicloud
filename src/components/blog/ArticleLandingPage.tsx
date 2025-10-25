import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  Clock,
  Tag,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Copy,
  Check,
  ChevronRight,
  Home,
  ArrowUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ArticleLandingPageProps {
  articleId: string;
}

interface BlogArticle {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  meta_description?: string | null;
  target_keywords?: string[];
  keywords?: string[];
  category?: string | null;
  subcategory?: string | null;
  author?: string | null;
  created_at: string;
  word_count?: number | null;
  product_links?: Array<{
    product_id: string;
    title: string;
    handle: string;
    image_url: string;
    price: number;
  }>;
}

export function ArticleLandingPage({ articleId }: ArticleLandingPageProps) {
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);

      const sections = document.querySelectorAll('h2[id]');
      const scrollPosition = window.scrollY + 200;

      sections.forEach((section) => {
        const element = section as HTMLElement;
        const top = element.offsetTop;
        const height = element.offsetHeight;

        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(element.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('id', articleId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const articleData: BlogArticle = {
          ...data,
          excerpt: (data as any).excerpt || null,
          meta_description: data.meta_description || null,
          target_keywords: data.keywords || (data as any).target_keywords || [],
          category: (data as any).category || null,
          subcategory: (data as any).subcategory || null,
          author: (data as any).author || null,
          word_count: (data as any).word_count || null,
        };
        setArticle(articleData);
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      toast.error('Erreur lors du chargement de l\'article');
    } finally {
      setLoading(false);
    }
  };

  const getReadingTime = (wordCount: number | null): string => {
    if (!wordCount) return '5 min';
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min`;
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = article?.title || '';

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Lien copié !');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Article non trouvé</p>
        </div>
      </div>
    );
  }

  const readingTime = getReadingTime(article.word_count);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2 text-blue-100 mb-4">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span>{article.category || 'Blog'}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{article.title}</h1>
          {article.excerpt && (
            <p className="text-xl text-blue-100 mb-8">{article.excerpt}</p>
          )}
          <div className="flex items-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(article.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{readingTime} de lecture</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        {/* Share Buttons */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="font-semibold mb-4">Partager cet article</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleShare('facebook')}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="p-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="p-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
            >
              <Linkedin className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Keywords */}
        {article.target_keywords && article.target_keywords.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-3">Mots-clés</h3>
            <div className="flex flex-wrap gap-2">
              {article.target_keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-50"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
